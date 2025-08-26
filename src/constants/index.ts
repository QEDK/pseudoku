import type { SudokuGrid } from "../types";

// Challenge puzzles
export const CHALLENGE_PUZZLES: Record<string, SudokuGrid> = {
  default: [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9],
  ],
  easy: [
    [5, 3, 4, 0, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 0, 0],
  ],
  medium: [
    [0, 0, 0, 2, 6, 0, 7, 0, 1],
    [6, 8, 0, 0, 7, 0, 0, 9, 0],
    [1, 9, 0, 0, 0, 4, 5, 0, 0],
    [8, 2, 0, 1, 0, 0, 0, 4, 0],
    [0, 0, 4, 6, 0, 2, 9, 0, 0],
    [0, 5, 0, 0, 0, 3, 0, 2, 8],
    [0, 0, 9, 3, 0, 0, 0, 7, 4],
    [0, 4, 0, 0, 5, 0, 0, 3, 6],
    [7, 0, 3, 0, 1, 8, 0, 0, 0],
  ],
  hard: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 3, 0, 8, 5],
    [0, 0, 1, 0, 2, 0, 0, 0, 0],
    [0, 0, 0, 5, 0, 7, 0, 0, 0],
    [0, 0, 4, 0, 0, 0, 1, 0, 0],
    [0, 9, 0, 0, 0, 0, 0, 0, 0],
    [5, 0, 0, 0, 0, 0, 0, 7, 3],
    [0, 0, 2, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 4, 0, 0, 0, 9],
  ],
};

// UI Constants
export const UI = {
  TIMER_UPDATE_INTERVAL: 100,
  CELL_ANIMATION_DURATION: 200,
  STATUS_MESSAGE_DURATION: 5000,
  PROOF_GENERATION_TIMEOUT: 60000,
} as const;

// Grid Constants
export const GRID = {
  SIZE: 9,
  BOX_SIZE: 3,
  TOTAL_CELLS: 81,
} as const;

// Keyboard Navigation
export const KEYBOARD_KEYS = {
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  ENTER: "Enter",
  BACKSPACE: "Backspace",
  DELETE: "Delete",
  ESCAPE: "Escape",
  TAB: "Tab",
} as const;

// API Endpoints
export const API = {
  GITHUB_GIST: "https://api.github.com/gists",
  TWITTER_INTENT: "https://twitter.com/intent/tweet",
} as const;

// Messages
export const MESSAGES = {
  ERRORS: {
    EMPTY_CELLS: "Please fill in all cells",
    INVALID_VALUE: "Only numbers 1-9 are allowed",
    DUPLICATE_ROW: (row: number) => `Row ${row + 1} contains duplicate values`,
    DUPLICATE_COLUMN: (col: number) =>
      `Column ${col + 1} contains duplicate values`,
    DUPLICATE_BOX: (box: number) => `Box ${box + 1} contains duplicate values`,
    PROOF_INIT_FAILED:
      "Failed to initialize proof system. Please refresh the page.",
    PROOF_GENERATION_FAILED: "Error generating proof. Please try again.",
    PROOF_VERIFICATION_FAILED: "Proof verification failed. Please try again.",
    NO_GITHUB_TOKEN: "Please enter a GitHub Personal Access Token",
    NO_PROOF: "No proof to upload. Generate a proof first.",
    GIST_UPLOAD_FAILED: "Failed to create gist",
  },
  SUCCESS: {
    SOLUTION_CORRECT: "Solution is correct! You can now generate a proof.",
    PROOF_GENERATED: "Proof generated and verified successfully!",
    GIST_CREATED: "Gist created successfully!",
    GAME_RESET: "Game reset. Good luck!",
  },
  INFO: {
    GENERATING_PROOF: "Generating proof... This may take a moment.",
    UPLOADING_GIST: "Uploading to GitHub Gist...",
    NO_EMPTY_CELLS: "No empty cells to fill!",
    HINT: "Try using the process of elimination for empty cells.",
  },
  CONFIRM: {
    RESET: "Are you sure you want to reset? Your progress will be lost.",
  },
} as const;

// Default values
export const DEFAULTS = {
  FIELD_ELEMENT_BYTES: 32,
  PROOF_DISPLAY_BYTES: 32,
  GIST_DESCRIPTION_PREFIX: "Pseudoku Zero-Knowledge Proof - Solved in",
  SHARE_MESSAGE_SUFFIX: "Solve a pseudoku at pseudoku.qedk.xyz",
} as const;
