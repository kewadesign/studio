
'use client';
import React from 'react';
import type { Board, Piece, GameState, TerrainType } from '@/types/game';
import GamePiece from './GamePiece';
import { BOARD_SIZE } from '@/types/game';

interface GameBoardProps {
  board: Board;
  pieces: Record<string, Piece>;
  selectedPieceId?: string | null;
  validMoves: { row: number; col: number }[];
  onSquareClick: (row: number, col: number) => void;
  currentPlayer: GameState['currentPlayer'];
  isGameOver: boolean;
}

const getTerrainChar = (terrain: TerrainType): string => {
  switch (terrain) {
    case 'rift': return 'K';
    case 'swamp': return 'S';
    case 'hill': return 'H';
    default: return '';
  }
};

const getTerrainColorClass = (terrain: TerrainType): string => {
  switch (terrain) {
    case 'rift': return 'text-destructive font-bold'; 
    case 'swamp': return 'text-[var(--chart-2)] font-bold'; 
    case 'hill': return 'text-[var(--chart-4)] font-bold';  
    default: return '';
  }
}

const GameBoard: React.FC<GameBoardProps> = ({
  board,
  pieces,
  selectedPieceId,
  validMoves,
  onSquareClick,
  currentPlayer,
  isGameOver,
}) => {
  // BOARD_SIZE is now 7, this will dynamically create grid-cols-7 if tailwind supports it via JIT
  // Or use inline style for safety.
  const gridColsClass = `grid-cols-${BOARD_SIZE}`; 

  return (
    <div 
      className={`grid ${gridColsClass} gap-1 p-2 bg-secondary/30 rounded-lg shadow-md aspect-square w-full max-w-md sm:max-w-lg md:max-w-[calc(theme(spacing.96)_*_0.875)] lg:max-w-xl xl:max-w-2xl`} // Adjusted max-width slightly for 7x7
      style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
    >
      {board.flat().map((square) => {
        const piece = square.pieceId ? pieces[square.pieceId] : null;
        const isSelected = piece?.id === selectedPieceId;
        const isValidMove = validMoves.some(
          (move) => move.row === square.row && move.col === square.col
        );

        let squareBgClass = (square.row + square.col) % 2 === 0 ? 'bg-background' : 'bg-muted/50';
        
        if (isValidMove) {
          squareBgClass = 'bg-green-300 dark:bg-green-700 cursor-pointer hover:bg-green-400';
        } else if (piece && piece.player === currentPlayer && !isGameOver) {
           // Check if this piece can be selected (e.g. Lion not paused)
          const currentPieceIsLion = piece.animal === 'lion';
          // This specific check for lionMovedLastTurn needs to be passed or determined here
          // For now, assume it's selectable if it's their turn. Lion pause logic is in page.tsx
          squareBgClass += ' cursor-pointer hover:bg-primary/20';
        } else if (!piece && square.terrain !== 'none' && !isGameOver) {
           squareBgClass += ' cursor-default'; 
        }

        return (
          <div
            key={`${square.row}-${square.col}`}
            className={`aspect-square flex items-center justify-center rounded-sm transition-colors duration-150 ${squareBgClass}`}
            onClick={() => !isGameOver && onSquareClick(square.row, square.col)}
            role="button"
            tabIndex={0}
            aria-label={`Square ${square.row + 1}, ${square.col + 1}${piece ? `, contains ${piece.animal}` : ''}${square.terrain !== 'none' && !piece ? `, terrain: ${square.terrain}` : ''}${isValidMove ? ', valid move' : ''}`}
          >
            {piece && <GamePiece piece={piece} isSelected={isSelected} />}
            {!piece && square.terrain !== 'none' && (
              <span className={`text-xl sm:text-2xl ${getTerrainColorClass(square.terrain)}`}>
                {getTerrainChar(square.terrain)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GameBoard;
