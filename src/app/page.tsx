
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import GameBoard from '@/components/game/GameBoard';
import type { GameState, Piece, Board, PlayerType, AnimalType, Square, TerrainType, CapturedPieces, RiftDirection } from '@/types/game';
import { BOARD_SIZE, NUM_RANDOM_SWAMPS, NUM_RANDOM_HILLS, NUM_RANDOM_RIFTS, TERRAIN_RESTRICTED_ROWS } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2, Cpu, User, Lightbulb, Award } from 'lucide-react';
import { analyzeGameState } from '@/ai/flows/analyze-game-state';
import { suggestMove } from '@/ai/flows/suggest-move';
import { useToast } from "@/hooks/use-toast";
import Tutorial from '@/components/game/Tutorial';

// GDD v0.4: 7x7 board. Player One (AI, Black, Top), Player Two (Human, White, Bottom)
// Startaufstellung (0-indexed, Player One (AI, Black) on rows 0/1, Player Two (Human, White) on rows 6/5):
// Player One (AI, Black, 'ai'): G(0,2), L(0,3), G(0,4) | Z(1,1), Z(1,2), Z(1,3), Z(1,4), Z(1,5)
// Player Two (Human, White, 'human'): G(6,2), L(6,3), G(6,4) | Z(5,1), Z(5,2), Z(5,3), Z(5,4), Z(5,5)

const initialPiecesSetup: Record<string, Omit<Piece, 'id'>> = {
  // AI Pieces (Player One - Black, Top) - Player 'ai'
  'ai_giraffe_c1': { animal: 'giraffe', player: 'ai', position: { row: 0, col: 2 } }, // c1
  'ai_lion_d1':    { animal: 'lion',    player: 'ai', position: { row: 0, col: 3 } }, // d1
  'ai_giraffe_e1': { animal: 'giraffe', player: 'ai', position: { row: 0, col: 4 } }, // e1
  'ai_gazelle_b2': { animal: 'gazelle', player: 'ai', position: { row: 1, col: 1 } }, // b2
  'ai_gazelle_c2': { animal: 'gazelle', player: 'ai', position: { row: 1, col: 2 } }, // c2
  'ai_gazelle_d2': { animal: 'gazelle', player: 'ai', position: { row: 1, col: 3 } }, // d2
  'ai_gazelle_e2': { animal: 'gazelle', player: 'ai', position: { row: 1, col: 4 } }, // e2
  'ai_gazelle_f2': { animal: 'gazelle', player: 'ai', position: { row: 1, col: 5 } }, // f2

  // Human Pieces (Player Two - White, Bottom) - Player 'human'
  'h_giraffe_c7': { animal: 'giraffe', player: 'human', position: { row: 6, col: 2 } }, // c7
  'h_lion_d7':    { animal: 'lion',    player: 'human', position: { row: 6, col: 3 } }, // d7
  'h_giraffe_e7': { animal: 'giraffe', player: 'human', position: { row: 6, col: 4 } }, // e7
  'h_gazelle_b6': { animal: 'gazelle', player: 'human', position: { row: 5, col: 1 } }, // b6
  'h_gazelle_c6': { animal: 'gazelle', player: 'human', position: { row: 5, col: 2 } }, // c6
  'h_gazelle_d6': { animal: 'gazelle', player: 'human', position: { row: 5, col: 3 } }, // d6
  'h_gazelle_e6': { animal: 'gazelle', player: 'human', position: { row: 5, col: 4 } }, // e6
  'h_gazelle_f6': { animal: 'gazelle', player: 'human', position: { row: 5, col: 5 } }, // f6
};

function createInitialPieces(): Record<string, Piece> {
  const pieces: Record<string, Piece> = {};
  for (const key in initialPiecesSetup) {
    pieces[key] = { ...initialPiecesSetup[key], id: key } as Piece;
  }
  return pieces;
}


function createInitialBoard(pieces: Record<string, Piece>): Board {
  const board: Board = Array(BOARD_SIZE).fill(null).map((_, r) =>
    Array(BOARD_SIZE).fill(null).map((_, c) => ({
      row: r,
      col: c,
      terrain: 'none' as TerrainType,
      pieceId: null,
    }))
  );

  const occupiedByFixedTerrainOrPiece = new Set<string>();
  Object.values(pieces).forEach(p => {
    occupiedByFixedTerrainOrPiece.add(`${p.position.row}-${p.position.col}`);
  });
  
  const availableCellsForRandomTerrain: {row: number, col: number}[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (TERRAIN_RESTRICTED_ROWS.includes(r)) continue;
    for (let c = 0; c < BOARD_SIZE; c++) {
       if (!occupiedByFixedTerrainOrPiece.has(`${r}-${c}`)) {
        availableCellsForRandomTerrain.push({row: r, col: c});
      }
    }
  }

  // Shuffle available cells
  for (let i = availableCellsForRandomTerrain.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availableCellsForRandomTerrain[i], availableCellsForRandomTerrain[j]] = [availableCellsForRandomTerrain[j], availableCellsForRandomTerrain[i]];
  }
  
  let randomTerrainPlacedCount = 0;
  const placeTerrain = (terrainType: TerrainType, count: number) => {
    for (let i = 0; i < count && randomTerrainPlacedCount < availableCellsForRandomTerrain.length; i++) {
      const cell = availableCellsForRandomTerrain[randomTerrainPlacedCount++];
      board[cell.row][cell.col].terrain = terrainType;
      if (terrainType === 'rift') {
        const riftDirections: RiftDirection[] = [
          { dRow: -1, dCol: 0 }, // North
          { dRow: 1, dCol: 0 },  // South
          { dRow: 0, dCol: -1 }, // West
          { dRow: 0, dCol: 1 },  // East
        ];
        board[cell.row][cell.col].riftDirection = riftDirections[Math.floor(Math.random() * riftDirections.length)];
      }
      occupiedByFixedTerrainOrPiece.add(`${cell.row}-${cell.col}`); 
    }
  };

  placeTerrain('swamp', NUM_RANDOM_SWAMPS);
  placeTerrain('hill', NUM_RANDOM_HILLS);
  placeTerrain('rift', NUM_RANDOM_RIFTS);


  Object.values(pieces).forEach(p => {
    board[p.position.row][p.position.col].pieceId = p.id;
  });
  return board;
}

export function getAnimalChar(animal: AnimalType): string {
  switch(animal) {
    case 'gazelle': return 'Z'; 
    case 'giraffe': return 'G'; 
    case 'lion': return 'L';    
    default: return '?';
  }
}

function getTerrainCharForBoardString(terrain: TerrainType): string {
  switch (terrain) {
    case 'rift': return 'K';
    case 'swamp': return 'S';
    case 'hill': return 'H';
    default: return '';
  }
}

function getBoardString(board: Board, pieces: Record<string, Piece>): string {
  return board.map(row =>
    row.map(square => {
      if (square.pieceId) {
        const piece = pieces[square.pieceId];
        // Player 'ai' (Top) is Black, Player 'human' (Bottom) is White
        const playerChar = piece.player === 'ai' ? 'B' : 'W'; 
        const animalChar = getAnimalChar(piece.animal);
        return `${playerChar}${animalChar}`;
      }
      const terrainChar = getTerrainCharForBoardString(square.terrain);
      return terrainChar !== '' ? terrainChar : '..';
    }).join(' ')
  ).join('\n');
}

function initializeGameState(): GameState {
  const pieces = createInitialPieces();
  const initialCapturedScore: CapturedPieces = { gazelle: 0, lion: 0, giraffe: 0 };
  return {
    board: createInitialBoard(pieces),
    pieces: pieces,
    currentPlayer: 'human', // Human (White, Bottom) starts
    selectedPieceId: null,
    validMoves: [],
    winner: null,
    playerOneName: 'KI-Gegner (Schwarz)', // AI Player (Black, Top)
    playerTwoName: 'Spieler (Weiß)', // Human Player (White, Bottom)
    humanCapturedAIScore: { ...initialCapturedScore },
    aiCapturedHumanScore: { ...initialCapturedScore },
    lionMovedLastTurn: null,
    swampSkipTurnForPiece: null,
    isGameOver: false,
    message: "Spieler (Weiß) ist am Zug. Wähle eine Figur.",
  };
}

export default function SavannahChasePage() {
  const [gameState, setGameState] = useState<GameState>(initializeGameState);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const { toast } = useToast();

  const colLabels = Array.from({ length: BOARD_SIZE }, (_, i) => String.fromCharCode(65 + i));
  // Player (White) is at the bottom, so row 1 is at the bottom for display
  const rowLabelsForDisplay = Array.from({ length: BOARD_SIZE }, (_, i) => (BOARD_SIZE - i).toString());


  const handleStartGame = () => {
    setShowTutorial(false);
    setGameState(initializeGameState());
  };

  const checkWinCondition = useCallback((
    humanPlayerCapturesAiScore: CapturedPieces, // Captures by Human (White)
    aiPlayerCapturesHumanScore: CapturedPieces   // Captures by AI (Black)
  ): PlayerType | null => {
    // Human (White) wins if they capture AI's (Black) Lion OR all 5 AI Gazelles
    if (humanPlayerCapturesAiScore.lion >= 1 || humanPlayerCapturesAiScore.gazelle >= 5) return 'human';
    // AI (Black) wins if they capture Human's (White) Lion OR all 5 Human Gazelles
    if (aiPlayerCapturesHumanScore.lion >= 1 || aiPlayerCapturesHumanScore.gazelle >= 5) return 'ai';
    return null;
  }, []);

  const calculateValidMoves = useCallback((
    pieceId: string,
    currentBoard: Board,
    currentPieces: Record<string, Piece>,
    lionPlayerCurrentlyPaused: PlayerType | null,
    swampPausedPieceInfo: { pieceId: string; player: PlayerType } | null
  ): { row: number; col: number }[] => {
    const piece = currentPieces[pieceId];
    if (!piece) return [];

    if (piece.animal === 'lion' && lionPlayerCurrentlyPaused === piece.player) {
      return []; 
    }

    if ((piece.animal === 'lion' || piece.animal === 'gazelle') &&
        swampPausedPieceInfo?.player === piece.player &&
        swampPausedPieceInfo?.pieceId === piece.id) {
      return []; 
    }

    let moves: { row: number; col: number }[] = [];
    const { row: startRow, col: startCol } = piece.position;

    if (piece.animal === 'lion') {
      const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1], 
        [-1, -1], [-1, 1], [1, -1], [1, 1]  
      ];
      for (const [dr, dc] of directions) {
        for (let dist = 1; dist <= 2; dist++) { // Lion moves 1-2 squares
          const r = startRow + dr * dist;
          const c = startCol + dc * dist;

          if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break; 

          const targetSquare = currentBoard[r][c];
          if (targetSquare.terrain === 'hill') continue; // Lion cannot enter Hill

          if (targetSquare.pieceId) {
            const targetPiece = currentPieces[targetSquare.pieceId];
            if (targetPiece.player !== piece.player) { 
              moves.push({ row: r, col: c });
            }
            break; 
          }
          moves.push({ row: r, col: c }); 
        }
      }
    } else if (piece.animal === 'giraffe') {
      const directions = [[-1,0], [1,0], [0,-1], [0,1]]; 
      for (const [dr, dc] of directions) {
        for (let dist = 1; dist <= 2; dist++) { 
          const r = startRow + dr * dist;
          const c = startCol + dc * dist;

          if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break; 

          const targetSquare = currentBoard[r][c];
          if (targetSquare.terrain === 'swamp') continue; 
          // GDD: Giraffe CAN enter Hill (latest rule). No restriction here.
          // GDD: Giraffe cannot jump over rift
          if (dist === 2) {
            const intermediateRow = startRow + dr;
            const intermediateCol = startCol + dc;
            if (currentBoard[intermediateRow][intermediateCol].terrain === 'rift') {
              continue; 
            }
          }

          if (targetSquare.pieceId) {
            const targetPiece = currentPieces[targetSquare.pieceId];
            if (targetPiece.player !== piece.player) {
              moves.push({ row: r, col: c }); 
            }
            break; 
          }
          moves.push({ row: r, col: c }); 
        }
      }
    } else if (piece.animal === 'gazelle') {
      // Human (White, bottom, 'human') Gazelles move "up" (row index decreases).
      // AI (Black, top, 'ai') Gazelles move "down" (row index increases).
      const forwardDir = piece.player === 'human' ? -1 : 1;

      const moveR = startRow + forwardDir;
      if (moveR >= 0 && moveR < BOARD_SIZE) { 
        const targetSquare = currentBoard[moveR][startCol];
        if (targetSquare.terrain === 'hill') {
          // Gazelle cannot enter Hill
        } else if (!targetSquare.pieceId) { 
          moves.push({ row: moveR, col: startCol });
        }
      }

      const captureCols = [startCol - 1, startCol + 1];
      for (const captureC of captureCols) {
        const captureR = startRow + forwardDir;
        if (captureR >= 0 && captureR < BOARD_SIZE && captureC >=0 && captureC < BOARD_SIZE) { 
          const targetSquare = currentBoard[captureR][captureC];
          if (targetSquare.terrain === 'hill') {
            // Gazelle cannot capture on Hill
          } else if (targetSquare.pieceId) {
            const targetPiece = currentPieces[targetSquare.pieceId];
            if (targetPiece.player !== piece.player && targetPiece.animal !== 'lion') {
              moves.push({ row: captureR, col: captureC });
            }
          }
        }
      }
    }
    return moves;
  }, []);

  const processSpecialFieldEffects = useCallback((
    movedPieceId: string,
    targetRow: number,
    targetCol: number,
    currentBoard: Board,
    currentPieces: Record<string, Piece>
  ): { board: Board, pieces: Record<string, Piece>, finalPosition: {row: number, col: number}, messageUpdate?: string } => {

    let newBoard = currentBoard.map(r => r.map(s => ({ ...s } as Square)));
    let newPieces = JSON.parse(JSON.stringify(currentPieces));
    let finalPos = { row: targetRow, col: targetCol };
    let pieceToUpdate = newPieces[movedPieceId];
    let messageUpdate;

    const originalPos = currentPieces[movedPieceId].position;
    const landedSquare = newBoard[finalPos.row][finalPos.col];

    if (landedSquare.terrain === 'rift' && landedSquare.riftDirection) {
        const pushDirection = landedSquare.riftDirection;
        const pieceOwnerName = pieceToUpdate.player === 'human' ? gameState.playerTwoName : gameState.playerOneName;
        const pieceAnimalName = pieceToUpdate.animal.charAt(0).toUpperCase() + pieceToUpdate.animal.slice(1);
        const directionNames: Record<string, string> = { "-1,0": "Norden", "1,0": "Süden", "0,-1": "Westen", "0,1": "Osten"};
        const dirKey = `${pushDirection.dRow},${pushDirection.dCol}`;
        messageUpdate = `${pieceOwnerName} ${pieceAnimalName} landete in einer Kluft! Wird nach ${directionNames[dirKey] || 'unbekannte Richtung'} verschoben.`;
        toast({ title: "Kluft!", description: messageUpdate, duration: 3500 });

        let currentPushRow = finalPos.row;
        let currentPushCol = finalPos.col;
        
        if (originalPos.row !== finalPos.row || originalPos.col !== finalPos.col) { 
             newBoard[originalPos.row][originalPos.col].pieceId = null;
        }
        newBoard[finalPos.row][finalPos.col].pieceId = null; 

        // eslint-disable-next-line no-constant-condition
        while(true) {
            const nextRow = currentPushRow + pushDirection.dRow;
            const nextCol = currentPushCol + pushDirection.dCol;

            if (nextRow < 0 || nextRow >= BOARD_SIZE || nextCol < 0 || nextCol >= BOARD_SIZE) {
                break; 
            }
            if (newBoard[nextRow][nextCol].pieceId) {
                break;
            }
            currentPushRow = nextRow;
            currentPushCol = nextCol;
        }
        finalPos = {row: currentPushRow, col: currentPushCol}; 
    }

    if ((originalPos.row !== targetRow || originalPos.col !== targetCol) && (originalPos.row !== finalPos.row || originalPos.col !== finalPos.col)) {
        newBoard[originalPos.row][originalPos.col].pieceId = null;
    }
    if (landedSquare.terrain !== 'rift' && (originalPos.row !== targetRow || originalPos.col !== targetCol)) {
        newBoard[originalPos.row][originalPos.col].pieceId = null;
    }
    
    newPieces[movedPieceId] = { ...pieceToUpdate, position: finalPos };
    newBoard[finalPos.row][finalPos.col].pieceId = movedPieceId;

    return { board: newBoard, pieces: newPieces, finalPosition: finalPos, messageUpdate };
  }, [toast, gameState.playerTwoName, gameState.playerOneName]);


  const handleSquareClick = useCallback((row: number, col: number) => {
    if (gameState.isGameOver || isLoadingAI || gameState.currentPlayer !== 'human') return;

    const clickedSquare = gameState.board[row][col];
    const pieceInClickedSquare = clickedSquare.pieceId ? gameState.pieces[clickedSquare.pieceId] : null;

    let newSwampSkipTurnForPiece = gameState.swampSkipTurnForPiece;
    if (newSwampSkipTurnForPiece?.player === 'human') {
        newSwampSkipTurnForPiece = null;
    }

    if (gameState.selectedPieceId) {
      const selectedPiece = gameState.pieces[gameState.selectedPieceId];
      const isValidMoveTarget = gameState.validMoves.some(m => m.row === row && m.col === col);

      if (isValidMoveTarget) {
        let newPieces = JSON.parse(JSON.stringify(gameState.pieces));
        let newBoard = gameState.board.map(r => r.map(s => ({ ...s } as Square)));
        let newHumanPlayerCapturesAiScore = { ...gameState.humanCapturedAIScore };

        let currentLionMovedLastTurn = gameState.lionMovedLastTurn;
        if (selectedPiece.animal === 'lion') {
            currentLionMovedLastTurn = selectedPiece.player; 
        } else if (gameState.lionMovedLastTurn === 'human') { 
            currentLionMovedLastTurn = null; 
        }

        let moveMessage = "";
        const targetSquareContentOriginalBoard = gameState.board[row][col];

        if (targetSquareContentOriginalBoard.pieceId) { 
          const capturedPieceOriginal = gameState.pieces[targetSquareContentOriginalBoard.pieceId];
          if (capturedPieceOriginal.animal === 'lion' && !(selectedPiece.animal === 'lion' || selectedPiece.animal === 'giraffe')) {
             toast({ title: "Ungültiger Fang", description: `Deine ${selectedPiece.animal} kann keinen Löwen fangen. Nur ein Löwe oder eine Giraffe kann das.`, variant: "destructive", duration: 4000 });
             setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [] }));
             return;
          }
          delete newPieces[targetSquareContentOriginalBoard.pieceId];
          newHumanPlayerCapturesAiScore[capturedPieceOriginal.animal]++;
          moveMessage = `${gameState.playerTwoName} ${selectedPiece.animal} hat ${gameState.playerOneName} ${capturedPieceOriginal.animal} geschlagen.`;
          toast({ title: "Gefangen!", description: moveMessage, duration: 3000 });
        }

        const originalPiecePos = selectedPiece.position;
        newBoard[originalPiecePos.row][originalPiecePos.col].pieceId = null;
        
        const effectResult = processSpecialFieldEffects(selectedPiece.id, row, col, newBoard, newPieces);
        newBoard = effectResult.board;
        newPieces = effectResult.pieces; 

        const finalLandedSquare = newBoard[newPieces[selectedPiece.id].position.row][newPieces[selectedPiece.id].position.col];
        if ((selectedPiece.animal === 'lion' || selectedPiece.animal === 'gazelle') && finalLandedSquare.terrain === 'swamp') {
            newSwampSkipTurnForPiece = { pieceId: selectedPiece.id, player: 'human' };
            const swampMessage = `${gameState.playerTwoName} ${selectedPiece.animal} landete auf einem Sumpf! Pausiert nächste Runde.`;
            if (!moveMessage) moveMessage = swampMessage; else moveMessage += ` ${swampMessage}`;
            toast({ title: "Sumpf!", description: swampMessage, duration: 3000 });
        }

        if (effectResult.messageUpdate && !moveMessage) moveMessage = effectResult.messageUpdate;
        else if (effectResult.messageUpdate && moveMessage && !moveMessage.includes(effectResult.messageUpdate)) moveMessage += " " + effectResult.messageUpdate;

        const winner = checkWinCondition(newHumanPlayerCapturesAiScore, gameState.aiCapturedHumanScore);
        let nextPlayer: PlayerType = 'ai';
        let gameStatusMessage = winner
          ? `${winner === 'human' ? gameState.playerTwoName : gameState.playerOneName} gewinnt!`
          : `${gameState.playerOneName} ist am Zug.`;

        if (!moveMessage && !winner) {
             const finalPos = newPieces[selectedPiece.id].position;
             gameStatusMessage = `${gameState.playerTwoName} ${selectedPiece.animal} von (${colLabels[originalPiecePos.col]}${BOARD_SIZE-originalPiecePos.row}) nach (${colLabels[finalPos.col]}${BOARD_SIZE-finalPos.row}). ${gameStatusMessage}`;
        } else if (moveMessage && !winner) {
            gameStatusMessage = `${moveMessage} ${gameStatusMessage}`;
        } else if (moveMessage && winner) {
            gameStatusMessage = `${moveMessage} ${gameStatusMessage}`;
        }

        setGameState(prev => ({
          ...prev,
          board: newBoard,
          pieces: newPieces,
          currentPlayer: winner ? prev.currentPlayer : nextPlayer,
          selectedPieceId: null,
          validMoves: [],
          winner,
          isGameOver: !!winner,
          message: gameStatusMessage,
          humanCapturedAIScore: newHumanPlayerCapturesAiScore,
          lionMovedLastTurn: currentLionMovedLastTurn,
          swampSkipTurnForPiece: newSwampSkipTurnForPiece,
        }));

      } else { 
        if (pieceInClickedSquare && pieceInClickedSquare.player === 'human') { 
            if (pieceInClickedSquare.id === gameState.selectedPieceId) { 
                 setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [], message: `${gameState.playerTwoName} ist am Zug. Wähle eine Figur.` }));
            } else { 
                const pieceMoves = calculateValidMoves(pieceInClickedSquare.id, gameState.board, gameState.pieces, gameState.lionMovedLastTurn, gameState.swampSkipTurnForPiece); 
                let messageForSelection = `Wählte ${pieceInClickedSquare.animal}. Wähle ein Zielfeld.`;

                if (pieceInClickedSquare.animal === 'lion' && gameState.lionMovedLastTurn === 'human') {
                    toast({ title: "Löwe Pausiert", description: "Dein Löwe muss diese Runde aussetzen." });
                    messageForSelection = "Löwe ist pausiert. Wähle eine andere Figur.";
                } else if ((pieceInClickedSquare.animal === 'lion' || pieceInClickedSquare.animal === 'gazelle') &&
                           gameState.swampSkipTurnForPiece?.pieceId === pieceInClickedSquare.id &&
                           gameState.swampSkipTurnForPiece?.player === 'human') {
                    toast({ title: "Sumpfpause", description: `Diese ${pieceInClickedSquare.animal} ist diese Runde durch den Sumpf pausiert.`});
                    messageForSelection = `Diese ${pieceInClickedSquare.animal} ist sumpf-pausiert. Wähle eine andere Figur.`;
                } else if (pieceMoves.length === 0) {
                    toast({ title: "Keine Züge", description: `Diese ${pieceInClickedSquare.animal} hat keine gültigen Züge.` });
                    messageForSelection = `Diese ${pieceInClickedSquare.animal} hat keine gültigen Züge. Wähle eine andere Figur.`;
                }
                setGameState(prev => ({
                    ...prev,
                    selectedPieceId: pieceInClickedSquare.id,
                    validMoves: pieceMoves,
                    message: messageForSelection,
                }));
            }
        } else { 
          setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [], message: `Ungültiger Zug. ${gameState.playerTwoName} ist am Zug. Wähle eine Figur.`}));
        }
      }
    } else if (pieceInClickedSquare && pieceInClickedSquare.player === 'human') { 
        const pieceMoves = calculateValidMoves(pieceInClickedSquare.id, gameState.board, gameState.pieces, gameState.lionMovedLastTurn, gameState.swampSkipTurnForPiece);
        let messageForSelection = `Wählte ${pieceInClickedSquare.animal}. Gültige Züge werden angezeigt.`;

        if (pieceInClickedSquare.animal === 'lion' && gameState.lionMovedLastTurn === 'human') {
             toast({ title: "Löwe Pausiert", description: "Dein Löwe muss diese Runde aussetzen." });
             messageForSelection = "Löwe ist pausiert. Wähle eine andere Figur.";
        } else if ((pieceInClickedSquare.animal === 'lion' || pieceInClickedSquare.animal === 'gazelle') &&
                   gameState.swampSkipTurnForPiece?.pieceId === pieceInClickedSquare.id &&
                   gameState.swampSkipTurnForPiece?.player === 'human') {
             toast({ title: "Sumpfpause", description: `Diese ${pieceInClickedSquare.animal} ist diese Runde durch den Sumpf pausiert.`});
             messageForSelection = `Diese ${pieceInClickedSquare.animal} ist sumpf-pausiert. Wähle eine andere Figur.`;
        } else if (pieceMoves.length === 0) {
            toast({ title: "Keine Züge", description: `Diese ${pieceInClickedSquare.animal} hat keine gültigen Züge.` });
            messageForSelection = `Keine Züge für diese ${pieceInClickedSquare.animal}. Wähle eine andere Figur.`;
        }
         setGameState(prev => ({
            ...prev,
            selectedPieceId: pieceInClickedSquare.id,
            validMoves: pieceMoves,
            message: messageForSelection,
            swampSkipTurnForPiece: newSwampSkipTurnForPiece, 
         }));
    } else { 
        setGameState(prev => ({ ...prev, message: `${gameState.playerTwoName} ist am Zug. Wähle eine deiner Figuren.`, swampSkipTurnForPiece: newSwampSkipTurnForPiece }));
    }
  }, [gameState, calculateValidMoves, checkWinCondition, toast, processSpecialFieldEffects, isLoadingAI, colLabels]);

  const handleAiAnalyze = async () => {
    if (isLoadingAI) return;
    setIsLoadingAI(true);
    try {
      const boardString = getBoardString(gameState.board, gameState.pieces);
      const analysisResult = await analyzeGameState({
        boardState: boardString,
        playerOneName: gameState.playerOneName, // AI (Schwarz)
        playerTwoName: gameState.playerTwoName, // Spieler (Weiß)
      });
      toast({
        title: "KI-Spielanalyse",
        description: (
          <div className="text-xs">
            <p><strong>{gameState.playerOneName} (KI):</strong> {analysisResult.playerOneSummary}</p>
            <p><strong>{gameState.playerTwoName} (Du):</strong> {analysisResult.playerTwoSummary}</p>
            <p><strong>Gesamt:</strong> {analysisResult.overallAssessment}</p>
          </div>
        ),
        duration: 9000
      });
    } catch (error) {
      console.error("Error analyzing game state:", error);
      toast({ title: "KI-Fehler", description: "Spielzustand konnte nicht analysiert werden.", variant: "destructive"});
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleAiSuggest = async () => {
    if (isLoadingAI) return;
    setIsLoadingAI(true);
    try {
      const boardString = getBoardString(gameState.board, gameState.pieces);
      const currentTurnPlayerNameForSuggestion = gameState.currentPlayer === 'human' ? gameState.playerTwoName : gameState.playerOneName;
      const playerColorForSuggestion = gameState.currentPlayer === 'human' ? 'Weiß, Unten' : 'Schwarz, Oben';
      
      let playerTurnDescription = `${currentTurnPlayerNameForSuggestion} (${playerColorForSuggestion})`;
      
      if (gameState.lionMovedLastTurn === gameState.currentPlayer) {
        playerTurnDescription += ` (Löwe ist pausiert).`;
      }
      if (gameState.swampSkipTurnForPiece?.player === gameState.currentPlayer && 
          gameState.pieces[gameState.swampSkipTurnForPiece.pieceId]) {
        const pieceData = gameState.pieces[gameState.swampSkipTurnForPiece.pieceId];
        playerTurnDescription += ` (${pieceData.animal} bei (${colLabels[pieceData.position.col]}${BOARD_SIZE-pieceData.position.row}) ist sumpf-pausiert).`;
      }

      const suggestionResult = await suggestMove({
        boardState: boardString,
        playerTurn: playerTurnDescription,
      });
      const suggestionText = (suggestionResult as { suggestedMove: string }).suggestedMove;
      toast({ title: `KI-Vorschlag für ${currentTurnPlayerNameForSuggestion}`, description: suggestionText || "KI konnte keinen Vorschlag ermitteln."});
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      toast({ title: "KI-Fehler", description: "KI-Vorschlag konnte nicht erhalten werden.", variant: "destructive"});
    } finally {
      setIsLoadingAI(false);
    }
  };

  useEffect(() => {
    if (gameState.currentPlayer === 'ai' && !gameState.isGameOver && !isLoadingAI) {
      setIsLoadingAI(true);
      const performAiMove = async () => {
        await new Promise(resolve => setTimeout(resolve, 1500)); 

        let currentSwampSkipTurnForPieceAi = gameState.swampSkipTurnForPiece;
        if (currentSwampSkipTurnForPieceAi?.player === 'ai') {
            currentSwampSkipTurnForPieceAi = null;
        }

        let allAiMoves: { pieceId: string, move: {row: number, col: number}, piece: Piece, isCapture: boolean, capturedPieceAnimal?: AnimalType }[] = [];
        const aiPieceIds = Object.keys(gameState.pieces).filter(id => gameState.pieces[id].player === 'ai');

        for (const pieceId of aiPieceIds) {
          const piece = gameState.pieces[pieceId];
          const validMovesForPiece = calculateValidMoves(pieceId, gameState.board, gameState.pieces, gameState.lionMovedLastTurn, gameState.swampSkipTurnForPiece);

          for (const move of validMovesForPiece) {
            const targetSquare = gameState.board[move.row][move.col];
            let isCapture = false;
            let isValidFinalMove = true;
            let capturedPieceAnimal: AnimalType | undefined = undefined;

            if (targetSquare.pieceId) { 
                const targetPieceDetails = gameState.pieces[targetSquare.pieceId];
                if (targetPieceDetails.player === 'ai') { 
                    isValidFinalMove = false; 
                } else { 
                    capturedPieceAnimal = targetPieceDetails.animal;
                    if (targetPieceDetails.animal === 'lion' && !(piece.animal === 'lion' || piece.animal === 'giraffe')) {
                        isValidFinalMove = false;
                    }
                    if (piece.animal === 'gazelle' && targetPieceDetails.animal === 'lion') {
                        isValidFinalMove = false;
                    }
                    if (isValidFinalMove) isCapture = true;
                }
            }
            if (isValidFinalMove) {
              allAiMoves.push({ pieceId, move, piece, isCapture, capturedPieceAnimal });
            }
          }
        }
        
        let chosenMoveData = null;
        const captureMoves = allAiMoves.filter(m => m.isCapture);

        if (captureMoves.length > 0) {
          const lionCaptures = captureMoves.filter(m => m.capturedPieceAnimal === 'lion');
          const giraffeCaptures = captureMoves.filter(m => m.capturedPieceAnimal === 'giraffe');
          const gazelleCaptures = captureMoves.filter(m => m.capturedPieceAnimal === 'gazelle');

          if (lionCaptures.length > 0) chosenMoveData = lionCaptures[Math.floor(Math.random() * lionCaptures.length)];
          else if (giraffeCaptures.length > 0) chosenMoveData = giraffeCaptures[Math.floor(Math.random() * giraffeCaptures.length)];
          else if (gazelleCaptures.length > 0) chosenMoveData = gazelleCaptures[Math.floor(Math.random() * gazelleCaptures.length)];
          else chosenMoveData = captureMoves[Math.floor(Math.random() * captureMoves.length)]; 
        }

        if (!chosenMoveData && allAiMoves.length > 0) {
          const nonRiftMoves = allAiMoves.filter(m => gameState.board[m.move.row][m.move.col].terrain !== 'rift');
          if (nonRiftMoves.length > 0) {
            chosenMoveData = nonRiftMoves[Math.floor(Math.random() * nonRiftMoves.length)];
          } else { 
            chosenMoveData = allAiMoves[Math.floor(Math.random() * allAiMoves.length)];
          }
        }


        if (chosenMoveData) {
          const { pieceId: aiPieceIdToMove, move: aiMoveToMake, piece: aiSelectedPiece } = chosenMoveData;

          let newPieces = JSON.parse(JSON.stringify(gameState.pieces));
          let newBoard = gameState.board.map(r => r.map(s => ({ ...s } as Square)));
          let newAiPlayerCapturesHumanScore = { ...gameState.aiCapturedHumanScore };

          let currentLionMovedLastTurn = gameState.lionMovedLastTurn;
          if (aiSelectedPiece.animal === 'lion') {
              currentLionMovedLastTurn = 'ai';
          } else if (gameState.lionMovedLastTurn === 'ai') { 
             currentLionMovedLastTurn = null;
          }

          let moveMessage = "";
          const originalAiPiecePos = aiSelectedPiece.position;
          newBoard[originalAiPiecePos.row][originalAiPiecePos.col].pieceId = null;

          const targetSquareContentOriginalBoard = gameState.board[aiMoveToMake.row][aiMoveToMake.col]; 
          if (targetSquareContentOriginalBoard.pieceId) { 
            const capturedPieceOriginal = gameState.pieces[targetSquareContentOriginalBoard.pieceId];
            if (capturedPieceOriginal.player === 'human') { 
                delete newPieces[targetSquareContentOriginalBoard.pieceId];
                newAiPlayerCapturesHumanScore[capturedPieceOriginal.animal]++;
                moveMessage = `${gameState.playerOneName} ${aiSelectedPiece.animal} hat ${gameState.playerTwoName} ${capturedPieceOriginal.animal} geschlagen.`;
                toast({ title: "KI-Fang!", description: moveMessage, duration: 3000 });
            }
          }
          
          const effectResult = processSpecialFieldEffects(aiSelectedPiece.id, aiMoveToMake.row, aiMoveToMake.col, newBoard, newPieces);
          newBoard = effectResult.board;
          newPieces = effectResult.pieces; 

          const finalLandedSquare = newBoard[newPieces[aiSelectedPiece.id].position.row][newPieces[aiSelectedPiece.id].position.col];
          if ((aiSelectedPiece.animal === 'lion' || aiSelectedPiece.animal === 'gazelle') && finalLandedSquare.terrain === 'swamp') {
              currentSwampSkipTurnForPieceAi = { pieceId: aiSelectedPiece.id, player: 'ai' };
              const swampMessage = `${gameState.playerOneName} ${aiSelectedPiece.animal} landete auf einem Sumpf! Pausiert nächste Runde.`;
              if (!moveMessage) moveMessage = swampMessage; else moveMessage += ` ${swampMessage}`;
              toast({ title: "Sumpf!", description: swampMessage, duration: 3000 });
          }

          if (effectResult.messageUpdate && !moveMessage) moveMessage = effectResult.messageUpdate;
          else if (effectResult.messageUpdate && moveMessage && !moveMessage.includes(effectResult.messageUpdate)) moveMessage += " " + effectResult.messageUpdate;

          const winner = checkWinCondition(gameState.humanCapturedAIScore, newAiPlayerCapturesHumanScore);
          let nextPlayerTurn: PlayerType = 'human';
          let gameStatusMessage = winner
            ? `${winner === 'human' ? gameState.playerTwoName : gameState.playerOneName} gewinnt!`
            : `${gameState.playerTwoName} ist am Zug.`;

          if (!moveMessage && !winner) {
             const finalPos = newPieces[aiSelectedPiece.id].position;
             gameStatusMessage = `${gameState.playerOneName} ${aiSelectedPiece.animal} von (${colLabels[originalAiPiecePos.col]}${BOARD_SIZE-originalAiPiecePos.row}) nach (${colLabels[finalPos.col]}${BOARD_SIZE-finalPos.row}). ${gameStatusMessage}`;
          } else if (moveMessage && !winner) {
            gameStatusMessage = `${moveMessage} ${gameStatusMessage}`;
          } else if (moveMessage && winner) {
            gameStatusMessage = `${moveMessage} ${gameStatusMessage}`;
          }

          setGameState(prev => ({
            ...prev,
            board: newBoard,
            pieces: newPieces,
            currentPlayer: winner ? prev.currentPlayer : nextPlayerTurn,
            winner,
            isGameOver: !!winner,
            message: gameStatusMessage,
            aiCapturedHumanScore: newAiPlayerCapturesHumanScore,
            lionMovedLastTurn: currentLionMovedLastTurn,
            swampSkipTurnForPiece: currentSwampSkipTurnForPieceAi, 
          }));

        } else { 
           let currentLionMovedLastTurn = gameState.lionMovedLastTurn;
           if (gameState.lionMovedLastTurn === 'ai') { 
             currentLionMovedLastTurn = null; 
           }
          setGameState(prev => ({
            ...prev,
            currentPlayer: 'human',
            message: `${gameState.playerOneName} hat keine gültigen Züge. ${gameState.playerTwoName} ist am Zug.`,
            lionMovedLastTurn: currentLionMovedLastTurn, 
            swampSkipTurnForPiece: currentSwampSkipTurnForPieceAi, 
          }));
        }
        setIsLoadingAI(false);
      };
      performAiMove();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentPlayer, gameState.isGameOver, colLabels]); 

  const handleResetGame = useCallback(() => {
    setShowTutorial(true); 
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    if (gameState.isGameOver && !showTutorial) {
      toast({
        title: "Spiel vorbei!",
        description: `${gameState.winner === 'human' ? gameState.playerTwoName : gameState.playerOneName} gewinnt! Spiel wird in 3 Sekunden zurückgesetzt...`,
        duration: 3000,
      });
      timeoutId = setTimeout(() => {
        handleResetGame();
      }, 3000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [gameState.isGameOver, gameState.winner, gameState.playerOneName, gameState.playerTwoName, handleResetGame, toast, showTutorial]);

  if (showTutorial) {
    return <Tutorial onStartGame={handleStartGame} />;
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
      <header className="mb-6 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary tracking-tight">Savannah Chase</h1>
      </header>

      <main className="flex flex-col lg:flex-row gap-6 md:gap-8 w-full max-w-6xl">
        <section className="flex-grow flex flex-col items-center lg:items-start">
          <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto">
            <div className="grid grid-cols-[auto_1fr_auto] grid-rows-[auto_1fr_auto] gap-x-1 gap-y-0.5 items-center w-full">
              <div className="w-6 h-6"></div>
              <div className="flex justify-around items-center w-full">
                {colLabels.map((label) => (
                  <span key={`top-${label}`} className="text-xs font-medium text-muted-foreground flex-1 text-center h-6 flex items-center justify-center">
                    {label}
                  </span>
                ))}
              </div>
              <div className="w-6 h-6"></div>

              <div className="flex flex-col justify-around items-center h-full">
                {rowLabelsForDisplay.map((label) => (
                  <span key={`left-${label}`} className="text-xs font-medium text-muted-foreground flex-1 w-6 flex items-center justify-center">
                    {label}
                  </span>
                ))}
              </div>

              <GameBoard
                board={gameState.board}
                pieces={gameState.pieces}
                selectedPieceId={gameState.selectedPieceId}
                validMoves={gameState.validMoves}
                onSquareClick={handleSquareClick}
                currentPlayer={gameState.currentPlayer}
                isGameOver={gameState.isGameOver}
                getAnimalChar={getAnimalChar}
              />

              <div className="flex flex-col justify-around items-center h-full">
                {rowLabelsForDisplay.map((label) => (
                  <span key={`right-${label}`} className="text-xs font-medium text-muted-foreground flex-1 w-6 flex items-center justify-center">
                    {label}
                  </span>
                ))}
              </div>

              <div className="w-6 h-6"></div>
              <div className="flex justify-around items-center w-full">
                {colLabels.map((label) => (
                  <span key={`bottom-${label}`} className="text-xs font-medium text-muted-foreground flex-1 text-center h-6 flex items-center justify-center">
                    {label}
                  </span>
                ))}
              </div>
              <div className="w-6 h-6"></div>
            </div>
          </div>
          
           <div className="mt-4 text-center lg:text-left w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto">
            <p className={`text-lg font-medium p-3 rounded-md shadow ${gameState.isGameOver ? (gameState.winner === 'human' ? 'bg-green-600 text-white' : (gameState.winner === 'ai' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-black') ) : 'bg-card text-card-foreground'}`}>
              {gameState.message}
            </p>
          </div>
        </section>

        <aside className="w-full lg:w-80 xl:w-96 flex flex-col gap-6">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl text-primary">
                <BarChart2 size={28}/> Spielstatus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-base">
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">Am Zug:</span>
                <span className={`font-semibold flex items-center gap-1 ${gameState.currentPlayer === 'human' ? 'text-primary' : 'text-accent'}`}>
                  {gameState.currentPlayer === 'human' ? <User size={18}/> : <Cpu size={18}/>}
                  {gameState.currentPlayer === 'human' ? gameState.playerTwoName : gameState.playerOneName}
                </span>
              </div>
               {gameState.lionMovedLastTurn && (
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">Löwe Pausiert:</span>
                    <span className={`font-semibold ${gameState.lionMovedLastTurn === 'human' ? 'text-primary' : 'text-accent'}`}>
                        Löwe von {(gameState.lionMovedLastTurn === 'human' ? gameState.playerTwoName : gameState.playerOneName)} muss aussetzen.
                    </span>
                </div>
               )}
               {gameState.swampSkipTurnForPiece && gameState.swampSkipTurnForPiece.player === gameState.currentPlayer && gameState.pieces[gameState.swampSkipTurnForPiece.pieceId] && (
                 <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">Sumpfpause:</span>
                    <span className={`font-semibold ${gameState.swampSkipTurnForPiece.player === 'human' ? 'text-primary' : 'text-accent'}`}>
                        {gameState.pieces[gameState.swampSkipTurnForPiece.pieceId].animal.charAt(0).toUpperCase() + gameState.pieces[gameState.swampSkipTurnForPiece.pieceId].animal.slice(1)} von {gameState.swampSkipTurnForPiece.player === 'human' ? gameState.playerTwoName : gameState.playerOneName} ist pausiert.
                    </span>
                </div>
               )}
              {gameState.winner && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-muted-foreground">Gewinner:</span>
                  <span className="font-semibold text-green-600 flex items-center gap-1">
                    <Award size={18} className="text-yellow-500" />
                    {gameState.winner === 'human' ? gameState.playerTwoName : (gameState.winner === 'ai' ? gameState.playerOneName : 'N/A')}
                  </span>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Gefangen von {gameState.playerTwoName} (Dir):</h4>
                <ul className="list-disc list-inside text-xs text-muted-foreground">
                  <li>Gazellen: {gameState.humanCapturedAIScore.gazelle} / 5</li>
                  <li>Giraffen: {gameState.humanCapturedAIScore.giraffe} / 2</li>
                  <li>Löwen: {gameState.humanCapturedAIScore.lion} / 1</li>
                </ul>
              </div>
               <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Gefangen von {gameState.playerOneName} (KI):</h4>
                <ul className="list-disc list-inside text-xs text-muted-foreground">
                  <li>Gazellen: {gameState.aiCapturedHumanScore.gazelle} / 5</li>
                  <li>Giraffen: {gameState.aiCapturedHumanScore.giraffe} / 2</li>
                  <li>Löwen: {gameState.aiCapturedHumanScore.lion} / 1</li>
                </ul>
              </div>
              <Button onClick={handleResetGame} className="w-full" variant="outline" size="sm">Spiel zurücksetzen & Tutorial anzeigen</Button>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl text-primary">
                <Lightbulb size={28}/> KI-Unterstützung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleAiAnalyze} disabled={isLoadingAI || gameState.isGameOver} className="w-full" size="sm">
                {isLoadingAI ? 'KI beschäftigt...' : 'Spiel analysieren'}
              </Button>
              <Button
                onClick={handleAiSuggest}
                disabled={isLoadingAI || gameState.isGameOver}
                className="w-full"
                size="sm"
              >
                {isLoadingAI ? 'KI beschäftigt...' : 'KI-Zugvorschlag erhalten'}
              </Button>
              {isLoadingAI && <p className="text-sm text-muted-foreground text-center">KI denkt nach...</p>}
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}
