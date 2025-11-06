/**
 * Step Sequencer
 * 
 * A programmable step sequencer for creating rhythmic patterns and melodic sequences.
 * Supports multiple patterns, adjustable tempo, and various output modes.
 * 
 * Features:
 * - Multiple steps (4, 8, 16, 32 steps)
 * - Adjustable tempo (BPM)
 * - Gate per step (note on/off)
 * - Velocity per step (0-127)
 * - Pitch per step (MIDI note numbers or CV)
 * - Pattern chaining
 * - Swing timing
 * - Multiple playback modes (forward, reverse, ping-pong, random)
 * 
 * Classic use: Basslines, arpeggios, drum patterns, generative melodies
 */

export interface SequencerStep {
  gate: boolean;        // Note on/off
  pitch: number;        // MIDI note number (0-127) or CV value
  velocity: number;     // Velocity (0-127)
  length: number;       // Note length (0-1, percentage of step)
}

export interface SequencerPattern {
  name: string;
  steps: SequencerStep[];
}

export type PlaybackMode = 'forward' | 'reverse' | 'pingpong' | 'random';

export interface SequencerConfig {
  steps?: number;       // Number of steps (4, 8, 16, 32)
  tempo?: number;       // BPM (40-300)
  swing?: number;       // Swing amount (0-1)
  mode?: PlaybackMode;  // Playback mode
}

export class Sequencer {
  private steps: number = 16;
  private tempo: number = 120;
  private swing: number = 0;
  private mode: PlaybackMode = 'forward';
  
  private currentStep: number = 0;
  private direction: number = 1; // 1 for forward, -1 for reverse
  private isPlaying: boolean = false;
  private intervalId: number | null = null;
  
  private pattern: SequencerStep[] = [];
  private patterns: Map<string, SequencerPattern> = new Map();
  
  // Callbacks for step events
  private onStepCallback: ((step: number, data: SequencerStep) => void) | null = null;
  private onPatternCompleteCallback: (() => void) | null = null;

  constructor(config: SequencerConfig = {}) {
    this.steps = config.steps || 16;
    this.tempo = config.tempo || 120;
    this.swing = config.swing || 0;
    this.mode = config.mode || 'forward';
    
    // Initialize default pattern
    this.initializeDefaultPattern();
  }

  /**
   * Initialize a default pattern with all gates off
   */
  private initializeDefaultPattern(): void {
    this.pattern = [];
    for (let i = 0; i < this.steps; i++) {
      this.pattern.push({
        gate: false,
        pitch: 60, // Middle C
        velocity: 100,
        length: 0.8, // 80% of step length
      });
    }
  }

  /**
   * Start the sequencer
   */
  public start(): void {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.currentStep = 0;
    this.direction = 1;
    
    // Play first step immediately
    this.playCurrentStep();
    
    // Schedule next steps
    this.scheduleNextStep();
  }

  /**
   * Stop the sequencer
   */
  public stop(): void {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    this.currentStep = 0;
    this.direction = 1;
  }

  /**
   * Pause the sequencer (maintains current position)
   */
  public pause(): void {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Resume from pause
   */
  public resume(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleNextStep();
  }

  /**
   * Reset to beginning
   */
  public reset(): void {
    this.currentStep = 0;
    this.direction = 1;
  }

  /**
   * Play the current step
   */
  private playCurrentStep(): void {
    const step = this.pattern[this.currentStep];
    
    // Trigger callback
    if (this.onStepCallback && step.gate) {
      this.onStepCallback(this.currentStep, step);
    }
  }

  /**
   * Schedule the next step
   */
  private scheduleNextStep(): void {
    if (!this.isPlaying) return;
    
    // Calculate step duration in milliseconds
    const beatDuration = (60000 / this.tempo) / 4; // Assuming 16th notes
    
    // Apply swing to odd-numbered steps
    let stepDuration = beatDuration;
    if (this.currentStep % 2 === 1 && this.swing > 0) {
      stepDuration *= (1 + this.swing * 0.5); // Max 50% swing
    }
    
    this.intervalId = window.setTimeout(() => {
      this.advanceStep();
      this.playCurrentStep();
      this.scheduleNextStep();
    }, stepDuration);
  }

  /**
   * Advance to the next step based on playback mode
   */
  private advanceStep(): void {
    switch (this.mode) {
      case 'forward':
        this.currentStep = (this.currentStep + 1) % this.steps;
        if (this.currentStep === 0 && this.onPatternCompleteCallback) {
          this.onPatternCompleteCallback();
        }
        break;
        
      case 'reverse':
        this.currentStep = (this.currentStep - 1 + this.steps) % this.steps;
        if (this.currentStep === this.steps - 1 && this.onPatternCompleteCallback) {
          this.onPatternCompleteCallback();
        }
        break;
        
      case 'pingpong':
        this.currentStep += this.direction;
        if (this.currentStep >= this.steps - 1) {
          this.direction = -1;
          this.currentStep = this.steps - 1;
        } else if (this.currentStep <= 0) {
          this.direction = 1;
          this.currentStep = 0;
          if (this.onPatternCompleteCallback) {
            this.onPatternCompleteCallback();
          }
        }
        break;
        
      case 'random':
        this.currentStep = Math.floor(Math.random() * this.steps);
        break;
    }
  }

  /**
   * Set a step's data
   */
  public setStep(index: number, data: Partial<SequencerStep>): void {
    if (index < 0 || index >= this.steps) return;
    
    this.pattern[index] = {
      ...this.pattern[index],
      ...data,
    };
  }

  /**
   * Get a step's data
   */
  public getStep(index: number): SequencerStep | null {
    if (index < 0 || index >= this.steps) return null;
    return { ...this.pattern[index] };
  }

  /**
   * Clear all steps
   */
  public clear(): void {
    this.pattern.forEach(step => {
      step.gate = false;
    });
  }

  /**
   * Randomize pattern
   */
  public randomize(density: number = 0.5): void {
    this.pattern.forEach(step => {
      step.gate = Math.random() < density;
      step.pitch = Math.floor(Math.random() * 24) + 48; // C3 to C5
      step.velocity = Math.floor(Math.random() * 64) + 64; // 64-127
    });
  }

  /**
   * Set the number of steps
   */
  public setSteps(steps: number): void {
    const validSteps = [4, 8, 16, 32];
    if (!validSteps.includes(steps)) {
      console.warn(`Invalid step count: ${steps}. Using 16.`);
      steps = 16;
    }
    
    const oldPattern = [...this.pattern];
    this.steps = steps;
    this.initializeDefaultPattern();
    
    // Copy old pattern data up to new length
    const copyLength = Math.min(oldPattern.length, this.steps);
    for (let i = 0; i < copyLength; i++) {
      this.pattern[i] = { ...oldPattern[i] };
    }
  }

  /**
   * Set tempo in BPM
   */
  public setTempo(bpm: number): void {
    this.tempo = Math.max(40, Math.min(300, bpm));
  }

  /**
   * Get current tempo
   */
  public getTempo(): number {
    return this.tempo;
  }

  /**
   * Set swing amount (0-1)
   */
  public setSwing(swing: number): void {
    this.swing = Math.max(0, Math.min(1, swing));
  }

  /**
   * Get swing amount
   */
  public getSwing(): number {
    return this.swing;
  }

  /**
   * Set playback mode
   */
  public setMode(mode: PlaybackMode): void {
    this.mode = mode;
    this.currentStep = 0;
    this.direction = 1;
  }

  /**
   * Get current playback mode
   */
  public getMode(): PlaybackMode {
    return this.mode;
  }

  /**
   * Get current step index
   */
  public getCurrentStep(): number {
    return this.currentStep;
  }

  /**
   * Check if sequencer is playing
   */
  public isRunning(): boolean {
    return this.isPlaying;
  }

  /**
   * Get number of steps
   */
  public getSteps(): number {
    return this.steps;
  }

  /**
   * Get the full pattern
   */
  public getPattern(): SequencerStep[] {
    return this.pattern.map(step => ({ ...step }));
  }

  /**
   * Set the full pattern
   */
  public setPattern(pattern: SequencerStep[]): void {
    if (pattern.length !== this.steps) {
      console.warn(`Pattern length ${pattern.length} doesn't match step count ${this.steps}`);
      return;
    }
    this.pattern = pattern.map(step => ({ ...step }));
  }

  /**
   * Save current pattern
   */
  public savePattern(name: string): void {
    this.patterns.set(name, {
      name,
      steps: this.pattern.map(step => ({ ...step })),
    });
  }

  /**
   * Load a saved pattern
   */
  public loadPattern(name: string): boolean {
    const pattern = this.patterns.get(name);
    if (!pattern) return false;
    
    this.setSteps(pattern.steps.length);
    this.pattern = pattern.steps.map(step => ({ ...step }));
    return true;
  }

  /**
   * Get list of saved patterns
   */
  public getPatternNames(): string[] {
    return Array.from(this.patterns.keys());
  }

  /**
   * Delete a saved pattern
   */
  public deletePattern(name: string): boolean {
    return this.patterns.delete(name);
  }

  /**
   * Register callback for step events
   */
  public onStep(callback: (step: number, data: SequencerStep) => void): void {
    this.onStepCallback = callback;
  }

  /**
   * Register callback for pattern complete events
   */
  public onPatternComplete(callback: () => void): void {
    this.onPatternCompleteCallback = callback;
  }

  /**
   * Create a simple bassline pattern
   */
  public createBasslinePattern(): void {
    const notes = [36, 36, 43, 41]; // C, C, G, F in bass range
    this.pattern.forEach((step, i) => {
      step.gate = i % 4 === 0 || i % 4 === 2;
      step.pitch = notes[Math.floor(i / 4) % notes.length];
      step.velocity = i % 4 === 0 ? 120 : 90;
      step.length = 0.6;
    });
  }

  /**
   * Create an arpeggio pattern
   */
  public createArpeggioPattern(rootNote: number = 60): void {
    // Major triad arpeggio
    const intervals = [0, 4, 7, 12]; // Root, major 3rd, perfect 5th, octave
    this.pattern.forEach((step, i) => {
      step.gate = true;
      step.pitch = rootNote + intervals[i % intervals.length];
      step.velocity = 100;
      step.length = 0.9;
    });
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    this.stop();
    this.onStepCallback = null;
    this.onPatternCompleteCallback = null;
    this.patterns.clear();
  }
}
