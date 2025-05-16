
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import GameBoard from '@/components/game/GameBoard';
import type { GameState, Piece, Board, PlayerType, AnimalType, Square, TerrainType, CapturedPieces } from '@/types/game';
import { BOARD_SIZE, TERRAIN_POSITIONS } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2, Cpu, User, Lightbulb, Award } from 'lucide-react';
import { analyzeGameState } from '@/ai/flows/analyze-game-state';
import { suggestMove } from '@/ai/flows/suggest-move';
import { useToast } from "@/hooks/use-toast";
import AnimalIcon from '@/components/icons/AnimalIcons';

// GDD Startaufstellung (0-indexed for 7x7):
// Human (Weiß, y=0/1): G(0,2), L(0,3), G(0,4) | Z(1,1), Z(1,2), Z(1,3), Z(1,4), Z(1,5)
// AI (Schwarz, y=6/5): G(6,2), L(6,3), G(6,4) | Z(5,1), Z(5,2), Z(5,3), Z(5,4), Z(5,5)
const initialPieces: Record<string, Piece> = {
  // Human Pieces
  'h_giraffe1': { id: 'h_giraffe1', animal: 'giraffe', player: 'human', position: { row: 0, col: 2 } }, // c1
  'h_lion1':    { id: 'h_lion1',    animal: 'lion',    player: 'human', position: { row: 0, col: 3 } }, // d1
  'h_giraffe2': { id: 'h_giraffe2', animal: 'giraffe', player: 'human', position: { row: 0, col: 4 } }, // e1
  'h_gazelle1': { id: 'h_gazelle1', animal: 'gazelle', player: 'human', position: { row: 1, col: 1 } }, // b2
  'h_gazelle2': { id: 'h_gazelle2', animal: 'gazelle', player: 'human', position: { row: 1, col: 2 } }, // c2
  'h_gazelle3': { id: 'h_gazelle3', animal: 'gazelle', player: 'human', position: { row: 1, col: 3 } }, // d2
  'h_gazelle4': { id: 'h_gazelle4', animal: 'gazelle', player: 'human', position: { row: 1, col: 4 } }, // e2
  'h_gazelle5': { id: 'h_gazelle5', animal: 'gazelle', player: 'human', position: { row: 1, col: 5 } }, // f2

  // AI Pieces
  'ai_giraffe1': { id: 'ai_giraffe1', animal: 'giraffe', player: 'ai', position: { row: 6, col: 2 } }, // c7
  'ai_lion1':    { id: 'ai_lion1',    animal: 'lion',    player: 'ai', position: { row: 6, col: 3 } }, // d7
  'ai_giraffe2': { id: 'ai_giraffe2', animal: 'giraffe', player: 'ai', position: { row: 6, col: 4 } }, // e7
  'ai_gazelle1': { id: 'ai_gazelle1', animal: 'gazelle', player: 'ai', position: { row: 5, col: 1 } }, // b6
  'ai_gazelle2': { id: 'ai_gazelle2', animal: 'gazelle', player: 'ai', position: { row: 5, col: 2 } }, // c6
  'ai_gazelle3': { id: 'ai_gazelle3', animal: 'gazelle', player: 'ai', position: { row: 5, col: 3 } }, // d6
  'ai_gazelle4': { id: 'ai_gazelle4', animal: 'gazelle', player: 'ai', position: { row: 5, col: 4 } }, // e6
  'ai_gazelle5': { id: 'ai_gazelle5', animal: 'gazelle', player: 'ai', position: { row: 5, col: 5 } }, // f6
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

  TERRAIN_POSITIONS.forEach(tp => {
    if (tp.pos.row < BOARD_SIZE && tp.pos.col < BOARD_SIZE) {
      board[tp.pos.row][tp.pos.col].terrain = tp.type;
    }
  });

  Object.values(pieces).forEach(p => {
    board[p.position.row][p.position.col].pieceId = p.id;
  });
  return board;
}

function initializeGameState(): GameState {
  const pieces = JSON.parse(JSON.stringify(initialPieces));
  const initialCapturedScore: CapturedPieces = { gazelle: 0, lion: 0, giraffe: 0 };
  return {
    board: createInitialBoard(pieces),
    pieces: pieces,
    currentPlayer: 'human',
    selectedPieceId: null,
    validMoves: [],
    winner: null,
    playerOneName: 'Human Player',
    playerTwoName: 'AI Opponent',
    humanCapturedAIScore: { ...initialCapturedScore },
    aiCapturedHumanScore: { ...initialCapturedScore },
    lionMovedLastTurn: null,
    isGameOver: false,
    message: "Human Player's turn. White to move.",
  };
}

function getAnimalChar(animal: AnimalType): string {
  switch(animal) {
    case 'gazelle': return 'Z'; // As per GDD
    case 'giraffe': return 'G'; // As per GDD
    case 'lion': return 'L';    // As per GDD
    default: return '?';
  }
}

function getTerrainChar(terrain: TerrainType): string {
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
      const terrainChar = getTerrainChar(square.terrain);
      return terrainChar !== '' ? terrainChar : '..';
    }).join(' ')
  ).join('\n');
}

export default function SavannahChasePage() {
  const [gameState, setGameState] = useState<GameState>(initializeGameState);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const { toast } = useToast();
  
  const checkWinCondition = useCallback((currentPieces: Record<string, Piece>, humanScore: CapturedPieces, aiScore: CapturedPieces): PlayerType | null => {
    // Win if opponent's Lion is captured
    if (humanScore.lion >= 1) return 'human'; // Human captured AI's Lion
    if (aiScore.lion >= 1) return 'ai';    // AI captured Human's Lion

    // Win if all 5 opponent's Gazelles are captured
    if (humanScore.gazelle >= 5) return 'human';
    if (aiScore.gazelle >= 5) return 'ai';
    
    return null;
  }, []);

  const calculateValidMoves = useCallback((pieceId: string, currentBoard: Board, currentPieces: Record<string, Piece>, currentPlayer: PlayerType, lionJustMovedPlayer: PlayerType | null): { row: number; col: number }[] => {
    const piece = currentPieces[pieceId];
    if (!piece || piece.player !== currentPlayer) return [];

    // Lion pause rule: If this player's lion moved last turn, it cannot move now.
    if (piece.animal === 'lion' && lionJustMovedPlayer === currentPlayer) {
      return [];
    }

    let moves: { row: number; col: number }[] = [];
    const { row: startRow, col: startCol } = piece.position;

    if (piece.animal === 'lion') {
      const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1], // Orthogonal
        [-1, -1], [-1, 1], [1, -1], [1, 1]  // Diagonal
      ];
      for (const [dr, dc] of directions) {
        for (let dist = 1; dist <= 3; dist++) {
          const r = startRow + dr * dist;
          const c = startCol + dc * dist;
          if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break; // Off board

          const targetSquare = currentBoard[r][c];
          if (targetSquare.pieceId) { // Square is occupied
            const targetPiece = currentPieces[targetSquare.pieceId];
            if (targetPiece.player !== currentPlayer) { // Opponent piece
              // Lion can be captured by Lion or Giraffe only.
              // This rule applies to the piece BEING CAPTURED.
              // So, when Lion calculates its moves, it can capture anything.
              // The restriction is on what can CAPTURE a Lion.
              moves.push({ row: r, col: c });
            }
            break; // Path blocked
          }
          moves.push({ row: r, col: c }); // Empty square
        }
      }
    } else if (piece.animal === 'giraffe') {
      const directions = [[-1,0], [1,0], [0,-1], [0,1]]; // Horizontal/Vertical
      for (const [dr, dc] of directions) {
        for (let dist = 1; dist <= 2; dist++) {
          const r = startRow + dr * dist;
          const c = startCol + dc * dist;
          if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;

          const targetSquare = currentBoard[r][c];
          if (targetSquare.terrain === 'hill') continue; // Giraffe cannot enter hill

          if (targetSquare.pieceId) {
            const targetPiece = currentPieces[targetSquare.pieceId];
            if (targetPiece.player !== currentPlayer) {
               moves.push({ row: r, col: c });
            }
            break; 
          }
          moves.push({ row: r, col: c });
        }
      }
    } else if (piece.animal === 'gazelle') {
      const forwardDir = currentPlayer === 'human' ? -1 : 1;
      // Movement: 1 field straight ahead
      const moveR = startRow + forwardDir;
      if (moveR >= 0 && moveR < BOARD_SIZE) {
        if (!currentBoard[moveR][startCol].pieceId) {
          moves.push({ row: moveR, col: startCol });
        }
      }
      // Capture: 1 field diagonally forward
      const captureCols = [startCol - 1, startCol + 1];
      for (const captureC of captureCols) {
        if (captureC >= 0 && captureC < BOARD_SIZE && moveR >=0 && moveR < BOARD_SIZE) {
          const targetSquare = currentBoard[moveR][captureC];
          if (targetSquare.pieceId) {
            const targetPiece = currentPieces[targetSquare.pieceId];
            if (targetPiece.player !== currentPlayer && targetPiece.animal !== 'lion') { // Gazelle cannot capture Lion
              moves.push({ row: moveR, col: captureC });
            }
          }
        }
      }
    }
    return moves;
  }, []);

  const processSpecialFieldEffects = useCallback((movedPiece: Piece, newBoard: Board, newPieces: Record<string, Piece>): { board: Board, pieces: Record<string, Piece>, messageUpdate?: string } => {
    let currentBoard = newBoard;
    let currentPieces = newPieces;
    let currentPosition = { ...movedPiece.position };
    let messageUpdate;

    const landedSquare = currentBoard[currentPosition.row][currentPosition.col];
    if (landedSquare.terrain === 'rift') {
        const riftRule = TERRAIN_POSITIONS.find(tp => tp.pos.row === currentPosition.row && tp.pos.col === currentPosition.col && tp.type === 'rift');
        if (riftRule && riftRule.direction) {
            messageUpdate = `${movedPiece.animal.charAt(0).toUpperCase() + movedPiece.animal.slice(1)} landed in a Rift! Pushed North.`;
            currentBoard[currentPosition.row][currentPosition.col].pieceId = null; // Vacate original rift square

            let pushedRow = currentPosition.row;
            let pushedCol = currentPosition.col;

            while(true) {
                pushedRow += riftRule.direction.dRow;
                pushedCol += riftRule.direction.dCol;

                if (pushedRow < 0 || pushedRow >= BOARD_SIZE || pushedCol < 0 || pushedCol >= BOARD_SIZE) { // Hit edge
                    currentPosition = { row: pushedRow - riftRule.direction.dRow, col: pushedCol - riftRule.direction.dCol };
                    break;
                }
                if (currentBoard[pushedRow][pushedCol].pieceId) { // Hit another piece
                    currentPosition = { row: pushedRow - riftRule.direction.dRow, col: pushedCol - riftRule.direction.dCol };
                    break;
                }
                // Keep pushing
                currentPosition = {row: pushedRow, col: pushedCol};
            }
            currentPieces[movedPiece.id] = { ...movedPiece, position: currentPosition };
            currentBoard[currentPosition.row][currentPosition.col].pieceId = movedPiece.id;
            toast({ title: "Rift!", description: messageUpdate });
        }
    }
    return { board: currentBoard, pieces: currentPieces, messageUpdate };
  }, [toast]);


  const handleSquareClick = useCallback((row: number, col: number) => {
    if (gameState.isGameOver || gameState.currentPlayer !== 'human') return;

    const clickedSquare = gameState.board[row][col];
    const pieceInSquare = clickedSquare.pieceId ? gameState.pieces[clickedSquare.pieceId] : null;

    if (gameState.selectedPieceId) {
      const selectedPiece = gameState.pieces[gameState.selectedPieceId];
      const isValidMove = gameState.validMoves.some(m => m.row === row && m.col === col);

      if (isValidMove) {
        let newPieces = { ...gameState.pieces };
        let newBoard = gameState.board.map(r => r.map(s => ({ ...s } as Square)));
        let newHumanScore = { ...gameState.humanCapturedAIScore };
        let newAiScore = { ...gameState.aiCapturedHumanScore };
        let newLionMovedLastTurn = gameState.lionMovedLastTurn;

        // Vacate old square
        newBoard[selectedPiece.position.row][selectedPiece.position.col].pieceId = null;
        
        // Handle capture
        let captureMessage = "";
        const targetSquare = newBoard[row][col];
        if (targetSquare.pieceId) {
          const capturedPiece = newPieces[targetSquare.pieceId];
          // Lion can only BE captured by Lion or Giraffe.
          // This check should be here: can selectedPiece capture capturedPiece?
          if (capturedPiece.animal === 'lion' && selectedPiece.animal !== 'lion' && selectedPiece.animal !== 'giraffe') {
             // Invalid capture: non-Lion/Giraffe trying to capture Lion
             toast({ title: "Invalid Move", description: `${selectedPiece.animal} cannot capture a Lion.`, variant: "destructive" });
             setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [] })); // Deselect
             return;
          }

          delete newPieces[targetSquare.pieceId]; // Remove captured piece
          captureMessage = `${selectedPiece.animal} captured ${capturedPiece.animal}!`;
          toast({ title: "Capture!", description: captureMessage});

          if (selectedPiece.player === 'human') { // Human captured AI piece
            newHumanScore[capturedPiece.animal]++;
          } else { // AI captured Human piece
            newAiScore[capturedPiece.animal]++;
          }
        }
        
        // Move selected piece
        newPieces[selectedPiece.id] = { ...selectedPiece, position: { row, col } };
        newBoard[row][col].pieceId = selectedPiece.id;

        // Lion pause rule
        if (selectedPiece.animal === 'lion') {
          newLionMovedLastTurn = selectedPiece.player;
        } else {
          newLionMovedLastTurn = null; // Reset if non-lion moved
        }

        // Process special field effects (like Kluft/Rift)
        const effectResult = processSpecialFieldEffects(newPieces[selectedPiece.id], newBoard, newPieces);
        newBoard = effectResult.board;
        newPieces = effectResult.pieces;
        if (effectResult.messageUpdate) {
          // message will be set below
        }
        
        const winner = checkWinCondition(newPieces, newHumanScore, newAiScore);
        let nextPlayer: PlayerType = gameState.currentPlayer === 'human' ? 'ai' : 'human';
        let message = winner 
          ? `${winner === 'human' ? gameState.playerOneName : gameState.playerTwoName} wins!` 
          : `${nextPlayer === 'human' ? gameState.playerOneName : gameState.playerTwoName}'s turn.`;
        
        if (newLionMovedLastTurn === nextPlayer && !winner) { // If next player's lion has to pause
           message += ` (${newPieces[nextPlayer === 'human' ? 'h_lion1' : 'ai_lion1'].animal} must pause)`;
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
          message,
          humanCapturedAIScore: newHumanScore,
          aiCapturedHumanScore: newAiScore,
          lionMovedLastTurn: newLionMovedLastTurn,
        }));

      } else { // Invalid move or selecting another piece
        if (pieceInSquare && pieceInSquare.player === 'human') {
           const pieceMoves = calculateValidMoves(pieceInSquare.id, gameState.board, gameState.pieces, 'human', gameState.lionMovedLastTurn);
            if (pieceMoves.length === 0 && pieceInSquare.animal === 'lion' && gameState.lionMovedLastTurn === 'human') {
                 toast({ title: "Lion Paused", description: "Your Lion must rest this turn." });
                 setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [] }));
            } else {
                 setGameState(prev => ({
                    ...prev,
                    selectedPieceId: pieceInSquare.id,
                    validMoves: pieceMoves,
                 }));
            }
        } else {
          setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [] }));
        }
      }
    } else if (pieceInSquare && pieceInSquare.player === 'human') { // No piece selected yet, selecting a human piece
        const pieceMoves = calculateValidMoves(pieceInSquare.id, gameState.board, gameState.pieces, 'human', gameState.lionMovedLastTurn);
        if (pieceMoves.length === 0 && pieceInSquare.animal === 'lion' && gameState.lionMovedLastTurn === 'human') {
             toast({ title: "Lion Paused", description: "Your Lion must rest this turn." });
        } else {
             setGameState(prev => ({
                ...prev,
                selectedPieceId: pieceInSquare.id,
                validMoves: pieceMoves,
             }));
        }
    }
  }, [gameState, calculateValidMoves, checkWinCondition, toast, processSpecialFieldEffects]);

  const handleAiAnalyze = async () => {
    setIsLoadingAI(true);
    try {
      const boardString = getBoardString(gameState.board, gameState.pieces);
      const analysisResult = await analyzeGameState({
        boardState: boardString,
        playerOneName: gameState.playerOneName,
        playerTwoName: gameState.playerTwoName,
      });
      // setGameState(prev => ({ ...prev, analysis: analysisResult })); // Analysis type changed
      toast({ title: "AI Analysis Complete", description: `${analysisResult.playerOneSummary}. ${analysisResult.playerTwoSummary}`});
    } catch (error) {
      console.error("Error analyzing game state:", error);
      toast({ title: "AI Error", description: "Could not analyze game state.", variant: "destructive"});
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleAiSuggest = async () => {
    setIsLoadingAI(true);
    try {
      const boardString = getBoardString(gameState.board, gameState.pieces);
      const suggestionResult = await suggestMove({
        boardState: boardString,
        playerTurn: gameState.currentPlayer === 'human' ? gameState.playerOneName : gameState.playerTwoName,
      });
      const suggestionText = (suggestionResult as { suggestedMove: string }).suggestedMove;
      // setGameState(prev => ({ ...prev, aiSuggestion: suggestionText })); // aiSuggestion type changed
      toast({ title: "AI Suggestion Ready", description: suggestionText || "AI has a suggestion."});
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
        await new Promise(resolve => setTimeout(resolve, 1500)); // GDD: 1.5s delay

        let allAiMoves: { pieceId: string, move: {row: number, col: number} }[] = [];
        const aiPieceIds = Object.keys(gameState.pieces).filter(id => gameState.pieces[id].player === 'ai');

        for (const pieceId of aiPieceIds) {
          const validMovesForPiece = calculateValidMoves(pieceId, gameState.board, gameState.pieces, 'ai', gameState.lionMovedLastTurn);
          validMovesForPiece.forEach(move => {
            // Additional check for capture rules from AI's perspective
            const targetSquare = gameState.board[move.row][move.col];
            if (targetSquare.pieceId) {
                const targetPieceDetails = gameState.pieces[targetSquare.pieceId];
                // AI Gazelle cannot capture Human Lion
                if (gameState.pieces[pieceId].animal === 'gazelle' && targetPieceDetails.animal === 'lion') {
                    return; // Skip this move
                }
                // Human Lion can only be captured by AI Lion or AI Giraffe
                if (targetPieceDetails.animal === 'lion' && targetPieceDetails.player === 'human' &&
                    gameState.pieces[pieceId].animal !== 'lion' && gameState.pieces[pieceId].animal !== 'giraffe') {
                    return; // Skip this move
                }
            }
            allAiMoves.push({ pieceId, move });
          });
        }

        if (allAiMoves.length > 0) {
          const randomMove = allAiMoves[Math.floor(Math.random() * allAiMoves.length)];
          const { pieceId: aiPieceIdToMove, move: aiMoveToMake } = randomMove;
          const aiSelectedPiece = gameState.pieces[aiPieceIdToMove];

          // Simulate AI move (similar to handleSquareClick logic)
          let newPieces = { ...gameState.pieces };
          let newBoard = gameState.board.map(r => r.map(s => ({ ...s } as Square)));
          let newHumanScore = { ...gameState.humanCapturedAIScore };
          let newAiScore = { ...gameState.aiCapturedHumanScore };
          let newLionMovedLastTurn = gameState.lionMovedLastTurn;

          newBoard[aiSelectedPiece.position.row][aiSelectedPiece.position.col].pieceId = null;
          
          let captureMessage = "";
          const targetSquare = newBoard[aiMoveToMake.row][aiMoveToMake.col];
          if (targetSquare.pieceId) {
            const capturedPiece = newPieces[targetSquare.pieceId];
            // Already pre-filtered invalid captures, but double-check just in case or for directness
            delete newPieces[targetSquare.pieceId];
            captureMessage = `AI ${aiSelectedPiece.animal} captured Human ${capturedPiece.animal}!`;
            toast({ title: "AI Capture!", description: captureMessage });
            newAiScore[capturedPiece.animal]++;
          }
          
          newPieces[aiSelectedPiece.id] = { ...aiSelectedPiece, position: { row: aiMoveToMake.row, col: aiMoveToMake.col } };
          newBoard[aiMoveToMake.row][aiMoveToMake.col].pieceId = aiSelectedPiece.id;

          if (aiSelectedPiece.animal === 'lion') {
            newLionMovedLastTurn = 'ai';
          } else {
             // if human lion moved last, and AI moves a non-lion, human lion is still paused for their next turn
            if (newLionMovedLastTurn !== 'human') newLionMovedLastTurn = null;
          }
          
          const effectResult = processSpecialFieldEffects(newPieces[aiSelectedPiece.id], newBoard, newPieces);
          newBoard = effectResult.board;
          newPieces = effectResult.pieces;
          
          const winner = checkWinCondition(newPieces, newHumanScore, newAiScore);
          let nextPlayer: PlayerType = 'human';
          let message = winner 
            ? `${winner === 'human' ? gameState.playerOneName : gameState.playerTwoName} wins!` 
            : `${gameState.playerOneName}'s turn.`;
          
          if (effectResult.messageUpdate && !winner) {
              message = `${effectResult.messageUpdate} ${message}`;
          } else if (!winner) {
              message = `AI moved ${aiSelectedPiece.animal} from (${aiSelectedPiece.position.row},${aiSelectedPiece.position.col}) to (${aiMoveToMake.row},${aiMoveToMake.col}). ${message}`;
          }

          if (newLionMovedLastTurn === nextPlayer && !winner) {
             message += ` (Your Lion must pause)`;
          }

          setGameState(prev => ({
            ...prev,
            board: newBoard,
            pieces: newPieces,
            currentPlayer: winner ? prev.currentPlayer : nextPlayer,
            winner,
            isGameOver: !!winner,
            message,
            humanCapturedAIScore: newHumanScore,
            aiCapturedHumanScore: newAiScore,
            lionMovedLastTurn: newLionMovedLastTurn,
          }));

        } else {
          // AI has no valid moves
          setGameState(prev => ({ ...prev, currentPlayer: 'human', message: "AI has no moves. Human Player's turn."}));
        }
        setIsLoadingAI(false);
      };
      performAiMove();
    }
  }, [gameState.currentPlayer, gameState.isGameOver, gameState.board, gameState.pieces, calculateValidMoves, checkWinCondition, toast, isLoadingAI, gameState.playerOneName, gameState.playerTwoName, gameState.lionMovedLastTurn, gameState.humanCapturedAIScore, gameState.aiCapturedHumanScore, processSpecialFieldEffects]);

  const handleResetGame = useCallback(() => {
    setGameState(initializeGameState());
    toast({ title: "Game Reset", description: "A new game has started."});
  }, [toast]);

  // Auto-reset on game over
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (gameState.isGameOver) {
      timeoutId = setTimeout(() => {
        handleResetGame();
      }, 3000); // 3 seconds delay
    }
    return () => clearTimeout(timeoutId);
  }, [gameState.isGameOver, handleResetGame]);


  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
      <header className="mb-6 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary tracking-tight">Savannah Chase</h1>
        <p className="text-muted-foreground text-lg sm:text-xl">A 7x7 board game of strategy and capture!</p>
      </header>

      <main className="flex flex-col lg:flex-row gap-6 md:gap-8 w-full max-w-6xl"> {/* Adjusted max-width for 7x7 board */}
        <section className="flex-grow flex flex-col items-center lg:items-start">
          <GameBoard
            board={gameState.board}
            pieces={gameState.pieces}
            selectedPieceId={gameState.selectedPieceId}
            validMoves={gameState.validMoves}
            onSquareClick={handleSquareClick}
            currentPlayer={gameState.currentPlayer}
            isGameOver={gameState.isGameOver}
          />
           <div className="mt-4 text-center lg:text-left w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl">
            <p className={`text-lg font-medium p-3 rounded-md shadow ${gameState.isGameOver ? (gameState.winner === 'human' ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'bg-card text-card-foreground'}`}>
              {gameState.message}
            </p>
          </div>
        </section>

        <aside className="w-full lg:w-80 xl:w-96 flex flex-col gap-6"> {/* Adjusted width for aside */}
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl text-primary">
                <BarChart2 size={28}/> Game Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-base"> {/* Adjusted text size */}
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">Turn:</span>
                <span className={`font-semibold flex items-center gap-1 ${gameState.currentPlayer === 'human' ? 'text-primary' : 'text-accent'}`}>
                  {gameState.currentPlayer === 'human' ? <User size={18}/> : <Cpu size={18}/>}
                  {gameState.currentPlayer === 'human' ? gameState.playerOneName : gameState.playerTwoName}
                </span>
              </div>
              {gameState.winner && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-muted-foreground">Winner:</span>
                  <span className="font-semibold text-green-600 flex items-center gap-1">
                    <Award size={18} className="text-yellow-500" />
                    {gameState.winner === 'human' ? gameState.playerOneName : gameState.playerTwoName}
                  </span>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                <p>Human Captures: {gameState.humanCapturedAIScore.gazelle} Z, {gameState.humanCapturedAIScore.giraffe} G, {gameState.humanCapturedAIScore.lion} L</p>
                <p>AI Captures: {gameState.aiCapturedHumanScore.gazelle} Z, {gameState.aiCapturedHumanScore.giraffe} G, {gameState.aiCapturedHumanScore.lion} L</p>
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
                {isLoadingAI ? 'Analyzing...' : 'Analyze Game State'}
              </Button>
              <Button onClick={handleAiSuggest} disabled={isLoadingAI || gameState.isGameOver || gameState.currentPlayer === 'ai'} className="w-full" size="sm">
                {isLoadingAI ? 'Suggesting...' : 'Get AI Move Suggestion'}
              </Button>
              {/* Removed direct display of analysis/suggestion from state as it's now in toast */}
              {isLoadingAI && <p className="text-sm text-muted-foreground text-center">AI is thinking...</p>}
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}
