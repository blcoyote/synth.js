/**
 * ArpeggiatorManager - Manages arpeggiator for Synth V2
 * 
 * Responsibilities:
 * - Generate arpeggio patterns from held notes
 * - Manage playback timing and note scheduling
 * - Handle pattern variations and octave spanning
 * - Note hold functionality
 * - Chord progression support
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
  private enabled: boolean = false;  // On/off toggle
  private isPlaying: boolean = false; // Internal playback state
  private currentNoteIndex: number = 0;
  private intervalId: number | null = null;
  
  // Input notes (the chord to arpeggiate from held keys)
  private heldNotes: Set<number> = new Set();
  private inputNotes: number[] = [];
  private arpeggioSequence: number[] = [];
  
  // Callbacks
  private onNoteCallback: ((note: ArpNote) => void) | null = null;
  private onNoteOffCallback: ((pitch: number) => void) | null = null;
  
  // Track currently playing note for hold mode
  private currentlyPlayingNote: number | null = null;
  
  // Progression support
  private currentProgression: ChordProgression | null = null;
  private currentChordIndex: number = 0;
  private barsPerChord: number = 1;
  private currentBar: number = 0;
  private rootNote: number = 60; // C4 by default
  
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
   * Enable arpeggiator (turn on)
   */
  public enable(): void {
    this.enabled = true;
    console.log('🎹 Arpeggiator enabled');
  }

  /**
   * Disable arpeggiator (turn off)
   */
  public disable(): void {
    this.enabled = false;
    this.stop();
    this.heldNotes.clear();
    console.log('🎹 Arpeggiator disabled');
  }

  /**
   * Check if arpeggiator is enabled
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
   * Handle note on from keyboard (when arpeggiator is enabled)
   */
  public handleNoteOn(noteIndex: number): void {
    if (!this.enabled) return;

    // Add to held notes
    this.heldNotes.add(noteIndex);
    
    // Update input notes from held notes
    this.updateInputNotesFromHeld();
    
    // If this is the first note, start playback
    if (this.heldNotes.size === 1 && !this.isPlaying) {
      this.start();
    }
  }

  /**
   * Handle note off from keyboard (when arpeggiator is enabled)
   */
  public handleNoteOff(noteIndex: number): void {
    if (!this.enabled) return;

    // Remove from held notes
    this.heldNotes.delete(noteIndex);
    
    // Update input notes from held notes
    this.updateInputNotesFromHeld();
    
    // If no more notes held, stop playback
    if (this.heldNotes.size === 0) {
      this.stop();
    }
  }

  /**
   * Update input notes from currently held notes
   */
  private updateInputNotesFromHeld(): void {
    this.inputNotes = Array.from(this.heldNotes).sort((a, b) => a - b);
    this.generateArpeggioSequence();
  }

  /**
   * Start arpeggiator playback (internal)
   */
  private start(): void {
    if (this.isPlaying) return;
    if (this.inputNotes.length === 0) {
      return;
    }
    
    this.isPlaying = true;
    this.currentNoteIndex = 0;
    this.generateArpeggioSequence();
    this.scheduleNextNote();
  }

  /**
   * Stop arpeggiator playback (internal)
   */
  private stop(): void {
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

    // Check if we need to change chord (progression mode)
    if (this.currentProgression && this.arpeggioSequence.length > 0) {
      this.currentBar++;
      const notesPerBar = this.getNotesPerBar();
      
      if (this.currentBar >= notesPerBar * this.barsPerChord) {
        this.currentBar = 0;
        this.currentChordIndex = (this.currentChordIndex + 1) % this.currentProgression.chords.length;
        this.updateNotesFromProgression();
      }
    }

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
  
  /**
   * Calculate notes per bar based on tempo and division
   */
  private getNotesPerBar(): number {
    // Assuming 4/4 time signature
    switch (this.division) {
      case '1/4': return 4;
      case '1/8': return 8;
      case '1/16': return 16;
      case '1/8T': return 12; // 8 * 1.5
      case '1/16T': return 24; // 16 * 1.5
      case '1/32': return 32;
      default: return 16;
    }
  }
  
  /**
   * Update notes from current progression chord
   */
  private updateNotesFromProgression(): void {
    if (!this.currentProgression) return;
    
    const chord = this.currentProgression.chords[this.currentChordIndex];
    const notes = chord.map(interval => this.rootNote + interval);
    this.setNotes(notes);
  }
  
  /**
   * Set chord progression
   */
  public setProgression(progressionKey: string, rootNote: number = 60, barsPerChord: number = 1): void {
    const progression = ArpeggiatorManager.PROGRESSIONS.get(progressionKey);
    if (!progression) {
      console.warn(`Progression "${progressionKey}" not found`);
      return;
    }
    
    this.currentProgression = progression;
    this.rootNote = rootNote;
    this.barsPerChord = Math.max(1, Math.min(8, barsPerChord));
    this.currentChordIndex = 0;
    this.currentBar = 0;
    
    // Set initial chord
    this.updateNotesFromProgression();
  }
  
  /**
   * Clear progression (use manual notes)
   */
  public clearProgression(): void {
    this.currentProgression = null;
    this.currentChordIndex = 0;
    this.currentBar = 0;
  }
  
  /**
   * Get available progression names
   */
  public static getProgressionNames(): string[] {
    return Array.from(ArpeggiatorManager.PROGRESSIONS.keys());
  }
  
  /**
   * Get progression details
   */
  public static getProgression(key: string): ChordProgression | undefined {
    return ArpeggiatorManager.PROGRESSIONS.get(key);
  }
  
  /**
   * Get all progressions
   */
  public static getAllProgressions(): Map<string, ChordProgression> {
    return new Map(ArpeggiatorManager.PROGRESSIONS);
  }
}



