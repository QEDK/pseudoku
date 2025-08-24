import { UltraHonkBackend } from '@aztec/bb.js';
import { Noir } from '@noir-lang/noir_js';
import circuit from '../circuits/target/pseudoku.json';
import { GitHubOAuth } from './utils/githubOauth';
import type {
  SudokuGrid,
  CellPosition,
  FieldElement,
  CircuitInputs,
  ProofData,
  GistRequest,
  GistResponse,
  ProofDataExport,
  StatusType,
  GameState,
  WitnessMap
} from './types';

// Challenge puzzle (0 = empty cell)
const CHALLENGE_PUZZLE: SudokuGrid = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

const MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

class PseudokuGame implements Partial<GameState> {
  grid: SudokuGrid = [];
  fixedCells: boolean[][] = [];
  startTime: number | null = null;
  timerInterval: ReturnType<typeof setTimeout> | null = null;
  elapsedTime: number = 0;
  fieldElement: FieldElement;
  proof: ProofData | null = null;
  proofTime: number | null = null;
  gistUrl: string | null = null;
  
  private noir: Noir | null = null;
  private backend: UltraHonkBackend | null = null;
  
  constructor() {
    this.fieldElement = this.generateFieldElement();
    this.initializeGame();
    this.setupEventListeners();
    this.initializeNoir();
  }
  
  private async initializeNoir(): Promise<void> {
    try {
      console.log('Checking WebAssembly support...');
      if (typeof WebAssembly === 'undefined') {
        throw new Error('WebAssembly is not supported in this browser');
      }
      
      // Check for SharedArrayBuffer (needed for multi-threading)
      const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
      console.log('SharedArrayBuffer available:', hasSharedArrayBuffer);
      
      console.log('Initializing Noir...');
      this.noir = new Noir(circuit);
      console.log('Noir instance created');
      
      // Initialize backend with appropriate configuration
      console.log('Initializing UltraHonk backend...');
      
      // Use single thread if SharedArrayBuffer is not available
      const backendOptions = hasSharedArrayBuffer 
        ? { threads: 4 } 
        : { threads: 1 };
      
      console.log('Backend options:', backendOptions);
      this.backend = new UltraHonkBackend(circuit.bytecode, backendOptions);
      console.log('Backend initialized successfully');
      
      // Test the initialization with a simple operation
      console.log('Testing initialization...');
      const testInputs = {
        solution: ['0', Array(9).fill(Array(9).fill(1))],
        challenge: ['0', Array(9).fill(Array(9).fill(1))]
      };
      
      // Just execute to test, don't generate proof
      await this.noir.execute(testInputs).catch(e => {
        console.log('Test execution (expected to fail):', e.message);
      });
      
      console.log('Noir and Barretenberg initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Noir:', error);
      
      // Try fallback initialization with single thread
      if (this.backend === null && error instanceof Error && error.message.includes('SharedArrayBuffer')) {
        console.log('Attempting fallback initialization with single thread...');
        try {
          this.backend = new UltraHonkBackend(circuit.bytecode, { threads: 1 });
          console.log('Fallback initialization successful');
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          this.showStatus('Failed to initialize proof system. Please check browser compatibility.', 'error');
        }
      } else {
        this.showStatus('Failed to initialize proof system. Please refresh the page.', 'error');
      }
    }
  }
  
  private generateFieldElement(): FieldElement {
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
  
  private initializeGame(): void {
    // Display field element
    const fieldElementText = document.getElementById('fieldElementText');
    if (fieldElementText) {
      fieldElementText.textContent = `Challenge ID: ${this.fieldElement.slice(0, 10)}...${this.fieldElement.slice(-8)}`;
    }
    
    // Initialize grid with challenge
    this.grid = CHALLENGE_PUZZLE.map(row => [...row]);
    this.fixedCells = [];
    
    // Mark fixed cells
    for (let i = 0; i < 9; i++) {
      this.fixedCells[i] = [];
      for (let j = 0; j < 9; j++) {
        this.fixedCells[i][j] = CHALLENGE_PUZZLE[i][j] !== 0;
      }
    }
    
    // Render grid
    this.renderGrid();
    
    // Start timer
    this.startTimer();
  }
  
  private renderGrid(): void {
    const gridElement = document.getElementById('sudokuGrid');
    if (!gridElement) return;
    
    gridElement.innerHTML = '';
    
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        const cell = document.createElement('input');
        cell.type = 'text';
        cell.className = 'sudoku-cell';
        cell.maxLength = 1;
        cell.dataset.row = i.toString();
        cell.dataset.col = j.toString();
        
        if (this.fixedCells[i][j]) {
          cell.value = this.grid[i][j].toString();
          cell.classList.add('fixed');
          cell.readOnly = true;
        } else if (this.grid[i][j] !== 0) {
          cell.value = this.grid[i][j].toString();
        }
        
        cell.addEventListener('input', (e) => this.handleCellInput(e as InputEvent));
        
        gridElement.appendChild(cell);
      }
    }
  }
  
  private handleCellInput(event: InputEvent): void {
    const cell = event.target as HTMLInputElement;
    const row = parseInt(cell.dataset.row!);
    const col = parseInt(cell.dataset.col!);
    const value = cell.value;
    
    // Allow only digits 1-9
    if (value && !/^[1-9]$/.test(value)) {
      cell.value = '';
      return;
    }
    
    // Update grid
    this.grid[row][col] = value ? parseInt(value) : 0;
    
    // Clear any error/success classes
    cell.classList.remove('error', 'success');
    
    // Check for conflicts
    if (value) {
      const conflicts = this.getConflicts(row, col, parseInt(value));
      if (conflicts.length > 0) {
        cell.classList.add('error');
      }
    }
  }
  
  private getConflicts(row: number, col: number, value: number): string[] {
    const conflicts: string[] = [];
    
    // Check row
    for (let j = 0; j < 9; j++) {
      if (j !== col && this.grid[row][j] === value) {
        conflicts.push(`Row ${row + 1}`);
        break;
      }
    }
    
    // Check column
    for (let i = 0; i < 9; i++) {
      if (i !== row && this.grid[i][col] === value) {
        conflicts.push(`Column ${col + 1}`);
        break;
      }
    }
    
    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = boxRow; i < boxRow + 3; i++) {
      for (let j = boxCol; j < boxCol + 3; j++) {
        if (i !== row && j !== col && this.grid[i][j] === value) {
          conflicts.push(`Box`);
          return conflicts;
        }
      }
    }
    
    return conflicts;
  }
  
  private startTimer(): void {
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => {
      this.updateTimer();
    }, 100);
  }
  
  private updateTimer(): void {
    if (!this.startTime) return;
    
    const elapsed = Date.now() - this.startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const timerElement = document.getElementById('timer');
    if (timerElement) {
      timerElement.textContent = display;
    }
    this.elapsedTime = elapsed;
  }
  
  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
  
  private checkSolution(): boolean {
    // Check if all cells are filled
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (this.grid[i][j] === 0) {
          this.showStatus('Please fill in all cells', 'error');
          return false;
        }
      }
    }
    
    // Check rows
    for (let i = 0; i < 9; i++) {
      if (!this.hasAllDigits(this.grid[i])) {
        this.showStatus(`Row ${i + 1} is incorrect`, 'error');
        return false;
      }
    }
    
    // Check columns
    for (let j = 0; j < 9; j++) {
      const column: number[] = [];
      for (let i = 0; i < 9; i++) {
        column.push(this.grid[i][j]);
      }
      if (!this.hasAllDigits(column)) {
        this.showStatus(`Column ${j + 1} is incorrect`, 'error');
        return false;
      }
    }
    
    // Check 3x3 boxes
    for (let boxNum = 0; boxNum < 9; boxNum++) {
      const box = this.getBox(boxNum);
      if (!this.hasAllDigits(box)) {
        this.showStatus(`Box ${boxNum + 1} is incorrect`, 'error');
        return false;
      }
    }
    
    this.stopTimer();
    this.showStatus('Solution is correct! You can now generate a proof.', 'success');
    
    const generateProofBtn = document.getElementById('generateProofBtn') as HTMLButtonElement;
    if (generateProofBtn) {
      generateProofBtn.disabled = false;
    }
    
    // Highlight all cells as success
    document.querySelectorAll('.sudoku-cell').forEach(cell => {
      if (!cell.classList.contains('fixed')) {
        cell.classList.add('success');
      }
    });
    
    return true;
  }
  
  private hasAllDigits(arr: number[]): boolean {
    const seen = new Set<number>();
    for (const val of arr) {
      if (val < 1 || val > 9 || seen.has(val)) {
        return false;
      }
      seen.add(val);
    }
    return seen.size === 9;
  }
  
  private getBox(boxNum: number): number[] {
    const box: number[] = [];
    const boxRow = Math.floor(boxNum / 3) * 3;
    const boxCol = (boxNum % 3) * 3;
    
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        box.push(this.grid[boxRow + i][boxCol + j]);
      }
    }
    return box;
  }
  
  private async generateProof(): Promise<void> {
    if (!this.noir || !this.backend) {
      this.showStatus('Proof system not initialized. Please refresh the page.', 'error');
      return;
    }
    
    this.showStatus('Generating proof... This may take a moment.', 'loading');
    
    const generateProofBtn = document.getElementById('generateProofBtn') as HTMLButtonElement;
    if (generateProofBtn) {
      generateProofBtn.disabled = true;
    }
    
    try {
      // Convert field element string to Field type
      const fieldValue = BigInt(this.fieldElement);
      
      // Prepare inputs for Noir circuit
      const inputs: CircuitInputs = {
        solution: [fieldValue.toString(), this.grid],
        challenge: [fieldValue.toString(), CHALLENGE_PUZZLE]
      };
      
      console.log('Executing circuit...');
      const { witness }: WitnessMap = await this.noir.execute(inputs);
      
      console.log('Generating proof...');
      const proofData: ProofData = await this.backend.generateProof(witness);
      
      console.log('Verifying proof...');
      const isValid: boolean = await this.backend.verifyProof(proofData);
      
      if (isValid) {
        this.proof = proofData;
        this.proofTime = this.elapsedTime;
        
        // Display proof hash
        const proofHash = this.hashProof(proofData.proof);
        const proofHashElement = document.getElementById('proofHash');
        if (proofHashElement) {
          proofHashElement.textContent = `Proof Hash: ${proofHash}`;
        }
        
        const proofDisplay = document.getElementById('proofDisplay');
        if (proofDisplay) {
          proofDisplay.classList.add('show');
        }
        
        this.showStatus('Proof generated and verified successfully!', 'success');
        
        const shareSection = document.getElementById('shareSection');
        if (shareSection) {
          shareSection.classList.add('show');
        }
      } else {
        this.showStatus('Proof verification failed. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Proof generation error:', error);
      this.showStatus(`Error generating proof: ${(error as Error).message}`, 'error');
    }
    
    if (generateProofBtn) {
      generateProofBtn.disabled = false;
    }
  }
  
  private hashProof(proof: Uint8Array): string {
    // Simple hash for display (first and last 8 chars of proof)
    const proofStr = Array.from(proof.slice(0, 32))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `${proofStr.slice(0, 8)}...${proofStr.slice(-8)}`;
  }
  
  private async uploadToGist(): Promise<void> {
    const tokenInput = document.getElementById('githubToken') as HTMLInputElement;
    const token = tokenInput?.value;
    
    if (!token) {
      this.showStatus('Please enter a GitHub Personal Access Token', 'error');
      return;
    }
    
    if (!this.proof) {
      this.showStatus('No proof to upload. Generate a proof first.', 'error');
      return;
    }
    
    this.showStatus('Uploading to GitHub Gist...', 'loading');
    
    const proofData: ProofDataExport = {
      challenge: CHALLENGE_PUZZLE,
      challengeId: this.fieldElement,
      proof: Array.from(this.proof.proof),
      publicInputs: this.proof.publicInputs,
      timeInMs: this.proofTime || 0,
      timestamp: new Date().toISOString()
    };
    
    const gistContent: GistRequest = {
      description: `Pseudoku Zero-Knowledge Proof - Solved in ${Math.floor((this.proofTime || 0) / 1000)}s`,
      public: true,
      files: {
        'pseudoku_proof.json': {
          content: JSON.stringify(proofData, null, 2)
        }
      }
    };
    
    try {
      const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gistContent)
      });
      
      if (response.ok) {
        const gist: GistResponse = await response.json();
        this.gistUrl = gist.html_url;
        this.showStatus(
          `Gist created successfully! <a href="${this.gistUrl}" target="_blank">View Gist</a>`,
          'success'
        );
      } else {
        const error = await response.json();
        this.showStatus(`Failed to create gist: ${error.message}`, 'error');
      }
    } catch (error) {
      this.showStatus(`Error uploading to GitHub: ${(error as Error).message}`, 'error');
    }
  }
  
  private async postToGitHub(): Promise<void> {
    const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || '';
    
    if (!CLIENT_ID) {
      // Fallback to manual token input
      this.showStatus('GitHub OAuth not configured. Use manual token instead.', 'info');
      const manualSection = document.getElementById('manualGistSection');
      if (manualSection) {
        manualSection.style.display = 'flex';
      }
      return;
    }
    
    // Store current proof in sessionStorage temporarily
    if (this.proof) {
      const proofData: ProofDataExport = {
        challenge: CHALLENGE_PUZZLE,
        challengeId: this.fieldElement,
        proof: Array.from(this.proof.proof),
        publicInputs: this.proof.publicInputs,
        timeInMs: this.proofTime || 0,
        timestamp: new Date().toISOString()
      };
      
      sessionStorage.setItem('pendingProof', JSON.stringify(proofData));
    }
    
    // Use GitHubOAuth class to initiate OAuth flow
    GitHubOAuth.initiateOAuth(CLIENT_ID);
  }
  
  private async verifyExternalProof(): Promise<void> {
    const modal = document.getElementById('verifyModal');
    if (modal) {
      modal.classList.add('show');
    }
  }
  
  private async performVerification(): Promise<void> {
    const input = (document.getElementById('proofInput') as HTMLTextAreaElement)?.value;
    
    if (!input) {
      this.showVerifyResult('Please paste proof data', false);
      return;
    }
    
    try {
      const proofData = JSON.parse(input) as ProofDataExport;
      
      if (!this.backend) {
        this.showVerifyResult('Proof system not initialized', false);
        return;
      }
      
      // Reconstruct proof format for verification
      const proof: ProofData = {
        proof: new Uint8Array(proofData.proof),
        publicInputs: proofData.publicInputs
      };
      
      // Verify the proof
      const isValid = await this.backend.verifyProof(proof);
      
      if (isValid) {
        const timeStr = this.formatTime(proofData.timeInMs);
        this.showVerifyResult(
          `✓ Valid proof! Solved in ${timeStr}. Challenge ID: ${proofData.challengeId.slice(0, 10)}...`,
          true
        );
      } else {
        this.showVerifyResult('✗ Invalid proof', false);
      }
    } catch (error) {
      console.error('Verification error:', error);
      this.showVerifyResult(`Error: ${(error as Error).message}`, false);
    }
  }
  
  private showVerifyResult(message: string, success: boolean): void {
    const resultDiv = document.getElementById('verifyResult');
    if (resultDiv) {
      resultDiv.className = `verify-result show ${success ? 'success' : 'error'}`;
      resultDiv.innerHTML = message;
    }
  }
  
  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
  }
  
  private async copyToClipboard(text: string, buttonId: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      const button = document.getElementById(buttonId);
      if (button) {
        button.classList.add('copied');
        const originalText = button.innerHTML;
        if (button.querySelector('svg')) {
          // Just add visual feedback for icon buttons
          setTimeout(() => button.classList.remove('copied'), 2000);
        } else {
          button.textContent = 'Copied!';
          setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copied');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Copy failed:', error);
      this.showStatus('Failed to copy to clipboard', 'error');
    }
  }
  
  private copyFieldElement(): void {
    this.copyToClipboard(this.fieldElement, 'copyFieldBtn');
  }
  
  private copyProofData(): void {
    if (!this.proof) {
      this.showStatus('No proof to copy', 'error');
      return;
    }
    
    const proofData: ProofDataExport = {
      challenge: CHALLENGE_PUZZLE,
      challengeId: this.fieldElement,
      proof: Array.from(this.proof.proof),
      publicInputs: this.proof.publicInputs,
      timeInMs: this.proofTime || 0,
      timestamp: new Date().toISOString()
    };
    
    this.copyToClipboard(JSON.stringify(proofData, null, 2), 'copyProofBtn');
  }
  
  private shareOnTwitter(): void {
    const timeInSeconds = Math.floor((this.proofTime || 0) / 1000);
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    
    let message = `I solved today's Pseudoku in ${timeStr}! `;
    
    if (this.gistUrl) {
      message += `Verify my proof here: ${this.gistUrl} `;
    }
    
    message += `\n\nSolve a pseudoku at pseudoku.qedk.xyz`;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
    window.open(twitterUrl, '_blank');
  }
  
  private reset(): void {
    if (confirm('Are you sure you want to reset? Your progress will be lost.')) {
      this.stopTimer();
      this.proof = null;
      this.gistUrl = null;
      this.fieldElement = this.generateFieldElement();
      
      const proofDisplay = document.getElementById('proofDisplay');
      if (proofDisplay) {
        proofDisplay.classList.remove('show');
      }
      
      const shareSection = document.getElementById('shareSection');
      if (shareSection) {
        shareSection.classList.remove('show');
      }
      
      const generateProofBtn = document.getElementById('generateProofBtn') as HTMLButtonElement;
      if (generateProofBtn) {
        generateProofBtn.disabled = true;
      }
      
      this.initializeGame();
      this.showStatus('Game reset. Good luck!', 'info');
    }
  }
  
  private giveHint(): void {
    // Find empty cells
    const emptyCells: CellPosition[] = [];
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (this.grid[i][j] === 0) {
          emptyCells.push([i, j]);
        }
      }
    }
    
    if (emptyCells.length === 0) {
      this.showStatus('No empty cells to fill!', 'info');
      return;
    }
    
    // For a real hint system, you'd need a solver
    // This is a simplified version
    this.showStatus('Hint: Try using the process of elimination for empty cells.', 'info');
  }
  
  private showStatus(message: string, type: StatusType): void {
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.innerHTML = message;
      statusElement.className = `status ${type}`;
    }
  }
  
  private async handleGitHubCallback(): Promise<void> {
    // Check if we're returning from GitHub OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
      try {
        const token = await GitHubOAuth.handleCallback(code, state);
        
        if (token) {
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Retrieve and post the pending proof
          const pendingProof = sessionStorage.getItem('pendingProof');
          if (pendingProof) {
            const proofData = JSON.parse(pendingProof) as ProofDataExport;
            const timeStr = this.formatTime(proofData.timeInMs);
            
            const result = await GitHubOAuth.createGist(
              token,
              proofData,
              `Pseudoku Zero-Knowledge Proof - Solved in ${timeStr}`
            );
            
            this.gistUrl = result.url;
            this.showStatus(
              `Gist created successfully! <a href="${this.gistUrl}" target="_blank">View Gist</a>`,
              'success'
            );
            
            sessionStorage.removeItem('pendingProof');
          }
        } else {
          // Fallback to manual token
          this.showStatus('OAuth failed. Please use manual token instead.', 'error');
          const manualSection = document.getElementById('manualGistSection');
          if (manualSection) {
            manualSection.style.display = 'flex';
          }
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        this.showStatus('OAuth authentication failed', 'error');
      }
    }
  }
  
  private setupEventListeners(): void {
    const checkBtn = document.getElementById('checkBtn');
    const generateProofBtn = document.getElementById('generateProofBtn');
    const resetBtn = document.getElementById('resetBtn');
    const hintBtn = document.getElementById('hintBtn');
    const uploadGistBtn = document.getElementById('uploadGistBtn');
    const shareTwitterBtn = document.getElementById('shareTwitterBtn');
    const postGithubBtn = document.getElementById('postGithubBtn');
    const verifyProofBtn = document.getElementById('verifyProofBtn');
    const copyFieldBtn = document.getElementById('copyFieldBtn');
    const copyProofBtn = document.getElementById('copyProofBtn');
    const verifyBtn = document.getElementById('verifyBtn');
    const closeModal = document.getElementById('closeModal');
    const modal = document.getElementById('verifyModal');
    
    checkBtn?.addEventListener('click', () => this.checkSolution());
    generateProofBtn?.addEventListener('click', () => this.generateProof());
    resetBtn?.addEventListener('click', () => this.reset());
    hintBtn?.addEventListener('click', () => this.giveHint());
    uploadGistBtn?.addEventListener('click', () => this.uploadToGist());
    shareTwitterBtn?.addEventListener('click', () => this.shareOnTwitter());
    postGithubBtn?.addEventListener('click', () => this.postToGitHub());
    verifyProofBtn?.addEventListener('click', () => this.verifyExternalProof());
    copyFieldBtn?.addEventListener('click', () => this.copyFieldElement());
    copyProofBtn?.addEventListener('click', () => this.copyProofData());
    verifyBtn?.addEventListener('click', () => this.performVerification());
    
    closeModal?.addEventListener('click', () => {
      if (modal) modal.classList.remove('show');
    });
    
    // Close modal when clicking outside
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
    
    // Check for GitHub OAuth callback
    this.handleGitHubCallback();
    
    // Keyboard navigation
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement?.classList.contains('sudoku-cell')) {
        const row = parseInt(activeElement.dataset.row!);
        const col = parseInt(activeElement.dataset.col!);
        let nextRow = row;
        let nextCol = col;
        
        switch(e.key) {
          case 'ArrowUp':
            nextRow = Math.max(0, row - 1);
            break;
          case 'ArrowDown':
            nextRow = Math.min(8, row + 1);
            break;
          case 'ArrowLeft':
            nextCol = Math.max(0, col - 1);
            break;
          case 'ArrowRight':
            nextCol = Math.min(8, col + 1);
            break;
          case 'Enter':
            if (col < 8) {
              nextCol = col + 1;
            } else if (row < 8) {
              nextRow = row + 1;
              nextCol = 0;
            }
            break;
          default:
            return;
        }
        
        if (nextRow !== row || nextCol !== col) {
          e.preventDefault();
          const nextCell = document.querySelector(
            `[data-row="${nextRow}"][data-col="${nextCol}"]`
          ) as HTMLElement;
          nextCell?.focus();
        }
      }
    });
  }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PseudokuGame();
});
