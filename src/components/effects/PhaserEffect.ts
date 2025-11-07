/**
 * PhaserEffect - Phasing effect
 *
 * Creates a sweeping, swirling effect by using a series of allpass filters
 * whose frequencies are modulated by an LFO. The phase cancellations create
 * the characteristic "notches" that sweep through the frequency spectrum.
 *
 * Classic use: Sweeping synth pads, guitar effects, electronic music,
 * vintage keyboard sounds, psychedelic textures
 *
 * Parameters:
 * - rate: LFO speed (0.1-10 Hz)
 * - depth: Modulation amount (0-1)
 * - feedback: Resonance amount (0-0.95)
 * - stages: Number of allpass stages (2, 4, 6, 8, 10, 12)
 * - mix: Wet/dry balance
 *
 * Implementation: Uses cascaded allpass filters with LFO-modulated frequencies
 * for the classic phasing sound.
 */

import { BaseEffect } from './BaseEffect';
import type { ParameterDescriptor } from '../../core/types';

export type PhaserPreset = 'subtle' | 'classic' | 'vintage' | 'deep' | 'fast' | 'slow' | 'extreme';

export interface PhaserPresetConfig {
  name: string;
  description: string;
  rate: number; // Hz
  depth: number; // 0-1
  feedback: number; // 0-0.95
  stages: number; // Number of allpass filters
}

const PHASER_PRESETS: Record<PhaserPreset, PhaserPresetConfig> = {
  subtle: {
    name: 'Subtle',
    description: 'Gentle movement, 4 stages',
    rate: 0.3,
    depth: 0.3,
    feedback: 0.2,
    stages: 4,
  },
  classic: {
    name: 'Classic',
    description: 'Traditional phaser sweep',
    rate: 0.5,
    depth: 0.5,
    feedback: 0.5,
    stages: 6,
  },
  vintage: {
    name: 'Vintage',
    description: 'Warm analog-style phasing',
    rate: 0.4,
    depth: 0.6,
    feedback: 0.6,
    stages: 4,
  },
  deep: {
    name: 'Deep',
    description: 'Rich, thick phasing',
    rate: 0.2,
    depth: 0.8,
    feedback: 0.7,
    stages: 8,
  },
  fast: {
    name: 'Fast',
    description: 'Quick, intense sweep',
    rate: 2.0,
    depth: 0.7,
    feedback: 0.6,
    stages: 6,
  },
  slow: {
    name: 'Slow',
    description: 'Slow, evolving texture',
    rate: 0.15,
    depth: 0.9,
    feedback: 0.5,
    stages: 8,
  },
  extreme: {
    name: 'Extreme',
    description: 'Maximum phasing intensity',
    rate: 1.5,
    depth: 0.95,
    feedback: 0.9,
    stages: 12,
  },
};

export class PhaserEffect extends BaseEffect {
  private allpassFilters: BiquadFilterNode[] = [];
  private lfo: OscillatorNode;
  private lfoGain: GainNode;
  private feedbackGain: GainNode;
  private currentPreset: PhaserPreset = 'classic';
  private rate = 0.5; // Hz
  private depth = 0.5; // 0-1
  private feedback = 0.5; // 0-0.95
  private stages = 6; // Number of allpass stages
  private baseFrequency = 440; // Hz - center frequency

  constructor(preset: PhaserPreset = 'classic') {
    super('Phaser Effect', 'phaser');

    // Create LFO for frequency modulation
    this.lfo = this.engine.getContext().createOscillator();
    this.lfo.type = 'sine';
    this.lfoGain = this.engine.getContext().createGain();

    // Create feedback path
    this.feedbackGain = this.engine.getContext().createGain();

    // Load preset and create filters
    this.loadPreset(preset);

    // Start LFO
    this.lfo.start();

    // Set up default routing
    this.setupRouting();
  }

  private createAllpassFilters(count: number): void {
    // Clean up existing filters
    this.allpassFilters.forEach((filter) => filter.disconnect());
    this.allpassFilters = [];

    // Create new allpass filters
    for (let i = 0; i < count; i++) {
      const filter = this.engine.getContext().createBiquadFilter();
      filter.type = 'allpass';
      filter.Q.value = 1.0;
      this.allpassFilters.push(filter);
    }
  }

  private setupRouting(): void {
    // Disconnect existing routing
    this.feedbackGain.disconnect();
    this.lfo.disconnect();
    this.lfoGain.disconnect();

    if (this.allpassFilters.length === 0) return;

    // Connect LFO to modulate filter frequencies
    this.lfo.connect(this.lfoGain);

    // Chain allpass filters together
    this.getInputNode().connect(this.allpassFilters[0]);

    for (let i = 0; i < this.allpassFilters.length - 1; i++) {
      this.allpassFilters[i].connect(this.allpassFilters[i + 1]);
      // Connect LFO to each filter's frequency
      this.lfoGain.connect(this.allpassFilters[i].frequency);
    }

    // Connect last filter to feedback and output
    const lastFilter = this.allpassFilters[this.allpassFilters.length - 1];
    this.lfoGain.connect(lastFilter.frequency);

    lastFilter.connect(this.wetGain);
    lastFilter.connect(this.feedbackGain);

    // Feedback to first filter
    this.feedbackGain.connect(this.allpassFilters[0]);

    // Update LFO and feedback parameters
    this.updateLFO();
    this.updateFeedback();
  }

  private updateLFO(): void {
    // Set LFO rate
    this.lfo.frequency.setValueAtTime(this.rate, this.engine.getContext().currentTime);

    // Set modulation depth
    // Depth controls how much the frequency varies (±depth * 1000 Hz around base frequency)
    const depthAmount = this.depth * 1000;
    this.lfoGain.gain.setValueAtTime(depthAmount, this.engine.getContext().currentTime);

    // Update base frequency for all filters
    this.allpassFilters.forEach((filter, index) => {
      // Spread filters across frequency spectrum
      const spread = Math.pow(2, index / this.allpassFilters.length);
      const freq = this.baseFrequency * spread;
      filter.frequency.setValueAtTime(freq, this.engine.getContext().currentTime);
    });
  }

  private updateFeedback(): void {
    // Clamp feedback to prevent instability
    const clampedFeedback = Math.max(0, Math.min(0.95, this.feedback));
    this.feedbackGain.gain.setValueAtTime(clampedFeedback, this.engine.getContext().currentTime);
  }

  /**
   * Load a preset configuration
   */
  loadPreset(preset: PhaserPreset): void {
    const config = PHASER_PRESETS[preset];
    if (!config) {
      console.warn(`Unknown phaser preset: ${preset}`);
      return;
    }

    this.currentPreset = preset;
    this.rate = config.rate;
    this.depth = config.depth;
    this.feedback = config.feedback;

    // Recreate filters if stage count changed
    if (config.stages !== this.stages) {
      this.stages = config.stages;
      this.createAllpassFilters(this.stages);
      this.setupRouting();
    } else {
      this.updateLFO();
      this.updateFeedback();
    }
  }

  /**
   * Get current preset name
   */
  getCurrentPreset(): PhaserPreset {
    return this.currentPreset;
  }

  /**
   * Get all available presets
   */
  getPresets(): Record<PhaserPreset, PhaserPresetConfig> {
    return PHASER_PRESETS;
  }

  setParameter(name: string, value: number): void {
    const currentTime = this.engine.getContext().currentTime;

    switch (name) {
      case 'rate':
      case 'speed':
        this.rate = Math.max(0.1, Math.min(10, value));
        this.lfo.frequency.setValueAtTime(this.rate, currentTime);
        break;

      case 'depth':
      case 'amount':
        this.depth = Math.max(0, Math.min(1, value));
        this.updateLFO();
        break;

      case 'feedback':
      case 'resonance':
        this.feedback = Math.max(0, Math.min(0.95, value));
        this.updateFeedback();
        break;

      case 'stages':
        const newStages = Math.max(2, Math.min(12, Math.round(value)));
        if (newStages !== this.stages) {
          this.stages = newStages;
          this.createAllpassFilters(this.stages);
          this.setupRouting();
        }
        break;

      case 'base':
      case 'frequency':
        this.baseFrequency = Math.max(100, Math.min(2000, value));
        this.updateLFO();
        break;

      case 'mix':
        this.setMix(value);
        break;

      default:
        console.warn(`Unknown parameter: ${name}`);
    }
  }

  getParameter(name: string): number {
    switch (name) {
      case 'rate':
      case 'speed':
        return this.rate;

      case 'depth':
      case 'amount':
        return this.depth;

      case 'feedback':
      case 'resonance':
        return this.feedback;

      case 'stages':
        return this.stages;

      case 'base':
      case 'frequency':
        return this.baseFrequency;

      case 'mix':
        return this.getMix();

      default:
        console.warn(`Unknown parameter: ${name}`);
        return 0;
    }
  }

  getParameters(): ParameterDescriptor[] {
    return [
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
      {
        name: 'stages',
        min: 2,
        max: 12,
        default: 6,
        unit: 'count',
        type: 'discrete',
      },
      {
        name: 'base',
        min: 100,
        max: 2000,
        default: 440,
        unit: 'Hz',
        type: 'continuous',
      },
      {
        name: 'mix',
        min: 0,
        max: 1,
        default: 0.5,
        unit: 'ratio',
        type: 'continuous',
      },
    ];
  }

  disconnect(): void {
    this.lfo.stop();
    this.lfo.disconnect();
    this.lfoGain.disconnect();
    this.feedbackGain.disconnect();
    this.allpassFilters.forEach((filter) => filter.disconnect());
    super.disconnect();
  }
}
