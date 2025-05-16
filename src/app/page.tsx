
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

// GDD v0.4 Startaufstellung (0-indexed for 7x7):
// Weiß (Spieler, y=0/1): G(0,2), L(0,3), G(0,4) | Z(1,1), Z(1,2), Z(1,3), Z(1,4), Z(1,5)
// Schwarz (KI, y=6/5): G(6,2), L(6,3), G(6,4) | Z(5,1), Z(5,2), Z(5,3), Z(5,4), Z(5,5)
// MODIFIED: AI is White (Top), Human is Black (Bottom)
const initialPieces: Record<string, Piece> = {
  // AI Pieces (Player One - White, Top)
  'ai_giraffe1': { id: 'ai_giraffe1', animal: 'giraffe', player: 'ai', position: { row: 0, col: 2 } }, // c1
  'ai_lion1':    { id: 'ai_lion1',    animal: 'lion',    player: 'ai', position: { row: 0, col: 3 } }, // d1
  'ai_giraffe2': { id: 'ai_giraffe2', animal: 'giraffe', player: 'ai', position: { row: 0, col: 4 } }, // e1
  'ai_gazelle1': { id: 'ai_gazelle1', animal: 'gazelle', player: 'ai', position: { row: 1, col: 1 } }, // b2
  'ai_gazelle2': { id: 'ai_gazelle2', animal: 'gazelle', player: 'ai', position: { row: 1, col: 2 } }, // c2
  'ai_gazelle3': { id: 'ai_gazelle3', animal: 'gazelle', player: 'ai', position: { row: 1, col: 3 } }, // d2
  'ai_gazelle4': { id: 'ai_gazelle4', animal: 'gazelle', player: 'ai', position: { row: 1, col: 4 } }, // e2
  'ai_gazelle5': { id: 'ai_gazelle5', animal: 'gazelle', player: 'ai', position: { row: 1, col: 5 } }, // f2

  // Human Pieces (Player Two - Black, Bottom)
  'h_giraffe1': { id: 'h_giraffe1', animal: 'giraffe', player: 'human', position: { row: 6, col: 2 } }, // c7
  'h_lion1':    { id: 'h_lion1',    animal: 'lion',    player: 'human', position: { row: 6, col: 3 } }, // d7
  'h_giraffe2': { id: 'h_giraffe2', animal: 'giraffe', player: 'human', position: { row: 6, col: 4 } }, // e7
  'h_gazelle1': { id: 'h_gazelle1', animal: 'gazelle', player: 'human', position: { row: 5, col: 1 } }, // b6
  'h_gazelle2': { id: 'h_gazelle2', animal: 'gazelle', player: 'human', position: { row: 5, col: 2 } }, // c6
  'h_gazelle3': { id: 'h_gazelle3', animal: 'gazelle', player: 'human', position: { row: 5, col: 3 } }, // d6
  'h_gazelle4': { id: 'h_gazelle4', animal: 'gazelle', player: 'human', position: { row: 5, col: 4 } }, // e6
  'h_gazelle5': { id: 'h_gazelle5', animal: 'gazelle', player: 'human', position: { row: 5, col: 5 } }, // f6
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

  // Place GDD-defined terrains
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
    default: return ''; // For 'none' or other cases
  }
}

function getBoardString(board: Board, pieces: Record<string, Piece>): string {
  return board.map(row =>
    row.map(square => {
      if (square.pieceId) {
        const piece = pieces[square.pieceId];
        // Player char based on 'human' (Black, Bottom) or 'ai' (White, Top)
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
    playerOneName: 'AI Opponent', // White, Top
    playerTwoName: 'Human Player', // Black, Bottom
    humanCapturedAIScore: { ...initialCapturedScore }, // Pieces AI (White) lost
    aiCapturedHumanScore: { ...initialCapturedScore },   // Pieces Human (Black) lost
    lionMovedLastTurn: null,
    isGameOver: false,
    message: "Human Player's turn (Black). Select a piece.",
  };
}

export default function SavannahChasePage() {
  const [gameState, setGameState] = useState<GameState>(initializeGameState);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const { toast } = useToast();
  
  const checkWinCondition = useCallback((currentPieces: Record<string, Piece>, humanPlayerIsBlackScore: CapturedPieces, aiPlayerIsWhiteScore: CapturedPieces): PlayerType | null => {
    // Human (Black) wins if they capture AI's (White) Lion or 5 AI Gazelles
    if (humanPlayerIsBlackScore.lion >= 1) return 'human'; // Human (Black) captured AI Lion
    if (humanPlayerIsBlackScore.gazelle >= 5) return 'human'; // Human (Black) captured 5 AI Gazelles

    // AI (White) wins if they capture Human's (Black) Lion or 5 Human Gazelles
    if (aiPlayerIsWhiteScore.lion >= 1) return 'ai'; // AI (White) captured Human Lion
    if (aiPlayerIsWhiteScore.gazelle >= 5) return 'ai'; // AI (White) captured 5 Human Gazelles
    
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
      const directions = [[-1,0], [1,0], [0,-1], [0,1]]; // Orthogonal
      for (const [dr, dc] of directions) {
        for (let dist = 1; dist <= 2; dist++) {
          const r = startRow + dr * dist;
          const c = startCol + dc * dist;
          if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;

          const targetSquare = currentBoard[r][c];
          if (targetSquare.terrain === 'hill') continue; // Giraffe cannot enter hill

          if (targetSquare.pieceId) {
            const targetPiece = currentPieces[targetSquare.pieceId];
            if (targetPiece.player !== piece.player) { 
               moves.push({ row: r, col: c });
            }
            break; // Stop in this direction if a piece is encountered
          }
          moves.push({ row: r, col: c });
        }
      }
    } else if (piece.animal === 'gazelle') {
      // Human (Black) starts bottom (Gazelles row 5), moves towards smaller row indices.
      // AI (White) starts top (Gazelles row 1), moves towards larger row indices.
      const forwardDir = piece.player === 'human' ? -1 : 1; 
      
      // Movement: 1 square straight forward
      const moveR = startRow + forwardDir;
      if (moveR >= 0 && moveR < BOARD_SIZE) { // Check bounds for target row
        if (!currentBoard[moveR][startCol].pieceId) { // Can only move to empty square
          moves.push({ row: moveR, col: startCol });
        }
      }
      
      // Capture: 1 square diagonally forward
      const captureCols = [startCol - 1, startCol + 1];
      for (const captureC of captureCols) {
        if (captureC >= 0 && captureC < BOARD_SIZE && moveR >=0 && moveR < BOARD_SIZE) { // Check bounds for target row & col
          const targetSquare = currentBoard[moveR][captureC];
          if (targetSquare.pieceId) {
            const targetPiece = currentPieces[targetSquare.pieceId];
            if (targetPiece.player !== piece.player && targetPiece.animal !== 'lion') { // Can capture opponent, not Lion
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

    const landedSquare = newBoard[finalPos.row][finalPos.col];
    
    if (landedSquare.terrain === 'rift') {
        const riftRule = TERRAIN_POSITIONS.find(tp => tp.pos.row === finalPos.row && tp.pos.col === finalPos.col && tp.type === 'rift');
        const pushDirection = riftRule?.direction || { dRow: -1, dCol: 0 }; // Default North if not specified on a random rift (should not happen with current setup)
        
        const pieceOwnerName = pieceToUpdate.player === 'human' ? gameState.playerTwoName : gameState.playerOneName;
        const pieceName = `${pieceOwnerName} ${pieceToUpdate.animal}`;
        messageUpdate = `${pieceName} landed in a Rift! Pushed North.`;
        toast({ title: "Rift!", description: messageUpdate });

        newBoard[targetRow][targetCol].pieceId = null; 
        
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

    if (gameState.selectedPieceId) { // A piece is already selected, try to move it
      const selectedPiece = gameState.pieces[gameState.selectedPieceId];
      const isValidMoveTarget = gameState.validMoves.some(m => m.row === row && m.col === col);

      if (isValidMoveTarget) {
        let newPieces = JSON.parse(JSON.stringify(gameState.pieces));
        let newBoard = gameState.board.map(r => r.map(s => ({ ...s } as Square)));
        let newHumanScore = { ...gameState.humanCapturedAIScore }; // Human (Black) captures AI (White) pieces
        let newAiScore = { ...gameState.aiCapturedHumanScore };   // AI (White) captures Human (Black) pieces
        
        let currentLionMovedLastTurn = gameState.lionMovedLastTurn;
        if (currentLionMovedLastTurn === 'human' && selectedPiece.player === 'human' && selectedPiece.animal !== 'lion') {
            // If human lion was paused, and human moves another piece, lion remains paused for AI's turn.
            // It unpauses before human's *next* turn. This seems correct.
        } else if (selectedPiece.animal === 'lion' && selectedPiece.player === 'human') {
            currentLionMovedLastTurn = 'human'; // Human lion moved, will pause next human turn
        } else if (currentLionMovedLastTurn === 'human' && selectedPiece.player === 'human' && selectedPiece.animal === 'lion') {
            // This case should not happen if lion is paused, as it wouldn't have valid moves.
            // If it happens, it implies an issue in valid move calculation for paused lion.
        }


        let moveMessage = "";

        // Vacate piece's original square
        newBoard[selectedPiece.position.row][selectedPiece.position.col].pieceId = null;
        
        const targetSquareContentOriginalBoard = gameState.board[row][col];
        if (targetSquareContentOriginalBoard.pieceId) { // Capture attempt
          const capturedPieceOriginal = gameState.pieces[targetSquareContentOriginalBoard.pieceId];
          
          // Check GDD Schlagregeln: Löwe kann nur von gegn. Löwen oder Giraffe geschlagen werden.
          if (capturedPieceOriginal.animal === 'lion' && !(selectedPiece.animal === 'lion' || selectedPiece.animal === 'giraffe')) {
             toast({ title: "Invalid Capture", description: `Your ${selectedPiece.animal} cannot capture a Lion. Only Lions or Giraffes can.`, variant: "destructive" });
             setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [] })); // Reset selection
             return;
          }
          // Gazelle cannot capture Lion rule is handled by Gazelle's valid moves calculation (not allowing the move).

          delete newPieces[targetSquareContentOriginalBoard.pieceId];
          // Human (Black) captures AI (White) piece
          newHumanScore[capturedPieceOriginal.animal]++;
          moveMessage = `${gameState.playerTwoName} ${selectedPiece.animal} captured ${gameState.playerOneName} ${capturedPieceOriginal.animal}.`;
          toast({ title: "Capture!", description: moveMessage });
        }
        
        newPieces[selectedPiece.id] = { ...selectedPiece, position: { row, col } };

        const effectResult = processSpecialFieldEffects(selectedPiece.id, row, col, newBoard, newPieces);
        newBoard = effectResult.board; 
        newPieces = effectResult.pieces; 
        
        if (effectResult.messageUpdate && !moveMessage) moveMessage = effectResult.messageUpdate;
        else if (effectResult.messageUpdate) moveMessage += " " + effectResult.messageUpdate;
        
        const winner = checkWinCondition(newPieces, newHumanScore, newAiScore);
        let nextPlayer: PlayerType = 'ai';
        let gameStatusMessage = winner 
          ? `${winner === 'human' ? gameState.playerTwoName : gameState.playerOneName} wins!` // Adjusted for new player names
          : `${gameState.playerOneName}'s turn (White).`; // AI's turn next
        
        // If AI's lion needs to pause next
        if (currentLionMovedLastTurn === 'ai' && !winner && nextPlayer === 'ai') {
           const pausingLionId = 'ai_lion1'; // AI Lion ID
           const pausingLion = newPieces[pausingLionId];
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
          aiCapturedHumanScore: prev.aiCapturedHumanScore, // AI score doesn't change on human's turn capture
          lionMovedLastTurn: currentLionMovedLastTurn,
        }));

      } else { // Clicked on an invalid move target or another of human's own pieces
        if (pieceInClickedSquare && pieceInClickedSquare.player === 'human') {
            // Deselect if clicking the same piece, or select the new piece
            if (pieceInClickedSquare.id === gameState.selectedPieceId) {
                 setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [], message: `${gameState.playerTwoName}'s turn (Black). Select a piece.` }));
            } else {
                const pieceMoves = calculateValidMoves(pieceInClickedSquare.id, gameState.board, gameState.pieces, gameState.lionMovedLastTurn);
                if (pieceMoves.length === 0 && pieceInClickedSquare.animal === 'lion' && gameState.lionMovedLastTurn === 'human') {
                    toast({ title: "Lion Paused", description: "Your Lion must rest this turn." });
                }
                setGameState(prev => ({
                    ...prev,
                    selectedPieceId: pieceInClickedSquare.id,
                    validMoves: pieceMoves,
                    message: pieceMoves.length > 0 ? `Selected ${pieceInClickedSquare.animal}. Choose a destination.` : `This ${pieceInClickedSquare.animal} has no valid moves or is paused. Select another piece.`,
                }));
            }
        } else { 
          // Clicked on empty square not a valid move, or AI piece
          setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [], message: `Invalid move. ${gameState.playerTwoName}'s turn (Black).` }));
        }
      }
    } else if (pieceInClickedSquare && pieceInClickedSquare.player === 'human') { // No piece selected yet, try to select this one
        const pieceMoves = calculateValidMoves(pieceInClickedSquare.id, gameState.board, gameState.pieces, gameState.lionMovedLastTurn);
        
        if (pieceMoves.length === 0) {
            if (pieceInClickedSquare.animal === 'lion' && gameState.lionMovedLastTurn === 'human') {
                 toast({ title: "Lion Paused", description: "Your Lion must rest this turn." });
                 setGameState(prev => ({ ...prev, message: "Lion is paused. Select another piece." }));
            } else {
                toast({ title: "No Moves", description: `This ${pieceInClickedSquare.animal} has no valid moves.` });
                setGameState(prev => ({ ...prev, message: `No moves for this ${pieceInClickedSquare.animal}. Select another piece.` }));
            }
        } else {
             setGameState(prev => ({
                ...prev,
                selectedPieceId: pieceInClickedSquare.id,
                validMoves: pieceMoves,
                message: `Selected ${pieceInClickedSquare.animal}. Highlighting valid moves.`,
             }));
        }
    } else { // Clicked on empty square or AI piece with no piece selected
        setGameState(prev => ({ ...prev, message: `${gameState.playerTwoName}'s turn (Black). Select one of your pieces.` }));
    }
  }, [gameState, calculateValidMoves, checkWinCondition, toast, processSpecialFieldEffects, isLoadingAI]);

  const handleAiAnalyze = async () => {
    if (isLoadingAI) return;
    setIsLoadingAI(true);
    try {
      const boardString = getBoardString(gameState.board, gameState.pieces);
      // AI is PlayerOne (White, Top), Human is PlayerTwo (Black, Bottom)
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
        playerTurn: currentTurnPlayerName, // Name of the player whose turn it is
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
        // AI is player 'ai', playerOneName
        const aiPieceIds = Object.keys(gameState.pieces).filter(id => gameState.pieces[id].player === 'ai');

        // Determine if AI lion is paused for this AI turn
        let lionPausedForAiThisTurn = gameState.lionMovedLastTurn === 'ai';

        for (const pieceId of aiPieceIds) {
          const piece = gameState.pieces[pieceId];
          const validMovesForPiece = calculateValidMoves(pieceId, gameState.board, gameState.pieces, lionPausedForAiThisTurn ? 'ai' : null);
          
          for (const move of validMovesForPiece) {
            const targetSquare = gameState.board[move.row][move.col];
            let isValidFinalMove = true; 
            if (targetSquare.pieceId) { 
                const targetPieceDetails = gameState.pieces[targetSquare.pieceId];
                if (targetPieceDetails.player === 'ai') { // Should not happen if calculateValidMoves is correct
                    isValidFinalMove = false; 
                }
                // Check AI's capture attempt against Human Lion
                if (targetPieceDetails.animal === 'lion' && targetPieceDetails.player === 'human' &&
                    !(piece.animal === 'lion' || piece.animal === 'giraffe')) {
                    isValidFinalMove = false; // AI non-Lion/non-Giraffe cannot capture Human Lion
                }
            }
            if (isValidFinalMove) {
              allAiMoves.push({ pieceId, move, piece });
            }
          }
        }

        // If AI Lion moved in its previous turn, it should now be unpaused for its next turn.
        let nextLionMovedLastTurnState = gameState.lionMovedLastTurn;
        if (nextLionMovedLastTurnState === 'ai') { // AI's lion was paused for *this* current AI turn
            nextLionMovedLastTurnState = null; // It becomes unpaused for the *next* AI turn
        }


        if (allAiMoves.length > 0) {
          const randomMoveData = allAiMoves[Math.floor(Math.random() * allAiMoves.length)];
          const { pieceId: aiPieceIdToMove, move: aiMoveToMake, piece: aiSelectedPiece } = randomMoveData;

          let newPieces = JSON.parse(JSON.stringify(gameState.pieces));
          let newBoard = gameState.board.map(r => r.map(s => ({ ...s } as Square)));
          let newHumanScore = { ...gameState.humanCapturedAIScore }; // Human (Black) pieces captured by AI (White)
          let newAiScore = { ...gameState.aiCapturedHumanScore };   // AI (White) pieces captured by Human (Black) -> this is what AI affects

          // If AI moves its lion, set it to be paused for AI's next turn
          if (aiSelectedPiece.animal === 'lion') {
              nextLionMovedLastTurnState = 'ai';
          }
          
          let moveMessage = "";

          newBoard[aiSelectedPiece.position.row][aiSelectedPiece.position.col].pieceId = null;
          
          const targetSquareContentOriginalBoard = gameState.board[aiMoveToMake.row][aiMoveToMake.col];
          if (targetSquareContentOriginalBoard.pieceId) { // AI Capture
            const capturedPieceOriginal = gameState.pieces[targetSquareContentOriginalBoard.pieceId];
            // Schlagregeln already filtered in allAiMoves selection
            delete newPieces[targetSquareContentOriginalBoard.pieceId];
            newAiScore[capturedPieceOriginal.animal]++; // AI (White) captures a Human (Black) piece
            moveMessage = `${gameState.playerOneName} ${aiSelectedPiece.animal} captured ${gameState.playerTwoName} ${capturedPieceOriginal.animal}.`;
            toast({ title: "AI Capture!", description: moveMessage });
          }
          
          newPieces[aiSelectedPiece.id] = { ...aiSelectedPiece, position: { row: aiMoveToMake.row, col: aiMoveToMake.col } };

          const effectResult = processSpecialFieldEffects(aiSelectedPiece.id, aiMoveToMake.row, aiMoveToMake.col, newBoard, newPieces);
          newBoard = effectResult.board;
          newPieces = effectResult.pieces;
          
          if (effectResult.messageUpdate && !moveMessage) moveMessage = effectResult.messageUpdate;
          else if (effectResult.messageUpdate) moveMessage += " " + effectResult.messageUpdate;
          
          const winner = checkWinCondition(newPieces, newHumanScore, newAiScore);
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
          
          // If Human's lion needs to pause next
          if (nextLionMovedLastTurnState === 'human' && !winner && nextPlayerTurn === 'human') {
             const pausingLionId = 'h_lion1'; // Human Lion ID
             const pausingLion = newPieces[pausingLionId];
             if(pausingLion) gameStatusMessage += ` (Your ${pausingLion.animal} must pause)`;
          }


          setGameState(prev => ({
            ...prev,
            board: newBoard,
            pieces: newPieces,
            currentPlayer: winner ? prev.currentPlayer : nextPlayerTurn,
            winner,
            isGameOver: !!winner,
            message: gameStatusMessage,
            humanCapturedAIScore: newHumanScore, // Score for Human (Black)
            aiCapturedHumanScore: newAiScore,   // Score for AI (White)
            lionMovedLastTurn: nextLionMovedLastTurnState,
          }));

        } else { // AI has no valid moves
          setGameState(prev => ({ 
            ...prev, 
            currentPlayer: 'human', 
            message: `${gameState.playerOneName} (AI) has no valid moves. ${gameState.playerTwoName}'s turn (Black).`,
            lionMovedLastTurn: nextLionMovedLastTurnState, // Lion pause state still needs to advance
          }));
        }
        setIsLoadingAI(false);
      };
      performAiMove();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentPlayer, gameState.isGameOver, gameState.lionMovedLastTurn]); // Added lionMovedLastTurn to deps for AI turn re-eval

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
                <span className={`font-semibold flex items-center gap-1 ${gameState.currentPlayer === 'human' ? 'text-accent' : 'text-primary'}`}> {/* Human is Black (accent), AI is White (primary) */}
                  {gameState.currentPlayer === 'human' ? <User size={18}/> : <Cpu size={18}/>}
                  {gameState.currentPlayer === 'human' ? gameState.playerTwoName : gameState.playerOneName}
                </span>
              </div>
               {gameState.lionMovedLastTurn && (
                <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Lion Paused:</span>
                    <span className={`font-semibold ${gameState.lionMovedLastTurn === 'human' ? 'text-accent' : 'text-primary'}`}>
                        {(gameState.lionMovedLastTurn === 'human' ? gameState.playerTwoName : gameState.playerOneName)}'s Lion
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
