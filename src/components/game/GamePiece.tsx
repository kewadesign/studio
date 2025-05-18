
import React from 'react';
import type { Piece as PieceType } from '@/types/game';
import { cn } from '@/lib/utils';

interface GamePieceProps {
  piece: PieceType;
  isSelected: boolean;
  displayChar: string;
}

const GamePiece: React.FC<GamePieceProps> = ({ piece, isSelected, displayChar }) => {
  const baseClasses =
    'w-[80%] aspect-square flex items-center justify-center rounded-full transition-all duration-200 ease-in-out text-2xl sm:text-3xl font-bold shadow-lg';

  // Spieler (Weiß, Human) - Helleres Orange
  // KI (Schwarz, AI) - Dunkleres Orange
  const pieceSpecificClasses =
    piece.player === 'human'
      ? 'bg-primary' // Helles, desaturiertes Orange (Theme-Primärfarbe)
      : 'bg-accent';   // Dunkleres Orange (Theme-Akzentfarbe)

  const textSpecificClasses =
    piece.player === 'human'
      ? 'text-primary-foreground drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]' // Dunklerer Text für hellen Hintergrund
      : 'text-accent-foreground drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]';   // Hellerer Text für dunklen Hintergrund


  const selectionClasses = isSelected
    ? 'ring-4 ring-offset-background ring-amber-500 scale-110 shadow-xl' // Gelb-orangener Ring
    : 'hover:shadow-xl';

  return (
    <div
      className={cn(baseClasses, pieceSpecificClasses, selectionClasses)}
      aria-label={`${piece.player === 'human' ? 'Spieler' : 'KI'} ${piece.animal}`}
    >
      <span className={textSpecificClasses}>
        {displayChar}
      </span>
    </div>
  );
};

export default GamePiece;
