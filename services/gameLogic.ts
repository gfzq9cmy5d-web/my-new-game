import { BOARD_SIZE, WIN_COUNT } from '../constants';
import { Player, BoardState } from '../types';

export const createEmptyGrid = (): Player[][] => {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
};

export const checkWin = (grid: Player[][], lastRow: number, lastCol: number, player: Player): { row: number, col: number }[] | null => {
  const directions = [
    [0, 1],   // Horizontal
    [1, 0],   // Vertical
    [1, 1],   // Diagonal \
    [1, -1]   // Diagonal /
  ];

  for (const [dx, dy] of directions) {
    const line = [{ row: lastRow, col: lastCol }];
    
    // Check forward
    let r = lastRow + dx;
    let c = lastCol + dy;
    while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && grid[r][c] === player) {
      line.push({ row: r, col: c });
      r += dx;
      c += dy;
    }

    // Check backward
    r = lastRow - dx;
    c = lastCol - dy;
    while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && grid[r][c] === player) {
      line.push({ row: r, col: c });
      r -= dx;
      c -= dy;
    }

    if (line.length >= WIN_COUNT) {
      return line;
    }
  }

  return null;
};

// URL Compression logic for sharing game state
export const serializeBoard = (grid: Player[][]): string => {
  return grid.flat().join('');
};

export const deserializeBoard = (str: string): Player[][] => {
  if (str.length !== BOARD_SIZE * BOARD_SIZE) return createEmptyGrid();
  
  const grid = createEmptyGrid();
  let idx = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const val = parseInt(str[idx]);
      if (val === 1) grid[r][c] = Player.Black;
      else if (val === 2) grid[r][c] = Player.White;
      else grid[r][c] = Player.None;
      idx++;
    }
  }
  return grid;
};