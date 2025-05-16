
export type PlayerType = 'human' | 'ai';
export type AnimalType = 'lion' | 'giraffe' | 'gazelle'; // Changed from goat

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

export interface CapturedPieces {
  gazelle: number;
  lion: number; // Though only 1 lion, count makes it consistent
  giraffe: number;
}

export interface GameState {
  board: Board;
  pieces: Record<string, Piece>;
  currentPlayer: PlayerType;
  selectedPieceId?: string | null;
  validMoves: { row: number; col: number }[];
  winner?: PlayerType | null;
  playerOneName: string; // Human
  playerTwoName: string; // AI
  humanCapturedAIScore: CapturedPieces; // Pieces AI lost, captured by Human
  aiCapturedHumanScore: CapturedPieces; // Pieces Human lost, captured by AI
  lionMovedLastTurn: PlayerType | null; // Tracks if a lion moved in the last turn to enforce pause
  isGameOver: boolean;
  message: string;
}

export const BOARD_SIZE = 7; // Changed from 8

export interface TerrainPlacement {
  pos: { row: number; col: number };
  type: TerrainType;
  direction?: { dRow: number; dCol: number }; // For rift push direction
}

// Define positions for new terrains (0-indexed for 7x7 board)
// GDD: Sumpf: (1,3), (5,3) | Hügel: (2,3), (4,3) | Kluft: (3,3) mit Richtung (0,1) (Nord)
// (0,1) Nord means row decreases (e.g. (3,3) to (2,3))
export const TERRAIN_POSITIONS: TerrainPlacement[] = [
  { pos: { row: 1, col: 3 }, type: 'swamp' },
  { pos: { row: 5, col: 3 }, type: 'swamp' },
  { pos: { row: 2, col: 3 }, type: 'hill' },
  { pos: { row: 4, col: 3 }, type: 'hill' },
  { pos: { row: 3, col: 3 }, type: 'rift', direction: { dRow: -1, dCol: 0 } }, // Push North
];
