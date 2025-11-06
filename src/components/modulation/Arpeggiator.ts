/**
 * Arpeggiator
 * 
 * A musical arpeggiator that generates note patterns from chords.
 * Supports multiple arpeggio patterns, chord progressions, and musical modes.
 * 
 * Features:
 * - Multiple arpeggio patterns (up, down, up-down, random, etc.)
 * - Octave range control (1-4 octaves)
 * - Adjustable tempo and note divisions
 * - Musical chord progressions (I-IV-V, I-V-vi-IV, etc.)
 * - Scale-aware note generation
 * - Velocity variation and humanization
 * - Gate length control
 * - Pattern memory and recall
 * 
 * Classic use: Rhythmic chord accompaniment, lead melodies, background textures
 */

export type ArpPattern = 
  | 'up'           // Notes ascending
  | 'down'         // Notes descending
  | 'updown'       // Up then down (bouncing)
  | 'downup'       // Down then up
  | 'updown2'      // Up then down, repeat top note
  | 'downup2'      // Down then up, repeat bottom note
  | 'converge'     // Outside notes moving inward
  | 'diverge'      // Inside notes moving outward
  | 'random'       // Random note selection
  | 'shuffle'      // Randomized but each note once per cycle
  | 'chord'        // All notes together
  | 'pinchedUp'    // Bottom, top, then ascending
  | 'pinchedDown'; // Top, bottom, then descending

export type NoteDivision = 
  | '1/4'    // Quarter notes
  | '1/8'    // Eighth notes
  | '1/16'   // Sixteenth notes
  | '1/8T'   // Eighth note triplets
  | '1/16T'  // Sixteenth note triplets
  | '1/32';  // Thirty-second notes

export interface ArpNote {
  pitch: number;      // MIDI note number
  velocity: number;   // 0-127
  gate: number;       // 0-1, percentage of note duration
}

export interface ChordProgression {
  name: string;
  chords: number[][]; // Array of chord (array of intervals from root)
}

export interface ArpeggiatorConfig {
  pattern?: ArpPattern;
  octaves?: number;        // Number of octaves to span (1-4)
  tempo?: number;          // BPM (40-300)
  division?: NoteDivision; // Note division
  gateLength?: number;     // 0-1, note length as percentage
  swing?: number;          // 0-1, swing amount
  humanize?: number;       // 0-1, timing and velocity variation
}

export class Arpeggiator {
  // Configuration
  private pattern: ArpPattern = 'up';
  private octaves: number = 1;
  private tempo: number = 120;
  private division: NoteDivision = '1/16';
  private gateLength: number = 0.8;
  private swing: number = 0;
  private humanize: number = 0;
  
  // State
  private isPlaying: boolean = false;
  private currentNoteIndex: number = 0;
  private intervalId: number | null = null;
  
  // Input notes (the chord to arpeggiate)
  private inputNotes: number[] = [60, 64, 67]; // Default C major chord
  private arpeggioSequence: number[] = [];
  
  // Shuffle pattern state
  private shuffleIndices: number[] = [];
  private shufflePosition: number = 0;
  
  // Callbacks
  private onNoteCallback: ((note: ArpNote) => void) | null = null;
  private onCycleCompleteCallback: (() => void) | null = null;
  
  // Preset chord progressions
  private static readonly PROGRESSIONS: Map<string, ChordProgression> = new Map([
    ['major-i-iv-v', {
      name: 'I-IV-V (Major)',
      chords: [
        [0, 4, 7],      // I (C major)
        [5, 9, 12],     // IV (F major)
        [7, 11, 14],    // V (G major)
      ]
    }],
    ['major-i-v-vi-iv', {
      name: 'I-V-vi-IV (Pop)',
      chords: [
        [0, 4, 7],      // I (C major)
        [7, 11, 14],    // V (G major)
        [9, 12, 16],    // vi (A minor)
        [5, 9, 12],     // IV (F major)
      ]
    }],
    ['minor-i-iv-v', {
      name: 'i-iv-v (Minor)',
      chords: [
        [0, 3, 7],      // i (C minor)
        [5, 8, 12],     // iv (F minor)
        [7, 11, 14],    // V (G major)
      ]
    }],
    ['minor-i-vi-iii-vii', {
      name: 'i-VI-III-VII (Andalusian)',
      chords: [
        [0, 3, 7],      // i (C minor)
        [8, 12, 15],    // VI (Ab major)
        [3, 7, 10],     // III (Eb major)
        [10, 14, 17],   // VII (Bb major)
      ]
    }],
    ['jazz-ii-v-i', {
      name: 'ii-V-I (Jazz)',
      chords: [
        [2, 5, 9, 12],     // ii7 (D minor 7)
        [7, 11, 14, 17],   // V7 (G dominant 7)
        [0, 4, 7, 11],     // Imaj7 (C major 7)
      ]
    }],
    ['ambient-sus', {
      name: 'Suspended Ambient',
      chords: [
        [0, 5, 7],         // sus4
        [2, 7, 9],         // sus4 (up a tone)
        [-2, 3, 5],        // sus4 (down a tone)
      ]
    }],
    ['extended-maj', {
      name: 'Extended Major',
      chords: [
        [0, 4, 7, 11, 14],    // maj9
        [5, 9, 12, 16, 19],   // maj9 (IV)
        [7, 11, 14, 18, 21],  // maj9 (V)
      ]
    }],
  ]);

  constructor(config: ArpeggiatorConfig = {}) {
    this.pattern = config.pattern || 'up';
    this.octaves = Math.max(1, Math.min(4, config.octaves || 1));
    this.tempo = config.tempo || 120;
    this.division = config.division || '1/16';
    this.gateLength = config.gateLength !== undefined ? config.gateLength : 0.8;
    this.swing = config.swing || 0;
    this.humanize = config.humanize || 0;
    
    this.updateArpeggioSequence();
  }

  /**
   * Generate the arpeggio sequence based on current pattern and settings
   */
  private updateArpeggioSequence(): void {
    if (this.inputNotes.length === 0) {
      this.arpeggioSequence = [];
      return;
    }
    
    // Expand notes across octaves
    const expandedNotes: number[] = [];
    for (let oct = 0; oct < this.octaves; oct++) {
      for (const note of this.inputNotes) {
        expandedNotes.push(note + (oct * 12));
      }
    }
    
    // Apply pattern
    switch (this.pattern) {
      case 'up':
        this.arpeggioSequence = [...expandedNotes];
        break;
        
      case 'down':
        this.arpeggioSequence = [...expandedNotes].reverse();
        break;
        
      case 'updown':
        this.arpeggioSequence = [
          ...expandedNotes,
          ...expandedNotes.slice(1, -1).reverse()
        ];
        break;
        
      case 'downup':
        this.arpeggioSequence = [
          ...expandedNotes.reverse(),
          ...expandedNotes.slice(1, -1)
        ];
        break;
        
      case 'updown2':
        // Repeat top note
        this.arpeggioSequence = [
          ...expandedNotes,
          expandedNotes[expandedNotes.length - 1],
          ...expandedNotes.slice(0, -1).reverse()
        ];
        break;
        
      case 'downup2':
        // Repeat bottom note
        const reversed = [...expandedNotes].reverse();
        this.arpeggioSequence = [
          ...reversed,
          reversed[reversed.length - 1],
          ...reversed.slice(0, -1).reverse()
        ];
        break;
        
      case 'converge':
        // Alternating from outside to inside
        const converge: number[] = [];
        let left = 0, right = expandedNotes.length - 1;
        while (left <= right) {
          converge.push(expandedNotes[left++]);
          if (left <= right) {
            converge.push(expandedNotes[right--]);
          }
        }
        this.arpeggioSequence = converge;
        break;
        
      case 'diverge':
        // Alternating from inside to outside
        const diverge: number[] = [];
        const mid = Math.floor(expandedNotes.length / 2);
        let offset = 0;
        while (mid - offset >= 0 || mid + offset < expandedNotes.length) {
          if (mid + offset < expandedNotes.length) {
            diverge.push(expandedNotes[mid + offset]);
          }
          if (offset > 0 && mid - offset >= 0) {
            diverge.push(expandedNotes[mid - offset]);
          }
          offset++;
        }
        this.arpeggioSequence = diverge;
        break;
        
      case 'pinchedUp':
        // Bottom, top, then ascending
        this.arpeggioSequence = [
          expandedNotes[0],
          expandedNotes[expandedNotes.length - 1],
          ...expandedNotes.slice(1, -1)
        ];
        break;
        
      case 'pinchedDown':
        // Top, bottom, then descending
        this.arpeggioSequence = [
          expandedNotes[expandedNotes.length - 1],
          expandedNotes[0],
          ...expandedNotes.slice(1, -1).reverse()
        ];
        break;
        
      case 'random':
        // Will be handled in playback
        this.arpeggioSequence = [...expandedNotes];
        break;
        
      case 'shuffle':
        // Create shuffled indices for one complete cycle
        this.arpeggioSequence = [...expandedNotes];
        this.regenerateShuffle();
        break;
        
      case 'chord':
        // All notes at once (will be handled specially)
        this.arpeggioSequence = [...expandedNotes];
        break;
    }
  }

  /**
   * Regenerate shuffle pattern
   */
  private regenerateShuffle(): void {
    this.shuffleIndices = Array.from(
      { length: this.arpeggioSequence.length },
      (_, i) => i
    );
    
    // Fisher-Yates shuffle
    for (let i = this.shuffleIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffleIndices[i], this.shuffleIndices[j]] = 
        [this.shuffleIndices[j], this.shuffleIndices[i]];
    }
    
    this.shufflePosition = 0;
  }

  /**
   * Get the next note index based on pattern
   */
  private getNextNoteIndex(): number {
    if (this.arpeggioSequence.length === 0) return 0;
    
    let index: number;
    
    switch (this.pattern) {
      case 'random':
        index = Math.floor(Math.random() * this.arpeggioSequence.length);
        break;
        
      case 'shuffle':
        index = this.shuffleIndices[this.shufflePosition];
        this.shufflePosition++;
        if (this.shufflePosition >= this.shuffleIndices.length) {
          this.regenerateShuffle();
        }
        break;
        
      default:
        index = this.currentNoteIndex;
        this.currentNoteIndex = (this.currentNoteIndex + 1) % this.arpeggioSequence.length;
        
        // Trigger cycle complete callback
        if (this.currentNoteIndex === 0 && this.onCycleCompleteCallback) {
          this.onCycleCompleteCallback();
        }
        break;
    }
    
    return index;
  }

  /**
   * Calculate note duration in milliseconds based on tempo and division
   */
  private getNoteDuration(): number {
    const quarterNoteDuration = 60000 / this.tempo; // ms per quarter note
    
    switch (this.division) {
      case '1/4':
        return quarterNoteDuration;
      case '1/8':
        return quarterNoteDuration / 2;
      case '1/16':
        return quarterNoteDuration / 4;
      case '1/8T':
        return (quarterNoteDuration / 2) * (2/3); // Triplet
      case '1/16T':
        return (quarterNoteDuration / 4) * (2/3); // Triplet
      case '1/32':
        return quarterNoteDuration / 8;
      default:
        return quarterNoteDuration / 4;
    }
  }

  /**
   * Apply humanization to timing and velocity
   */
  private applyHumanization(baseVelocity: number): { velocity: number; timingOffset: number } {
    if (this.humanize === 0) {
      return { velocity: baseVelocity, timingOffset: 0 };
    }
    
    // Velocity variation (±10% of humanize amount)
    const velocityVariation = (Math.random() - 0.5) * 20 * this.humanize;
    const velocity = Math.max(1, Math.min(127, baseVelocity + velocityVariation));
    
    // Timing variation (±10ms * humanize amount)
    const timingOffset = (Math.random() - 0.5) * 20 * this.humanize;
    
    return { velocity, timingOffset };
  }

  /**
   * Play the current note(s)
   */
  private playCurrentNote(): void {
    if (this.arpeggioSequence.length === 0 || !this.onNoteCallback) return;
    
    if (this.pattern === 'chord') {
      // Play all notes simultaneously
      for (const pitch of this.arpeggioSequence) {
        const baseVelocity = 100;
        const { velocity } = this.applyHumanization(baseVelocity);
        
        this.onNoteCallback({
          pitch,
          velocity,
          gate: this.gateLength,
        });
      }
    } else {
      // Play single note
      const noteIndex = this.getNextNoteIndex();
      const pitch = this.arpeggioSequence[noteIndex];
      
      const baseVelocity = 100;
      const { velocity } = this.applyHumanization(baseVelocity);
      
      this.onNoteCallback({
        pitch,
        velocity,
        gate: this.gateLength,
      });
    }
  }

  /**
   * Schedule the next note
   */
  private scheduleNextNote(): void {
    if (!this.isPlaying) return;
    
    let duration = this.getNoteDuration();
    
    // Apply swing to odd-numbered notes
    if (this.currentNoteIndex % 2 === 1 && this.swing > 0) {
      duration *= (1 + this.swing * 0.5); // Max 50% swing
    }
    
    // Apply humanization timing offset
    const { timingOffset } = this.applyHumanization(100);
    duration += timingOffset;
    
    this.intervalId = window.setTimeout(() => {
      this.playCurrentNote();
      this.scheduleNextNote();
    }, duration);
  }

  /**
   * Start the arpeggiator
   */
  public start(): void {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.currentNoteIndex = 0;
    
    // Play first note immediately
    this.playCurrentNote();
    
    // Schedule subsequent notes
    this.scheduleNextNote();
  }

  /**
   * Stop the arpeggiator
   */
  public stop(): void {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    this.currentNoteIndex = 0;
  }

  /**
   * Pause the arpeggiator (maintains position)
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
    this.scheduleNextNote();
  }

  /**
   * Reset to beginning
   */
  public reset(): void {
    this.currentNoteIndex = 0;
    if (this.pattern === 'shuffle') {
      this.regenerateShuffle();
    }
  }

  /**
   * Set the input notes (chord to arpeggiate)
   */
  public setNotes(notes: number[]): void {
    this.inputNotes = [...notes].sort((a, b) => a - b); // Sort ascending
    this.updateArpeggioSequence();
    this.reset();
  }

  /**
   * Get the current input notes
   */
  public getNotes(): number[] {
    return [...this.inputNotes];
  }

  /**
   * Set arpeggio pattern
   */
  public setPattern(pattern: ArpPattern): void {
    this.pattern = pattern;
    this.updateArpeggioSequence();
    this.reset();
  }

  /**
   * Get current pattern
   */
  public getPattern(): ArpPattern {
    return this.pattern;
  }

  /**
   * Set octave range
   */
  public setOctaves(octaves: number): void {
    this.octaves = Math.max(1, Math.min(4, octaves));
    this.updateArpeggioSequence();
    this.reset();
  }

  /**
   * Get octave range
   */
  public getOctaves(): number {
    return this.octaves;
  }

  /**
   * Set tempo in BPM
   */
  public setTempo(bpm: number): void {
    this.tempo = Math.max(40, Math.min(300, bpm));
  }

  /**
   * Get tempo
   */
  public getTempo(): number {
    return this.tempo;
  }

  /**
   * Set note division
   */
  public setDivision(division: NoteDivision): void {
    this.division = division;
  }

  /**
   * Get note division
   */
  public getDivision(): NoteDivision {
    return this.division;
  }

  /**
   * Set gate length (0-1)
   */
  public setGateLength(length: number): void {
    this.gateLength = Math.max(0, Math.min(1, length));
  }

  /**
   * Get gate length
   */
  public getGateLength(): number {
    return this.gateLength;
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
   * Set humanization amount (0-1)
   */
  public setHumanize(amount: number): void {
    this.humanize = Math.max(0, Math.min(1, amount));
  }

  /**
   * Get humanization amount
   */
  public getHumanize(): number {
    return this.humanize;
  }

  /**
   * Check if arpeggiator is running
   */
  public isRunning(): boolean {
    return this.isPlaying;
  }

  /**
   * Get the generated arpeggio sequence
   */
  public getSequence(): number[] {
    return [...this.arpeggioSequence];
  }

  /**
   * Load a preset chord progression
   */
  public loadProgression(name: string, rootNote: number = 60): boolean {
    const progression = Arpeggiator.PROGRESSIONS.get(name);
    if (!progression) return false;
    
    // For now, just load the first chord
    // In a more advanced version, this could cycle through chords
    const chord = progression.chords[0].map(interval => rootNote + interval);
    this.setNotes(chord);
    return true;
  }

  /**
   * Get list of available progressions
   */
  public static getProgressionNames(): string[] {
    return Array.from(Arpeggiator.PROGRESSIONS.keys());
  }

  /**
   * Get progression details
   */
  public static getProgression(name: string): ChordProgression | undefined {
    return Arpeggiator.PROGRESSIONS.get(name);
  }

  /**
   * Set a chord from common chord types
   */
  public setChord(root: number, type: 'major' | 'minor' | 'major7' | 'minor7' | 'dom7' | 'sus4' | 'sus2' | 'dim' | 'aug'): void {
    const chords: Record<string, number[]> = {
      'major': [0, 4, 7],
      'minor': [0, 3, 7],
      'major7': [0, 4, 7, 11],
      'minor7': [0, 3, 7, 10],
      'dom7': [0, 4, 7, 10],
      'sus4': [0, 5, 7],
      'sus2': [0, 2, 7],
      'dim': [0, 3, 6],
      'aug': [0, 4, 8],
    };
    
    const intervals = chords[type] || chords['major'];
    this.setNotes(intervals.map(i => root + i));
  }

  /**
   * Register callback for note events
   */
  public onNote(callback: (note: ArpNote) => void): void {
    this.onNoteCallback = callback;
  }

  /**
   * Register callback for cycle complete events
   */
  public onCycleComplete(callback: () => void): void {
    this.onCycleCompleteCallback = callback;
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    this.stop();
    this.onNoteCallback = null;
    this.onCycleCompleteCallback = null;
  }
}
