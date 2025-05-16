export type PlayerType = 'human' | 'ai';
export type AnimalType = 'lion' | 'zebra' | 'elephant' | 'cheetah';

export interface Piece {
  id: string;
  animal: AnimalType;
  player: PlayerType;
  position: { row: number; col: number };
}

export interface Square {
  row: number;
  col: number;
  isRift?: boolean;
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
  message: string; // General messages, like who won or current status
}

export const BOARD_SIZE = 5;
export const RIFT_POSITION = { row: Math.floor(BOARD_SIZE / 2), col: Math.floor(BOARD_SIZE / 2) };
