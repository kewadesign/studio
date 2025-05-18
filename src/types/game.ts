
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
  playerOneName: string; // AI (Schwarz, Oben)
  playerTwoName: string; // Spieler (Weiß, Unten)
  humanCapturedAIScore: CapturedPieces; // Pieces AI (Schwarz) lost, captured by Spieler (Weiß)
  aiCapturedHumanScore: CapturedPieces;   // Pieces Spieler (Weiß) lost, captured by AI (Schwarz)
  lionMovedLastTurn: PlayerType | null;
  swampSkipTurnForPiece: { pieceId: string; player: PlayerType } | null;
  isGameOver: boolean;
  message: string;
}

export const BOARD_ROWS = 7;
export const BOARD_COLS = 8;

export const NUM_RANDOM_SWAMPS = 3;
export const NUM_RANDOM_HILLS = 2;
export const NUM_RANDOM_RIFTS = 2;

// Rows restricted from having random terrain placed on them (player starting rows)
// AI (Schwarz, Oben) on rows 0,1. Spieler (Weiß, Unten) on rows 5,6 (for 7 total rows).
export const TERRAIN_RESTRICTED_ROWS: number[] = [0, 1, BOARD_ROWS - 2, BOARD_ROWS - 1];
