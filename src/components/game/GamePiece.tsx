
import React from 'react';
import type { Piece as PieceType } from '@/types/game';

interface GamePieceProps {
  piece: PieceType;
  isSelected: boolean;
  displayChar: string; // Add this prop back
}

const GamePiece: React.FC<GamePieceProps> = ({ piece, isSelected, displayChar }) => {
  // Player 'human' is Black (bottom, primary color), Player 'ai' is White (top, accent color)
  const playerColorClass = piece.player === 'human' ? 'text-primary-foreground bg-primary/80' : 'text-accent-foreground bg-accent/80';
  
  return (
    <div
      className={`w-10/12 h-10/12 flex items-center justify-center rounded-full transition-all duration-200 ease-in-out text-2xl sm:text-3xl font-bold
        ${isSelected ? 'ring-4 ring-offset-2 ring-blue-500 scale-110 shadow-lg' : 'shadow-md'}
        ${playerColorClass}`}
      aria-label={`${piece.player} ${piece.animal}`}
    >
      {displayChar}
    </div>
  );
};

export default GamePiece;

    