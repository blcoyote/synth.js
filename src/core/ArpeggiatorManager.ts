/**
 * ArpeggiatorManager - Manages arpeggiator for Synth V2
 * 
 * Responsibilities:
 * - Generate arpeggio patterns from held notes
 * - Manage playback timing and note scheduling
 * - Handle pattern variations and octave spanning
 * - Note hold functionality
 * 
 * Clean architecture: No direct audio access, uses VoiceManager callback
 */

export type ArpPattern = 
  | 'up'           // Notes ascending
  | 'down'         // Notes descending
  | 'updown'       // Up then down (bouncing)
  | 'updown2'      // Up then down, repeat top note
  | 'converge'     // Outside notes moving inward
  | 'diverge'      // Inside notes moving outward
  | 'random'       // Random note selection
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

export interface ArpeggiatorConfig {
  pattern?: ArpPattern;
  octaves?: number;        // Number of octaves to span (1-4)
  tempo?: number;          // BPM (40-300)
  division?: NoteDivision; // Note division
  gateLength?: number;     // 0-1, note length as percentage
  noteHold?: boolean;      // Hold notes until next note plays
}

export class ArpeggiatorManager {
  // Configuration
  private pattern: ArpPattern = 'up';
  private octaves: number = 1;
  private tempo: number = 120;
  private division: NoteDivision = '1/16';
  private gateLength: number = 0.8;
  private noteHold: boolean = false;
  
  // State
  private isPlaying: boolean = false;
  private currentNoteIndex: number = 0;
  private intervalId: number | null = null;
  
  // Input notes (the chord to arpeggiate)
  private inputNotes: number[] = [];
  private arpeggioSequence: number[] = [];
  
  // Callbacks
  private onNoteCallback: ((note: ArpNote) => void) | null = null;
  private onNoteOffCallback: ((pitch: number) => void) | null = null;
  
  // Track currently playing note for hold mode
  private currentlyPlayingNote: number | null = null;

  constructor(config?: ArpeggiatorConfig) {
    if (config) {
      if (config.pattern) this.pattern = config.pattern;
      if (config.octaves) this.octaves = config.octaves;
      if (config.tempo) this.tempo = config.tempo;
      if (config.division) this.division = config.division;
      if (config.gateLength) this.gateLength = config.gateLength;
      if (config.noteHold !== undefined) this.noteHold = config.noteHold;
    }
  }

  /**
   * Start arpeggiator playback
   */
  public start(): void {
    if (this.isPlaying) return;
    if (this.inputNotes.length === 0) {
      console.warn('Cannot start arpeggiator: no input notes set');
      return;
    }
    
    this.isPlaying = true;
    this.currentNoteIndex = 0;
    this.generateArpeggioSequence();
    this.scheduleNextNote();
  }

  /**
   * Stop arpeggiator playback
   */
  public stop(): void {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    
    if (this.intervalId !== null) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    
    // Stop currently playing note if in hold mode
    if (this.currentlyPlayingNote !== null && this.onNoteOffCallback) {
      this.onNoteOffCallback(this.currentlyPlayingNote);
      this.currentlyPlayingNote = null;
    }
    
    this.currentNoteIndex = 0;
  }

  /**
   * Pause arpeggiator (can be resumed)
   */
  public pause(): void {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    
    if (this.intervalId !== null) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Resume arpeggiator from pause
   */
  public resume(): void {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.scheduleNextNote();
  }

  /**
   * Set input notes (the chord to arpeggiate)
   */
  public setNotes(notes: number[]): void {
    this.inputNotes = [...notes].sort((a, b) => a - b); // Sort ascending
    this.generateArpeggioSequence();
  }

  /**
   * Register note callback
   */
  public onNote(callback: (note: ArpNote) => void): void {
    this.onNoteCallback = callback;
  }

  /**
   * Register note off callback
   */
  public onNoteOff(callback: (pitch: number) => void): void {
    this.onNoteOffCallback = callback;
  }

  /**
   * Pattern setters/getters
   */
  public setPattern(pattern: ArpPattern): void {
    this.pattern = pattern;
    if (this.inputNotes.length > 0) {
      this.generateArpeggioSequence();
      this.currentNoteIndex = 0;
    }
  }

  public getPattern(): ArpPattern {
    return this.pattern;
  }

  public setOctaves(octaves: number): void {
    this.octaves = Math.max(1, Math.min(4, octaves));
    if (this.inputNotes.length > 0) {
      this.generateArpeggioSequence();
    }
  }

  public getOctaves(): number {
    return this.octaves;
  }

  public setTempo(tempo: number): void {
    this.tempo = Math.max(40, Math.min(300, tempo));
  }

  public getTempo(): number {
    return this.tempo;
  }

  public setDivision(division: NoteDivision): void {
    this.division = division;
  }

  public getDivision(): NoteDivision {
    return this.division;
  }

  public setGateLength(gate: number): void {
    this.gateLength = Math.max(0.1, Math.min(1.0, gate));
  }

  public getGateLength(): number {
    return this.gateLength;
  }

  public setNoteHold(hold: boolean): void {
    this.noteHold = hold;
  }

  public getNoteHold(): boolean {
    return this.noteHold;
  }

  public isRunning(): boolean {
    return this.isPlaying;
  }

  /**
   * Generate arpeggio sequence based on pattern
   */
  private generateArpeggioSequence(): void {
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

    // Generate pattern
    switch (this.pattern) {
      case 'up':
        this.arpeggioSequence = [...expandedNotes];
        break;

      case 'down':
        this.arpeggioSequence = [...expandedNotes].reverse();
        break;

      case 'updown':
        // Bounce at top, don't repeat
        this.arpeggioSequence = [
          ...expandedNotes,
          ...expandedNotes.slice(1, -1).reverse()
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
        // Bottom, top, then ascending middle notes
        this.arpeggioSequence = [
          expandedNotes[0],
          expandedNotes[expandedNotes.length - 1],
          ...expandedNotes.slice(1, -1)
        ];
        break;

      case 'pinchedDown':
        // Top, bottom, then descending middle notes
        this.arpeggioSequence = [
          expandedNotes[expandedNotes.length - 1],
          expandedNotes[0],
          ...expandedNotes.slice(1, -1).reverse()
        ];
        break;

      case 'random':
        // Random note from the pool each time
        this.arpeggioSequence = [...expandedNotes];
        break;
    }
  }

  /**
   * Get next note index based on pattern
   */
  private getNextNoteIndex(): number {
    if (this.arpeggioSequence.length === 0) return 0;

    if (this.pattern === 'random') {
      return Math.floor(Math.random() * this.arpeggioSequence.length);
    }

    const index = this.currentNoteIndex;
    this.currentNoteIndex = (this.currentNoteIndex + 1) % this.arpeggioSequence.length;
    return index;
  }

  /**
   * Calculate note duration in milliseconds
   */
  private getNoteDuration(): number {
    const quarterNoteDuration = 60000 / this.tempo;

    switch (this.division) {
      case '1/4':
        return quarterNoteDuration;
      case '1/8':
        return quarterNoteDuration / 2;
      case '1/16':
        return quarterNoteDuration / 4;
      case '1/8T':
        return (quarterNoteDuration / 2) * (2 / 3);
      case '1/16T':
        return (quarterNoteDuration / 4) * (2 / 3);
      case '1/32':
        return quarterNoteDuration / 8;
      default:
        return quarterNoteDuration / 4;
    }
  }

  /**
   * Schedule next note
   */
  private scheduleNextNote(): void {
    if (!this.isPlaying) return;

    const noteIndex = this.getNextNoteIndex();
    const pitch = this.arpeggioSequence[noteIndex];
    const duration = this.getNoteDuration();
    const gateDuration = duration * this.gateLength;

    // Stop previous note if in hold mode
    if (this.noteHold && this.currentlyPlayingNote !== null && this.onNoteOffCallback) {
      this.onNoteOffCallback(this.currentlyPlayingNote);
    }

    // Play note
    if (this.onNoteCallback) {
      this.onNoteCallback({
        pitch,
        velocity: 100,
        gate: this.gateLength
      });
    }

    // Track for hold mode
    this.currentlyPlayingNote = pitch;

    // Schedule note off (if not in hold mode)
    if (!this.noteHold && this.onNoteOffCallback) {
      setTimeout(() => {
        this.onNoteOffCallback!(pitch);
      }, gateDuration);
    }

    // Schedule next note
    this.intervalId = window.setTimeout(() => {
      this.scheduleNextNote();
    }, duration);
  }
}



