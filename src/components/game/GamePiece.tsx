
import React from 'react';
import type { Piece as PieceType } from '@/types/game';

interface GamePieceProps {
  piece: PieceType;
  isSelected: boolean;
  displayChar: string;
}

const GamePiece: React.FC<GamePieceProps> = ({ piece, isSelected, displayChar }) => {
  // Base classes for the piece
  const baseClasses = "w-10/12 h-10/12 flex items-center justify-center rounded-full transition-all duration-200 ease-in-out text-2xl sm:text-3xl font-bold border-2 shadow-lg";

  // Player-specific styling
  // Player 'human' (White, Bottom) uses Primary theme colors for their pieces.
  // Player 'ai' (Black, Top) uses Accent theme colors for their pieces.
  let playerSpecificClasses = "";
  if (piece.player === 'human') { 
    playerSpecificClasses = "bg-gradient-to-br from-primary/80 via-primary to-primary/60 text-primary-foreground border-primary-foreground hover:from-primary/90 hover:to-primary/70";
  } else { 
    playerSpecificClasses = "bg-gradient-to-br from-accent/80 via-accent to-accent/60 text-accent-foreground border-accent-foreground hover:from-accent/90 hover:to-accent/70";
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
