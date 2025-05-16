
export type PlayerType = 'human' | 'ai';
export type AnimalType = 'lion' | 'giraffe' | 'gazelle';

export interface Piece {
  id: string;
  animal: AnimalType;
  player: PlayerType;
  position: { row: number; col: number };
}

export type TerrainType = 'rift' | 'swamp' | 'hill' | 'none';

export interface RiftDirection {
  dRow: number; // -1 for North, 1 for South, 0 for E/W
  dCol: number; // -1 for West, 1 for East, 0 for N/S
}

export interface Square {
  row: number;
  col: number;
  terrain: TerrainType;
  pieceId?: string | null;
  riftDirection?: RiftDirection;
}

export type Board = Square[][];

export interface CapturedPieces {
  gazelle: number; // Max 5
  lion: number;    // Max 1
  giraffe: number; // Max 2
}

export interface GameState {
  board: Board;
  pieces: Record<string, Piece>;
  currentPlayer: PlayerType;
  selectedPieceId?: string | null;
  validMoves: { row: number; col: number }[];
  winner?: PlayerType | null;
  playerOneName: string; // AI (White, Top)
  playerTwoName: string; // Human (Black, Bottom)
  humanCapturedAIScore: CapturedPieces; // Pieces AI (White) lost, captured by Human (Black)
  aiCapturedHumanScore: CapturedPieces;   // Pieces Human (Black) lost, captured by AI (White)
  lionMovedLastTurn: PlayerType | null;
  swampSkipTurnForPiece: { pieceId: string; player: PlayerType } | null; // Piece that landed on swamp and must skip its owner's next turn
  isGameOver: boolean;
  message: string;
}

export const BOARD_SIZE = 7;

// Number of random terrains to place.
// These will be placed on rows 2, 3, 4 (0-indexed middle rows for a 7x7 board).
// They will not be placed on starting rows (0,1 for AI; 5,6 for Human).
export const NUM_RANDOM_SWAMPS = 3;
export const NUM_RANDOM_HILLS = 2;
export const NUM_RANDOM_RIFTS = 2;
