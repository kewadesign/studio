
import React from 'react';
import type { Piece as PieceType } from '@/types/game';

interface GamePieceProps {
  piece: PieceType;
  isSelected: boolean;
  displayChar: string;
}

const GamePiece: React.FC<GamePieceProps> = ({ piece, isSelected, displayChar }) => {
  // Player 'human' (Black, Bottom) uses Primary theme colors
  // Player 'ai' (White, Top) uses Accent theme colors
  
  // Base classes for the piece
  const baseClasses = "w-10/12 h-10/12 flex items-center justify-center rounded-full transition-all duration-200 ease-in-out text-2xl sm:text-3xl font-bold border-2 shadow-lg";

  // Player-specific styling
  let playerSpecificClasses = "";
  if (piece.player === 'human') { // Human Player (Black, Bottom) - uses primary theme
    playerSpecificClasses = "bg-primary text-primary-foreground border-primary hover:bg-primary/90";
  } else { // AI Player (White, Top) - uses accent theme
    playerSpecificClasses = "bg-accent text-accent-foreground border-accent hover:bg-accent/90";
  }

  // Selection-specific styling
  const selectionClasses = isSelected ? "ring-4 ring-offset-background ring-ring scale-110 shadow-xl" : "hover:shadow-xl";

  return (
    <div
      className={`${baseClasses} ${playerSpecificClasses} ${selectionClasses}`}
      aria-label={`${piece.player} ${piece.animal}`}
    >
      {displayChar}
    </div>
  );
};

export default GamePiece;

    