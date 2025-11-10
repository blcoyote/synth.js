/**
 * SequencerManager - Step sequencer for Synth V2
 * 
 * Responsibilities:
 * - Manage step sequence (up to 16 steps)
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
  steps?: number;           // Number of steps (4, 8, 16)
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
  private enabled: boolean = false;  // On/off toggle
  private isPlaying: boolean = false; // Internal playback state
  private isPaused: boolean = false;
  private currentStep: number = 0;
  private direction: 1 | -1 = 1; // For pingpong mode
  private intervalId: number | null = null;
  
  // Keyboard-driven mode
  private rootNote: number | null = null;  // Currently held root note
  private noteHoldEnabled: boolean = false; // Latch mode - continue playing after key release
  
  // Step recording mode
  private isRecording: boolean = false;
  private recordStep: number = 0;
  private recordRootNote: number | null = null; // Root note when recording started
  
  // Step data (stores intervals relative to root note, not absolute pitches)
  private steps: SequencerStep[] = [];
  
  // Callbacks - now with time parameter for AudioContext scheduling
  private onNoteCallback: ((pitch: number, velocity: number, time?: number) => void) | null = null;
  private onNoteOffCallback: ((pitch: number, time?: number) => void) | null = null;
  private onStepCallback: ((stepIndex: number) => void) | null = null;
  
  // Direct DOM manipulation for visualization (no React re-renders)
  private playheadElement: HTMLElement | null = null;
  
  // Track currently playing notes for cleanup
  private activeNotes: Set<number> = new Set();
  
  // Audio timing - for precise scheduling
  private audioContext: AudioContext | null = null;
  private nextStepTime: number = 0;
  private scheduleAheadTime: number = 0.2; // Look ahead 200ms (increased for reliability)
  private schedulerTimerId: number | null = null; // Use setTimeout for scheduling loop
  private scheduledNotes: Map<number, { timeoutId: number; pitch: number }> = new Map(); // Track scheduled note-offs
  private tempoChanged: boolean = false; // Flag for tempo changes
  private swingChanged: boolean = false; // Flag for swing changes

  constructor(config?: SequencerConfig, audioContext?: AudioContext) {
    this.audioContext = audioContext || null;
    if (config) {
      if (config.steps) this.stepCount = config.steps;
      if (config.tempo) this.tempo = config.tempo;
      if (config.mode) this.mode = config.mode;
      if (config.swing !== undefined) this.swing = config.swing;
    }
    
    this.initializeSteps();
  }

  /**
   * Initialize step data with defaults (as intervals: 0, 2, 4, etc.)
   */
  private initializeSteps(): void {
    this.steps = Array.from({ length: this.stepCount }, (_, i) => ({
      gate: true, // Enable gates by default so sequence makes sound
      pitch: i % 12, // Store as interval (0-11) for relative playback
      velocity: 100,
      length: 0.8,
    }));
  }

  /**
   * Enable sequencer
   */
  public enable(): void {
    this.enabled = true;
    console.log('🎵 Sequencer enabled');
  }

  /**
   * Disable sequencer
   */
  public disable(): void {
    this.enabled = false;
    this.stop();
    this.rootNote = null;
    console.log('🎵 Sequencer disabled');
  }

  /**
   * Check if sequencer is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set enabled state
   */
  public setEnabled(enabled: boolean): void {
    if (enabled) {
      this.enable();
    } else {
      this.disable();
    }
  }

  /**
   * Set note hold mode
   */
  public setNoteHold(enabled: boolean): void {
    this.noteHoldEnabled = enabled;
  }

  /**
   * Get note hold mode
   */
  public getNoteHold(): boolean {
    return this.noteHoldEnabled;
  }

  /**
   * Handle note on from keyboard (when sequencer is enabled)
   */
  public handleNoteOn(noteIndex: number): void {
    if (!this.enabled) return;

    // Set as root note
    this.rootNote = noteIndex;
    
    // Start playback if not already playing
    if (!this.isPlaying) {
      this.start();
    }
  }

  /**
   * Handle note off from keyboard (when sequencer is enabled)
   */
  public handleNoteOff(noteIndex: number): void {
    if (!this.enabled) return;

    // Only stop if note hold is disabled and this was the root note
    if (!this.noteHoldEnabled && this.rootNote === noteIndex) {
      this.rootNote = null;
      this.stop();
    }
  }

  /**
   * Start sequencer playback (internal)
   */
  private start(): void {
    if (this.isPlaying && !this.isPaused) return;
    
    this.isPlaying = true;
    this.isPaused = false;
    
    if (!this.isPaused) {
      this.currentStep = 0;
      this.direction = 1;
    }
    
    // Initialize timing - require AudioContext for accurate timing
    if (!this.audioContext) {
      console.warn('⚠️ No AudioContext available - timing may be imprecise');
      this.nextStepTime = performance.now() / 1000;
    } else {
      this.nextStepTime = this.audioContext.currentTime;
    }
    
    this.scheduleSteps();
  }

  /**
   * Stop sequencer playback (internal)
   */
  private stop(): void {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    this.isPaused = false;
    
    // Cancel scheduling loop
    if (this.intervalId !== null) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.schedulerTimerId !== null) {
      cancelAnimationFrame(this.schedulerTimerId);
      this.schedulerTimerId = null;
    }
    
    // Cancel all scheduled note-offs
    this.scheduledNotes.forEach(({ timeoutId }) => {
      clearTimeout(timeoutId);
    });
    this.scheduledNotes.clear();
    
    // Stop all active notes
    this.stopAllNotes();
    
    this.currentStep = 0;
    this.direction = 1;
  }

  /**
   * Toggle note hold (public method for UI)
   */
  public toggleNoteHold(): void {
    this.noteHoldEnabled = !this.noteHoldEnabled;
  }

  /**
   * Reset sequencer to beginning (public)
   */
  public reset(): void {
    this.currentStep = 0;
    this.direction = 1;
    // Reset playhead visualization
    this.updatePlayheadPosition(0);
  }

  /**
   * Start step recording mode
   */
  public startRecording(rootNote?: number): void {
    if (this.isPlaying) {
      this.stop();
    }
    
    this.isRecording = true;
    this.recordStep = 0;
    this.recordRootNote = rootNote || null;
    
    // Clear all steps for fresh recording
    this.steps.forEach(step => {
      step.gate = false;
      step.pitch = 0;
      step.velocity = 100;
      step.length = 0.8;
    });
    
    console.log('🔴 Recording started at step 0');
    
    // Notify UI of current record step
    if (this.onStepCallback) {
      this.onStepCallback(this.recordStep);
    }
  }

  /**
   * Stop recording mode
   */
  public stopRecording(): void {
    this.isRecording = false;
    this.recordStep = 0;
    this.recordRootNote = null;
    console.log('⏹️ Recording stopped');
  }

  /**
   * Check if currently recording
   */
  public getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get current recording step
   */
  public getRecordStep(): number {
    return this.recordStep;
  }

  /**
   * Record a note at current step and advance
   */
  public recordNote(noteIndex: number, velocity: number = 100): void {
    if (!this.isRecording || this.recordStep >= this.stepCount) return;

    // Set root note if this is the first note
    if (this.recordRootNote === null) {
      this.recordRootNote = noteIndex;
      console.log(`🎹 Root note set to ${noteIndex}`);
    }

    // Calculate interval from root
    const interval = noteIndex - this.recordRootNote;
    
    // Record step
    this.steps[this.recordStep] = {
      gate: true,
      pitch: interval,
      velocity,
      length: 0.8,
    };

    console.log(`✏️ Recorded step ${this.recordStep}: interval ${interval >= 0 ? '+' : ''}${interval}`);

    // Advance to next step
    this.recordStep++;

    // Stop recording if we've filled all steps
    if (this.recordStep >= this.stepCount) {
      console.log('✅ Recording complete (all steps filled)');
      this.stopRecording();
    }

    // Notify UI of current record step
    if (this.onStepCallback) {
      this.onStepCallback(this.recordStep);
    }
  }

  /**
   * Record a rest (empty step) and advance
   */
  public recordRest(): void {
    if (!this.isRecording || this.recordStep >= this.stepCount) return;

    // Record empty step (gate off)
    this.steps[this.recordStep] = {
      gate: false,
      pitch: 0,
      velocity: 100,
      length: 0.8,
    };

    console.log(`🔇 Recorded rest at step ${this.recordStep}`);

    // Advance to next step
    this.recordStep++;

    // Stop recording if we've filled all steps
    if (this.recordStep >= this.stepCount) {
      console.log('✅ Recording complete (all steps filled)');
      this.stopRecording();
    }

    // Notify UI of current record step
    if (this.onStepCallback) {
      this.onStepCallback(this.recordStep);
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
      step.pitch = -12 + Math.floor(Math.random() * 25); // -12 to +12 semitones
      step.velocity = 80 + Math.floor(Math.random() * 40); // 80-120
    });
  }

  /**
   * Fill sequence with bassline pattern (root, fifth, octave)
   */
  public fillBassline(): void {
    const intervals = [0, 7, 12, 7]; // root, fifth, octave, fifth
    for (let i = 0; i < this.stepCount; i++) {
      this.steps[i].gate = true;
      this.steps[i].pitch = intervals[i % intervals.length];
      this.steps[i].velocity = 110;
      this.steps[i].length = 0.8;
    }
  }

  /**
   * Fill sequence with melodic pattern (scale intervals)
   */
  public fillMelodic(scale: number[] = [0, 2, 4, 5, 7, 9, 11]): void {
    for (let i = 0; i < this.stepCount; i++) {
      this.steps[i].gate = true;
      this.steps[i].pitch = scale[i % scale.length];
      this.steps[i].velocity = 100 + (i % 2 ? 10 : 0); // Slight accent on odd steps
      this.steps[i].length = 0.8;
    }
  }

  /**
   * Fill sequence with generative pattern (pleasing intervals within scale)
   */
  public fillGenerative(scale: number[] = [0, 2, 4, 5, 7, 9, 11]): void {
    for (let i = 0; i < this.stepCount; i++) {
      // 80% chance of gate being active
      this.steps[i].gate = Math.random() > 0.2;
      
      if (i === 0) {
        // Start on root
        this.steps[i].pitch = scale[0];
      } else {
        // Favor stepwise motion, avoid large leaps
        const prevPitch = this.steps[i - 1].pitch;
        const scaleIndex = scale.findIndex(note => note >= prevPitch % 12);
        const centerIndex = scaleIndex >= 0 ? scaleIndex : 0;
        
        // Choose from nearby scale notes (±2 steps in scale)
        const minIndex = Math.max(0, centerIndex - 2);
        const maxIndex = Math.min(scale.length - 1, centerIndex + 2);
        const noteIndex = minIndex + Math.floor(Math.random() * (maxIndex - minIndex + 1));
        
        this.steps[i].pitch = scale[noteIndex];
      }
      
      // Varied velocity for dynamics
      this.steps[i].velocity = 90 + Math.floor(Math.random() * 30); // 90-120
      
      // Varied note length for interest
      this.steps[i].length = 0.6 + Math.random() * 0.3; // 0.6-0.9
    }
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
    const newTempo = Math.max(40, Math.min(300, tempo));
    if (newTempo !== this.tempo) {
      this.tempo = newTempo;
      this.tempoChanged = true;
    }
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
    const newSwing = Math.max(0, Math.min(1, swing));
    if (newSwing !== this.swing) {
      this.swing = newSwing;
      this.swingChanged = true;
    }
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

  public onStep(callback: ((stepIndex: number) => void) | null): void {
    this.onStepCallback = callback;
  }

  /**
   * Set playhead element for direct DOM manipulation (no React re-renders)
   */
  public setPlayheadElement(element: HTMLElement | null): void {
    this.playheadElement = element;
  }

  /**
   * Update playhead position using CSS transform (no React re-render)
   */
  private updatePlayheadPosition(stepIndex: number): void {
    if (this.playheadElement) {
      const position = (stepIndex / this.stepCount) * 100;
      this.playheadElement.style.transform = `translateX(${position * this.stepCount}%)`;
    }
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
   * Get current time from most accurate source
   */
  private getCurrentTime(): number {
    return this.audioContext 
      ? this.audioContext.currentTime 
      : performance.now() / 1000;
  }

  /**
   * Schedule steps using look-ahead approach for precise timing
   */
  private scheduleSteps(): void {
    if (!this.isPlaying) return;

    const currentTime = this.getCurrentTime();

    // Handle tempo/swing changes - reschedule if needed
    if (this.tempoChanged || this.swingChanged) {
      // Adjust nextStepTime to maintain phase continuity
      // This prevents sudden jumps when tempo changes
      const timeToNextStep = this.nextStepTime - currentTime;
      if (timeToNextStep > 0 && this.tempoChanged) {
        // Recalculate based on new tempo, maintaining relative position
        const newStepDuration = this.getStepDuration(this.currentStep) / 1000;
        this.nextStepTime = currentTime + Math.min(timeToNextStep, newStepDuration);
      }
      this.tempoChanged = false;
      this.swingChanged = false;
    }

    // Schedule all steps that fall within the look-ahead window
    while (this.nextStepTime < currentTime + this.scheduleAheadTime) {
      // Schedule current step
      this.scheduleStep(this.currentStep, this.nextStepTime);
      
      // Calculate duration for THIS step before advancing
      const stepDuration = this.getStepDuration(this.currentStep) / 1000; // Convert to seconds
      
      // Advance to next step
      this.currentStep = this.getNextStepIndex();
      
      // Add the duration to get the time for the NEXT step
      this.nextStepTime += stepDuration;
      
      // CRITICAL FIX: Prevent timing drift accumulation
      // If we're scheduling too far behind current time, resync to current time
      // This prevents "catching up" behavior that causes rubber-banding
      if (this.nextStepTime < currentTime - 0.05) {
        console.warn('Sequencer fell behind, resyncing timing');
        this.nextStepTime = currentTime;
      }
    }

    // Calculate optimal next check time based on when we'll need to schedule again
    // Use shorter interval for more consistent scheduling (25ms = ~40Hz, good balance)
    const nextCheckDelay = 25; // Fixed 25ms interval for consistent timing
    
    this.schedulerTimerId = window.setTimeout(() => {
      this.schedulerTimerId = null;
      this.scheduleSteps();
    }, nextCheckDelay);
  }

  /**
   * Schedule a single step to play at precise time
   */
  private scheduleStep(stepIndex: number, time: number): void {
    const step = this.steps[stepIndex];
    const stepDuration = this.getStepDuration(stepIndex) / 1000; // Convert to seconds
    const currentTime = this.getCurrentTime();
    const delay = Math.max(0, (time - currentTime) * 1000); // Convert to ms for setTimeout (UI only)

    // Play note if gate is active
    if (step.gate && this.onNoteCallback && this.rootNote !== null) {
      // Calculate absolute pitch from root note + interval
      const absolutePitch = this.rootNote + step.pitch;
      const noteOffTime = time + (stepDuration * step.length);
      
      // Update visualization using direct DOM manipulation (no React re-render)
      window.setTimeout(() => {
        if (this.isPlaying) {
          this.updatePlayheadPosition(stepIndex);
          // Also call React callback if registered (for recording mode, etc.)
          if (this.onStepCallback) {
            this.onStepCallback(stepIndex);
          }
        }
      }, delay);
      
      // CRITICAL: Pass AudioContext time to callback for sample-accurate scheduling
      // This offloads timing to the audio engine instead of relying on setTimeout
      if (!this.isPlaying) return;
      
      // Remove from tracking if retriggering
      if (this.activeNotes.has(absolutePitch)) {
        this.activeNotes.delete(absolutePitch);
      }

      // Play note with PRECISE AudioContext time (no setTimeout!)
      this.onNoteCallback(absolutePitch, step.velocity / 127, time);
      this.activeNotes.add(absolutePitch);
      
      // Schedule note off with PRECISE AudioContext time
      if (this.onNoteOffCallback) {
        // Use setTimeout only to trigger the callback, but pass the precise time
        window.setTimeout(() => {
          if (this.isPlaying && this.activeNotes.has(absolutePitch)) {
            this.onNoteOffCallback!(absolutePitch, noteOffTime);
            this.activeNotes.delete(absolutePitch);
          }
        }, delay + (stepDuration * step.length * 1000));
      }
    } else {
      // If no note, just update visualization
      setTimeout(() => {
        if (this.isPlaying) {
          this.updatePlayheadPosition(stepIndex);
          // Also call React callback if registered (for recording mode, etc.)
          if (this.onStepCallback) {
            this.onStepCallback(stepIndex);
          }
        }
      }, delay);
    }
  }

  /**
   * Set AudioContext for precise timing (should be called after audio initialization)
   */
  public setAudioContext(audioContext: AudioContext): void {
    this.audioContext = audioContext;
  }
}



