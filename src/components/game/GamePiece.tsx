
import React from 'react';
import type { Piece as PieceType } from '@/types/game';

interface GamePieceProps {
  piece: PieceType;
  isSelected: boolean;
  displayChar: string;
}

const GamePiece: React.FC<GamePieceProps> = ({ piece, isSelected, displayChar }) => {
  // Base classes for the piece: Ensure it's a square then make it round
  // Reduced width to make pieces "a bit smaller"
  const baseClasses =
    'w-[80%] aspect-square flex items-center justify-center rounded-full transition-all duration-200 ease-in-out text-2xl sm:text-3xl font-bold shadow-lg';

  // New radial gradient for a less intense, orange-brown look
  // Applied to all pieces for a unified style
  const pieceGradient = 'bg-[radial-gradient(ellipse_at_center,_#D9B38C_20%,_#BF8040_100%)]';

  // Text color is white for good contrast with the new gradient
  const textColor = 'text-white';

  // Selection-specific styling
  const selectionClasses = isSelected
    ? 'ring-4 ring-offset-background ring-yellow-400 scale-110 shadow-xl'
    : 'hover:shadow-xl';

  return (
    <div
      className={`${baseClasses} ${pieceGradient} ${textColor} ${selectionClasses}`}
      aria-label={`${piece.player} ${piece.animal}`}
    >
      <span className="drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
        {displayChar}
      </span>
    </div>
  );
};

export default GamePiece;
