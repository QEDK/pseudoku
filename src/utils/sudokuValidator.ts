import type { SudokuGrid } from "../types";

export class SudokuValidator {
  /**
   * Validates if a Sudoku grid is completely filled and correct
   */
  static isValid(grid: SudokuGrid): { valid: boolean; error?: string } {
    // Check if all cells are filled
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (grid[i][j] === 0) {
          return {
            valid: false,
            error: `Cell at row ${i + 1}, column ${j + 1} is empty`,
          };
        }
        if (grid[i][j] < 1 || grid[i][j] > 9) {
          return {
            valid: false,
            error: `Invalid value at row ${i + 1}, column ${j + 1}`,
          };
        }
      }
    }

    // Check rows
    for (let i = 0; i < 9; i++) {
      if (!SudokuValidator.hasAllDigits(grid[i])) {
        return {
          valid: false,
          error: `Row ${i + 1} contains duplicate values`,
        };
      }
    }

    // Check columns
    for (let j = 0; j < 9; j++) {
      const column = SudokuValidator.getColumn(grid, j);
      if (!SudokuValidator.hasAllDigits(column)) {
        return {
          valid: false,
          error: `Column ${j + 1} contains duplicate values`,
        };
      }
    }

    // Check 3x3 boxes
    for (let boxNum = 0; boxNum < 9; boxNum++) {
      const box = SudokuValidator.getBox(grid, boxNum);
      if (!SudokuValidator.hasAllDigits(box)) {
        const boxRow = Math.floor(boxNum / 3) + 1;
        const boxCol = (boxNum % 3) + 1;
        return {
          valid: false,
          error: `Box at position (${boxRow}, ${boxCol}) contains duplicate values`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Checks if an array contains all digits from 1 to 9 exactly once
   */
  static hasAllDigits(arr: number[]): boolean {
    const seen = new Set<number>();
    for (const val of arr) {
      if (val < 1 || val > 9 || seen.has(val)) {
        return false;
      }
      seen.add(val);
    }
    return seen.size === 9;
  }

  /**
   * Gets a column from the grid
   */
  static getColumn(grid: SudokuGrid, col: number): number[] {
    const column: number[] = [];
    for (let i = 0; i < 9; i++) {
      column.push(grid[i][col]);
    }
    return column;
  }

  /**
   * Gets a 3x3 box from the grid
   */
  static getBox(grid: SudokuGrid, boxNum: number): number[] {
    const box: number[] = [];
    const boxRow = Math.floor(boxNum / 3) * 3;
    const boxCol = (boxNum % 3) * 3;

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        box.push(grid[boxRow + i][boxCol + j]);
      }
    }
    return box;
  }

  /**
   * Gets all conflicts for a given cell value
   */
  static getConflicts(
    grid: SudokuGrid,
    row: number,
    col: number,
    value: number,
  ): Array<{ type: "row" | "column" | "box"; position: number }> {
    const conflicts: Array<{
      type: "row" | "column" | "box";
      position: number;
    }> = [];

    // Check row
    for (let j = 0; j < 9; j++) {
      if (j !== col && grid[row][j] === value) {
        conflicts.push({ type: "row", position: row });
        break;
      }
    }

    // Check column
    for (let i = 0; i < 9; i++) {
      if (i !== row && grid[i][col] === value) {
        conflicts.push({ type: "column", position: col });
        break;
      }
    }

    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = boxRow; i < boxRow + 3; i++) {
      for (let j = boxCol; j < boxCol + 3; j++) {
        if (i !== row && j !== col && grid[i][j] === value) {
          const boxNum = Math.floor(row / 3) * 3 + Math.floor(col / 3);
          conflicts.push({ type: "box", position: boxNum });
          return conflicts;
        }
      }
    }

    return conflicts;
  }

  /**
   * Checks if a puzzle matches the challenge (for verification)
   */
  static matchesChallenge(
    solution: SudokuGrid,
    challenge: SudokuGrid,
  ): boolean {
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (challenge[i][j] !== 0 && solution[i][j] !== challenge[i][j]) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Counts the number of filled cells
   */
  static countFilledCells(grid: SudokuGrid): number {
    let count = 0;
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (grid[i][j] !== 0) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Gets all empty cell positions
   */
  static getEmptyCells(grid: SudokuGrid): Array<[number, number]> {
    const emptyCells: Array<[number, number]> = [];
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (grid[i][j] === 0) {
          emptyCells.push([i, j]);
        }
      }
    }
    return emptyCells;
  }

  /**
   * Deep clones a Sudoku grid
   */
  static cloneGrid(grid: SudokuGrid): SudokuGrid {
    return grid.map((row) => [...row]);
  }
}
