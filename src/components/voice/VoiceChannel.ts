/**
 * VoiceChannel - Encapsulates a complete voice with oscillator, envelope, and routing
 * 
 * A VoiceChannel represents a single sound generator with all its components:
 * - Oscillator (sound source)
 * - ADSR Envelope (amplitude shaping)
 * - Pan control (stereo positioning)
 * - LFO modulation (vibrato, tremolo, etc.)
 * 
 * This abstraction makes it easy to create polyphonic synthesizers by
 * managing multiple VoiceChannels simultaneously.
 */

import { AudioEngine } from '../../core';
import type { BaseOscillator } from '../oscillators/BaseOscillator';
import {
  SineOscillator,
  SawtoothOscillator,
  SquareOscillator,
  TriangleOscillator,
} from '../oscillators';
import { ADSREnvelope } from '../envelopes';
import type { LFO } from '../modulation';

export interface VoiceChannelConfig {
  waveform: 'sine' | 'sawtooth' | 'square' | 'triangle';
  octave?: number;
  detune?: number;
  volume?: number;
  pan?: number;
  envelope?: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
}

export interface VoiceChannelState {
  isPlaying: boolean;
  frequency: number;
  noteNumber?: number;
  velocity: number;
}

/**
 * VoiceChannel - A complete voice with oscillator, envelope, and effects
 */
export class VoiceChannel {
  private engine: AudioEngine;
  private oscillator: BaseOscillator;
  private envelope: ADSREnvelope;
  private panNode: StereoPannerNode;
  private config: Required<VoiceChannelConfig>;
  private state: VoiceChannelState;
  private lfo: LFO | null = null;
  private releaseTimeout?: number;

  constructor(frequency: number, config: VoiceChannelConfig) {
    this.engine = AudioEngine.getInstance();
    
    // Set default config values
    this.config = {
      waveform: config.waveform,
      octave: config.octave ?? 0,
      detune: config.detune ?? 0,
      volume: config.volume ?? 0.7,
      pan: config.pan ?? 0,
      envelope: config.envelope ?? {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.7,
        release: 0.3,
      },
    };

    // Initialize state
    this.state = {
      isPlaying: false,
      frequency: frequency * Math.pow(2, this.config.octave),
      velocity: 1.0,
    };

    // Create oscillator based on waveform
    this.oscillator = this.createOscillator(this.state.frequency);
    
    // Apply initial settings
    this.oscillator.setParameter('volume', this.config.volume);
    this.oscillator.setParameter('detune', this.config.detune);

    // Create pan node
    this.panNode = this.engine.getContext().createStereoPanner();
    this.panNode.pan.value = this.config.pan;

    // Create envelope
    this.envelope = new ADSREnvelope(this.config.envelope);

    // Build signal chain: oscillator -> pan -> envelope
    this.oscillator.connect(this.panNode);
    this.panNode.connect(this.envelope.getInputNode());
  }

  /**
   * Create oscillator based on waveform type
   */
  private createOscillator(frequency: number): BaseOscillator {
    switch (this.config.waveform) {
      case 'sine':
        return new SineOscillator(frequency);
      case 'sawtooth':
        return new SawtoothOscillator(frequency);
      case 'square':
        return new SquareOscillator(frequency);
      case 'triangle':
        return new TriangleOscillator(frequency);
    }
  }

  /**
   * Connect the voice output to a destination
   */
  connect(destination: AudioNode): void {
    this.envelope.connect(destination);
  }

  /**
   * Disconnect from all destinations
   */
  disconnect(): void {
    this.envelope.disconnect();
  }

  /**
   * Start the oscillator and trigger the envelope
   */
  trigger(velocity: number = 1.0): void {
    if (this.state.isPlaying) {
      // If already playing, retrigger
      this.stop();
    }

    this.state.velocity = velocity;
    this.state.isPlaying = true;

    // Clear any pending release timeout
    if (this.releaseTimeout) {
      window.clearTimeout(this.releaseTimeout);
      this.releaseTimeout = undefined;
    }

    // Start oscillator
    this.oscillator.start();

    // Trigger envelope
    this.envelope.trigger(velocity);
  }

  /**
   * Release the note (begin envelope release phase)
   */
  release(): void {
    if (!this.state.isPlaying) {
      return;
    }

    // Trigger envelope release
    this.envelope.triggerRelease();

    // Schedule cleanup after release phase
    const releaseTime = this.config.envelope.release;
    this.releaseTimeout = window.setTimeout(() => {
      this.stop();
    }, releaseTime * 1000 + 50); // Add 50ms buffer
  }

  /**
   * Stop the oscillator immediately
   */
  stop(): void {
    if (this.releaseTimeout) {
      window.clearTimeout(this.releaseTimeout);
      this.releaseTimeout = undefined;
    }

    if (this.state.isPlaying) {
      try {
        this.oscillator.stop();
      } catch (e) {
        // Oscillator may have already stopped
        console.warn('Oscillator stop error:', e);
      }
      this.state.isPlaying = false;
    }
  }

  /**
   * Cleanup and disconnect everything
   */
  dispose(): void {
    this.stop();
    
    // Disconnect LFO if connected
    if (this.lfo) {
      this.detachLFO();
    }

    this.disconnect();
    this.oscillator.disconnect();
    this.panNode.disconnect();
  }

  /**
   * Attach an LFO to modulate oscillator frequency (vibrato)
   */
  attachLFO(lfo: LFO): void {
    if (!lfo.isEnabled()) {
      return;
    }

    this.lfo = lfo;
    
    // Get the internal oscillator node for Web Audio API modulation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oscNode = (this.oscillator as any).oscillatorNode as OscillatorNode;
    if (oscNode && oscNode.frequency) {
      lfo.connectToParam(oscNode.frequency);
    }
  }

  /**
   * Detach LFO modulation
   */
  detachLFO(): void {
    if (this.lfo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oscNode = (this.oscillator as any).oscillatorNode as OscillatorNode;
      if (oscNode && oscNode.frequency) {
        this.lfo.disconnect();
      }
      this.lfo = null;
    }
  }

  // === Parameter Getters/Setters ===

  setFrequency(frequency: number): void {
    this.state.frequency = frequency * Math.pow(2, this.config.octave);
    this.oscillator.setParameter('frequency', this.state.frequency);
  }

  setWaveform(waveform: 'sine' | 'sawtooth' | 'square' | 'triangle'): void {
    // Note: Changing waveform requires creating a new oscillator
    // This should typically be done before triggering the note
    this.config.waveform = waveform;
  }

  setOctave(octave: number): void {
    this.config.octave = octave;
    this.state.frequency = this.state.frequency * Math.pow(2, octave - this.config.octave);
    this.oscillator.setParameter('frequency', this.state.frequency);
  }

  setDetune(cents: number): void {
    this.config.detune = cents;
    this.oscillator.setParameter('detune', cents);
  }

  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    this.oscillator.setParameter('volume', this.config.volume);
  }

  setPan(pan: number): void {
    this.config.pan = Math.max(-1, Math.min(1, pan));
    this.panNode.pan.value = this.config.pan;
  }

  setEnvelopeParameter(param: 'attack' | 'decay' | 'sustain' | 'release', value: number): void {
    this.config.envelope[param] = value;
    // Note: This affects future triggers, not current note
  }

  // === Getters ===

  isPlaying(): boolean {
    return this.state.isPlaying;
  }

  getFrequency(): number {
    return this.state.frequency;
  }

  getConfig(): Readonly<Required<VoiceChannelConfig>> {
    return { ...this.config };
  }

  getState(): Readonly<VoiceChannelState> {
    return { ...this.state };
  }

  getOscillator(): BaseOscillator {
    return this.oscillator;
  }

  getEnvelope(): ADSREnvelope {
    return this.envelope;
  }

  getPanNode(): StereoPannerNode {
    return this.panNode;
  }
}
