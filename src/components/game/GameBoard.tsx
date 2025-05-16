'use client';
import React from 'react';
import type { Board, Piece, GameState } from '@/types/game';
import GamePiece from './GamePiece';
import AnimalIcon from '@/components/icons/AnimalIcons';

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
  return (
    <div className="grid grid-cols-5 gap-1 p-2 bg-secondary/30 rounded-lg shadow-md aspect-square w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl">
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
            className={`aspect-square flex items-center justify-center rounded-md transition-colors duration-150 ${squareBgClass}`}
            onClick={() => !isGameOver && onSquareClick(square.row, square.col)}
            role="button"
            tabIndex={0}
            aria-label={`Square ${square.row + 1}, ${square.col + 1}${piece ? `, contains ${piece.animal}` : ''}${isValidMove ? ', valid move' : ''}`}
          >
            {square.isRift && !piece && <AnimalIcon type="rift" size={24} />}
            {piece && <GamePiece piece={piece} isSelected={isSelected} />}
          </div>
        );
      })}
    </div>
  );
};

export default GameBoard;
