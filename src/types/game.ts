
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
  dRow: number;
  dCol: number;
}

export interface Square {
  row: number;
  col: number;
  terrain: TerrainType;
  pieceId?: string | null;
  riftDirection?: RiftDirection; // Only if terrain is 'rift'
}

export type Board = Square[][];

export interface CapturedPieces {
  gazelle: number;
  lion: number;
  giraffe: number;
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
  lionMovedLastTurn: PlayerType | null; // Tracks which player's lion moved last and must pause
  isGameOver: boolean;
  message: string;
}

export const BOARD_SIZE = 7;

// Number of random terrains to place
export const NUM_RANDOM_SWAMPS = 2;
export const NUM_RANDOM_HILLS = 2;
export const NUM_RANDOM_RIFTS = 2; // For rifts with random directions

// Note: Specific terrain positions from GDD v0.4 like S(1,3), H(2,3), K(3,3) are
// now replaced by random generation for Swamps, Hills, and Rifts.
// The `createInitialBoard` function in page.tsx will handle their placement.
