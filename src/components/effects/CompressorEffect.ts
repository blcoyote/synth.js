/**
 * CompressorEffect - Dynamic range compression
 *
 * Controls dynamic range by reducing the volume of loud sounds and optionally
 * boosting quiet sounds. Essential for mixing, mastering, and sound design.
 *
 * Classic use: Controlling peaks, adding punch, evening out levels,
 * mastering chains, parallel compression, vocal processing
 *
 * Parameters:
 * - threshold: Level above which compression starts (dB)
 * - knee: Smoothness of compression curve (dB)
 * - ratio: Amount of compression (1:1 to 20:1)
 * - attack: How quickly compression engages (seconds)
 * - release: How quickly compression disengages (seconds)
 * - mix: Wet/dry balance (for parallel compression)
 *
 * Implementation: Uses Web Audio API DynamicsCompressorNode
 */

import { BaseEffect } from './BaseEffect';
import type { ParameterDescriptor } from '../../core/types';

export type CompressorPreset =
  | 'soft'
  | 'medium'
  | 'hard'
  | 'limiting'
  | 'parallel'
  | 'vocal'
  | 'master';

export interface CompressorPresetConfig {
  name: string;
  description: string;
  threshold: number; // dB
  knee: number; // dB
  ratio: number; // compression ratio
  attack: number; // seconds
  release: number; // seconds
  mix: number; // 0-1 for parallel compression
}

const COMPRESSOR_PRESETS: Record<CompressorPreset, CompressorPresetConfig> = {
  soft: {
    name: 'Soft',
    description: 'Gentle compression, transparent',
    threshold: -24,
    knee: 30,
    ratio: 2,
    attack: 0.003,
    release: 0.25,
    mix: 1.0,
  },
  medium: {
    name: 'Medium',
    description: 'Balanced compression',
    threshold: -18,
    knee: 12,
    ratio: 4,
    attack: 0.003,
    release: 0.25,
    mix: 1.0,
  },
  hard: {
    name: 'Hard',
    description: 'Aggressive compression',
    threshold: -12,
    knee: 6,
    ratio: 8,
    attack: 0.001,
    release: 0.1,
    mix: 1.0,
  },
  limiting: {
    name: 'Limiting',
    description: 'Brick wall limiting',
    threshold: -6,
    knee: 0,
    ratio: 20,
    attack: 0.001,
    release: 0.05,
    mix: 1.0,
  },
  parallel: {
    name: 'Parallel',
    description: 'NY-style parallel compression',
    threshold: -24,
    knee: 6,
    ratio: 10,
    attack: 0.001,
    release: 0.1,
    mix: 0.3,
  },
  vocal: {
    name: 'Vocal',
    description: 'Smooth vocal compression',
    threshold: -20,
    knee: 20,
    ratio: 3,
    attack: 0.005,
    release: 0.25,
    mix: 1.0,
  },
  master: {
    name: 'Master',
    description: 'Mastering bus compression',
    threshold: -15,
    knee: 6,
    ratio: 2.5,
    attack: 0.01,
    release: 0.3,
    mix: 1.0,
  },
};

export class CompressorEffect extends BaseEffect {
  private compressor: DynamicsCompressorNode;
  private currentPreset: CompressorPreset = 'medium';

  constructor(preset: CompressorPreset = 'medium') {
    super('Compressor Effect', 'compressor');

    // Create compressor node
    this.compressor = this.engine.getContext().createDynamicsCompressor();

    // Connect through compressor
    this.getInputNode().connect(this.compressor);
    this.compressor.connect(this.wetGain);

    // Load preset
    this.loadPreset(preset);
  }

  /**
   * Load a preset configuration
   */
  loadPreset(preset: CompressorPreset): void {
    const config = COMPRESSOR_PRESETS[preset];
    if (!config) {
      console.warn(`Unknown compressor preset: ${preset}`);
      return;
    }

    this.currentPreset = preset;

    // Apply compressor settings
    const now = this.engine.getContext().currentTime;
    this.compressor.threshold.setValueAtTime(config.threshold, now);
    this.compressor.knee.setValueAtTime(config.knee, now);
    this.compressor.ratio.setValueAtTime(config.ratio, now);
    this.compressor.attack.setValueAtTime(config.attack, now);
    this.compressor.release.setValueAtTime(config.release, now);

    // Set mix for parallel compression
    this.setMix(config.mix);
  }

  /**
   * Get current preset name
   */
  getCurrentPreset(): CompressorPreset {
    return this.currentPreset;
  }

  /**
   * Get all available presets
   */
  getPresets(): Record<CompressorPreset, CompressorPresetConfig> {
    return COMPRESSOR_PRESETS;
  }

  /**
   * Get current reduction in dB (how much compression is being applied)
   */
  getReduction(): number {
    return this.compressor.reduction;
  }

  setParameter(name: string, value: number): void {
    const now = this.engine.getContext().currentTime;

    switch (name) {
      case 'threshold':
        // -100 to 0 dB
        this.compressor.threshold.setValueAtTime(Math.max(-100, Math.min(0, value)), now);
        break;

      case 'knee':
        // 0 to 40 dB
        this.compressor.knee.setValueAtTime(Math.max(0, Math.min(40, value)), now);
        break;

      case 'ratio':
        // 1 to 20
        this.compressor.ratio.setValueAtTime(Math.max(1, Math.min(20, value)), now);
        break;

      case 'attack':
        // 0 to 1 second
        this.compressor.attack.setValueAtTime(Math.max(0, Math.min(1, value)), now);
        break;

      case 'release':
        // 0 to 1 second
        this.compressor.release.setValueAtTime(Math.max(0, Math.min(1, value)), now);
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
      case 'threshold':
        return this.compressor.threshold.value;

      case 'knee':
        return this.compressor.knee.value;

      case 'ratio':
        return this.compressor.ratio.value;

      case 'attack':
        return this.compressor.attack.value;

      case 'release':
        return this.compressor.release.value;

      case 'mix':
        return this.getMix();

      case 'reduction':
        return this.compressor.reduction;

      default:
        console.warn(`Unknown parameter: ${name}`);
        return 0;
    }
  }

  getParameters(): ParameterDescriptor[] {
    return [
      {
        name: 'threshold',
        min: -100,
        max: 0,
        default: -24,
        unit: 'dB',
        type: 'continuous',
      },
      {
        name: 'knee',
        min: 0,
        max: 40,
        default: 30,
        unit: 'dB',
        type: 'continuous',
      },
      {
        name: 'ratio',
        min: 1,
        max: 20,
        default: 4,
        unit: 'ratio',
        type: 'continuous',
      },
      {
        name: 'attack',
        min: 0,
        max: 1,
        default: 0.003,
        unit: 's',
        type: 'continuous',
      },
      {
        name: 'release',
        min: 0,
        max: 1,
        default: 0.25,
        unit: 's',
        type: 'continuous',
      },
      {
        name: 'mix',
        min: 0,
        max: 1,
        default: 1.0,
        unit: 'ratio',
        type: 'continuous',
      },
    ];
  }

  disconnect(): void {
    this.compressor.disconnect();
    super.disconnect();
  }
}
