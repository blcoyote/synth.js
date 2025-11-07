/**
 * FlangerEffect - Flanging effect
 *
 * Creates a sweeping, whooshing effect by mixing the signal with a
 * delayed copy where the delay time is modulated by an LFO.
 * The feedback creates the characteristic resonant peaks.
 *
 * Classic use: Jet plane sounds, metallic sweeps, psychedelic textures,
 * guitar effects, synth pads
 *
 * Parameters:
 * - rate: LFO speed (0.1-10 Hz)
 * - depth: Modulation amount (0-1)
 * - feedback: Regeneration amount (0-0.95)
 * - mix: Wet/dry balance
 *
 * Implementation: Uses a delay line modulated by an LFO with feedback
 * for the classic flanging sound.
 */

import { BaseEffect } from './BaseEffect';
import type { ParameterDescriptor } from '../../core/types';

export type FlangerPreset =
  | 'subtle'
  | 'classic'
  | 'jet'
  | 'metallic'
  | 'deep'
  | 'through-zero'
  | 'extreme';

export interface FlangerPresetConfig {
  name: string;
  description: string;
  rate: number; // Hz
  depth: number; // 0-1
  feedback: number; // 0-0.95
}

const FLANGER_PRESETS: Record<FlangerPreset, FlangerPresetConfig> = {
  subtle: {
    name: 'Subtle',
    description: 'Gentle movement, natural',
    rate: 0.3,
    depth: 0.3,
    feedback: 0.2,
  },
  classic: {
    name: 'Classic',
    description: 'Traditional flanger sweep',
    rate: 0.5,
    depth: 0.5,
    feedback: 0.5,
  },
  jet: {
    name: 'Jet Plane',
    description: 'Famous jet plane whoosh',
    rate: 0.2,
    depth: 0.7,
    feedback: 0.7,
  },
  metallic: {
    name: 'Metallic',
    description: 'Resonant metallic tones',
    rate: 0.4,
    depth: 0.6,
    feedback: 0.8,
  },
  deep: {
    name: 'Deep',
    description: 'Slow, dramatic sweep',
    rate: 0.15,
    depth: 0.8,
    feedback: 0.6,
  },
  'through-zero': {
    name: 'Through-Zero',
    description: 'Extreme phase cancellation',
    rate: 0.25,
    depth: 0.95,
    feedback: 0.5,
  },
  extreme: {
    name: 'Extreme',
    description: 'Maximum flanging intensity',
    rate: 1.0,
    depth: 0.9,
    feedback: 0.9,
  },
};

export class FlangerEffect extends BaseEffect {
  private delayNode: DelayNode;
  private feedbackGain: GainNode;
  private lfo: OscillatorNode;
  private lfoGain: GainNode;

  private rate: number = 0.5; // Hz
  private depth: number = 0.5;
  private feedback: number = 0.5;
  private currentPreset: FlangerPreset = 'classic';

  constructor(preset: FlangerPreset = 'classic') {
    super('Flanger Effect', 'flanger');

    // Load preset configuration
    const config = FLANGER_PRESETS[preset];
    this.currentPreset = preset;
    this.rate = config.rate;
    this.depth = config.depth;
    this.feedback = config.feedback;

    // Create delay for flanging effect
    // Flanger uses shorter delays than chorus (1-15ms typical)
    this.delayNode = this.engine.createDelay(0.02); // 20ms max
    this.delayNode.delayTime.value = 0.005; // Base delay 5ms

    // Create feedback path
    this.feedbackGain = this.engine.createGain(this.feedback);

    // Create LFO to modulate delay time
    this.lfo = this.engine.createOscillator('sine', this.rate);
    this.lfoGain = this.engine.createGain(this.depth * 0.005); // Max ±5ms modulation

    // Connect LFO to modulate delay time
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.delayNode.delayTime);

    // Connect audio path with feedback
    this.inputGain.connect(this.delayNode);
    this.delayNode.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode); // Feedback loop

    // Connect to wet path
    this.connectWetPath(this.delayNode);

    // Start LFO
    this.lfo.start();

    // Set initial mix to 50% (typical for flanger)
    this.setMix(0.5);
  }

  public setParameter(name: string, value: number): void {
    const now = this.engine.getCurrentTime();

    switch (name) {
      case 'rate':
      case 'speed':
        this.rate = Math.max(0.1, Math.min(10, value));
        this.lfo.frequency.linearRampToValueAtTime(this.rate, now + 0.01);
        break;

      case 'depth':
      case 'amount': {
        this.depth = Math.max(0, Math.min(1, value));
        // Scale depth to delay time modulation (0-5ms)
        const modAmount = this.depth * 0.005;
        this.lfoGain.gain.linearRampToValueAtTime(modAmount, now + 0.01);
        break;
      }

      case 'feedback':
      case 'regeneration': {
        // Limit feedback to prevent instability
        this.feedback = Math.max(0, Math.min(0.95, value));
        this.feedbackGain.gain.linearRampToValueAtTime(this.feedback, now + 0.01);
        break;
      }

      case 'mix':
        this.setMix(value);
        break;

      default:
        console.warn(`Unknown parameter: ${name}`);
    }
  }

  public getParameter(name: string): number {
    switch (name) {
      case 'rate':
      case 'speed':
        return this.rate;
      case 'depth':
      case 'amount':
        return this.depth;
      case 'feedback':
      case 'regeneration':
        return this.feedback;
      case 'mix':
        return this.mix;
      default:
        return 0;
    }
  }

  public getParameters(): ParameterDescriptor[] {
    return [
      ...this.getCommonParameters(),
      {
        name: 'rate',
        min: 0.1,
        max: 10,
        default: 0.5,
        unit: 'Hz',
        type: 'continuous',
      },
      {
        name: 'depth',
        min: 0,
        max: 1,
        default: 0.5,
        unit: 'ratio',
        type: 'continuous',
      },
      {
        name: 'feedback',
        min: 0,
        max: 0.95,
        default: 0.5,
        unit: 'ratio',
        type: 'continuous',
      },
    ];
  }

  /**
   * Load a flanger preset
   */
  public loadPreset(preset: FlangerPreset): void {
    const config = FLANGER_PRESETS[preset];
    if (!config) {
      console.warn(`Unknown flanger preset: ${preset}`);
      return;
    }

    this.currentPreset = preset;

    // Apply preset parameters
    this.setParameter('rate', config.rate);
    this.setParameter('depth', config.depth);
    this.setParameter('feedback', config.feedback);
  }

  /**
   * Get the current preset name
   */
  public getCurrentPreset(): FlangerPreset {
    return this.currentPreset;
  }

  /**
   * Get all available presets
   */
  public getPresets(): Record<FlangerPreset, FlangerPresetConfig> {
    return FLANGER_PRESETS;
  }

  public disconnect(): void {
    // Stop LFO
    try {
      this.lfo.stop();
    } catch (e) {
      // Already stopped
    }
    super.disconnect();
  }
}
