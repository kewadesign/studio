
import React from 'react';
import type { Piece as PieceType } from '@/types/game';

interface GamePieceProps {
  piece: PieceType;
  isSelected: boolean;
  displayChar: string;
}

const GamePiece: React.FC<GamePieceProps> = ({ piece, isSelected, displayChar }) => {
  const baseClasses =
    'w-[80%] aspect-square flex items-center justify-center rounded-full transition-all duration-200 ease-in-out text-2xl sm:text-3xl font-bold shadow-lg';

  // Conditional styling based on the player
  let pieceSpecificClasses = '';
  let textSpecificClasses = '';

  if (piece.player === 'human') { // Player's pieces (lighter)
    pieceSpecificClasses = 'bg-[radial-gradient(ellipse_at_center,_hsl(var(--card))_40%,_hsl(var(--primary))_100%)]'; // Light tan/beige to muted gold
    textSpecificClasses = 'text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.6)]';
  } else { // AI's pieces (darker)
    pieceSpecificClasses = 'bg-[radial-gradient(ellipse_at_center,_hsl(var(--muted))_40%,_hsl(var(--foreground))_100%)]'; // Muted tan/gray to dark brown
    textSpecificClasses = 'text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]';
  }

  const selectionClasses = isSelected
    ? 'ring-4 ring-offset-background ring-yellow-400 scale-110 shadow-xl'
    : 'hover:shadow-xl';

  return (
    <div
      className={`${baseClasses} ${pieceSpecificClasses} ${selectionClasses}`}
      aria-label={`${piece.player} ${piece.animal}`}
    >
      <span className={textSpecificClasses}>
        {displayChar}
      </span>
    </div>
  );
};

export default GamePiece;
