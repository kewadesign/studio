import React from 'react';
import type { Piece as PieceType } from '@/types/game';

interface GamePieceProps {
  piece: PieceType;
  isSelected: boolean;
  displayChar: string;
}

const GamePiece: React.FC<GamePieceProps> = ({ piece, isSelected, displayChar }) => {
  const playerColorClass = piece.player === 'human' ? 'text-primary-foreground bg-primary/70' : 'text-accent-foreground bg-accent/70';
  
  return (
    <div
      className={`w-full h-full flex items-center justify-center rounded-full transition-all duration-200 ease-in-out text-2xl font-bold
        ${isSelected ? 'ring-4 ring-offset-2 ring-blue-500 scale-110 shadow-lg' : 'shadow-md'}
        ${playerColorClass}`}
      aria-label={`${piece.player} ${piece.animal}`}
    >
      {displayChar}
    </div>
  );
};

export default GamePiece;
