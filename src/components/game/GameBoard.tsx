
'use client';
import React from 'react';
import type { Board, Piece, GameState, TerrainType, RiftDirection, AnimalType } from '@/types/game';
import GamePiece from './GamePiece';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Wind, Waves, Mountain } from 'lucide-react';

interface GameBoardProps {
  board: Board;
  pieces: Record<string, Piece>;
  selectedPieceId?: string | null;
  validMoves: { row: number; col: number }[];
  onSquareClick: (row: number, col: number) => void;
  currentPlayer: GameState['currentPlayer'];
  isGameOver: boolean;
  getAnimalChar: (animal: AnimalType) => string;
  boardCols: number;
  boardRows: number;
}

const getTerrainColorClass = (terrain: TerrainType): string => {
  switch (terrain) {
    case 'rift': return 'text-destructive font-bold';
    case 'swamp': return 'text-emerald-600 dark:text-emerald-400 font-bold';
    case 'hill': return 'text-yellow-700 dark:text-yellow-500 font-bold';
    default: return 'text-muted-foreground';
  }
}

const RiftArrowIcon: React.FC<{direction?: RiftDirection, className?: string}> = ({ direction, className }) => {
  if (!direction) return null;
  const iconSize = 12; // Slightly smaller to fit with main terrain icon
  if (direction.dRow === -1 && direction.dCol === 0) return <ArrowUp size={iconSize} className={className} />; // North
  if (direction.dRow === 1 && direction.dCol === 0) return <ArrowDown size={iconSize} className={className} />;  // South
  if (direction.dRow === 0 && direction.dCol === -1) return <ArrowLeft size={iconSize} className={className} />; // West
  if (direction.dRow === 0 && direction.dCol === 1) return <ArrowRight size={iconSize} className={className} />; // East
  return null;
}

const TerrainIconDisplay: React.FC<{terrain: TerrainType, riftDirection?: RiftDirection}> = ({ terrain, riftDirection }) => {
  const colorClass = getTerrainColorClass(terrain);
  const iconSize = 18;

  switch (terrain) {
    case 'rift':
      return (
        <div className="flex flex-col items-center justify-center">
          <Wind size={iconSize} className={colorClass} />
          <RiftArrowIcon direction={riftDirection} className={colorClass} />
        </div>
      );
    case 'swamp':
      return <Waves size={iconSize} className={colorClass} />;
    case 'hill':
      return <Mountain size={iconSize} className={colorClass} />;
    default:
      return null;
  }
}


const GameBoard: React.FC<GameBoardProps> = ({
  board,
  pieces,
  selectedPieceId,
  validMoves,
  onSquareClick,
  currentPlayer,
  isGameOver,
  getAnimalChar,
  boardCols,
  // boardRows is available but not directly used for grid-cols
}) => {
  const gridColsClass = `grid-cols-${boardCols}`;

  return (
    <div
      className={`grid ${gridColsClass} gap-1 p-2 bg-card rounded-lg shadow-lg aspect-auto w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl`}
      style={{ gridTemplateColumns: `repeat(${boardCols}, minmax(0, 1fr))` }}
    >
      {board.flat().map((square) => {
        const piece = square.pieceId ? pieces[square.pieceId] : null;
        const isSelected = piece?.id === selectedPieceId;
        const isValidMove = validMoves.some(
          (move) => move.row === square.row && move.col === square.col
        );

        let squareBgClass = (square.row + square.col) % 2 === 0 ? 'bg-background' : 'bg-muted/30';
        let cursorClass = 'cursor-default';

        if (isValidMove) {
          squareBgClass = 'bg-amber-400/50 dark:bg-amber-500/50';
          cursorClass = 'cursor-pointer hover:bg-amber-500/60 dark:hover:bg-amber-600/60';
        } else if (piece && piece.player === currentPlayer && !isGameOver && currentPlayer === 'human') {
          squareBgClass += ' hover:bg-primary/20';
          cursorClass = 'cursor-pointer';
        }

        if (isSelected) {
            squareBgClass = 'bg-primary/30';
        }

        return (
          <div
            key={`${square.row}-${square.col}`}
            className={`aspect-square flex items-center justify-center rounded-sm transition-colors duration-150 ${squareBgClass} ${cursorClass} relative`}
            onClick={() => !isGameOver && onSquareClick(square.row, square.col)}
            role="button"
            tabIndex={0}
            aria-label={`Feld ${square.row + 1}, ${String.fromCharCode(65 + square.col)}${piece ? `, enthält ${piece.player === 'human' ? 'Spieler (Weiß)' : 'KI (Schwarz)'} ${getAnimalChar(piece.animal)}` : ''}${square.terrain !== 'none' && !piece ? `, Terrain: ${square.terrain}` : ''}${isValidMove ? ', gültiger Zug' : ''}`}
          >
            {piece && (
              <GamePiece
                piece={piece}
                isSelected={isSelected}
                displayChar={getAnimalChar(piece.animal)}
              />
            )}
            {!piece && square.terrain !== 'none' && (
               <TerrainIconDisplay terrain={square.terrain} riftDirection={square.riftDirection} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GameBoard;
