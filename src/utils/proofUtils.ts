import type { FieldElement, ProofData, ProofDataExport, SudokuGrid } from '../types';

const MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

export class ProofUtils {
  /**
   * Generates a random field element for unique proof generation
   */
  static generateFieldElement(): FieldElement {
    const bytes = new Uint8Array(32); // 256 bits
    let rand;
    for (;;) {
        crypto.getRandomValues(bytes);
        bytes[0] &= 0x3f; // mask top 2 bits → 254-bit candidate
        let x = 0n;
        for (let i = 0; i < bytes.length; i++) x = (x << 8n) | BigInt(bytes[i]);
        if (x < MODULUS) {
            rand = x;
            break;
        }
    }
    return rand.toString();
  }

  /**
   * Creates a display-friendly hash of the proof
   */
  static hashProof(proof: Uint8Array): string {
    const proofStr = Array.from(proof.slice(0, 32))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `${proofStr.slice(0, 8)}...${proofStr.slice(-8)}`;
  }

  /**
   * Formats the field element for display
   */
  static formatFieldElement(fieldElement: FieldElement): string {
    return `${fieldElement.slice(0, 10)}...${fieldElement.slice(-8)}`;
  }

  /**
   * Prepares proof data for export
   */
  static prepareProofExport(
    proof: ProofData,
    challengeId: FieldElement,
    timeInMs: number
  ): ProofDataExport {
    // convert proof to hex
    const proofHex = Array.from(proof.proof)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return {
      challengeId,
      proof: proofHex,
      publicInputs: proof.publicInputs,
      timeInMs,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validates that a proof data structure is well-formed
   */
  static isValidProofData(data: any): data is ProofData {
    return (
      data &&
      typeof data === 'object' &&
      data.proof instanceof Uint8Array &&
      Array.isArray(data.publicInputs) &&
      data.publicInputs.every((input: any) => typeof input === 'string')
    );
  }

  /**
   * Converts BigInt field element to string for Noir
   */
  static fieldElementToString(fieldElement: FieldElement): string {
    return BigInt(fieldElement).toString();
  }

  /**
   * Estimates proof generation time based on grid complexity
   */
  static estimateProofTime(filledCells: number): { min: number; max: number } {
    // Rough estimates in seconds
    const baseTime = 5;
    const complexityFactor = (81 - filledCells) * 0.1;
    
    return {
      min: Math.floor(baseTime + complexityFactor),
      max: Math.floor(baseTime + complexityFactor * 3)
    };
  }

  /**
   * Formats time for display
   */
  static formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Creates a shareable message for social media
   */
  static createShareMessage(
    timeInMs: number,
    gistUrl?: string | null
  ): string {
    const timeStr = this.formatTime(timeInMs);
    let message = `I solved today's Pseudoku in ${timeStr}! `;
    
    if (gistUrl) {
      message += `Verify my proof here: ${gistUrl} `;
    }
    
    message += `\n\nSolve a pseudoku at pseudoku.qedk.xyz`;
    
    return message;
  }

  /**
   * Validates GitHub personal access token format
   */
  static isValidGitHubToken(token: string): boolean {
    // GitHub tokens typically start with ghp_ for personal access tokens
    // or github_pat_ for fine-grained personal access tokens
    return /^(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59})$/.test(token);
  }

  /**
   * Sanitizes proof data for public sharing
   */
  static sanitizeForPublic(proofData: ProofDataExport): Partial<ProofDataExport> {
    // Remove any potentially sensitive data while keeping proof validity
    const { proof, timeInMs, timestamp } = proofData;
    return {
      proof,
      timeInMs,
      timestamp
    };
  }
}
