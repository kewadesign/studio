
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import GameBoard from '@/components/game/GameBoard';
import type { GameState, Piece, Board, PlayerType, AnimalType, Square, TerrainType, CapturedPieces, RiftDirection } from '@/types/game';
import { BOARD_SIZE, NUM_RANDOM_SWAMPS, NUM_RANDOM_HILLS, NUM_RANDOM_RIFTS } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2, Cpu, User, Lightbulb, Award } from 'lucide-react';
import { analyzeGameState } from '@/ai/flows/analyze-game-state';
import { suggestMove } from '@/ai/flows/suggest-move';
import { useToast } from "@/hooks/use-toast";
import Tutorial from '@/components/game/Tutorial';

// GDD v0.4: 7x7 board. Player One (AI, White, Top), Player Two (Human, Black, Bottom)
// Startaufstellung (0-indexed, Player One (AI, White) on rows 0/1, Player Two (Human, Black) on rows 6/5):
// Player One (AI, White, 'ai'): G(0,2), L(0,3), G(0,4) | Z(1,1), Z(1,2), Z(1,3), Z(1,4), Z(1,5)
// Player Two (Human, Black, 'human'): G(6,2), L(6,3), G(6,4) | Z(5,1), Z(5,2), Z(5,3), Z(5,4), Z(5,5)

const initialPieces: Record<string, Piece> = {
  // AI Pieces (Player One - White, Top) - Player 'ai'
  'ai_giraffe1': { id: 'ai_giraffe1', animal: 'giraffe', player: 'ai', position: { row: 0, col: 2 } },
  'ai_lion1':    { id: 'ai_lion1',    animal: 'lion',    player: 'ai', position: { row: 0, col: 3 } },
  'ai_giraffe2': { id: 'ai_giraffe2', animal: 'giraffe', player: 'ai', position: { row: 0, col: 4 } },
  'ai_gazelle1': { id: 'ai_gazelle1', animal: 'gazelle', player: 'ai', position: { row: 1, col: 1 } },
  'ai_gazelle2': { id: 'ai_gazelle2', animal: 'gazelle', player: 'ai', position: { row: 1, col: 2 } },
  'ai_gazelle3': { id: 'ai_gazelle3', animal: 'gazelle', player: 'ai', position: { row: 1, col: 3 } },
  'ai_gazelle4': { id: 'ai_gazelle4', animal: 'gazelle', player: 'ai', position: { row: 1, col: 4 } },
  'ai_gazelle5': { id: 'ai_gazelle5', animal: 'gazelle', player: 'ai', position: { row: 1, col: 5 } },

  // Human Pieces (Player Two - Black, Bottom) - Player 'human'
  'h_giraffe1': { id: 'h_giraffe1', animal: 'giraffe', player: 'human', position: { row: 6, col: 2 } },
  'h_lion1':    { id: 'h_lion1',    animal: 'lion',    player: 'human', position: { row: 6, col: 3 } },
  'h_giraffe2': { id: 'h_giraffe2', animal: 'giraffe', player: 'human', position: { row: 6, col: 4 } },
  'h_gazelle1': { id: 'h_gazelle1', animal: 'gazelle', player: 'human', position: { row: 5, col: 1 } },
  'h_gazelle2': { id: 'h_gazelle2', animal: 'gazelle', player: 'human', position: { row: 5, col: 2 } },
  'h_gazelle3': { id: 'h_gazelle3', animal: 'gazelle', player: 'human', position: { row: 5, col: 3 } },
  'h_gazelle4': { id: 'h_gazelle4', animal: 'gazelle', player: 'human', position: { row: 5, col: 4 } },
  'h_gazelle5': { id: 'h_gazelle5', animal: 'gazelle', player: 'human', position: { row: 5, col: 5 } },
};

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

  // Restricted rows for random terrain (player start rows: 0,1 for AI; 5,6 for Human)
  const restrictedRowsForRandomTerrain = [0, 1, 5, 6];

  const availableCellsForRandomTerrain: {row: number, col: number}[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (restrictedRowsForRandomTerrain.includes(r)) continue;
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
        const playerChar = piece.player === 'ai' ? 'W' : 'B'; // AI=White, Human=Black
        const animalChar = getAnimalChar(piece.animal);
        return `${playerChar}${animalChar}`;
      }
      const terrainChar = getTerrainCharForBoardString(square.terrain);
      return terrainChar !== '' ? terrainChar : '..';
    }).join(' ')
  ).join('\n');
}

function initializeGameState(): GameState {
  const piecesCopy = JSON.parse(JSON.stringify(initialPieces));
  const initialCapturedScore: CapturedPieces = { gazelle: 0, lion: 0, giraffe: 0 };
  return {
    board: createInitialBoard(piecesCopy),
    pieces: piecesCopy,
    currentPlayer: 'human', // Human (Black, Bottom) starts
    selectedPieceId: null,
    validMoves: [],
    winner: null,
    playerOneName: 'AI Opponent (White)',
    playerTwoName: 'Human Player (Black)',
    humanCapturedAIScore: { ...initialCapturedScore },
    aiCapturedHumanScore: { ...initialCapturedScore },
    lionMovedLastTurn: null,
    swampSkipTurnForPiece: null,
    isGameOver: false,
    message: "Human Player's turn (Black). Select a piece.",
  };
}

export default function SavannahChasePage() {
  const [gameState, setGameState] = useState<GameState>(initializeGameState);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const { toast } = useToast();

  const handleStartGame = () => {
    setShowTutorial(false);
    setGameState(initializeGameState());
  };

  const checkWinCondition = useCallback((
    humanPlayerCapturesAiScore: CapturedPieces,
    aiPlayerCapturesHumanScore: CapturedPieces
  ): PlayerType | null => {
    if (humanPlayerCapturesAiScore.lion >= 1 || humanPlayerCapturesAiScore.gazelle >= 5) return 'human';
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
        [-1, 0], [1, 0], [0, -1], [0, 1], // Orthogonal
        [-1, -1], [-1, 1], [1, -1], [1, 1] // Diagonal
      ];
      for (const [dr, dc] of directions) {
        for (let dist = 1; dist <= 2; dist++) { // Lion moves 1-2 squares (GDD v0.4)
          const r = startRow + dr * dist;
          const c = startCol + dc * dist;

          if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break; 

          const targetSquare = currentBoard[r][c];
          if (targetSquare.terrain === 'hill') continue; // Lion cannot enter Hill

          if (targetSquare.pieceId) {
            const targetPiece = currentPieces[targetSquare.pieceId];
            if (targetPiece.player !== piece.player) { 
              if (targetPiece.animal === 'lion' && !(piece.animal === 'lion' || piece.animal === 'giraffe')) {
                 // This lion cannot capture the other lion
              } else {
                moves.push({ row: r, col: c });
              }
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
          if (targetSquare.terrain === 'swamp') continue; // Giraffe cannot enter Swamp

          // Giraffe cannot jump over a rift for a 2-square move
          if (dist === 2) {
            const intermediateRow = startRow + dr;
            const intermediateCol = startCol + dc;
            if (currentBoard[intermediateRow][intermediateCol].terrain === 'rift') {
              continue; // Cannot jump over rift
            }
          }
          // Giraffes CAN enter Hills - no 'hill' terrain check here for Giraffes

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
      const forwardDir = piece.player === 'human' ? -1 : 1; // Human (Black, Bottom) Gazelles move decreasing row index

      // Move 1 square forward
      const moveR = startRow + forwardDir;
      if (moveR >= 0 && moveR < BOARD_SIZE) {
        if (currentBoard[moveR][startCol].terrain === 'hill') {
          // Gazelle cannot enter Hill
        } else if (!currentBoard[moveR][startCol].pieceId) {
          moves.push({ row: moveR, col: startCol });
        }
      }

      // Capture 1 square diagonally forward
      const captureCols = [startCol - 1, startCol + 1];
      for (const captureC of captureCols) {
        const captureR = startRow + forwardDir;
        if (captureC >= 0 && captureC < BOARD_SIZE && captureR >=0 && captureR < BOARD_SIZE) {
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
        messageUpdate = `${pieceOwnerName} ${pieceAnimalName} landed in a Rift! Being pushed.`;
        toast({ title: "Rift!", description: messageUpdate, duration: 3000 });

        let currentPushRow = finalPos.row;
        let currentPushCol = finalPos.col;
        
        if (originalPos.row !== finalPos.row || originalPos.col !== finalPos.col) {
            newBoard[originalPos.row][originalPos.col].pieceId = null;
        }

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
            finalPos = {row: currentPushRow, col: currentPushCol};
        }
    }

    if (originalPos.row !== finalPos.row || originalPos.col !== finalPos.col) {
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
            currentLionMovedLastTurn = selectedPiece.player; // 'human'
        } else if (gameState.lionMovedLastTurn === 'human') { 
            currentLionMovedLastTurn = null;
        }

        let moveMessage = "";

        const targetSquareContentOriginalBoard = gameState.board[row][col];
        if (targetSquareContentOriginalBoard.pieceId) {
          const capturedPieceOriginal = gameState.pieces[targetSquareContentOriginalBoard.pieceId];
          if (capturedPieceOriginal.animal === 'lion' && !(selectedPiece.animal === 'lion' || selectedPiece.animal === 'giraffe')) {
             toast({ title: "Invalid Capture", description: `Your ${selectedPiece.animal} cannot capture a Lion. Only a Lion or Giraffe can.`, variant: "destructive", duration: 4000 });
             setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [] }));
             return;
          }
          delete newPieces[targetSquareContentOriginalBoard.pieceId];
          newHumanPlayerCapturesAiScore[capturedPieceOriginal.animal]++;
          moveMessage = `${gameState.playerTwoName} ${selectedPiece.animal} captured ${gameState.playerOneName} ${capturedPieceOriginal.animal}.`;
          toast({ title: "Capture!", description: moveMessage, duration: 3000 });
        }

        const effectResult = processSpecialFieldEffects(selectedPiece.id, row, col, newBoard, newPieces);
        newBoard = effectResult.board;
        newPieces = effectResult.pieces;

        const finalLandedSquare = newBoard[newPieces[selectedPiece.id].position.row][newPieces[selectedPiece.id].position.col];
        if ((selectedPiece.animal === 'lion' || selectedPiece.animal === 'gazelle') && finalLandedSquare.terrain === 'swamp') {
            newSwampSkipTurnForPiece = { pieceId: selectedPiece.id, player: 'human' }; 
            const swampMessage = `${gameState.playerTwoName} ${selectedPiece.animal} landed on a Swamp! Will pause its next move.`;
            if (!moveMessage) moveMessage = swampMessage; else moveMessage += ` ${swampMessage}`;
            toast({ title: "Swamp!", description: swampMessage, duration: 3000 });
        }


        if (effectResult.messageUpdate && !moveMessage) moveMessage = effectResult.messageUpdate;
        else if (effectResult.messageUpdate && moveMessage && !moveMessage.includes(effectResult.messageUpdate)) moveMessage += " " + effectResult.messageUpdate;

        const winner = checkWinCondition(newHumanPlayerCapturesAiScore, gameState.aiCapturedHumanScore);
        let nextPlayer: PlayerType = 'ai';
        let gameStatusMessage = winner
          ? `${winner === 'human' ? gameState.playerTwoName : gameState.playerOneName} wins!`
          : `${gameState.playerOneName}'s turn (White).`;

        if (!moveMessage && !winner) {
             const movedPieceOriginalPos = gameState.pieces[selectedPiece.id].position;
             const finalPos = newPieces[selectedPiece.id].position;
             gameStatusMessage = `${gameState.playerTwoName} ${selectedPiece.animal} from (${movedPieceOriginalPos.row},${movedPieceOriginalPos.col}) to (${finalPos.row},${finalPos.col}). ${gameStatusMessage}`;
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
                 setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [], message: `${gameState.playerTwoName}'s turn (Black). Select a piece.` }));
            } else { 
                const pieceMoves = calculateValidMoves(pieceInClickedSquare.id, gameState.board, gameState.pieces, gameState.lionMovedLastTurn, newSwampSkipTurnForPiece);
                let messageForSelection = `Selected ${pieceInClickedSquare.animal}. Choose a destination.`;

                if (pieceInClickedSquare.animal === 'lion' && gameState.lionMovedLastTurn === 'human') {
                    toast({ title: "Lion Paused", description: "Your Lion must rest this turn." });
                    messageForSelection = "Lion is paused. Select another piece.";
                } else if ((pieceInClickedSquare.animal === 'lion' || pieceInClickedSquare.animal === 'gazelle') &&
                           gameState.swampSkipTurnForPiece?.pieceId === pieceInClickedSquare.id && 
                           gameState.swampSkipTurnForPiece?.player === 'human') {
                    toast({ title: "Swamp Pause", description: `This ${pieceInClickedSquare.animal} is paused by the swamp this turn.`});
                    messageForSelection = `This ${pieceInClickedSquare.animal} is swamp-paused. Select another piece.`;
                } else if (pieceMoves.length === 0) {
                    toast({ title: "No Moves", description: `This ${pieceInClickedSquare.animal} has no valid moves.` });
                    messageForSelection = `This ${pieceInClickedSquare.animal} has no valid moves. Select another piece.`;
                }
                setGameState(prev => ({
                    ...prev,
                    selectedPieceId: pieceInClickedSquare.id,
                    validMoves: pieceMoves,
                    message: messageForSelection,
                }));
            }
        } else { 
          setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [], message: `Invalid move. ${gameState.playerTwoName}'s turn (Black). Select a piece.`}));
        }
      }
    } else if (pieceInClickedSquare && pieceInClickedSquare.player === 'human') { 
        const pieceMoves = calculateValidMoves(pieceInClickedSquare.id, gameState.board, gameState.pieces, gameState.lionMovedLastTurn, newSwampSkipTurnForPiece);
        let messageForSelection = `Selected ${pieceInClickedSquare.animal}. Highlighting valid moves.`;

        if (pieceInClickedSquare.animal === 'lion' && gameState.lionMovedLastTurn === 'human') {
             toast({ title: "Lion Paused", description: "Your Lion must rest this turn." });
             messageForSelection = "Lion is paused. Select another piece.";
        } else if ((pieceInClickedSquare.animal === 'lion' || pieceInClickedSquare.animal === 'gazelle') &&
                   newSwampSkipTurnForPiece?.pieceId === pieceInClickedSquare.id && 
                   newSwampSkipTurnForPiece?.player === 'human') {
             toast({ title: "Swamp Pause", description: `This ${pieceInClickedSquare.animal} is paused by the swamp this turn.`});
             messageForSelection = `This ${pieceInClickedSquare.animal} is swamp-paused. Select another piece.`;
        } else if (pieceMoves.length === 0) {
            toast({ title: "No Moves", description: `This ${pieceInClickedSquare.animal} has no valid moves.` });
            messageForSelection = `No moves for this ${pieceInClickedSquare.animal}. Select another piece.`;
        }
         setGameState(prev => ({
            ...prev,
            selectedPieceId: pieceInClickedSquare.id,
            validMoves: pieceMoves,
            message: messageForSelection,
            swampSkipTurnForPiece: newSwampSkipTurnForPiece, 
         }));
    } else { 
        setGameState(prev => ({ ...prev, message: `${gameState.playerTwoName}'s turn (Black). Select one of your pieces.`, swampSkipTurnForPiece: newSwampSkipTurnForPiece }));
    }
  }, [gameState, calculateValidMoves, checkWinCondition, toast, processSpecialFieldEffects, isLoadingAI]);

  const handleAiAnalyze = async () => {
    if (isLoadingAI) return;
    setIsLoadingAI(true);
    try {
      const boardString = getBoardString(gameState.board, gameState.pieces);
      const analysisResult = await analyzeGameState({
        boardState: boardString,
        playerOneName: gameState.playerOneName,
        playerTwoName: gameState.playerTwoName,
      });
      toast({
        title: "AI Game Analysis",
        description: (
          <div className="text-xs">
            <p><strong>{gameState.playerOneName} (AI):</strong> {analysisResult.playerOneSummary}</p>
            <p><strong>{gameState.playerTwoName} (Human):</strong> {analysisResult.playerTwoSummary}</p>
            <p><strong>Overall:</strong> {analysisResult.overallAssessment}</p>
          </div>
        ),
        duration: 9000
      });
    } catch (error) {
      console.error("Error analyzing game state:", error);
      toast({ title: "AI Error", description: "Could not analyze game state.", variant: "destructive"});
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleAiSuggest = async () => {
    if (isLoadingAI) return;
    setIsLoadingAI(true);
    try {
      const boardString = getBoardString(gameState.board, gameState.pieces);
      const currentTurnPlayerName = gameState.currentPlayer === 'human' ? gameState.playerTwoName : gameState.playerOneName;
      let playerTurnDescription = `${currentTurnPlayerName} (${gameState.currentPlayer === 'human' ? 'Black, Bottom' : 'White, Top'})`;
      if (gameState.lionMovedLastTurn === gameState.currentPlayer) {
        playerTurnDescription += ` (Lion is paused).`;
      }
      if (gameState.swampSkipTurnForPiece?.player === gameState.currentPlayer && gameState.pieces[gameState.swampSkipTurnForPiece.pieceId]) {
        playerTurnDescription += ` (${gameState.pieces[gameState.swampSkipTurnForPiece.pieceId].animal} at (${gameState.pieces[gameState.swampSkipTurnForPiece.pieceId].position.row},${gameState.pieces[gameState.swampSkipTurnForPiece.pieceId].position.col}) is swamp-paused).`;
      }

      const suggestionResult = await suggestMove({
        boardState: boardString,
        playerTurn: playerTurnDescription,
      });
      const suggestionText = (suggestionResult as { suggestedMove: string }).suggestedMove;
      toast({ title: `AI Suggestion for ${currentTurnPlayerName}`, description: suggestionText || "AI could not determine a suggestion."});
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      toast({ title: "AI Error", description: "Could not get AI suggestion.", variant: "destructive"});
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
          const validMovesForPiece = calculateValidMoves(pieceId, gameState.board, gameState.pieces, gameState.lionMovedLastTurn, currentSwampSkipTurnForPieceAi);

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
          // Prefer non-Kluft moves if possible, if no capture is available
          const nonKluftMoves = allAiMoves.filter(m => gameState.board[m.move.row][m.move.col].terrain !== 'rift');
          if (nonKluftMoves.length > 0) {
            chosenMoveData = nonKluftMoves[Math.floor(Math.random() * nonKluftMoves.length)];
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

          const targetSquareContentOriginalBoard = gameState.board[aiMoveToMake.row][aiMoveToMake.col];
          if (targetSquareContentOriginalBoard.pieceId) {
            const capturedPieceOriginal = gameState.pieces[targetSquareContentOriginalBoard.pieceId];
            if (capturedPieceOriginal.player === 'human') { 
                delete newPieces[targetSquareContentOriginalBoard.pieceId];
                newAiPlayerCapturesHumanScore[capturedPieceOriginal.animal]++;
                moveMessage = `${gameState.playerOneName} ${aiSelectedPiece.animal} captured ${gameState.playerTwoName} ${capturedPieceOriginal.animal}.`;
                toast({ title: "AI Capture!", description: moveMessage, duration: 3000 });
            }
          }

          const effectResult = processSpecialFieldEffects(aiSelectedPiece.id, aiMoveToMake.row, aiMoveToMake.col, newBoard, newPieces);
          newBoard = effectResult.board;
          newPieces = effectResult.pieces;

          const finalLandedSquare = newBoard[newPieces[aiSelectedPiece.id].position.row][newPieces[aiSelectedPiece.id].position.col];
          if ((aiSelectedPiece.animal === 'lion' || aiSelectedPiece.animal === 'gazelle') && finalLandedSquare.terrain === 'swamp') {
              currentSwampSkipTurnForPieceAi = { pieceId: aiSelectedPiece.id, player: 'ai' }; 
              const swampMessage = `${gameState.playerOneName} ${aiSelectedPiece.animal} landed on a Swamp! Will pause its next move.`;
              if (!moveMessage) moveMessage = swampMessage; else moveMessage += ` ${swampMessage}`;
              toast({ title: "Swamp!", description: swampMessage, duration: 3000 });
          }


          if (effectResult.messageUpdate && !moveMessage) moveMessage = effectResult.messageUpdate;
          else if (effectResult.messageUpdate && moveMessage && !moveMessage.includes(effectResult.messageUpdate)) moveMessage += " " + effectResult.messageUpdate;

          const winner = checkWinCondition(gameState.humanCapturedAIScore, newAiPlayerCapturesHumanScore);
          let nextPlayerTurn: PlayerType = 'human';
          let gameStatusMessage = winner
            ? `${winner === 'human' ? gameState.playerTwoName : gameState.playerOneName} wins!`
            : `${gameState.playerTwoName}'s turn (Black).`;

          if (!moveMessage && !winner) {
             const movedPieceOriginalPos = gameState.pieces[aiSelectedPiece.id].position;
             const finalPos = newPieces[aiSelectedPiece.id].position;
             gameStatusMessage = `${gameState.playerOneName} ${aiSelectedPiece.animal} from (${movedPieceOriginalPos.row},${movedPieceOriginalPos.col}) to (${finalPos.row},${finalPos.col}). ${gameStatusMessage}`;
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
            message: `${gameState.playerOneName} (AI) has no valid moves. ${gameState.playerTwoName}'s turn (Black).`,
            lionMovedLastTurn: currentLionMovedLastTurn,
            swampSkipTurnForPiece: currentSwampSkipTurnForPieceAi, 
          }));
        }
        setIsLoadingAI(false);
      };
      performAiMove();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentPlayer, gameState.isGameOver]); 

  const handleResetGame = useCallback(() => {
    setShowTutorial(true); 
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    if (gameState.isGameOver && !showTutorial) {
      toast({
        title: "Game Over!",
        description: `${gameState.winner === 'human' ? gameState.playerTwoName : gameState.playerOneName} wins! Resetting in 3 seconds...`,
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
           <div className="mt-4 text-center lg:text-left w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl">
            <p className={`text-lg font-medium p-3 rounded-md shadow ${gameState.isGameOver ? (gameState.winner === 'human' ? 'bg-green-600 text-white' : (gameState.winner === 'ai' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-black') ) : 'bg-card text-card-foreground'}`}>
              {gameState.message}
            </p>
          </div>
        </section>

        <aside className="w-full lg:w-80 xl:w-96 flex flex-col gap-6">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl text-primary">
                <BarChart2 size={28}/> Game Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-base">
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">Turn:</span>
                <span className={`font-semibold flex items-center gap-1 ${gameState.currentPlayer === 'human' ? 'text-accent' : 'text-primary'}`}>
                  {gameState.currentPlayer === 'human' ? <User size={18}/> : <Cpu size={18}/>}
                  {gameState.currentPlayer === 'human' ? gameState.playerTwoName : gameState.playerOneName}
                </span>
              </div>
               {gameState.lionMovedLastTurn && (
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">Lion Paused:</span>
                    <span className={`font-semibold ${gameState.lionMovedLastTurn === 'human' ? 'text-accent' : 'text-primary'}`}>
                        {(gameState.lionMovedLastTurn === 'human' ? gameState.playerTwoName : gameState.playerOneName)}'s Lion must rest.
                    </span>
                </div>
               )}
               {gameState.swampSkipTurnForPiece && gameState.swampSkipTurnForPiece.player === gameState.currentPlayer && gameState.pieces[gameState.swampSkipTurnForPiece.pieceId] && (
                 <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">Swamp Pause:</span>
                    <span className={`font-semibold ${gameState.swampSkipTurnForPiece.player === 'human' ? 'text-accent' : 'text-primary'}`}>
                        {gameState.pieces[gameState.swampSkipTurnForPiece.pieceId].animal.charAt(0).toUpperCase() + gameState.pieces[gameState.swampSkipTurnForPiece.pieceId].animal.slice(1)} of {gameState.swampSkipTurnForPiece.player === 'human' ? gameState.playerTwoName : gameState.playerOneName} is paused.
                    </span>
                </div>
               )}
              {gameState.winner && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-muted-foreground">Winner:</span>
                  <span className="font-semibold text-green-600 flex items-center gap-1">
                    <Award size={18} className="text-yellow-500" />
                    {gameState.winner === 'human' ? gameState.playerTwoName : (gameState.winner === 'ai' ? gameState.playerOneName : 'N/A')}
                  </span>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Captured by {gameState.playerTwoName} (Black):</h4>
                <ul className="list-disc list-inside text-xs text-muted-foreground">
                  <li>Gazelles: {gameState.humanCapturedAIScore.gazelle} / 5</li>
                  <li>Giraffes: {gameState.humanCapturedAIScore.giraffe}</li>
                  <li>Lions: {gameState.humanCapturedAIScore.lion} / 1</li>
                </ul>
              </div>
               <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Captured by {gameState.playerOneName} (White):</h4>
                <ul className="list-disc list-inside text-xs text-muted-foreground">
                  <li>Gazelles: {gameState.aiCapturedHumanScore.gazelle} / 5</li>
                  <li>Giraffes: {gameState.aiCapturedHumanScore.giraffe}</li>
                  <li>Lions: {gameState.aiCapturedHumanScore.lion} / 1</li>
                </ul>
              </div>
              <Button onClick={handleResetGame} className="w-full" variant="outline" size="sm">Reset Game & Show Tutorial</Button>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl text-primary">
                <Lightbulb size={28}/> AI Assistance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleAiAnalyze} disabled={isLoadingAI || gameState.isGameOver} className="w-full" size="sm">
                {isLoadingAI ? 'AI Busy...' : 'Analyze Game State'}
              </Button>
              <Button
                onClick={handleAiSuggest}
                disabled={isLoadingAI || gameState.isGameOver}
                className="w-full"
                size="sm"
              >
                {isLoadingAI ? 'AI Busy...' : 'Get AI Move Suggestion'}
              </Button>
              {isLoadingAI && <p className="text-sm text-muted-foreground text-center">AI is thinking...</p>}
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}
