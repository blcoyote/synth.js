/**
 * BaseOscillator - Abstract base class for all oscillators
 * 
 * Provides common functionality for oscillator components including:
 * - Frequency control with smooth ramping
 * - Detune control
 * - Gain/volume control
 * - Start/stop management
 * - Connection management
 */

import type { AudioComponent, ParameterDescriptor } from '../../core/types';
import { AudioEngine } from '../../core/AudioEngine';

export abstract class BaseOscillator implements AudioComponent {
  protected engine: AudioEngine;
  protected oscillator: OscillatorNode | null = null;
  protected gainNode: GainNode;
  protected isPlaying: boolean = false;
  protected enabled: boolean = true;
  protected name: string;
  protected type: OscillatorType;
  
  // Current parameter values
  protected frequency: number = 440; // A4
  protected detune: number = 0;
  protected volume: number = 0.5;

  constructor(name: string, type: OscillatorType, frequency: number = 440) {
    this.engine = AudioEngine.getInstance();
    this.name = name;
    this.type = type;
    this.frequency = frequency;
    
    // Create gain node for volume control
    this.gainNode = this.engine.createGain(this.volume);
  }

  /**
   * Start the oscillator
   */
  public start(time?: number): void {
    if (this.isPlaying) {
      console.warn(`${this.name} is already playing`);
      return;
    }

    // Create new oscillator (they can only be started once)
    this.oscillator = this.engine.createOscillator(this.type, this.frequency);
    this.oscillator.detune.value = this.detune;
    
    // Connect oscillator to gain node
    this.oscillator.connect(this.gainNode);
    
    // Start oscillator
    const startTime = time ?? this.engine.getCurrentTime();
    this.oscillator.start(startTime);
    
    this.isPlaying = true;
  }

  /**
   * Stop the oscillator
   */
  public stop(time?: number): void {
    if (!this.isPlaying || !this.oscillator) {
      return;
    }

    const stopTime = time ?? this.engine.getCurrentTime();
    this.oscillator.stop(stopTime);
    
    // Clean up after stop
    setTimeout(() => {
      if (this.oscillator) {
        this.oscillator.disconnect();
        this.oscillator = null;
      }
      this.isPlaying = false;
    }, (stopTime - this.engine.getCurrentTime()) * 1000 + 100);
  }

  /**
   * Check if oscillator is currently playing
   */
  public isOscillatorPlaying(): boolean {
    return this.isPlaying;
  }

  // AudioComponent interface implementation

  public connect(destination: AudioNode | AudioComponent): void {
    if ('getInputNode' in destination) {
      this.gainNode.connect(destination.getInputNode());
    } else {
      this.gainNode.connect(destination);
    }
  }

  public disconnect(): void {
    this.gainNode.disconnect();
  }

  public setParameter(name: string, value: number): void {
    const now = this.engine.getCurrentTime();
    
    switch (name) {
      case 'frequency':
        this.frequency = Math.max(20, Math.min(20000, value));
        if (this.oscillator) {
          this.oscillator.frequency.linearRampToValueAtTime(this.frequency, now + 0.01);
        }
        break;
        
      case 'detune':
        this.detune = Math.max(-1200, Math.min(1200, value));
        if (this.oscillator) {
          this.oscillator.detune.linearRampToValueAtTime(this.detune, now + 0.01);
        }
        break;
        
      case 'volume':
        this.volume = Math.max(0, Math.min(1, value));
        this.gainNode.gain.linearRampToValueAtTime(this.volume, now + 0.01);
        break;
        
      default:
        console.warn(`Unknown parameter: ${name}`);
    }
  }

  public getParameter(name: string): number {
    switch (name) {
      case 'frequency':
        return this.frequency;
      case 'detune':
        return this.detune;
      case 'volume':
        return this.volume;
      default:
        return 0;
    }
  }

  public enable(): void {
    this.enabled = true;
    this.gainNode.gain.value = this.volume;
  }

  public disable(): void {
    this.enabled = false;
    this.gainNode.gain.value = 0;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getName(): string {
    return this.name;
  }

  public getType(): string {
    return `Oscillator-${this.type}`;
  }

  public getParameters(): ParameterDescriptor[] {
    return [
      {
        name: 'frequency',
        min: 20,
        max: 20000,
        default: 440,
        unit: 'Hz',
        type: 'continuous',
      },
      {
        name: 'detune',
        min: -1200,
        max: 1200,
        default: 0,
        unit: 'cents',
        type: 'continuous',
      },
      {
        name: 'volume',
        min: 0,
        max: 1,
        default: 0.5,
        unit: 'linear',
        type: 'continuous',
      },
    ];
  }

  public getInputNode(): AudioNode {
    // Oscillators don't have input (they're sources)
    throw new Error('Oscillators do not have input nodes');
  }

  public getOutputNode(): AudioNode {
    return this.gainNode;
  }

  /**
   * Get the underlying OscillatorNode for direct parameter access (e.g., FM modulation)
   */
  public getOscillatorNode(): OscillatorNode | null {
    return this.oscillator;
  }

  /**
   * Set frequency from MIDI note number
   */
  public setNoteNumber(noteNumber: number): void {
    // MIDI note to frequency: f = 440 * 2^((n-69)/12)
    const frequency = 440 * Math.pow(2, (noteNumber - 69) / 12);
    this.setParameter('frequency', frequency);
  }

  /**
   * Set frequency from note name (e.g., "A4", "C3", "F#5")
   */
  public setNoteName(noteName: string): void {
    const noteNumber = this.noteNameToNumber(noteName);
    this.setNoteNumber(noteNumber);
  }

  /**
   * Convert note name to MIDI note number
   */
  private noteNameToNumber(noteName: string): number {
    const noteMap: { [key: string]: number } = {
      'C': 0, 'C#': 1, 'Db': 1,
      'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4,
      'F': 5, 'F#': 6, 'Gb': 6,
      'G': 7, 'G#': 8, 'Ab': 8,
      'A': 9, 'A#': 10, 'Bb': 10,
      'B': 11,
    };

    const match = noteName.match(/^([A-G][#b]?)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid note name: ${noteName}`);
    }

    const [, note, octave] = match;
    const noteOffset = noteMap[note];
    const octaveNumber = parseInt(octave, 10);

    return (octaveNumber + 1) * 12 + noteOffset;
  }
}
