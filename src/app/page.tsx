
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
// Figures per player: 1 Lion (L), 2 Giraffes (G), 5 Gazelles (Z)
// Startaufstellung (0-indexed, Player One (AI) on rows 0/1, Player Two (Human) on rows 6/5):
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
  
  // Available cells for random terrain, not on start rows or fixed terrain/pieces
  const availableCellsForRandomTerrain: {row: number, col: number}[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    // Restrict random terrain to rows 2, 3, 4 (middle rows)
    if (r < 2 || r > 4) continue; 
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!occupiedByFixedTerrainOrPiece.has(`${r}-${c}`)) {
        availableCellsForRandomTerrain.push({row: r, col: c});
      }
    }
  }

  // Shuffle available cells for random terrain
  for (let i = availableCellsForRandomTerrain.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availableCellsForRandomTerrain[i], availableCellsForRandomTerrain[j]] = [availableCellsForRandomTerrain[j], availableCellsForRandomTerrain[i]];
  }
  
  let randomTerrainPlacedCount = 0;
  const riftDirections: RiftDirection[] = [
    { dRow: -1, dCol: 0 }, // North
    { dRow: 1, dCol: 0 },  // South
    { dRow: 0, dCol: -1 }, // West
    { dRow: 0, dCol: 1 },  // East
  ];

  // Place NUM_RANDOM_SWAMPS
  for (let i = 0; i < NUM_RANDOM_SWAMPS && randomTerrainPlacedCount < availableCellsForRandomTerrain.length; i++) {
    const cell = availableCellsForRandomTerrain[randomTerrainPlacedCount++];
    board[cell.row][cell.col].terrain = 'swamp';
    occupiedByFixedTerrainOrPiece.add(`${cell.row}-${cell.col}`); 
  }

  // Place NUM_RANDOM_HILLS
  for (let i = 0; i < NUM_RANDOM_HILLS && randomTerrainPlacedCount < availableCellsForRandomTerrain.length; i++) {
    const cell = availableCellsForRandomTerrain[randomTerrainPlacedCount++];
    board[cell.row][cell.col].terrain = 'hill';
    occupiedByFixedTerrainOrPiece.add(`${cell.row}-${cell.col}`);
  }
  
  // Place NUM_RANDOM_RIFTS
  for (let i = 0; i < NUM_RANDOM_RIFTS && randomTerrainPlacedCount < availableCellsForRandomTerrain.length; i++) {
    const cell = availableCellsForRandomTerrain[randomTerrainPlacedCount++];
    board[cell.row][cell.col].terrain = 'rift';
    board[cell.row][cell.col].riftDirection = riftDirections[Math.floor(Math.random() * riftDirections.length)];
    occupiedByFixedTerrainOrPiece.add(`${cell.row}-${cell.col}`);
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
        // PlayerInitial: B for Human/Black, W for AI/White
        // In GDD: Player One (AI, White, Top), Player Two (Human, Black, Bottom)
        const playerChar = piece.player === 'ai' ? 'W' : 'B'; 
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
    currentPlayer: 'human', // Player Two (Human, Black) starts as per GDD: "Weiß (Spieler) beginnt." - assuming Spieler is Human.
    selectedPieceId: null,
    validMoves: [],
    winner: null,
    playerOneName: 'AI Opponent (White)', // AI is Player One (White, Top)
    playerTwoName: 'Human Player (Black)',   // Human is Player Two (Black, Bottom)
    humanCapturedAIScore: { ...initialCapturedScore }, 
    aiCapturedHumanScore: { ...initialCapturedScore },   
    lionMovedLastTurn: null, 
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
    currentPieces: Record<string, Piece>, 
    humanPlayerCapturesAiScore: CapturedPieces, // Human (Black, 'human') captures AI (White, 'ai')
    aiPlayerCapturesHumanScore: CapturedPieces  // AI (White, 'ai') captures Human (Black, 'human')
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
        for (let dist = 1; dist <= 2; dist++) { // Lion moves 1-2 squares
          const r = startRow + dr * dist;
          const c = startCol + dc * dist;

          if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break; 

          const targetSquare = currentBoard[r][c];
          if (targetSquare.pieceId) {
            const targetPiece = currentPieces[targetSquare.pieceId];
            if (targetPiece.player !== piece.player) { 
              // Lion can be captured ONLY by an enemy Lion or Giraffe (GDD Schlagregeln #2)
              // This check is done when *moving* a piece to capture the Lion.
              // Here, we only check if the Lion can capture an enemy piece.
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
          if (targetSquare.terrain === 'hill') continue; // Giraffe cannot enter Hill (GDD #5)

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
      // Player 'human' (Black, Bottom) Gazelles move "forward" (decreasing row index, towards AI)
      // Player 'ai' (White, Top) Gazelles move "forward" (increasing row index, towards Human)
      const forwardDir = piece.player === 'human' ? -1 : 1; 
      
      // Movement: 1 square forward
      const moveR = startRow + forwardDir;
      if (moveR >= 0 && moveR < BOARD_SIZE) { 
        if (!currentBoard[moveR][startCol].pieceId) { 
          moves.push({ row: moveR, col: startCol });
        }
      }
      
      // Capture: 1 square diagonally forward
      const captureCols = [startCol - 1, startCol + 1];
      for (const captureC of captureCols) {
        // Gazelle capture row is the same as its forward move row
        const captureR = startRow + forwardDir; 
        if (captureC >= 0 && captureC < BOARD_SIZE && captureR >=0 && captureR < BOARD_SIZE) { 
          const targetSquare = currentBoard[captureR][captureC];
          if (targetSquare.pieceId) {
            const targetPiece = currentPieces[targetSquare.pieceId];
            // Gazelle can capture if target is enemy AND not a Lion (GDD Schlagregeln #1)
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
    // Clear piece from original square on the *newBoard* before rift processing
    // newBoard[originalPos.row][originalPos.col].pieceId = null; // This is done by calling function
    
    const landedSquare = newBoard[finalPos.row][finalPos.col];
    
    if (landedSquare.terrain === 'rift' && landedSquare.riftDirection) {
        const pushDirection = landedSquare.riftDirection;
        const pieceOwnerName = pieceToUpdate.player === 'human' ? gameState.playerTwoName : gameState.playerOneName;
        const pieceAnimalName = pieceToUpdate.animal.charAt(0).toUpperCase() + pieceToUpdate.animal.slice(1);
        messageUpdate = `${pieceOwnerName} ${pieceAnimalName} landed in a Rift! Being pushed.`;
        toast({ title: "Rift!", description: messageUpdate });
        
        let currentPushRow = finalPos.row;
        let currentPushCol = finalPos.col;

        // eslint-disable-next-line no-constant-condition
        while(true) {
            const nextRow = currentPushRow + pushDirection.dRow;
            const nextCol = currentPushCol + pushDirection.dCol;

            // Check bounds
            if (nextRow < 0 || nextRow >= BOARD_SIZE || nextCol < 0 || nextCol >= BOARD_SIZE) { 
                break; // Stop if pushed off board
            }
            // Check for obstacle (another piece)
            if (newBoard[nextRow][nextCol].pieceId) { 
                break; // Stop if hits another piece
            }
            // Update current position and finalPos
            currentPushRow = nextRow;
            currentPushCol = nextCol;
            finalPos = {row: currentPushRow, col: currentPushCol}; 
        }
    }
    
    // Update piece position in newPieces AFTER rift effect processing
    newPieces[movedPieceId] = { ...pieceToUpdate, position: finalPos };
    // Place piece on its final square on the newBoard
    newBoard[finalPos.row][finalPos.col].pieceId = movedPieceId;
    // Ensure original square is cleared if it wasn't the final landing square (e.g. rift moved it)
    if (originalPos.row !== finalPos.row || originalPos.col !== finalPos.col) {
        newBoard[originalPos.row][originalPos.col].pieceId = null;
    }

    return { board: newBoard, pieces: newPieces, finalPosition: finalPos, messageUpdate };
  }, [toast, gameState.playerTwoName, gameState.playerOneName]);


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
        // AI score not needed here as human is moving
        
        let currentLionMovedLastTurn = gameState.lionMovedLastTurn;
        if (selectedPiece.animal === 'lion') {
            currentLionMovedLastTurn = selectedPiece.player; // 'human'
        } else if (gameState.lionMovedLastTurn === 'human') {
            currentLionMovedLastTurn = null; // Reset pause if human moved a non-lion while human lion was paused
        }

        let moveMessage = "";
        // Clear selected piece from its original position on the new board
        newBoard[selectedPiece.position.row][selectedPiece.position.col].pieceId = null;
        
        const targetSquareContentOriginalBoard = gameState.board[row][col];
        if (targetSquareContentOriginalBoard.pieceId) { // Potential capture
          const capturedPieceOriginal = gameState.pieces[targetSquareContentOriginalBoard.pieceId];
          
          // GDD Schlagregeln #2: Lion can ONLY be captured by enemy Lion or Giraffe
          if (capturedPieceOriginal.animal === 'lion' && !(selectedPiece.animal === 'lion' || selectedPiece.animal === 'giraffe')) {
             toast({ title: "Invalid Capture", description: `Your ${selectedPiece.animal} cannot capture a Lion. Only a Lion or Giraffe can.`, variant: "destructive" });
             setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [] })); // Reset selection
             return;
          }
          // GDD Schlagregeln #1: Gazelle cannot capture Lion (already handled by Gazelle's calculateValidMoves)
          
          delete newPieces[targetSquareContentOriginalBoard.pieceId]; // Remove captured piece
          newHumanPlayerCapturesAiScore[capturedPieceOriginal.animal]++; // Update score
          const capturerName = gameState.playerTwoName; // Human Player
          const capturedOwnerName = gameState.playerOneName; // AI Opponent
          moveMessage = `${capturerName} ${selectedPiece.animal} captured ${capturedOwnerName} ${capturedPieceOriginal.animal}.`;
          toast({ title: "Capture!", description: moveMessage });
        }
        
        // Tentatively place selected piece on target square (before special effects)
        // newPieces[selectedPiece.id] = { ...selectedPiece, position: { row, col } };
        // newBoard[row][col].pieceId = selectedPiece.id; // This is handled by processSpecialFieldEffects

        // Process special field effects using the board *after* clearing the original spot
        const effectResult = processSpecialFieldEffects(selectedPiece.id, row, col, newBoard, newPieces);
        newBoard = effectResult.board; 
        newPieces = effectResult.pieces; // newPieces now has the updated position from effectResult
        
        if (effectResult.messageUpdate && !moveMessage) moveMessage = effectResult.messageUpdate;
        else if (effectResult.messageUpdate) moveMessage += " " + effectResult.messageUpdate;
        
        const winner = checkWinCondition(newPieces, newHumanPlayerCapturesAiScore, gameState.aiCapturedHumanScore);
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
          // aiCapturedHumanScore: gameState.aiCapturedHumanScore, // Stays same
          lionMovedLastTurn: currentLionMovedLastTurn,
        }));

      } else { // Clicked on a non-valid-move square
        if (pieceInClickedSquare && pieceInClickedSquare.player === 'human') { // If it's another of human's pieces
            if (pieceInClickedSquare.id === gameState.selectedPieceId) { // Clicked selected piece again
                 setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [], message: `${gameState.playerTwoName}'s turn (Black). Select a piece.` }));
            } else { // Selected a different human piece
                const pieceMoves = calculateValidMoves(pieceInClickedSquare.id, gameState.board, gameState.pieces, gameState.lionMovedLastTurn === 'human' ? 'human' : null);
                let messageForSelection = `Selected ${pieceInClickedSquare.animal}. Choose a destination.`;
                if (pieceMoves.length === 0) {
                    if (pieceInClickedSquare.animal === 'lion' && gameState.lionMovedLastTurn === 'human') {
                        toast({ title: "Lion Paused", description: "Your Lion must rest this turn." });
                        messageForSelection = "Lion is paused. Select another piece.";
                    } else {
                        toast({ title: "No Moves", description: `This ${pieceInClickedSquare.animal} has no valid moves.` });
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
        } else { // Clicked an empty square or AI piece (and not a valid move target)
          setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [], message: `Invalid move. ${gameState.playerTwoName}'s turn (Black). Select a piece.` }));
        }
      }
    } else if (pieceInClickedSquare && pieceInClickedSquare.player === 'human') { // No piece selected yet, and clicked a human piece
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
    } else { // Clicked an empty square or AI piece with no selection
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

        let allAiMoves: { pieceId: string, move: {row: number, col: number}, piece: Piece, isCapture: boolean, capturedPieceAnimal?: AnimalType }[] = [];
        const aiPieceIds = Object.keys(gameState.pieces).filter(id => gameState.pieces[id].player === 'ai');
        
        const isAiLionPausedThisTurn = gameState.lionMovedLastTurn === 'ai';

        for (const pieceId of aiPieceIds) {
          const piece = gameState.pieces[pieceId];
          const validMovesForPiece = calculateValidMoves(pieceId, gameState.board, gameState.pieces, isAiLionPausedThisTurn ? 'ai' : null);
          
          for (const move of validMovesForPiece) {
            const targetSquare = gameState.board[move.row][move.col];
            let isCapture = false;
            let isValidFinalMove = true; 
            let capturedPieceAnimal: AnimalType | undefined = undefined;
            
            if (targetSquare.pieceId) { // Potential capture
                const targetPieceDetails = gameState.pieces[targetSquare.pieceId];
                if (targetPieceDetails.player === 'ai') { // Can't capture own piece
                    isValidFinalMove = false; 
                } else { // Capturing human piece
                    capturedPieceAnimal = targetPieceDetails.animal;
                    // GDD Schlagregeln #2 (Lion can ONLY be captured by enemy Lion or Giraffe)
                    // This is when *AI* is capturing Human's Lion.
                    if (targetPieceDetails.animal === 'lion' && !(piece.animal === 'lion' || piece.animal === 'giraffe')) {
                        isValidFinalMove = false; 
                    }
                    // GDD Schlagregeln #1 (Gazelle cannot capture Lion)
                    // This is already handled in calculateValidMoves for Gazelle,
                    // but an explicit check here for AI's Gazelle is safe.
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
          // Prioritize capturing Lion, then Giraffe, then Gazelle
          const lionCaptures = captureMoves.filter(m => m.capturedPieceAnimal === 'lion');
          const giraffeCaptures = captureMoves.filter(m => m.capturedPieceAnimal === 'giraffe');
          const gazelleCaptures = captureMoves.filter(m => m.capturedPieceAnimal === 'gazelle');

          if (lionCaptures.length > 0) chosenMoveData = lionCaptures[Math.floor(Math.random() * lionCaptures.length)];
          else if (giraffeCaptures.length > 0) chosenMoveData = giraffeCaptures[Math.floor(Math.random() * giraffeCaptures.length)];
          else if (gazelleCaptures.length > 0) chosenMoveData = gazelleCaptures[Math.floor(Math.random() * gazelleCaptures.length)];
          // else chosenMoveData = captureMoves[Math.floor(Math.random() * captureMoves.length)]; // Fallback if only other captures exist
        }
        
        if (!chosenMoveData && allAiMoves.length > 0) { // If no capture moves, or none of the prioritized ones, pick any valid move
          chosenMoveData = allAiMoves[Math.floor(Math.random() * allAiMoves.length)];
        }


        if (chosenMoveData) {
          const { pieceId: aiPieceIdToMove, move: aiMoveToMake, piece: aiSelectedPiece } = chosenMoveData;

          let newPieces = JSON.parse(JSON.stringify(gameState.pieces));
          let newBoard = gameState.board.map(r => r.map(s => ({ ...s } as Square)));
          // let newHumanPlayerCapturesAiScore = { ...gameState.humanCapturedAIScore }; // AI is moving, so this score doesn't change
          let newAiPlayerCapturesHumanScore = { ...gameState.aiCapturedHumanScore };

          let currentLionMovedLastTurn = gameState.lionMovedLastTurn;
          if (aiSelectedPiece.animal === 'lion') {
              currentLionMovedLastTurn = 'ai'; 
          } else if (gameState.lionMovedLastTurn === 'ai') { 
             currentLionMovedLastTurn = null; // Reset pause if AI moved non-lion
          }
          
          let moveMessage = "";
          // Clear AI piece from its original position on the new board
          newBoard[aiSelectedPiece.position.row][aiSelectedPiece.position.col].pieceId = null;
          
          const targetSquareContentOriginalBoard = gameState.board[aiMoveToMake.row][aiMoveToMake.col];
          if (targetSquareContentOriginalBoard.pieceId) { // AI Capture
            const capturedPieceOriginal = gameState.pieces[targetSquareContentOriginalBoard.pieceId];
            // Ensure it's a human piece (already filtered by allAiMoves logic, but good for clarity)
            if (capturedPieceOriginal.player === 'human') {
                delete newPieces[targetSquareContentOriginalBoard.pieceId]; // Remove captured human piece
                newAiPlayerCapturesHumanScore[capturedPieceOriginal.animal]++; // Update AI's score
                const capturerName = gameState.playerOneName; // AI
                const capturedOwnerName = gameState.playerTwoName; // Human
                moveMessage = `${capturerName} ${aiSelectedPiece.animal} captured ${capturedOwnerName} ${capturedPieceOriginal.animal}.`;
                toast({ title: "AI Capture!", description: moveMessage });
            }
          }
          
          // Tentatively place AI piece on target square (before special effects)
          // newPieces[aiSelectedPiece.id] = { ...aiSelectedPiece, position: { row: aiMoveToMake.row, col: aiMoveToMake.col } };
          // newBoard[aiMoveToMake.row][aiMoveToMake.col].pieceId = aiSelectedPiece.id; // Handled by processSpecialFieldEffects

          const effectResult = processSpecialFieldEffects(aiSelectedPiece.id, aiMoveToMake.row, aiMoveToMake.col, newBoard, newPieces);
          newBoard = effectResult.board;
          newPieces = effectResult.pieces; // newPieces has updated pos
          
          if (effectResult.messageUpdate && !moveMessage) moveMessage = effectResult.messageUpdate;
          else if (effectResult.messageUpdate) moveMessage += " " + effectResult.messageUpdate;
          
          const winner = checkWinCondition(newPieces, gameState.humanCapturedAIScore, newAiPlayerCapturesHumanScore);
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
          }

          setGameState(prev => ({
            ...prev,
            board: newBoard,
            pieces: newPieces,
            currentPlayer: winner ? prev.currentPlayer : nextPlayerTurn,
            winner,
            isGameOver: !!winner,
            message: gameStatusMessage,
            // humanCapturedAIScore: gameState.humanCapturedAIScore, // Stays same
            aiCapturedHumanScore: newAiPlayerCapturesHumanScore,
            lionMovedLastTurn: currentLionMovedLastTurn,
          }));

        } else { // AI has no valid moves
           let currentLionMovedLastTurn = gameState.lionMovedLastTurn;
           if (gameState.lionMovedLastTurn === 'ai') { // If AI lion was paused, unpause it as turn passes
             currentLionMovedLastTurn = null;
           }
          setGameState(prev => ({ 
            ...prev, 
            currentPlayer: 'human', 
            message: `${gameState.playerOneName} (AI) has no valid moves. ${gameState.playerTwoName}'s turn (Black).`,
            lionMovedLastTurn: currentLionMovedLastTurn,
          }));
        }
        setIsLoadingAI(false);
      };
      performAiMove();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentPlayer, gameState.isGameOver, calculateValidMoves, checkWinCondition, processSpecialFieldEffects, toast]); 

  const handleResetGame = useCallback(() => {
    setShowTutorial(true); 
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    if (gameState.isGameOver && !showTutorial) { 
      timeoutId = setTimeout(() => {
        handleResetGame();
      }, 3000); 
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [gameState.isGameOver, handleResetGame, showTutorial]);

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

    