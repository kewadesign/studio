
'use client';
import React from 'react';
import type { Board, Piece, GameState, TerrainType, AnimalType } from '@/types/game'; // Added AnimalType
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
  getAnimalChar: (animal: AnimalType) => string; // Added prop
}

const getTerrainDisplayChar = (terrain: TerrainType): string => {
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
    case 'swamp': return 'text-emerald-600 dark:text-emerald-400 font-bold'; // Example: Sumpf-Farbe
    case 'hill': return 'text-yellow-700 dark:text-yellow-500 font-bold';  // Example: Hügel-Farbe
    default: return 'text-muted-foreground';
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
  getAnimalChar, // Destructure new prop
}) => {
  const gridColsClass = `grid-cols-${BOARD_SIZE}`; 

  return (
    <div 
      className={`grid ${gridColsClass} gap-1 p-2 bg-card rounded-lg shadow-lg aspect-square w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl`}
      style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
    >
      {board.flat().map((square) => {
        const piece = square.pieceId ? pieces[square.pieceId] : null;
        const isSelected = piece?.id === selectedPieceId;
        const isValidMove = validMoves.some(
          (move) => move.row === square.row && move.col === square.col
        );

        let squareBgClass = (square.row + square.col) % 2 === 0 ? 'bg-background' : 'bg-muted/30';
        let cursorClass = 'cursor-default';

        if (isValidMove) {
          squareBgClass = 'bg-green-400/50 dark:bg-green-600/50';
          cursorClass = 'cursor-pointer hover:bg-green-500/60';
        } else if (piece && piece.player === currentPlayer && !isGameOver) {
          squareBgClass += ' hover:bg-primary/20';
          cursorClass = 'cursor-pointer';
        }
        
        // Highlighting for selected piece itself
        if (isSelected) {
            squareBgClass = 'bg-primary/30'; // Highlight selected piece's square
        }


        return (
          <div
            key={`${square.row}-${square.col}`}
            className={`aspect-square flex items-center justify-center rounded-sm transition-colors duration-150 ${squareBgClass} ${cursorClass}`}
            onClick={() => !isGameOver && onSquareClick(square.row, square.col)}
            role="button"
            tabIndex={0}
            aria-label={`Square ${square.row + 1}, ${String.fromCharCode(97 + square.col)}${piece ? `, contains ${piece.player} ${piece.animal}` : ''}${square.terrain !== 'none' && !piece ? `, terrain: ${square.terrain}` : ''}${isValidMove ? ', valid move' : ''}`}
          >
            {piece && (
              <GamePiece 
                piece={piece} 
                isSelected={isSelected} 
                displayChar={getAnimalChar(piece.animal)} // Pass display character
              />
            )}
            {!piece && square.terrain !== 'none' && (
              <span className={`text-2xl sm:text-3xl ${getTerrainColorClass(square.terrain)} opacity-70`}>
                {getTerrainDisplayChar(square.terrain)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GameBoard;
