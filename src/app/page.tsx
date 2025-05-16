
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import GameBoard from '@/components/game/GameBoard';
import type { GameState, Piece, Board, PlayerType, AnimalType, Square, TerrainType, CapturedPieces } from '@/types/game';
import { BOARD_SIZE, FIXED_TERRAIN_POSITIONS, NUM_RANDOM_SWAMPS, NUM_RANDOM_HILLS } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2, Cpu, User, Lightbulb, Award } from 'lucide-react';
import { analyzeGameState } from '@/ai/flows/analyze-game-state';
import { suggestMove } from '@/ai/flows/suggest-move';
import { useToast } from "@/hooks/use-toast";

// AI is White (Top), Human is Black (Bottom)
// Startaufstellung (GDD v0.4, 7x7, 0-indexed):
// Weiß (AI, y=0/1): G(0,2), L(0,3), G(0,4) | Z(1,1), Z(1,2), Z(1,3), Z(1,4), Z(1,5)
// Schwarz (Human, y=6/5): G(6,2), L(6,3), G(6,4) | Z(5,1), Z(5,2), Z(5,3), Z(5,4), Z(5,5)
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

  // Place fixed terrains (central Rift)
  FIXED_TERRAIN_POSITIONS.forEach(tp => {
    if (tp.pos.row >= 0 && tp.pos.row < BOARD_SIZE && tp.pos.col >= 0 && tp.pos.col < BOARD_SIZE) {
      board[tp.pos.row][tp.pos.col].terrain = tp.type;
      occupiedByFixedTerrainOrPiece.add(`${tp.pos.row}-${tp.pos.col}`);
    }
  });

  // Mark piece starting positions as occupied for terrain placement
  Object.values(pieces).forEach(p => {
    occupiedByFixedTerrainOrPiece.add(`${p.position.row}-${p.position.col}`);
  });

  // Generate list of available cells for random terrains
  const availableCellsForRandomTerrain: {row: number, col: number}[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
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
  
  // Place random Swamps
  for (let i = 0; i < NUM_RANDOM_SWAMPS && i < availableCellsForRandomTerrain.length; i++) {
    const cell = availableCellsForRandomTerrain[i];
    board[cell.row][cell.col].terrain = 'swamp';
  }

  // Place random Hills (start from where swamps left off in the shuffled list)
  for (let i = 0; i < NUM_RANDOM_HILLS && (i + NUM_RANDOM_SWAMPS) < availableCellsForRandomTerrain.length; i++) {
    const cell = availableCellsForRandomTerrain[i + NUM_RANDOM_SWAMPS];
    board[cell.row][cell.col].terrain = 'hill';
  }

  // Place pieces on the board
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
        const playerChar = piece.player === 'human' ? 'H' : 'A'; 
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
    playerOneName: 'AI Opponent',     // White, Top, plays as 'ai'
    playerTwoName: 'Human Player',   // Black, Bottom, plays as 'human'
    humanCapturedAIScore: { ...initialCapturedScore }, // Pieces AI (White, 'ai') lost
    aiCapturedHumanScore: { ...initialCapturedScore },   // Pieces Human (Black, 'human') lost
    lionMovedLastTurn: null,
    isGameOver: false,
    message: "Human Player's turn (Black). Select a piece.",
  };
}

export default function SavannahChasePage() {
  const [gameState, setGameState] = useState<GameState>(initializeGameState);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const { toast } = useToast();
  
  const checkWinCondition = useCallback((
    currentPieces: Record<string, Piece>, 
    humanPlayerCapturesAiScore: CapturedPieces, // Human (Black) captures AI (White) pieces
    aiPlayerCapturesHumanScore: CapturedPieces  // AI (White) captures Human (Black) pieces
  ): PlayerType | null => {
    // Human (Black, 'human') wins if they capture AI's (White, 'ai') Lion or 5 AI Gazelles
    if (humanPlayerCapturesAiScore.lion >= 1) return 'human'; 
    if (humanPlayerCapturesAiScore.gazelle >= 5) return 'human';

    // AI (White, 'ai') wins if they capture Human's (Black, 'human') Lion or 5 Human Gazelles
    if (aiPlayerCapturesHumanScore.lion >= 1) return 'ai'; 
    if (aiPlayerCapturesHumanScore.gazelle >= 5) return 'ai';
    
    return null;
  }, []);

  const calculateValidMoves = useCallback((
    pieceId: string, 
    currentBoard: Board, 
    currentPieces: Record<string, Piece>, 
    lionPlayerCurrentlyPaused: PlayerType | null 
  ): { row: number; col: number }[] => {
    const piece = currentPieces[pieceId];
    if (!piece) return [];

    if (piece.animal === 'lion' && lionPlayerCurrentlyPaused === piece.player) {
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
        for (let dist = 1; dist <= 3; dist++) {
          const r = startRow + dr * dist;
          const c = startCol + dc * dist;
          if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;

          const targetSquare = currentBoard[r][c];
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
          if (targetSquare.terrain === 'hill') continue; 

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
      // Human (Black, 'human') starts bottom (Gazelles row 5), moves towards smaller row indices (up).
      // AI (White, 'ai') starts top (Gazelles row 1), moves towards larger row indices (down).
      const forwardDir = piece.player === 'human' ? -1 : 1; 
      
      const moveR = startRow + forwardDir;
      if (moveR >= 0 && moveR < BOARD_SIZE) {
        if (!currentBoard[moveR][startCol].pieceId) {
          moves.push({ row: moveR, col: startCol });
        }
      }
      
      const captureCols = [startCol - 1, startCol + 1];
      for (const captureC of captureCols) {
        if (captureC >= 0 && captureC < BOARD_SIZE && moveR >=0 && moveR < BOARD_SIZE) {
          const targetSquare = currentBoard[moveR][captureC];
          if (targetSquare.pieceId) {
            const targetPiece = currentPieces[targetSquare.pieceId];
            if (targetPiece.player !== piece.player && targetPiece.animal !== 'lion') {
              moves.push({ row: moveR, col: captureC });
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

    // Temporarily remove piece from original board position for rift check
    // This ensures the piece itself is not an obstacle for its own rift movement.
    const originalPos = currentPieces[movedPieceId].position;
    newBoard[originalPos.row][originalPos.col].pieceId = null;
    
    const landedSquare = newBoard[finalPos.row][finalPos.col];
    
    if (landedSquare.terrain === 'rift') {
        const riftRule = FIXED_TERRAIN_POSITIONS.find(tp => tp.pos.row === finalPos.row && tp.pos.col === finalPos.col && tp.type === 'rift');
        const pushDirection = riftRule?.direction || { dRow: -1, dCol: 0 }; 
        
        const pieceOwnerName = pieceToUpdate.player === 'human' ? gameState.playerTwoName : gameState.playerOneName;
        const pieceAnimalName = pieceToUpdate.animal.charAt(0).toUpperCase() + pieceToUpdate.animal.slice(1);
        messageUpdate = `${pieceOwnerName} ${pieceAnimalName} landed in a Rift! Pushed North.`;
        toast({ title: "Rift!", description: messageUpdate });
        
        let pushedRow = finalPos.row;
        let pushedCol = finalPos.col;

        // eslint-disable-next-line no-constant-condition
        while(true) {
            pushedRow += pushDirection.dRow; 
            pushedCol += pushDirection.dCol;

            if (pushedRow < 0 || pushedRow >= BOARD_SIZE || pushedCol < 0 || pushedCol >= BOARD_SIZE) { 
                finalPos = { row: pushedRow - pushDirection.dRow, col: pushedCol - pushDirection.dCol };
                break;
            }
            if (newBoard[pushedRow][pushedCol].pieceId) { 
                finalPos = { row: pushedRow - pushDirection.dRow, col: pushedCol - pushDirection.dCol };
                break;
            }
            finalPos = {row: pushedRow, col: pushedCol};
        }
    }
    
    newPieces[movedPieceId] = { ...pieceToUpdate, position: finalPos };
    newBoard[finalPos.row][finalPos.col].pieceId = movedPieceId;
    
    return { board: newBoard, pieces: newPieces, finalPosition: finalPos, messageUpdate };
  }, [toast, gameState.playerOneName, gameState.playerTwoName]);


  const handleSquareClick = useCallback((row: number, col: number) => {
    if (gameState.isGameOver || isLoadingAI || gameState.currentPlayer !== 'human') return;

    const clickedSquare = gameState.board[row][col];
    const pieceInClickedSquare = clickedSquare.pieceId ? gameState.pieces[clickedSquare.pieceId] : null;

    if (gameState.selectedPieceId) {
      const selectedPiece = gameState.pieces[gameState.selectedPieceId];
      const isValidMoveTarget = gameState.validMoves.some(m => m.row === row && m.col === col);

      if (isValidMoveTarget) {
        let newPieces = JSON.parse(JSON.stringify(gameState.pieces));
        let newBoard = gameState.board.map(r => r.map(s => ({ ...s } as Square)));
        let newHumanPlayerCapturesAiScore = { ...gameState.humanCapturedAIScore };
        let newAiPlayerCapturesHumanScore = { ...gameState.aiCapturedHumanScore };
        
        let currentLionMovedLastTurn = gameState.lionMovedLastTurn;
        if (selectedPiece.animal === 'lion') {
            currentLionMovedLastTurn = selectedPiece.player; 
        } else if (currentLionMovedLastTurn === selectedPiece.player) {
            // If another piece moved, the lion of current player is no longer considered to have moved "last turn"
            // for the purpose of its *next* turn's pause.
            // The pause happens on the player's turn *after* the lion moved.
            // If the lion moved, currentLionMovedLastTurn = 'human'. 
            // Next human turn, if human moves another piece, lion is still paused.
            // After this other piece moves, currentLionMovedLastTurn should become null.
            // No, this is simpler: if lion moved, its player is recorded.
            // On that player's *next* turn, their lion is paused. After that turn concludes, it's reset.
        }


        let moveMessage = "";
        newBoard[selectedPiece.position.row][selectedPiece.position.col].pieceId = null;
        
        const targetSquareContentOriginalBoard = gameState.board[row][col];
        if (targetSquareContentOriginalBoard.pieceId) {
          const capturedPieceOriginal = gameState.pieces[targetSquareContentOriginalBoard.pieceId];
          
          if (capturedPieceOriginal.animal === 'lion' && !(selectedPiece.animal === 'lion' || selectedPiece.animal === 'giraffe')) {
             toast({ title: "Invalid Capture", description: `Your ${selectedPiece.animal} cannot capture a Lion. Only Lions or Giraffes can.`, variant: "destructive" });
             setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [] }));
             return;
          }
          
          delete newPieces[targetSquareContentOriginalBoard.pieceId];
          // Human (Black, 'human') captures AI (White, 'ai') piece
          newHumanPlayerCapturesAiScore[capturedPieceOriginal.animal]++;
          const capturerName = gameState.playerTwoName; // Human
          const capturedOwnerName = gameState.playerOneName; // AI
          moveMessage = `${capturerName} ${selectedPiece.animal} captured ${capturedOwnerName} ${capturedPieceOriginal.animal}.`;
          toast({ title: "Capture!", description: moveMessage });
        }
        
        newPieces[selectedPiece.id] = { ...selectedPiece, position: { row, col } };

        const effectResult = processSpecialFieldEffects(selectedPiece.id, row, col, newBoard, newPieces);
        newBoard = effectResult.board; 
        newPieces = effectResult.pieces; 
        
        if (effectResult.messageUpdate && !moveMessage) moveMessage = effectResult.messageUpdate;
        else if (effectResult.messageUpdate) moveMessage += " " + effectResult.messageUpdate;
        
        const winner = checkWinCondition(newPieces, newHumanPlayerCapturesAiScore, newAiPlayerCapturesHumanScore);
        let nextPlayer: PlayerType = 'ai';
        let gameStatusMessage = winner 
          ? `${winner === 'human' ? gameState.playerTwoName : gameState.playerOneName} wins!`
          : `${gameState.playerOneName}'s turn (White).`;
        
        // Reset lionMovedLastTurn if the player whose lion was paused just made a move (any move)
        let nextLionMovedLastTurn = currentLionMovedLastTurn;
        if (currentLionMovedLastTurn === 'human') { // Human's lion was paused for this turn
            nextLionMovedLastTurn = null; // Unpause for Human's *next* turn
        }

        if (winner && nextLionMovedLastTurn === 'human') { // If human wins on their paused lion's turn, still clear it
            nextLionMovedLastTurn = null;
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
          aiCapturedHumanScore: newAiPlayerCapturesHumanScore,
          lionMovedLastTurn: nextLionMovedLastTurn,
        }));

      } else { 
        if (pieceInClickedSquare && pieceInClickedSquare.player === 'human') {
            if (pieceInClickedSquare.id === gameState.selectedPieceId) {
                 setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [], message: `${gameState.playerTwoName}'s turn (Black). Select a piece.` }));
            } else {
                const pieceMoves = calculateValidMoves(pieceInClickedSquare.id, gameState.board, gameState.pieces, gameState.lionMovedLastTurn === 'human' ? 'human' : null);
                let messageForSelection = `Selected ${pieceInClickedSquare.animal}. Choose a destination.`;
                if (pieceMoves.length === 0) {
                    if (pieceInClickedSquare.animal === 'lion' && gameState.lionMovedLastTurn === 'human') {
                        toast({ title: "Lion Paused", description: "Your Lion must rest this turn." });
                        messageForSelection = "Lion is paused. Select another piece.";
                    } else {
                        messageForSelection = `This ${pieceInClickedSquare.animal} has no valid moves. Select another piece.`;
                    }
                }
                setGameState(prev => ({
                    ...prev,
                    selectedPieceId: pieceInClickedSquare.id,
                    validMoves: pieceMoves,
                    message: messageForSelection,
                }));
            }
        } else { 
          setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [], message: `Invalid move. ${gameState.playerTwoName}'s turn (Black). Select a piece.` }));
        }
      }
    } else if (pieceInClickedSquare && pieceInClickedSquare.player === 'human') {
        const pieceMoves = calculateValidMoves(pieceInClickedSquare.id, gameState.board, gameState.pieces, gameState.lionMovedLastTurn === 'human' ? 'human' : null);
        let messageForSelection = `Selected ${pieceInClickedSquare.animal}. Highlighting valid moves.`;
        if (pieceMoves.length === 0) {
            if (pieceInClickedSquare.animal === 'lion' && gameState.lionMovedLastTurn === 'human') {
                 toast({ title: "Lion Paused", description: "Your Lion must rest this turn." });
                 messageForSelection = "Lion is paused. Select another piece.";
            } else {
                toast({ title: "No Moves", description: `This ${pieceInClickedSquare.animal} has no valid moves.` });
                messageForSelection = `No moves for this ${pieceInClickedSquare.animal}. Select another piece.`;
            }
        }
         setGameState(prev => ({
            ...prev,
            selectedPieceId: pieceInClickedSquare.id,
            validMoves: pieceMoves,
            message: messageForSelection,
         }));
    } else {
        setGameState(prev => ({ ...prev, message: `${gameState.playerTwoName}'s turn (Black). Select one of your pieces.` }));
    }
  }, [gameState, calculateValidMoves, checkWinCondition, toast, processSpecialFieldEffects, isLoadingAI]);

  const handleAiAnalyze = async () => {
    if (isLoadingAI) return;
    setIsLoadingAI(true);
    try {
      const boardString = getBoardString(gameState.board, gameState.pieces);
      const analysisResult = await analyzeGameState({
        boardState: boardString,
        playerOneName: gameState.playerOneName, // AI (White)
        playerTwoName: gameState.playerTwoName, // Human (Black)
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
      const suggestionResult = await suggestMove({
        boardState: boardString,
        playerTurn: `${currentTurnPlayerName} (${gameState.currentPlayer === 'human' ? 'Black, Bottom' : 'White, Top'})`,
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

        let allAiMoves: { pieceId: string, move: {row: number, col: number}, piece: Piece }[] = [];
        const aiPieceIds = Object.keys(gameState.pieces).filter(id => gameState.pieces[id].player === 'ai');
        
        const isAiLionPausedThisTurn = gameState.lionMovedLastTurn === 'ai';

        for (const pieceId of aiPieceIds) {
          const piece = gameState.pieces[pieceId];
          const validMovesForPiece = calculateValidMoves(pieceId, gameState.board, gameState.pieces, isAiLionPausedThisTurn ? 'ai' : null);
          
          for (const move of validMovesForPiece) {
            const targetSquare = gameState.board[move.row][move.col];
            let isValidFinalMove = true; 
            if (targetSquare.pieceId) { 
                const targetPieceDetails = gameState.pieces[targetSquare.pieceId];
                if (targetPieceDetails.player === 'ai') { 
                    isValidFinalMove = false; 
                }
                if (targetPieceDetails.animal === 'lion' && targetPieceDetails.player === 'human' &&
                    !(piece.animal === 'lion' || piece.animal === 'giraffe')) {
                    isValidFinalMove = false;
                }
            }
            if (isValidFinalMove) {
              allAiMoves.push({ pieceId, move, piece });
            }
          }
        }
        
        let nextLionMovedLastTurnState = gameState.lionMovedLastTurn;

        if (allAiMoves.length > 0) {
          const randomMoveData = allAiMoves[Math.floor(Math.random() * allAiMoves.length)];
          const { pieceId: aiPieceIdToMove, move: aiMoveToMake, piece: aiSelectedPiece } = randomMoveData;

          let newPieces = JSON.parse(JSON.stringify(gameState.pieces));
          let newBoard = gameState.board.map(r => r.map(s => ({ ...s } as Square)));
          let newHumanPlayerCapturesAiScore = { ...gameState.humanCapturedAIScore };
          let newAiPlayerCapturesHumanScore = { ...gameState.aiCapturedHumanScore };

          if (aiSelectedPiece.animal === 'lion') {
              nextLionMovedLastTurnState = 'ai'; 
          } else if (nextLionMovedLastTurnState === 'ai') {
             // If AI's lion was paused for this turn, and AI moved another piece,
             // then for AI's *next* turn, its lion is unpaused.
             nextLionMovedLastTurnState = null;
          }
          
          let moveMessage = "";
          newBoard[aiSelectedPiece.position.row][aiSelectedPiece.position.col].pieceId = null;
          
          const targetSquareContentOriginalBoard = gameState.board[aiMoveToMake.row][aiMoveToMake.col];
          if (targetSquareContentOriginalBoard.pieceId) {
            const capturedPieceOriginal = gameState.pieces[targetSquareContentOriginalBoard.pieceId];
            delete newPieces[targetSquareContentOriginalBoard.pieceId];
            newAiPlayerCapturesHumanScore[capturedPieceOriginal.animal]++; // AI (White) captures a Human (Black) piece
            const capturerName = gameState.playerOneName; // AI
            const capturedOwnerName = gameState.playerTwoName; // Human
            moveMessage = `${capturerName} ${aiSelectedPiece.animal} captured ${capturedOwnerName} ${capturedPieceOriginal.animal}.`;
            toast({ title: "AI Capture!", description: moveMessage });
          }
          
          newPieces[aiSelectedPiece.id] = { ...aiSelectedPiece, position: { row: aiMoveToMake.row, col: aiMoveToMake.col } };

          const effectResult = processSpecialFieldEffects(aiSelectedPiece.id, aiMoveToMake.row, aiMoveToMake.col, newBoard, newPieces);
          newBoard = effectResult.board;
          newPieces = effectResult.pieces;
          
          if (effectResult.messageUpdate && !moveMessage) moveMessage = effectResult.messageUpdate;
          else if (effectResult.messageUpdate) moveMessage += " " + effectResult.messageUpdate;
          
          const winner = checkWinCondition(newPieces, newHumanPlayerCapturesAiScore, newAiPlayerCapturesHumanScore);
          let nextPlayerTurn: PlayerType = 'human';
          let gameStatusMessage = winner 
            ? `${winner === 'human' ? gameState.playerTwoName : gameState.playerOneName} wins!` 
            : `${gameState.playerTwoName}'s turn (Black).`;

          if (!moveMessage && !winner) {
             const movedPieceOriginalPos = gameState.pieces[aiSelectedPiece.id].position;
             gameStatusMessage = `${gameState.playerOneName} ${aiSelectedPiece.animal} from (${movedPieceOriginalPos.row},${movedPieceOriginalPos.col}) to (${effectResult.finalPosition.row},${effectResult.finalPosition.col}). ${gameStatusMessage}`;
          } else if (moveMessage && !winner) {
            gameStatusMessage = `${moveMessage} ${gameStatusMessage}`;
          }
           if (winner && nextLionMovedLastTurnState === 'ai') { // If AI wins on its paused lion's turn, still clear it
             nextLionMovedLastTurnState = null;
           }


          setGameState(prev => ({
            ...prev,
            board: newBoard,
            pieces: newPieces,
            currentPlayer: winner ? prev.currentPlayer : nextPlayerTurn,
            winner,
            isGameOver: !!winner,
            message: gameStatusMessage,
            humanCapturedAIScore: newHumanPlayerCapturesAiScore,
            aiCapturedHumanScore: newAiPlayerCapturesHumanScore,
            lionMovedLastTurn: nextLionMovedLastTurnState,
          }));

        } else { 
          // AI has no moves, its lion pause state still needs to advance if it was paused
           if (nextLionMovedLastTurnState === 'ai') {
             nextLionMovedLastTurnState = null;
           }
          setGameState(prev => ({ 
            ...prev, 
            currentPlayer: 'human', 
            message: `${gameState.playerOneName} (AI) has no valid moves. ${gameState.playerTwoName}'s turn (Black).`,
            lionMovedLastTurn: nextLionMovedLastTurnState,
          }));
        }
        setIsLoadingAI(false);
      };
      performAiMove();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentPlayer, gameState.isGameOver, gameState.lionMovedLastTurn]);

  const handleResetGame = useCallback(() => {
    setGameState(initializeGameState());
    toast({ title: "Game Reset", description: "A new game has started. Black to move."});
  }, [toast]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    if (gameState.isGameOver) {
      timeoutId = setTimeout(() => {
        handleResetGame();
      }, 3000); 
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [gameState.isGameOver, handleResetGame]);

  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
      <header className="mb-6 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary tracking-tight">Savannah Chase</h1>
        <p className="text-muted-foreground text-lg sm:text-xl">A 7x7 board game of strategy and capture! (GDD v0.4)</p>
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
               {gameState.lionMovedLastTurn && ( // Display if a lion is currently paused
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">Lion Paused:</span>
                    <span className={`font-semibold ${gameState.lionMovedLastTurn === 'human' ? 'text-accent' : 'text-primary'}`}>
                        {(gameState.lionMovedLastTurn === 'human' ? gameState.playerTwoName : gameState.playerOneName)}'s Lion must rest.
                    </span>
                </div>
               )}
              {gameState.winner && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-muted-foreground">Winner:</span>
                  <span className="font-semibold text-green-600 flex items-center gap-1">
                    <Award size={18} className="text-yellow-500" />
                    {gameState.winner === 'human' ? gameState.playerTwoName : gameState.playerOneName}
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
              <Button onClick={handleResetGame} className="w-full" variant="outline" size="sm">Reset Game</Button>
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
