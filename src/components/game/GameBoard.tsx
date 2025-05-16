
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
    case 'rift': return 'text-destructive font-bold'; // K for Kluft
    case 'swamp': return 'text-[var(--chart-2)] font-bold'; // S for Sumpf (using chart-2 color)
    case 'hill': return 'text-[var(--chart-4)] font-bold';  // H for Hügel (using chart-4 color)
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
  const gridColsClass = `grid-cols-${BOARD_SIZE}`;

  return (
    <div 
      className={`grid ${gridColsClass} gap-1 p-2 bg-secondary/30 rounded-lg shadow-md aspect-square w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl`}
      style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
    >
      {board.flat().map((square) => {
        const piece = square.pieceId ? pieces[square.pieceId] : null;
        const isSelected = piece?.id === selectedPieceId;
        const isValidMove = validMoves.some(
          (move) => move.row === square.row && move.col === square.col
        );

        let squareBgClass = (square.row + square.col) % 2 === 0 ? 'bg-background' : 'bg-muted/50';
        // No special background for terrain, letters will indicate it
        
        if (isValidMove) {
          squareBgClass = 'bg-green-300 dark:bg-green-700 cursor-pointer hover:bg-green-400';
        } else if (piece && piece.player === currentPlayer && !isGameOver) {
          squareBgClass += ' cursor-pointer hover:bg-primary/20';
        } else if (!piece && square.terrain !== 'none' && !isGameOver) {
           // Make terrain squares clickable if empty (though click logic handles selection)
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
              <span className={`text-2xl ${getTerrainColorClass(square.terrain)}`}>
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
