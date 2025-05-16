
export type PlayerType = 'human' | 'ai';
export type AnimalType = 'lion' | 'goat' | 'giraffe';

export interface Piece {
  id: string;
  animal: AnimalType;
  player: PlayerType;
  position: { row: number; col: number };
}

export type TerrainType = 'rift' | 'swamp' | 'hill' | 'none';

export interface Square {
  row: number;
  col: number;
  terrain: TerrainType;
  pieceId?: string | null;
}

export type Board = Square[][];

export interface GameState {
  board: Board;
  pieces: Record<string, Piece>;
  currentPlayer: PlayerType;
  selectedPieceId?: string | null;
  validMoves: { row: number; col: number }[];
  winner?: PlayerType | null;
  playerOneName: string;
  playerTwoName: string;
  analysis: { playerOneSummary: string; playerTwoSummary: string } | null;
  aiSuggestion: string | null;
  isGameOver: boolean;
  message: string;
}

export const BOARD_SIZE = 8;

export interface TerrainPlacement {
  pos: { row: number; col: number };
  type: TerrainType;
}

// Define positions for new terrains (0-indexed for 8x8 board)
export const TERRAIN_POSITIONS: TerrainPlacement[] = [
  { pos: { row: 2, col: 2 }, type: 'rift' },   // K (Kluft/Rift)
  { pos: { row: 5, col: 5 }, type: 'rift' },   // K (Kluft/Rift)
  { pos: { row: 1, col: 4 }, type: 'swamp' },  // S (Sumpf/Swamp)
  { pos: { row: 6, col: 3 }, type: 'swamp' },  // S (Sumpf/Swamp)
  { pos: { row: 3, col: 6 }, type: 'hill' },   // H (Hügel/Hill)
  { pos: { row: 4, col: 1 }, type: 'hill' },   // H (Hügel/Hill)
];
