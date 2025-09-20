// Sudoku generation and validation utilities

export type SudokuGrid = (number | null)[][];
export type Difficulty = 'easy' | 'medium' | 'hard';

// Generate a complete valid Sudoku solution
export const generateCompleteSudoku = (): SudokuGrid => {
  const grid: SudokuGrid = Array(9).fill(null).map(() => Array(9).fill(null));
  
  const isValid = (grid: SudokuGrid, row: number, col: number, num: number): boolean => {
    // Check row
    for (let x = 0; x < 9; x++) {
      if (grid[row][x] === num) return false;
    }
    
    // Check column
    for (let x = 0; x < 9; x++) {
      if (grid[x][col] === num) return false;
    }
    
    // Check 3x3 box
    const startRow = row - row % 3;
    const startCol = col - col % 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (grid[i + startRow][j + startCol] === num) return false;
      }
    }
    
    return true;
  };
  
  const solve = (grid: SudokuGrid): boolean => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === null) {
          const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          for (const num of numbers) {
            if (isValid(grid, row, col, num)) {
              grid[row][col] = num;
              if (solve(grid)) return true;
              grid[row][col] = null;
            }
          }
          return false;
        }
      }
    }
    return true;
  };
  
  solve(grid);
  return grid;
};

// Generate a puzzle by removing numbers from a complete solution
export const generatePuzzle = (difficulty: Difficulty): { puzzle: SudokuGrid; solution: SudokuGrid } => {
  const solution = generateCompleteSudoku();
  const puzzle = solution.map(row => [...row]);
  
  const difficultyMap = {
    easy: 35,    // Remove 35 numbers (46 given)
    medium: 45,  // Remove 45 numbers (36 given)
    hard: 55     // Remove 55 numbers (26 given)
  };
  
  const numbersToRemove = difficultyMap[difficulty];
  let removed = 0;
  
  while (removed < numbersToRemove) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    
    if (puzzle[row][col] !== null) {
      puzzle[row][col] = null;
      removed++;
    }
  }
  
  return { puzzle, solution };
};

// Validate a move against the solution
export const validateMove = (solution: SudokuGrid, row: number, col: number, value: number): boolean => {
  return solution[row][col] === value;
};

// Check if the puzzle is complete
export const isPuzzleComplete = (currentBoard: SudokuGrid): boolean => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (currentBoard[row][col] === null) {
        return false;
      }
    }
  }
  return true;
};

// Convert grid to/from JSON format for database storage
export const gridToJson = (grid: SudokuGrid): Record<string, number | null> => {
  const result: Record<string, number | null> = {};
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      result[`${row}-${col}`] = grid[row][col];
    }
  }
  return result;
};

export const jsonToGrid = (json: Record<string, number | null>): SudokuGrid => {
  const grid: SudokuGrid = Array(9).fill(null).map(() => Array(9).fill(null));
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const key = `${row}-${col}`;
      grid[row][col] = json[key] ?? null;
    }
  }
  return grid;
};