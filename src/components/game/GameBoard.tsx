
'use client';
import React from 'react';
import type { Board, Piece, GameState, TerrainType, RiftDirection, AnimalType } from '@/types/game'; 
import GamePiece from './GamePiece';
import { BOARD_SIZE } from '@/types/game';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface GameBoardProps {
  board: Board;
  pieces: Record<string, Piece>;
  selectedPieceId?: string | null;
  validMoves: { row: number; col: number }[];
  onSquareClick: (row: number, col: number) => void;
  currentPlayer: GameState['currentPlayer'];
  isGameOver: boolean;
  getAnimalChar: (animal: AnimalType) => string; // Add this prop
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
    case 'swamp': return 'text-emerald-600 dark:text-emerald-400 font-bold'; 
    case 'hill': return 'text-yellow-700 dark:text-yellow-500 font-bold';  
    default: return 'text-muted-foreground';
  }
}

const RiftArrowIcon: React.FC<{direction?: RiftDirection, className?: string}> = ({ direction, className }) => {
  if (!direction) return null;
  // Adjust icon size for smaller board cells
  const iconSize = 14;
  if (direction.dRow === -1 && direction.dCol === 0) return <ArrowUp size={iconSize} className={className} />; // North
  if (direction.dRow === 1 && direction.dCol === 0) return <ArrowDown size={iconSize} className={className} />;  // South
  if (direction.dRow === 0 && direction.dCol === -1) return <ArrowLeft size={iconSize} className={className} />; // West
  if (direction.dRow === 0 && direction.dCol === 1) return <ArrowRight size={iconSize} className={className} />; // East
  return null;
}

const GameBoard: React.FC<GameBoardProps> = ({
  board,
  pieces,
  selectedPieceId,
  validMoves,
  onSquareClick,
  currentPlayer,
  isGameOver,
  getAnimalChar, // Destructure prop
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
        } else if (piece && piece.player === currentPlayer && !isGameOver && currentPlayer === 'human') {
          squareBgClass += ' hover:bg-primary/20';
          cursorClass = 'cursor-pointer';
        }
        
        if (isSelected) {
            squareBgClass = 'bg-primary/30'; 
        }

        return (
          <div
            key={`${square.row}-${square.col}`}
            className={`aspect-square flex items-center justify-center rounded-sm transition-colors duration-150 ${squareBgClass} ${cursorClass} relative`}
            onClick={() => !isGameOver && onSquareClick(square.row, square.col)}
            role="button"
            tabIndex={0}
            aria-label={`Square ${square.row + 1}, ${String.fromCharCode(97 + square.col)}${piece ? `, contains ${piece.player} ${piece.animal}` : ''}${square.terrain !== 'none' && !piece ? `, terrain: ${square.terrain}` : ''}${isValidMove ? ', valid move' : ''}`}
          >
            {piece && (
              <GamePiece 
                piece={piece} 
                isSelected={isSelected}
                displayChar={getAnimalChar(piece.animal)} // Pass displayChar
              />
            )}
            {!piece && square.terrain !== 'none' && (
              <div className="flex flex-col items-center justify-center text-center">
                <span className={`text-sm sm:text-base ${getTerrainColorClass(square.terrain)} opacity-80 leading-none`}>
                  {getTerrainDisplayChar(square.terrain)}
                </span>
                {square.terrain === 'rift' && (
                  <RiftArrowIcon direction={square.riftDirection} className={`${getTerrainColorClass(square.terrain)} opacity-80`} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GameBoard;

    