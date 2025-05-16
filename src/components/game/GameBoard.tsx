'use client';
import React from 'react';
import type { Board, Piece, GameState } from '@/types/game';
import GamePiece from './GamePiece';
import AnimalIcon from '@/components/icons/AnimalIcons';
import { BOARD_SIZE } from '@/types/game'; // Import BOARD_SIZE

interface GameBoardProps {
  board: Board;
  pieces: Record<string, Piece>;
  selectedPieceId?: string | null;
  validMoves: { row: number; col: number }[];
  onSquareClick: (row: number, col: number) => void;
  currentPlayer: GameState['currentPlayer'];
  isGameOver: boolean;
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
  // Dynamically create grid-cols class based on BOARD_SIZE
  const gridColsClass = `grid-cols-${BOARD_SIZE}`;

  return (
    <div 
      className={`grid ${gridColsClass} gap-1 p-2 bg-secondary/30 rounded-lg shadow-md aspect-square w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl`}
      style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }} // Ensure Tailwind JIT picks this up or use inline style
    >
      {board.flat().map((square) => {
        const piece = square.pieceId ? pieces[square.pieceId] : null;
        const isSelected = piece?.id === selectedPieceId;
        const isValidMove = validMoves.some(
          (move) => move.row === square.row && move.col === square.col
        );

        let squareBgClass = (square.row + square.col) % 2 === 0 ? 'bg-background' : 'bg-muted/50';
        if (square.isRift) {
          squareBgClass = 'bg-purple-200 dark:bg-purple-800';
        }
        if (isValidMove) {
          squareBgClass = 'bg-green-300 dark:bg-green-700 cursor-pointer hover:bg-green-400';
        } else if (piece && piece.player === currentPlayer && !isGameOver) {
          squareBgClass += ' cursor-pointer hover:bg-primary/20';
        }


        return (
          <div
            key={`${square.row}-${square.col}`}
            className={`aspect-square flex items-center justify-center rounded-sm transition-colors duration-150 ${squareBgClass}`} // rounded-sm for tighter grid
            onClick={() => !isGameOver && onSquareClick(square.row, square.col)}
            role="button"
            tabIndex={0}
            aria-label={`Square ${square.row + 1}, ${square.col + 1}${piece ? `, contains ${piece.animal}` : ''}${isValidMove ? ', valid move' : ''}`}
          >
            {square.isRift && !piece && <AnimalIcon type="rift" size={20} />} 
            {piece && <GamePiece piece={piece} isSelected={isSelected} />}
          </div>
        );
      })}
    </div>
  );
};

export default GameBoard;
