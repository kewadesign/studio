
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
  isGameOver: boolean;
  message: string;
}

export const BOARD_SIZE = 7;

// GDD v0.4 specifies these fixed terrain positions
// (row, col) 0-indexed from top-left
export const TERRAIN_POSITIONS = {
  SWAMP_1: { row: 1, col: 3 }, // GDD (D2) if D is col 3, row 2 is idx 1
  SWAMP_2: { row: 5, col: 3 }, // GDD (D6)
  HILL_1:  { row: 2, col: 3 }, // GDD (D3)
  HILL_2:  { row: 4, col: 3 }, // GDD (D5)
  RIFT_CENTER: { row: 3, col: 3 } // GDD (D4)
};

// Number of *additional* random terrains to place, beyond the fixed GDD ones if any.
// If fixed GDD terrains are used, these counts can be 0 or more for *extra* random ones.
// If no fixed GDD terrains are used, these will be the total random ones.
// For now, let's make GDD terrains fixed and add a few more random ones.
export const NUM_RANDOM_SWAMPS = 0; // GDD has 2 fixed swamps
export const NUM_RANDOM_HILLS = 0;  // GDD has 2 fixed hills
export const NUM_RANDOM_RIFTS = 2;  // GDD has 1 fixed rift, let's add 2 more random ones.
                                    // These random rifts will NOT be on start rows.
                                    // Total 3 rifts.

    