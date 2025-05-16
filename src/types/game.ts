
export type PlayerType = 'human' | 'ai';
export type AnimalType = 'lion' | 'giraffe' | 'gazelle';

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
  lionMovedLastTurn: PlayerType | null;
  isGameOver: boolean;
  message: string;
}

export const BOARD_SIZE = 7;

export interface TerrainPlacement {
  pos: { row: number; col: number };
  type: TerrainType;
  direction?: { dRow: number; dCol: number };
}

// Central Rift remains fixed as per GDD v0.4
export const FIXED_TERRAIN_POSITIONS: TerrainPlacement[] = [
  { pos: { row: 3, col: 3 }, type: 'rift', direction: { dRow: -1, dCol: 0 } }, // Push North
];

// Number of random terrains to place
export const NUM_RANDOM_SWAMPS = 2;
export const NUM_RANDOM_HILLS = 2;
