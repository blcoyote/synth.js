/**
 * Voice State Module
 * 
 * Manages oscillator configurations, active voices, and envelope settings
 */

const DEFAULT_ENVELOPE_SUSTAIN = 0.7;
const DEFAULT_ENVELOPE_RELEASE = 0.3;

import type { BaseOscillator } from '../components/oscillators/BaseOscillator';
import type { ADSREnvelope } from '../components/envelopes/ADSREnvelope';

/**
 * Voice represents an active note being played
 */
export interface Voice {
  noteIndex: number;
  baseFrequency: number; // Original note frequency (before octave/detune)
  oscillators: Array<{
    oscillator: BaseOscillator;
    panNode: StereoPannerNode;
    envelope: ADSREnvelope;
    oscNum: number; // Which oscillator config this belongs to (1, 2, or 3)
  }>;
  isActive: boolean;
  releaseTimeout?: number;
}

/**
 * OscillatorConfig represents the settings for a single oscillator
 */
export interface OscillatorConfig {
  enabled: boolean;
  waveform: 'sine' | 'sawtooth' | 'square' | 'triangle';
  octave: number;
  detune: number;
  volume: number;
  pan: number;
  fmEnabled?: boolean;
  fmDepth?: number;
}

class VoiceStateManager {
  // Map of MIDI note number to oscillator configuration
  public oscillatorConfigs: Map<number, OscillatorConfig> = new Map();

  // Map of MIDI note number to active voice
  public activeVoices: Map<number, Voice> = new Map();

  // Envelope settings (one per oscillator)
  public envelopeSettings = {
    1: {
      attack: 0.01,
      decay: 0.1,
      sustain: DEFAULT_ENVELOPE_SUSTAIN,
      release: DEFAULT_ENVELOPE_RELEASE,
    },
    2: {
      attack: 0.01,
      decay: 0.1,
      sustain: DEFAULT_ENVELOPE_SUSTAIN,
      release: DEFAULT_ENVELOPE_RELEASE,
    },
    3: {
      attack: 0.01,
      decay: 0.1,
      sustain: DEFAULT_ENVELOPE_SUSTAIN,
      release: DEFAULT_ENVELOPE_RELEASE,
    },
  };

  /**
   * Initialize default oscillator configuration for a note
   */
  initializeOscillatorConfig(note: number): void {
    if (!this.oscillatorConfigs.has(note)) {
      this.oscillatorConfigs.set(note, {
        enabled: true,
        waveform: 'sine',
        octave: 0,
        detune: 0,
        volume: 0.3,
        pan: 0,
      });
    }
  }

  /**
   * Clear all active voices
   */
  clearActiveVoices(): void {
    this.activeVoices.clear();
  }

  /**
   * Get voice by note
   */
  getVoice(note: number): Voice | undefined {
    return this.activeVoices.get(note);
  }

  /**
   * Add or update voice
   */
  setVoice(note: number, voice: Voice): void {
    this.activeVoices.set(note, voice);
  }

  /**
   * Remove voice by note
   */
  deleteVoice(note: number): void {
    this.activeVoices.delete(note);
  }
}

export const voiceState = new VoiceStateManager();
