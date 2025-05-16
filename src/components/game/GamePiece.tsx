import React from 'react';
import type { Piece as PieceType } from '@/types/game';
import AnimalIcon from '@/components/icons/AnimalIcons';

interface GamePieceProps {
  piece: PieceType;
  isSelected: boolean;
}

const GamePiece: React.FC<GamePieceProps> = ({ piece, isSelected }) => {
  return (
    <div
      className={`w-full h-full flex items-center justify-center rounded-full transition-all duration-200 ease-in-out
        ${isSelected ? 'ring-4 ring-offset-2 ring-blue-500 scale-110' : ''}
        ${piece.player === 'human' ? 'bg-primary/30' : 'bg-accent/30'}`}
      aria-label={`${piece.player} ${piece.animal}`}
    >
      <AnimalIcon animal={piece.animal} player={piece.player} type="animal" size={32} />
    </div>
  );
};

export default GamePiece;
