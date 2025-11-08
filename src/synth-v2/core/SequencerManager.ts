/**
 * SequencerManager - Step sequencer for Synth V2
 * 
 * Responsibilities:
 * - Manage step sequence (up to 64 steps)
 * - Handle playback timing and step progression
 * - Track playhead position
 * - Generate notes from step data
 * 
 * Clean architecture: No direct audio access, uses VoiceManager callback
 */

export interface SequencerStep {
  gate: boolean;        // Note on/off
  pitch: number;        // MIDI note number
  velocity: number;     // 0-127
  length: number;       // Note length (0-1, as fraction of step)
}

export type SequencerMode = 'forward' | 'reverse' | 'pingpong' | 'random';

export interface SequencerConfig {
  steps?: number;           // Number of steps (4, 8, 16, 32, 64)
  tempo?: number;           // BPM (40-300)
  mode?: SequencerMode;     // Playback mode
  swing?: number;           // 0-1, swing amount
}

export class SequencerManager {
  // Configuration
  private stepCount: number = 16;
  private tempo: number = 120;
  private mode: SequencerMode = 'forward';
  private swing: number = 0;
  
  // State
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private currentStep: number = 0;
  private direction: 1 | -1 = 1; // For pingpong mode
  private intervalId: number | null = null;
  
  // Step data
  private steps: SequencerStep[] = [];
  
  // Callbacks
  private onNoteCallback: ((pitch: number, velocity: number) => void) | null = null;
  private onNoteOffCallback: ((pitch: number) => void) | null = null;
  private onStepCallback: ((stepIndex: number) => void) | null = null;
  
  // Track currently playing notes for cleanup
  private activeNotes: Set<number> = new Set();

  constructor(config?: SequencerConfig) {
    if (config) {
      if (config.steps) this.stepCount = config.steps;
      if (config.tempo) this.tempo = config.tempo;
      if (config.mode) this.mode = config.mode;
      if (config.swing !== undefined) this.swing = config.swing;
    }
    
    this.initializeSteps();
  }

  /**
   * Initialize step data with defaults
   */
  private initializeSteps(): void {
    this.steps = Array.from({ length: this.stepCount }, () => ({
      gate: false,
      pitch: 60, // Middle C
      velocity: 100,
      length: 0.8,
    }));
  }

  /**
   * Start sequencer playback
   */
  public start(): void {
    if (this.isPlaying && !this.isPaused) return;
    
    this.isPlaying = true;
    this.isPaused = false;
    
    if (!this.isPaused) {
      this.currentStep = 0;
      this.direction = 1;
    }
    
    this.scheduleNextStep();
  }

  /**
   * Stop sequencer playback
   */
  public stop(): void {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    this.isPaused = false;
    
    if (this.intervalId !== null) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    
    // Stop all active notes
    this.stopAllNotes();
    
    this.currentStep = 0;
    this.direction = 1;
  }

  /**
   * Pause sequencer (can be resumed)
   */
  public pause(): void {
    if (!this.isPlaying || this.isPaused) return;
    
    this.isPaused = true;
    this.isPlaying = false;
    
    if (this.intervalId !== null) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    
    // Stop all active notes
    this.stopAllNotes();
  }

  /**
   * Resume from pause
   */
  public resume(): void {
    if (this.isPlaying || !this.isPaused) return;
    
    this.isPlaying = true;
    this.isPaused = false;
    this.scheduleNextStep();
  }

  /**
   * Reset sequencer to beginning
   */
  public reset(): void {
    const wasPlaying = this.isPlaying;
    
    if (wasPlaying) {
      this.stop();
    }
    
    this.currentStep = 0;
    this.direction = 1;
    
    if (wasPlaying) {
      this.start();
    }
  }

  /**
   * Set step data
   */
  public setStep(index: number, data: Partial<SequencerStep>): void {
    if (index < 0 || index >= this.stepCount) return;
    
    this.steps[index] = {
      ...this.steps[index],
      ...data,
    };
  }

  /**
   * Get step data
   */
  public getStep(index: number): SequencerStep | null {
    if (index < 0 || index >= this.stepCount) return null;
    return { ...this.steps[index] };
  }

  /**
   * Get all steps
   */
  public getSteps(): SequencerStep[] {
    return this.steps.map(s => ({ ...s }));
  }

  /**
   * Clear all steps
   */
  public clear(): void {
    this.steps.forEach(step => {
      step.gate = false;
    });
  }

  /**
   * Randomize steps
   */
  public randomize(density: number = 0.5): void {
    this.steps.forEach(step => {
      step.gate = Math.random() < density;
      step.pitch = 48 + Math.floor(Math.random() * 25); // C3 to C5
      step.velocity = 80 + Math.floor(Math.random() * 40); // 80-120
    });
  }

  /**
   * Set number of steps
   */
  public setSteps(count: 4 | 8 | 16 | 32 | 64): void {
    const oldSteps = [...this.steps];
    this.stepCount = count;
    
    // Resize array
    this.steps = Array.from({ length: count }, (_, i) => 
      i < oldSteps.length ? oldSteps[i] : {
        gate: false,
        pitch: 60,
        velocity: 100,
        length: 0.8,
      }
    );
    
    // Reset if current step is out of bounds
    if (this.currentStep >= count) {
      this.currentStep = 0;
    }
  }

  /**
   * Get current step count
   */
  public getStepCount(): number {
    return this.stepCount;
  }

  /**
   * Set tempo
   */
  public setTempo(tempo: number): void {
    this.tempo = Math.max(40, Math.min(300, tempo));
  }

  /**
   * Get tempo
   */
  public getTempo(): number {
    return this.tempo;
  }

  /**
   * Set playback mode
   */
  public setMode(mode: SequencerMode): void {
    this.mode = mode;
  }

  /**
   * Get playback mode
   */
  public getMode(): SequencerMode {
    return this.mode;
  }

  /**
   * Set swing amount
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
   * Get current step index
   */
  public getCurrentStep(): number {
    return this.currentStep;
  }

  /**
   * Check if playing
   */
  public isRunning(): boolean {
    return this.isPlaying;
  }

  /**
   * Register callbacks
   */
  public onNote(callback: (pitch: number, velocity: number) => void): void {
    this.onNoteCallback = callback;
  }

  public onNoteOff(callback: (pitch: number) => void): void {
    this.onNoteOffCallback = callback;
  }

  public onStep(callback: (stepIndex: number) => void): void {
    this.onStepCallback = callback;
  }

  /**
   * Get next step index based on mode
   */
  private getNextStepIndex(): number {
    let nextStep: number;

    switch (this.mode) {
      case 'forward':
        nextStep = (this.currentStep + 1) % this.stepCount;
        break;

      case 'reverse':
        nextStep = this.currentStep - 1;
        if (nextStep < 0) nextStep = this.stepCount - 1;
        break;

      case 'pingpong':
        nextStep = this.currentStep + this.direction;
        
        if (nextStep >= this.stepCount) {
          nextStep = this.stepCount - 2;
          this.direction = -1;
        } else if (nextStep < 0) {
          nextStep = 1;
          this.direction = 1;
        }
        break;

      case 'random':
        nextStep = Math.floor(Math.random() * this.stepCount);
        break;

      default:
        nextStep = (this.currentStep + 1) % this.stepCount;
    }

    return nextStep;
  }

  /**
   * Calculate step duration in milliseconds
   */
  private getStepDuration(stepIndex: number): number {
    const sixteenthNoteDuration = (60000 / this.tempo) / 4;
    
    // Apply swing to odd-numbered steps
    if (this.swing > 0 && stepIndex % 2 === 1) {
      return sixteenthNoteDuration * (1 + this.swing * 0.5);
    }
    
    return sixteenthNoteDuration;
  }

  /**
   * Stop all currently playing notes
   */
  private stopAllNotes(): void {
    if (this.onNoteOffCallback) {
      this.activeNotes.forEach(pitch => {
        this.onNoteOffCallback!(pitch);
      });
    }
    this.activeNotes.clear();
  }

  /**
   * Play current step and schedule next
   */
  private scheduleNextStep(): void {
    if (!this.isPlaying) return;

    const step = this.steps[this.currentStep];
    const stepDuration = this.getStepDuration(this.currentStep);

    // Notify step callback (for UI update)
    if (this.onStepCallback) {
      this.onStepCallback(this.currentStep);
    }

    // Play note if gate is active
    if (step.gate && this.onNoteCallback) {
      // Stop previous note if it's still playing
      if (this.activeNotes.has(step.pitch) && this.onNoteOffCallback) {
        this.onNoteOffCallback(step.pitch);
        this.activeNotes.delete(step.pitch);
      }

      // Play new note
      this.onNoteCallback(step.pitch, step.velocity / 127);
      this.activeNotes.add(step.pitch);

      // Schedule note off
      const noteDuration = stepDuration * step.length;
      setTimeout(() => {
        if (this.onNoteOffCallback && this.activeNotes.has(step.pitch)) {
          this.onNoteOffCallback(step.pitch);
          this.activeNotes.delete(step.pitch);
        }
      }, noteDuration);
    }

    // Move to next step
    this.currentStep = this.getNextStepIndex();

    // Schedule next step
    this.intervalId = window.setTimeout(() => {
      this.scheduleNextStep();
    }, stepDuration);
  }
}
