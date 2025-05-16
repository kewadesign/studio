'use client';

import React, { useState, useEffect, useCallback } from 'react';
import GameBoard from '@/components/game/GameBoard';
import type { GameState, Piece, Board, Square, PlayerType, AnimalType } from '@/types/game';
import { BOARD_SIZE, RIFT_POSITION } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, BarChart2, Cpu, User, Lightbulb } from 'lucide-react';
import { analyzeGameState } from '@/ai/flows/analyze-game-state';
import { suggestMove } from '@/ai/flows/suggest-move';
import { useToast } from "@/hooks/use-toast";
import AnimalIcon from '@/components/icons/AnimalIcons';


const initialPieces: Record<string, Piece> = {
  'h_elephant': { id: 'h_elephant', animal: 'elephant', player: 'human', position: { row: BOARD_SIZE - 1, col: 1 } },
  'h_lion': { id: 'h_lion', animal: 'lion', player: 'human', position: { row: BOARD_SIZE - 1, col: BOARD_SIZE - 2 } },
  'ai_zebra': { id: 'ai_zebra', animal: 'zebra', player: 'ai', position: { row: 0, col: 1 } },
  'ai_cheetah': { id: 'ai_cheetah', animal: 'cheetah', player: 'ai', position: { row: 0, col: BOARD_SIZE - 2 } },
};

function createInitialBoard(pieces: Record<string, Piece>): Board {
  const board: Board = Array(BOARD_SIZE).fill(null).map((_, r) =>
    Array(BOARD_SIZE).fill(null).map((_, c) => ({
      row: r,
      col: c,
      isRift: r === RIFT_POSITION.row && c === RIFT_POSITION.col,
      pieceId: null,
    }))
  );

  Object.values(pieces).forEach(p => {
    board[p.position.row][p.position.col].pieceId = p.id;
  });
  return board;
}

function initializeGameState(): GameState {
  const pieces = JSON.parse(JSON.stringify(initialPieces)); // Deep copy
  return {
    board: createInitialBoard(pieces),
    pieces: pieces,
    currentPlayer: 'human',
    selectedPieceId: null,
    validMoves: [],
    winner: null,
    playerOneName: 'Human Player',
    playerTwoName: 'AI Opponent',
    analysis: null,
    aiSuggestion: null,
    isGameOver: false,
    message: "Human Player's turn.",
  };
}

function getBoardString(board: Board, pieces: Record<string, Piece>): string {
  return board.map(row =>
    row.map(square => {
      if (square.pieceId) {
        const piece = pieces[square.pieceId];
        const playerChar = piece.player === 'human' ? 'H' : 'A';
        const animalChar = piece.animal.substring(0,1).toUpperCase();
        return `${playerChar}${animalChar}`;
      }
      if (square.isRift) return 'RF';
      return '..';
    }).join('')
  ).join('\n');
}


export default function SavannahChasePage() {
  const [gameState, setGameState] = useState<GameState>(initializeGameState);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const { toast } = useToast();

  const checkWinCondition = useCallback((currentPieces: Record<string, Piece>): PlayerType | null => {
    for (const piece of Object.values(currentPieces)) {
      if (piece.player === 'human' && piece.position.row === 0) return 'human';
      if (piece.player === 'ai' && piece.position.row === BOARD_SIZE - 1) return 'ai';
    }
    return null;
  }, []);
  
  const calculateValidMoves = useCallback((piece: Piece, board: Board, currentPieces: Record<string, Piece>): { row: number; col: number }[] => {
    if (!piece) return [];
    const moves: { row: number; col: number }[] = [];
    const { row, col } = piece.position;
    const potentialMoves = [
      { r: row - 1, c: col }, { r: row + 1, c: col },
      { r: row, c: col - 1 }, { r: row, c: col + 1 },
    ];

    potentialMoves.forEach(move => {
      if (move.r >= 0 && move.r < BOARD_SIZE && move.c >= 0 && move.c < BOARD_SIZE) {
        const targetSquare = board[move.r][move.c];
        if (!targetSquare.pieceId) { // Can only move to empty squares
          moves.push({ row: move.r, col: move.c });
        }
      }
    });
    return moves;
  }, []);

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (gameState.isGameOver || gameState.currentPlayer !== 'human') return;

    const clickedSquare = gameState.board[row][col];
    const pieceInSquare = clickedSquare.pieceId ? gameState.pieces[clickedSquare.pieceId] : null;

    if (gameState.selectedPieceId) {
      const selectedPiece = gameState.pieces[gameState.selectedPieceId];
      const isValidMove = gameState.validMoves.some(m => m.row === row && m.col === col);

      if (isValidMove) {
        const newPieces = { ...gameState.pieces };
        const newBoard = gameState.board.map(r => r.map(s => ({ ...s })));

        // Vacate old square
        newBoard[selectedPiece.position.row][selectedPiece.position.col].pieceId = null;
        
        // Update piece position
        newPieces[selectedPiece.id] = { ...selectedPiece, position: { row, col } };
        
        // Occupy new square
        newBoard[row][col].pieceId = selectedPiece.id;
        
        let nextPlayer: PlayerType = 'ai';
        let message = "AI Opponent's turn.";

        // Rift logic
        if (newBoard[row][col].isRift) {
          toast({ title: "Rift Zone!", description: `${selectedPiece.animal} landed on a rift and loses the next turn!` });
          nextPlayer = 'human'; // Skip AI's turn
          message = "Human Player's turn again due to Rift!";
        }
        
        const winner = checkWinCondition(newPieces);

        setGameState(prev => ({
          ...prev,
          board: newBoard,
          pieces: newPieces,
          currentPlayer: winner ? prev.currentPlayer : nextPlayer,
          selectedPieceId: null,
          validMoves: [],
          winner,
          isGameOver: !!winner,
          message: winner ? `${winner === 'human' ? prev.playerOneName : prev.playerTwoName} wins!` : message,
        }));
      } else {
        // Clicked on an invalid square or own piece again, deselect or select new piece
        if (pieceInSquare && pieceInSquare.player === 'human') {
          setGameState(prev => ({
            ...prev,
            selectedPieceId: pieceInSquare.id,
            validMoves: calculateValidMoves(pieceInSquare, prev.board, prev.pieces),
          }));
        } else {
          setGameState(prev => ({ ...prev, selectedPieceId: null, validMoves: [] }));
        }
      }
    } else if (pieceInSquare && pieceInSquare.player === 'human') {
      // No piece selected, and clicked on a human player's piece
      setGameState(prev => ({
        ...prev,
        selectedPieceId: pieceInSquare.id,
        validMoves: calculateValidMoves(pieceInSquare, prev.board, prev.pieces),
      }));
    }
  }, [gameState, calculateValidMoves, checkWinCondition, toast]);

  const handleAiAnalyze = async () => {
    setIsLoadingAI(true);
    try {
      const boardString = getBoardString(gameState.board, gameState.pieces);
      const analysisResult = await analyzeGameState({
        boardState: boardString,
        playerOneName: gameState.playerOneName,
        playerTwoName: gameState.playerTwoName,
      });
      setGameState(prev => ({ ...prev, analysis: analysisResult }));
      toast({ title: "AI Analysis Complete", description: "Check the game info panel."});
    } catch (error) {
      console.error("Error analyzing game state:", error);
      toast({ title: "AI Error", description: "Could not analyze game state.", variant: "destructive"});
      setGameState(prev => ({ ...prev, analysis: null }));
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
      // Type assertion, assuming SuggestMoveOutput has suggestedMove
      const suggestionText = (suggestionResult as { suggestedMove: string }).suggestedMove;
      setGameState(prev => ({ ...prev, aiSuggestion: suggestionText }));
      toast({ title: "AI Suggestion Ready", description: suggestionText || "AI has a suggestion."});
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      toast({ title: "AI Error", description: "Could not get AI suggestion.", variant: "destructive"});
      setGameState(prev => ({ ...prev, aiSuggestion: "Error fetching suggestion." }));
    } finally {
      setIsLoadingAI(false);
    }
  };
  
  // AI Turn Logic
  useEffect(() => {
    if (gameState.currentPlayer === 'ai' && !gameState.isGameOver && !isLoadingAI) {
      setIsLoadingAI(true);
      const performAiMove = async () => {
        try {
          const boardString = getBoardString(gameState.board, gameState.pieces);
          const suggestionResult = await suggestMove({
            boardState: boardString,
            playerTurn: gameState.playerTwoName,
          });
          const suggestedMoveText = (suggestionResult as { suggestedMove: string }).suggestedMove;
          setGameState(prev => ({ ...prev, aiSuggestion: suggestedMoveText }));
          
          // Basic AI: Find first movable AI piece and make a valid move towards human's side.
          // This is a placeholder. A real AI would parse suggestedMoveText or use a better strategy.
          const aiPieces = Object.values(gameState.pieces).filter(p => p.player === 'ai');
          let moved = false;
          for (const piece of aiPieces) {
            const validMoves = calculateValidMoves(piece, gameState.board, gameState.pieces);
            if (validMoves.length > 0) {
              // Prefer moves downwards (towards human side)
              const sortedMoves = validMoves.sort((a,b) => b.row - a.row);
              const move = sortedMoves[0];

              const newPieces = { ...gameState.pieces };
              const newBoard = gameState.board.map(r => r.map(s => ({ ...s })));
              newBoard[piece.position.row][piece.position.col].pieceId = null;
              newPieces[piece.id] = { ...piece, position: { row: move.row, col: move.col } };
              newBoard[move.row][move.col].pieceId = piece.id;
              
              let nextPlayer: PlayerType = 'human';
              let message = "Human Player's turn.";

              if (newBoard[move.row][move.col].isRift) {
                toast({ title: "Rift Zone!", description: `${piece.animal} landed on a rift and loses the next turn!` });
                nextPlayer = 'ai'; // Skip Human's turn
                message = "AI Opponent's turn again due to Rift!";
              }

              const winner = checkWinCondition(newPieces);
              setGameState(prev => ({
                ...prev,
                board: newBoard,
                pieces: newPieces,
                currentPlayer: winner ? prev.currentPlayer : nextPlayer,
                winner,
                isGameOver: !!winner,
                message: winner ? `${winner === 'human' ? prev.playerOneName : prev.playerTwoName} wins!` : message,
                aiSuggestion: `AI moved ${piece.animal} from (${piece.position.row},${piece.position.col}) to (${move.row},${move.col}). ${suggestedMoveText ? `(AI suggestion: ${suggestedMoveText})` : ''}`
              }));
              moved = true;
              break;
            }
          }
          if (!moved) { // AI has no moves
             setGameState(prev => ({ ...prev, currentPlayer: 'human', message: "AI has no moves. Human Player's turn."}));
          }

        } catch (error) {
          console.error("Error during AI turn:", error);
          toast({ title: "AI Error", description: "AI failed to make a move.", variant: "destructive"});
          setGameState(prev => ({ ...prev, currentPlayer: 'human', message: "AI Error. Human Player's turn." })); // Fallback to human
        } finally {
          setIsLoadingAI(false);
        }
      };
      // Add a small delay for AI "thinking" time
      const timeoutId = setTimeout(performAiMove, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [gameState.currentPlayer, gameState.isGameOver, gameState.board, gameState.pieces, calculateValidMoves, checkWinCondition, toast, isLoadingAI]);

  const handleResetGame = () => {
    setGameState(initializeGameState());
    toast({ title: "Game Reset", description: "A new game has started."});
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
      <header className="mb-6 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary tracking-tight">Savannah Chase</h1>
        <p className="text-muted-foreground text-lg sm:text-xl">A game of wits and speed!</p>
      </header>

      <main className="flex flex-col lg:flex-row gap-6 md:gap-8 w-full max-w-7xl">
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
            <p className={`text-xl font-medium p-3 rounded-md shadow ${gameState.isGameOver ? (gameState.winner === 'human' ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'bg-card'}`}>
              {gameState.message}
            </p>
          </div>
        </section>

        <aside className="w-full lg:w-96 xl:w-1/3 flex flex-col gap-6">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl text-primary">
                <BarChart2 size={28}/> Game Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">Current Player:</span>
                <span className={`font-semibold flex items-center gap-1 ${gameState.currentPlayer === 'human' ? 'text-primary' : 'text-accent'}`}>
                  {gameState.currentPlayer === 'human' ? <User size={20}/> : <Cpu size={20}/>}
                  {gameState.currentPlayer === 'human' ? gameState.playerOneName : gameState.playerTwoName}
                </span>
              </div>
              {gameState.winner && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-muted-foreground">Winner:</span>
                  <span className="font-semibold text-green-600 flex items-center gap-1">
                    <AnimalIcon type="crown" size={20} />
                    {gameState.winner === 'human' ? gameState.playerOneName : gameState.playerTwoName}
                  </span>
                </div>
              )}
              <Button onClick={handleResetGame} className="w-full" variant="outline">Reset Game</Button>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl text-primary">
                <Lightbulb size={28}/> AI Assistance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleAiAnalyze} disabled={isLoadingAI} className="w-full">
                {isLoadingAI ? 'Analyzing...' : 'Analyze Game State'}
              </Button>
              <Button onClick={handleAiSuggest} disabled={isLoadingAI} className="w-full">
                {isLoadingAI ? 'Getting Suggestion...' : 'Get AI Move Suggestion'}
              </Button>
              {gameState.analysis && (
                <div className="mt-3 p-3 bg-secondary/30 rounded-md text-sm space-y-1">
                  <p><strong>{gameState.playerOneName}:</strong> {gameState.analysis.playerOneSummary}</p>
                  <p><strong>{gameState.playerTwoName}:</strong> {gameState.analysis.playerTwoSummary}</p>
                </div>
              )}
              {gameState.aiSuggestion && (
                 <div className="mt-3 p-3 bg-secondary/30 rounded-md text-sm">
                  <p><strong>AI Suggests:</strong> {gameState.aiSuggestion}</p>
                </div>
              )}
              {isLoadingAI && <p className="text-sm text-muted-foreground text-center">AI is thinking...</p>}
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}
