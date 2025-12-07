import { GoogleGenAI, Type } from "@google/genai";
import { Player, Coordinates, Difficulty } from "../types";
import { BOARD_SIZE } from "../constants";

// Helper to convert grid to a string representation for the LLM
const boardToString = (grid: Player[][]): string => {
  return grid.map(row => 
    row.map(cell => (cell === Player.None ? "." : cell === Player.Black ? "X" : "O")).join(" ")
  ).join("\n");
};

export const getBestMove = async (
  apiKey: string,
  grid: Player[][],
  aiPlayer: Player,
  difficulty: Difficulty
): Promise<Coordinates> => {
  
  if (difficulty === Difficulty.Easy) {
    // Easy: Pure random (but somewhat smart to pick near existing pieces)
    return getRandomMove(grid);
  } else if (difficulty === Difficulty.Medium) {
    // Medium: Heuristic based (Blocks wins, finds 3s/4s)
    return getMediumMove(grid, aiPlayer);
  } else {
    // Hard: Uses Gemini LLM
    return getHardMove(apiKey, grid, aiPlayer);
  }
};

// --- HARD: Gemini LLM ---
const getHardMove = async (
  apiKey: string,
  grid: Player[][],
  aiPlayer: Player
): Promise<Coordinates> => {
  // If no API Key provided, fallback to Medium logic
  if (!apiKey) {
    console.warn("No API Key provided for Hard mode, falling back to Medium heuristic");
    return getMediumMove(grid, aiPlayer);
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    You are a Gomoku (Five-in-a-Row) expert. 
    The board size is ${BOARD_SIZE}x${BOARD_SIZE}.
    
    Current board state:
    . = Empty
    X = Black (Player 1)
    O = White (Player 2)
    
    ${boardToString(grid)}
    
    You are playing as ${aiPlayer === Player.Black ? "Black (X)" : "White (O)"}.
    The opponent is ${aiPlayer === Player.Black ? "White (O)" : "Black (X)"}.
    
    Objective:
    1. Check if you can win immediately. If so, take that spot.
    2. Check if the opponent will win on their next turn. If so, block them.
    3. Otherwise, play the most strategic move to build a line of 5.
    
    Return ONLY the coordinates of your next move.
    Rows and Columns are 0-indexed (0 to ${BOARD_SIZE - 1}).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            row: { type: Type.INTEGER },
            col: { type: Type.INTEGER }
          },
          required: ["row", "col"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    if (result && typeof result.row === 'number' && typeof result.col === 'number') {
      // Validate move
      if (
        result.row >= 0 && result.row < BOARD_SIZE &&
        result.col >= 0 && result.col < BOARD_SIZE &&
        grid[result.row][result.col] === Player.None
      ) {
        return { row: result.row, col: result.col };
      }
    }
    
    console.error("Gemini returned invalid move, falling back to Medium.");
    return getMediumMove(grid, aiPlayer);

  } catch (error) {
    console.error("Gemini API Error:", error);
    return getMediumMove(grid, aiPlayer);
  }
};

// --- MEDIUM: Heuristic ---
const getMediumMove = (grid: Player[][], aiPlayer: Player): Coordinates => {
  const opponent = aiPlayer === Player.Black ? Player.White : Player.Black;
  let bestScore = -Infinity;
  let bestMove: Coordinates | null = null;

  // Evaluate every empty cell
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (grid[r][c] === Player.None) {
        // Calculate score for this position
        // Higher score = better move
        const score = evaluatePosition(grid, r, c, aiPlayer, opponent);
        
        // Add a tiny random factor to break ties and make it feel less robotic
        const randomFactor = Math.random() * 5; 
        
        if (score + randomFactor > bestScore) {
          bestScore = score + randomFactor;
          bestMove = { row: r, col: c };
        }
      }
    }
  }

  return bestMove || getRandomMove(grid);
};

// Evaluate how good a specific spot (r,c) is for the AI
const evaluatePosition = (grid: Player[][], r: number, c: number, me: Player, opp: Player): number => {
  let score = 0;

  // Directions: Horizontal, Vertical, Diagonal \, Diagonal /
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

  for (const [dr, dc] of directions) {
    // Check offense (My potential lines)
    score += getLineScore(grid, r, c, dr, dc, me);
    // Check defense (Blocking opponent lines) - Slightly higher weight on defense usually prevents losing
    score += getLineScore(grid, r, c, dr, dc, opp) * 1.1; 
  }

  // Bonus for being near center
  const center = Math.floor(BOARD_SIZE / 2);
  const dist = Math.abs(r - center) + Math.abs(c - center);
  score -= dist; // Slight penalty for being far from center

  return score;
};

const getLineScore = (grid: Player[][], r: number, c: number, dr: number, dc: number, player: Player): number => {
  let count = 0;
  let openEnds = 0;

  // Check forward
  let i = 1;
  while (true) {
    const nr = r + dr * i;
    const nc = c + dc * i;
    if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) break;
    if (grid[nr][nc] === player) {
      count++;
    } else if (grid[nr][nc] === Player.None) {
      openEnds++;
      break;
    } else {
      break;
    }
    i++;
  }

  // Check backward
  i = 1;
  while (true) {
    const nr = r - dr * i;
    const nc = c - dc * i;
    if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) break;
    if (grid[nr][nc] === player) {
      count++;
    } else if (grid[nr][nc] === Player.None) {
      openEnds++;
      break;
    } else {
      break;
    }
    i++;
  }

  // Scoring weights
  if (count >= 4) return 100000; // 5 in a row (winning or blocking win)
  if (count === 3 && openEnds > 0) return 5000; // 4 in a row (setting up win)
  if (count === 2 && openEnds === 2) return 1000; // Open 3
  if (count === 2 && openEnds > 0) return 100;
  if (count === 1 && openEnds === 2) return 50;

  return 10; // Basic connection
};


// --- EASY: Random ---
const getRandomMove = (grid: Player[][]): Coordinates => {
  const availableMoves: Coordinates[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (grid[r][c] === Player.None) {
        availableMoves.push({ row: r, col: c });
      }
    }
  }
  
  if (availableMoves.length === 0) return { row: 0, col: 0 };

  // Try to pick a move near the center or existing pieces for slightly better "randomness"
  // Simple heuristic: filter for moves that have neighbors
  const smartRandom = availableMoves.filter(m => hasNeighbor(grid, m.row, m.col));
  
  if (smartRandom.length > 0) {
    return smartRandom[Math.floor(Math.random() * smartRandom.length)];
  }

  return availableMoves[Math.floor(Math.random() * availableMoves.length)];
};

const hasNeighbor = (grid: Player[][], r: number, c: number): boolean => {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && grid[nr][nc] !== Player.None) {
        return true;
      }
    }
  }
  return false;
};