
import React from 'react';
import type { Piece as PieceType } from '@/types/game';

interface GamePieceProps {
  piece: PieceType;
  isSelected: boolean;
  displayChar: string;
}

const GamePiece: React.FC<GamePieceProps> = ({ piece, isSelected, displayChar }) => {
  // Base classes for the piece
  // Removed border-2 from here
  const baseClasses = "w-10/12 h-10/12 flex items-center justify-center rounded-full transition-all duration-200 ease-in-out text-2xl sm:text-3xl font-bold shadow-lg";

  // Player-specific styling
  // Player 'human' (White, Bottom) uses Primary theme colors for their pieces.
  // Player 'ai' (Black, Top) uses Accent theme colors for their pieces.
  let playerSpecificClasses = "";
  if (piece.player === 'human') { // Human is White (Bottom)
    // Removed border-primary-foreground
    playerSpecificClasses = "bg-gradient-to-br from-primary/90 via-primary to-primary/70 text-primary-foreground hover:from-primary hover:to-primary/80";
  } else { // AI is Black (Top)
    // Removed border-accent-foreground
    playerSpecificClasses = "bg-gradient-to-br from-accent/90 via-accent to-accent/70 text-accent-foreground hover:from-accent hover:to-accent/80";
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
