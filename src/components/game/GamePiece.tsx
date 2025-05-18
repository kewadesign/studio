
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

  let pieceSpecificClasses = '';
  let textSpecificClasses = '';

  if (piece.player === 'human') { // Spieler (Weiß) - heller
    pieceSpecificClasses = 'bg-primary'; // Helles, desaturiertes Orange/Gold (Theme-Primärfarbe)
    textSpecificClasses = 'text-primary-foreground drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]'; // Dunklerer Text
  } else { // KI (Schwarz) - dunkler
    pieceSpecificClasses = 'bg-accent'; // Dunkleres Orange (Theme-Akzentfarbe)
    textSpecificClasses = 'text-accent-foreground drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]'; // Hellerer Text
  }

  const selectionClasses = isSelected
    ? 'ring-4 ring-offset-background ring-yellow-500 scale-110 shadow-xl' // Gelb-orangener Ring
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
