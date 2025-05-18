
import React from 'react';
import type { Piece as PieceType } from '@/types/game';

interface GamePieceProps {
  piece: PieceType;
  isSelected: boolean;
  displayChar: string;
}

const GamePiece: React.FC<GamePieceProps> = ({ piece, isSelected, displayChar }) => {
  // Base classes for the piece: Ensure it's a square then make it round
  // Using w-[85%] and aspect-square to maintain a circle within the parent cell
  const baseClasses =
    'w-[85%] aspect-square flex items-center justify-center rounded-full transition-all duration-200 ease-in-out text-2xl sm:text-3xl font-bold shadow-lg text-white';

  // Player-specific styling with custom gradients
  // Player 'human' (White, Bottom)
  // Gradient: Red to Orange/Yellow
  const humanPlayerGradient = 'bg-[linear-gradient(90deg,rgba(253,29,29,1)_28%,rgba(252,176,69,1)_100%)]';
  // AI 'ai' (Black, Top)
  // Gradient: Red to Purple
  const aiPlayerGradient = 'bg-[linear-gradient(90deg,rgba(253,29,29,1)_29%,rgba(148,69,252,1)_62%)]';

  let playerSpecificClasses = '';
  if (piece.player === 'human') { // Human (White, Bottom)
    playerSpecificClasses = `${humanPlayerGradient} hover:opacity-90`;
  } else { // AI (Black, Top)
    playerSpecificClasses = `${aiPlayerGradient} hover:opacity-90`;
  }

  // Selection-specific styling
  const selectionClasses = isSelected
    ? 'ring-4 ring-offset-background ring-yellow-400 scale-110 shadow-xl' // Changed ring to yellow-400
    : 'hover:shadow-xl';

  return (
    <div
      className={`${baseClasses} ${playerSpecificClasses} ${selectionClasses}`}
      aria-label={`${piece.player} ${piece.animal}`}
    >
      <span className="drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
        {displayChar}
      </span>
    </div>
  );
};

export default GamePiece;
