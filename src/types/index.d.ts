// Type definitions for Pseudoku

// Sudoku types
export type SudokuGrid = number[][];
export type CellPosition = [row: number, col: number];
export type FieldElement = string;

// Noir circuit types
export interface CircuitInputs {
  solution: [string, number[][]];
  challenge: [string, number[][]];
}

export interface ProofData {
  proof: Uint8Array;
  publicInputs: string[];
}

export interface WitnessMap {
  witness: Uint8Array;
}

// GitHub Gist types
export interface GistFile {
  content: string;
}

export interface GistRequest {
  description: string;
  public: boolean;
  files: Record<string, GistFile>;
}

export interface GistResponse {
  html_url: string;
  id: string;
  created_at: string;
}

export interface ProofDataExport {
  challengeId: string;
  proof: string;
  publicInputs: string[];
  timeInMs: number;
  timestamp: string;
}

// UI State types
export type StatusType = "info" | "success" | "error" | "loading";

export interface GameState {
  grid: SudokuGrid;
  fixedCells: boolean[][];
  startTime: number | null;
  timerInterval: NodeJS.Timeout | null;
  elapsedTime: number;
  fieldElement: FieldElement;
  proof: ProofData | null;
  proofTime: number | null;
  gistUrl: string | null;
}

// Noir.js module declaration
declare module "@noir-lang/noir_js" {
  export class Noir {
    constructor(circuit: any);
    execute(inputs: any): Promise<WitnessMap>;
  }
}

// bb.js module declaration
declare module "@aztec/bb.js" {
  export class UltraHonkBackend {
    constructor(bytecode: string, options?: any);
    generateProof(witness: Uint8Array): Promise<ProofData>;
    verifyProof(proofData: ProofData): Promise<boolean>;
  }
}

// Circuit JSON module
declare module "*.json" {
  const value: {
    bytecode: string;
    abi: any;
  };
  export default value;
}
