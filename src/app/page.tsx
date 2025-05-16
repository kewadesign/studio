
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

// GDD Startaufstellung (0-indexed for 7x7):
// Human (Weiß, y=0/1): G(0,2), L(0,3), G(0,4) | Z(1,1), Z(1,2), Z(1,3), Z(1,4), Z(1,5)
// AI (Schwarz, y=6/5): G(6,2), L(6,3), G(6,4) | Z(5,1), Z(5,2), Z(5,3), Z(5,4), Z(5,5)
// Piece IDs: h_ for human, ai_ for AI. animalNameNumber.
const initialPieces: Record<string, Piece> = {
  // Human Pieces (Player One)
  'h_giraffe1': { id: 'h_giraffe1', animal: 'giraffe', player: 'human', position: { row: 0, col: 2 } }, // c1
  'h_lion1':    { id: 'h_lion1',    animal: 'lion',    player: 'human', position: { row: 0, col: 3 } }, // d1
  'h_giraffe2': { id: 'h_giraffe2', animal: 'giraffe', player: 'human', position: { row: 0, col: 4 } }, // e1
  'h_gazelle1': { id: 'h_gazelle1', animal: 'gazelle', player: 'human', position: { row: 1, col: 1 } }, // b2
  'h_gazelle2': { id: 'h_gazelle2', animal: 'gazelle', player: 'human', position: { row: 1, col: 2 } }, // c2
  'h_gazelle3': { id: 'h_gazelle3', animal: 'gazelle', player: 'human', position: { row: 1, col: 3 } }, // d2
  'h_gazelle4': { id: 'h_gazelle4', animal: 'gazelle', player: 'human', position: { row: 1, col: 4 } }, // e2
  'h_gazelle5': { id: 'h_gazelle5', animal: 'gazelle', player: 'human', position: { row: 1, col: 5 } }, // f2

  // AI Pieces (Player Two)
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
    if (tp.pos.row >= 0 && tp.pos.row < BOARD_SIZE && tp.pos.col >= 0 && tp.pos.col < BOARD_SIZE) {
      board[tp.pos.row][tp.pos.col].terrain = tp.type;
    }
  });

  Object.values(pieces).forEach(p => {
    board[p.position.row][p.position.col].pieceId = p.id;
  });
  return board;
}

export function getAnimalChar(animal: AnimalType): string {
  switch(animal) {
    case 'gazelle': return 'Z'; // As per GDD
    case 'giraffe': return 'G'; // As per GDD
    case 'lion': return 'L';    // As per GDD
    default: return '?';
  }
}

function getTerrainCharForBoardString(terrain: TerrainType): string {
  switch (terrain) {
    case 'rift': return 'K';
    case 'swamp': return 'S';
    case 'hill': return 'H';
    default: return ''; // Represent 'none' as empty or '..' if no piece
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
      // If terrain has a char, use it. Otherwise, use '..' for empty non-special squares.
      return terrainChar !== '' ? terrainChar : '..';
    }).join(' ')
  ).join('\n');
}


function initializeGameState(): GameState {
  const piecesCopy = JSON.parse(JSON.stringify(initialPieces)); // Deep copy
  const initialCapturedScore: CapturedPieces = { gazelle: 0, lion: 0, giraffe: 0 };
  return {
    board: createInitialBoard(piecesCopy),
    pieces: piecesCopy,
    currentPlayer: 'human',
    selectedPieceId: null,
    validMoves: [],
    winner: null,
    playerOneName: 'Human Player', // White
    playerTwoName: 'AI Opponent',  // Black
    humanCapturedAIScore: { ...initialCapturedScore }, // AI pieces captured by Human
    aiCapturedHumanScore: { ...initialCapturedScore },   // Human pieces captured by AI
    lionMovedLastTurn: null, // null, 'human', or 'ai'
    isGameOver: false,
    message: "Human Player's turn (White). Select a piece.",
  };
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
    
    // Check if a player has no valid moves (stalemate-like, but GDD implies game continues if possible)
    // This is a more complex check, for now, only explicit win conditions are checked.
    
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
              // Lion can be captured by Lion or Giraffe only (checked on capture, not move calc)
              moves.push({ row: r, col: c });
            }
            break; // Path blocked if any piece is there
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
          if (targetSquare.terrain === 'hill') continue; // Giraffe cannot enter hill (GDD rule)

          if (targetSquare.pieceId) {
            const targetPiece = currentPieces[targetSquare.pieceId];
            if (targetPiece.player !== currentPlayer) { // Opponent piece
               moves.push({ row: r, col: c });
            }
            break; // Path blocked
          }
          moves.push({ row: r, col: c }); // Empty square
        }
      }
    } else if (piece.animal === 'gazelle') {
      const forwardDir = currentPlayer === 'human' ? -1 : 1; // Human moves from row 1 to 0; AI from row 5 to 6
      
      // Movement: 1 field straight ahead (GDD rule)
      const moveR = startRow + forwardDir;
      if (moveR >= 0 && moveR < BOARD_SIZE) {
        if (!currentBoard[moveR][startCol].pieceId) { // Can only move to empty square
          moves.push({ row: moveR, col: startCol });
        }
      }
      // Capture: 1 field diagonally forward (GDD rule)
      const captureCols = [startCol - 1, startCol + 1];
      for (const captureC of captureCols) {
        if (captureC >= 0 && captureC < BOARD_SIZE && moveR >=0 && moveR < BOARD_SIZE) { // Check capture target is on board
          const targetSquare = currentBoard[moveR][captureC];
          if (targetSquare.pieceId) {
            const targetPiece = currentPieces[targetSquare.pieceId];
            // Gazelle cannot capture Lion (GDD rule)
            if (targetPiece.player !== currentPlayer && targetPiece.animal !== 'lion') { 
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
    let newPieces = { ...currentPieces };
    let finalPos = { row: targetRow, col: targetCol };
    let pieceToUpdate = { ...newPieces[movedPieceId] }; // Work on a copy
    let messageUpdate;

    const landedSquare = newBoard[finalPos.row][finalPos.col];
    
    if (landedSquare.terrain === 'rift') {
        const riftRule = TERRAIN_POSITIONS.find(tp => tp.pos.row === finalPos.row && tp.pos.col === finalPos.col && tp.type === 'rift');
        
        if (riftRule && riftRule.direction) {
            const pieceName = `${pieceToUpdate.player.charAt(0).toUpperCase()}${pieceToUpdate.player.slice(1)} ${pieceToUpdate.animal}`;
            messageUpdate = `${pieceName} landed in a Rift! Pushed North.`;
            toast({ title: "Rift!", description: messageUpdate });

            newBoard[pieceToUpdate.position.row][pieceToUpdate.position.col].pieceId = null; // Vacate original square (pre-push)
            
            let pushedRow = finalPos.row;
            let pushedCol = finalPos.col;

            // eslint-disable-next-line no-constant-condition
            while(true) {
                pushedRow += riftRule.direction.dRow; // North means row index decreases
                pushedCol += riftRule.direction.dCol;

                if (pushedRow < 0 || pushedRow >= BOARD_SIZE || pushedCol < 0 || pushedCol >= BOARD_SIZE) { // Hit board edge
                    finalPos = { row: pushedRow - riftRule.direction.dRow, col: pushedCol - riftRule.direction.dCol };
                    break;
                }
                if (newBoard[pushedRow][pushedCol].pieceId) { // Hit another piece
                    finalPos = { row: pushedRow - riftRule.direction.dRow, col: pushedCol - riftRule.direction.dCol };
                    break;
                }
                // Continue pushing if square is empty
                 finalPos = {row: pushedRow, col: pushedCol};
            }
            // Update piece position in the pieces map
            newPieces[movedPieceId] = { ...pieceToUpdate, position: finalPos };
            // Update the board with the new pieceId at the final position
            newBoard[finalPos.row][finalPos.col].pieceId = movedPieceId;
        }
    } else {
        // If not a rift, the final position is the targetRow/Col
        // The piece map is updated before calling this, and board is updated after.
        // Ensure the piece in newPieces has its position updated to targetRow/Col if no rift effect.
        newPieces[movedPieceId] = { ...pieceToUpdate, position: {row: targetRow, col: targetCol}};
        newBoard[targetRow][targetCol].pieceId = movedPieceId; // Ensure piece is on target if no rift
    }

    return { board: newBoard, pieces: newPieces, finalPosition: finalPos, messageUpdate };
  }, [toast]);


  const handleSquareClick = useCallback((row: number, col: number) => {
    if (gameState.isGameOver || gameState.currentPlayer !== 'human') return;

    const clickedSquare = gameState.board[row][col];
    const pieceInClickedSquare = clickedSquare.pieceId ? gameState.pieces[clickedSquare.pieceId] : null;

    if (gameState.selectedPieceId) {
      const selectedPiece = gameState.pieces[gameState.selectedPieceId];
      const isValidMoveTarget = gameState.validMoves.some(m => m.row === row && m.col === col);

      if (isValidMoveTarget) {
        let newPieces = { ...gameState.pieces };
        let newBoard = gameState.board.map(r => r.map(s => ({ ...s } as Square)));
        let newHumanScore = { ...gameState.humanCapturedAIScore };
        let newAiScore = { ...gameState.aiCapturedHumanScore }; // Should not be affected by human move
        let newLionMovedLastTurn = gameState.lionMovedLastTurn;
        let moveMessage = "";

        // Vacate old square for selected piece
        newBoard[selectedPiece.position.row][selectedPiece.position.col].pieceId = null;
        
        // Handle capture
        const targetSquareContent = gameState.board[row][col]; // Use original board to check target
        if (targetSquareContent.pieceId) {
          const capturedPiece = newPieces[targetSquareContent.pieceId];
          
          // GDD Schlagregel: Löwe kann nur von gegn. Löwen oder Giraffe geschlagen werden.
          if (capturedPiece.animal === 'lion' && !(selectedPiece.animal === 'lion' || selectedPiece.animal === 'giraffe')) {
             toast({ title: "Invalid Capture", description: `Your ${selectedPiece.animal} cannot capture a Lion. Only Lions or Giraffes can.`, variant: "destructive" });
             setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [] })); // Deselect, revert visually
             return;
          }
          // GDD Schlagregel: Gazelle kann keinen Löwen schlagen (already covered by valid moves, but good to have defense here)
          if (selectedPiece.animal === 'gazelle' && capturedPiece.animal === 'lion') {
            toast({ title: "Invalid Capture", description: "A Gazelle cannot capture a Lion.", variant: "destructive" });
            setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [] }));
            return;
          }

          delete newPieces[targetSquareContent.pieceId]; // Remove captured piece from pieces map
          newHumanScore[capturedPiece.animal]++;
          moveMessage = `Human ${selectedPiece.animal} captured AI ${capturedPiece.animal}.`;
          toast({ title: "Capture!", description: moveMessage });
        }
        
        // Initial move of selected piece (before special effects)
        // The piece in newPieces for selectedPiece.id still has its old position.
        // We update its position after special effects.
        newPieces[selectedPiece.id] = { ...selectedPiece, position: { row, col } }; // Tentative new position

        // Process special field effects (like Kluft/Rift)
        // This function will update the board and the piece's final position in newPieces
        const effectResult = processSpecialFieldEffects(selectedPiece.id, row, col, newBoard, newPieces);
        newBoard = effectResult.board; // Board is updated by effectResult
        newPieces = effectResult.pieces; // Pieces map is updated by effectResult
        
        if (effectResult.messageUpdate && !moveMessage) moveMessage = effectResult.messageUpdate;
        else if (effectResult.messageUpdate) moveMessage += " " + effectResult.messageUpdate;

        // Lion pause rule: GDD - After a movement, Lion must pause in the next turn.
        if (selectedPiece.animal === 'lion') {
          newLionMovedLastTurn = 'human';
        } else {
          // If AI lion moved last and human moves non-lion, AI lion is still paused
          if (newLionMovedLastTurn !== 'ai') {
            newLionMovedLastTurn = null; 
          }
        }
        
        const winner = checkWinCondition(newPieces, newHumanScore, newAiScore);
        let nextPlayer: PlayerType = 'ai';
        let gameStatusMessage = winner 
          ? `${winner === 'human' ? gameState.playerOneName : gameState.playerTwoName} wins!` 
          : `${gameState.playerTwoName}'s turn (Black).`;
        
        if (newLionMovedLastTurn === nextPlayer && !winner) {
           const pausingLion = nextPlayer === 'human' ? newPieces['h_lion1'] : newPieces['ai_lion1'];
           if (pausingLion) gameStatusMessage += ` (${pausingLion.animal} must pause)`;
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
          humanCapturedAIScore: newHumanScore,
          // aiCapturedHumanScore should not change on human's turn
          lionMovedLastTurn: newLionMovedLastTurn,
        }));

      } else { // Invalid move target or selecting another of player's own pieces
        if (pieceInClickedSquare && pieceInClickedSquare.player === 'human') {
           const pieceMoves = calculateValidMoves(pieceInClickedSquare.id, gameState.board, gameState.pieces, 'human', gameState.lionMovedLastTurn);
            if (pieceMoves.length === 0 && pieceInClickedSquare.animal === 'lion' && gameState.lionMovedLastTurn === 'human') {
                 toast({ title: "Lion Paused", description: "Your Lion must rest this turn." });
                 setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [] }));
            } else {
                 setGameState(prev => ({
                    ...prev,
                    selectedPieceId: pieceInClickedSquare.id,
                    validMoves: pieceMoves,
                    message: `Selected ${pieceInClickedSquare.animal}. Choose a destination.`,
                 }));
            }
        } else { // Clicked on empty square not a valid move, or opponent piece
          setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [], message: "Invalid move or selection. Human Player's turn." }));
        }
      }
    } else if (pieceInClickedSquare && pieceInClickedSquare.player === 'human') { // No piece selected yet, selecting a human piece
        const pieceMoves = calculateValidMoves(pieceInClickedSquare.id, gameState.board, gameState.pieces, 'human', gameState.lionMovedLastTurn);
        if (pieceMoves.length === 0 && pieceInClickedSquare.animal === 'lion' && gameState.lionMovedLastTurn === 'human') {
             toast({ title: "Lion Paused", description: "Your Lion must rest this turn." });
             setGameState(prev => ({ ...prev, message: "Lion is paused. Select another piece." }));
        } else if (pieceMoves.length === 0) {
            toast({ title: "No Moves", description: `This ${pieceInClickedSquare.animal} has no valid moves.` });
            setGameState(prev => ({ ...prev, message: `No moves for this ${pieceInClickedSquare.animal}. Select another piece.` }));
        }
        else {
             setGameState(prev => ({
                ...prev,
                selectedPieceId: pieceInClickedSquare.id,
                validMoves: pieceMoves,
                message: `Selected ${pieceInClickedSquare.animal}. Highlighting valid moves.`,
             }));
        }
    } else {
        setGameState(prev => ({ ...prev, message: "Select one of your pieces (White)." }));
    }
  }, [gameState, calculateValidMoves, checkWinCondition, toast, processSpecialFieldEffects]);

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
          <div>
            <p><strong>{gameState.playerOneName}:</strong> {analysisResult.playerOneSummary}</p>
            <p><strong>{gameState.playerTwoName}:</strong> {analysisResult.playerTwoSummary}</p>
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
      const suggestionResult = await suggestMove({
        boardState: boardString,
        playerTurn: gameState.currentPlayer === 'human' ? gameState.playerOneName : gameState.playerTwoName,
      });
      const suggestionText = (suggestionResult as { suggestedMove: string }).suggestedMove;
      toast({ title: "AI Move Suggestion", description: suggestionText || "AI could not determine a suggestion."});
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      toast({ title: "AI Error", description: "Could not get AI suggestion.", variant: "destructive"});
    } finally {
      setIsLoadingAI(false);
    }
  };
  
  useEffect(() => {
    if (gameState.currentPlayer === 'ai' && !gameState.isGameOver && !isLoadingAI) {
      setIsLoadingAI(true); // Set loading true before timeout
      const performAiMove = async () => {
        await new Promise(resolve => setTimeout(resolve, 1500)); // GDD: 1.5s delay

        let allAiMoves: { pieceId: string, move: {row: number, col: number}, piece: Piece }[] = [];
        const aiPieceIds = Object.keys(gameState.pieces).filter(id => gameState.pieces[id].player === 'ai');

        for (const pieceId of aiPieceIds) {
          const piece = gameState.pieces[pieceId];
          const validMovesForPiece = calculateValidMoves(pieceId, gameState.board, gameState.pieces, 'ai', gameState.lionMovedLastTurn);
          
          for (const move of validMovesForPiece) {
            const targetSquare = gameState.board[move.row][move.col];
            let isValidCapture = true;
            if (targetSquare.pieceId) { // Potential capture
                const targetPieceDetails = gameState.pieces[targetSquare.pieceId];
                // AI Gazelle cannot capture Human Lion
                if (piece.animal === 'gazelle' && targetPieceDetails.animal === 'lion') {
                    isValidCapture = false;
                }
                // Human Lion can only BE captured by AI Lion or AI Giraffe
                if (targetPieceDetails.animal === 'lion' && targetPieceDetails.player === 'human' &&
                    !(piece.animal === 'lion' || piece.animal === 'giraffe')) {
                    isValidCapture = false;
                }
            }
            if (isValidCapture) {
              allAiMoves.push({ pieceId, move, piece });
            }
          }
        }

        if (allAiMoves.length > 0) {
          const randomMoveData = allAiMoves[Math.floor(Math.random() * allAiMoves.length)];
          const { pieceId: aiPieceIdToMove, move: aiMoveToMake, piece: aiSelectedPiece } = randomMoveData;

          let newPieces = { ...gameState.pieces };
          let newBoard = gameState.board.map(r => r.map(s => ({ ...s } as Square)));
          let newHumanScore = { ...gameState.humanCapturedAIScore }; // Should not change on AI's turn
          let newAiScore = { ...gameState.aiCapturedHumanScore };
          let newLionMovedLastTurn = gameState.lionMovedLastTurn;
          let moveMessage = "";

          newBoard[aiSelectedPiece.position.row][aiSelectedPiece.position.col].pieceId = null;
          
          const targetSquareContent = gameState.board[aiMoveToMake.row][aiMoveToMake.col];
          if (targetSquareContent.pieceId) {
            const capturedPiece = newPieces[targetSquareContent.pieceId];
            // Schlagregeln already filtered in allAiMoves, direct delete
            delete newPieces[targetSquareContent.pieceId];
            newAiScore[capturedPiece.animal]++;
            moveMessage = `AI ${aiSelectedPiece.animal} captured Human ${capturedPiece.animal}.`;
            toast({ title: "AI Capture!", description: moveMessage });
          }
          
          // Update piece position before special effects for processSpecialFieldEffects
          newPieces[aiSelectedPiece.id] = { ...aiSelectedPiece, position: { row: aiMoveToMake.row, col: aiMoveToMake.col } };

          const effectResult = processSpecialFieldEffects(aiSelectedPiece.id, aiMoveToMake.row, aiMoveToMake.col, newBoard, newPieces);
          newBoard = effectResult.board;
          newPieces = effectResult.pieces; // Pieces map updated by effectResult
          
          if (effectResult.messageUpdate && !moveMessage) moveMessage = effectResult.messageUpdate;
          else if (effectResult.messageUpdate) moveMessage += " " + effectResult.messageUpdate;


          if (aiSelectedPiece.animal === 'lion') {
            newLionMovedLastTurn = 'ai';
          } else {
            // if human lion moved last, and AI moves non-lion, human lion is still paused
            if (newLionMovedLastTurn !== 'human') {
                newLionMovedLastTurn = null;
            }
          }
          
          const winner = checkWinCondition(newPieces, newHumanScore, newAiScore);
          let nextPlayer: PlayerType = 'human';
          let gameStatusMessage = winner 
            ? `${winner === 'human' ? gameState.playerOneName : gameState.playerTwoName} wins!` 
            : `${gameState.playerOneName}'s turn (White).`;

          if (!moveMessage && !winner) {
            gameStatusMessage = `AI moved ${aiSelectedPiece.animal} from (${aiSelectedPiece.position.row},${aiSelectedPiece.position.col}) to (${effectResult.finalPosition.row},${effectResult.finalPosition.col}). ${gameStatusMessage}`;
          } else if (moveMessage && !winner) {
            gameStatusMessage = `${moveMessage} ${gameStatusMessage}`;
          }
          
          if (newLionMovedLastTurn === nextPlayer && !winner) { // If next player (human) lion has to pause
             const pausingLion = nextPlayer === 'human' ? newPieces['h_lion1'] : newPieces['ai_lion1'];
             if(pausingLion) gameStatusMessage += ` (Your ${pausingLion.animal} must pause)`;
          }

          setGameState(prev => ({
            ...prev,
            board: newBoard,
            pieces: newPieces,
            currentPlayer: winner ? prev.currentPlayer : nextPlayer,
            winner,
            isGameOver: !!winner,
            message: gameStatusMessage,
            aiCapturedHumanScore: newAiScore,
            lionMovedLastTurn: newLionMovedLastTurn,
          }));

        } else {
          // AI has no valid moves
          setGameState(prev => ({ 
            ...prev, 
            currentPlayer: 'human', 
            message: "AI has no moves. Human Player's turn (White)."
          }));
        }
        setIsLoadingAI(false); // Set loading false after AI move or no move
      };
      performAiMove();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentPlayer, gameState.isGameOver]); // Removed other dependencies to prevent re-triggering AI move prematurely

  const handleResetGame = useCallback(() => {
    setGameState(initializeGameState());
    toast({ title: "Game Reset", description: "A new game has started. White to move."});
  }, [toast]);

  // Auto-reset on game over
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    if (gameState.isGameOver) {
      timeoutId = setTimeout(() => {
        handleResetGame();
      }, 3000); // 3 seconds delay as per GDD
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
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Captured by Human:</h4>
                <ul className="list-disc list-inside text-xs text-muted-foreground">
                  <li>Gazelles: {gameState.humanCapturedAIScore.gazelle} / 5</li>
                  <li>Giraffes: {gameState.humanCapturedAIScore.giraffe}</li>
                  <li>Lions: {gameState.humanCapturedAIScore.lion} / 1</li>
                </ul>
              </div>
               <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Captured by AI:</h4>
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
                {isLoadingAI && gameState.currentPlayer === 'human' ? 'AI Busy...' : 'Analyze Game State'}
              </Button>
              <Button 
                onClick={handleAiSuggest} 
                disabled={isLoadingAI || gameState.isGameOver || gameState.currentPlayer === 'ai'} 
                className="w-full" 
                size="sm"
              >
                {isLoadingAI && gameState.currentPlayer === 'human' ? 'AI Busy...' : 'Get AI Move Suggestion'}
              </Button>
              {isLoadingAI && <p className="text-sm text-muted-foreground text-center">AI is thinking...</p>}
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}
