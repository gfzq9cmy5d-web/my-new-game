export enum Player {
  None = 0,
  Black = 1,
  White = 2,
}

export interface BoardState {
  grid: Player[][];
  currentPlayer: Player;
  winner: Player | null;
  history: { row: number; col: number; player: Player }[];
  winningLine: { row: number; col: number }[] | null;
}

export enum GameMode {
  Local = 'LOCAL',
  AI = 'AI',
  Remote = 'REMOTE_LINK' // Async play via URL sharing
}

export enum Difficulty {
  Easy = 'EASY',
  Medium = 'MEDIUM',
  Hard = 'HARD'
}

export interface Coordinates {
  row: number;
  col: number;
}