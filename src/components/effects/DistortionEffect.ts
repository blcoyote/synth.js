/**
 * DistortionEffect - Waveshaping distortion/overdrive
 *
 * Adds harmonic content and grit by clipping the waveform.
 * Uses a waveshaper with different curve types.
 *
 * Classic use: Guitar-like overdrive, aggressive synth leads,
 * bass saturation, adding harmonics
 *
 * Parameters:
 * - drive: Amount of distortion (0-1)
 * - tone: Post-distortion filtering (0-1, dark to bright)
 * - mix: Wet/dry balance
 */

import { BaseEffect } from './BaseEffect';
import type { ParameterDescriptor } from '../../core/types';

export type DistortionPreset =
  | 'clean'
  | 'warm'
  | 'overdrive'
  | 'distortion'
  | 'fuzz'
  | 'heavy'
  | 'brutal';

export interface DistortionPresetConfig {
  name: string;
  description: string;
  drive: number; // 0-1
  tone: number; // 0-1
}

const DISTORTION_PRESETS: Record<DistortionPreset, DistortionPresetConfig> = {
  clean: {
    name: 'Clean Boost',
    description: 'Subtle saturation, transparent',
    drive: 0.15,
    tone: 0.7,
  },
  warm: {
    name: 'Warm',
    description: 'Gentle tube-like warmth',
    drive: 0.35,
    tone: 0.6,
  },
  overdrive: {
    name: 'Overdrive',
    description: 'Classic guitar overdrive',
    drive: 0.5,
    tone: 0.55,
  },
  distortion: {
    name: 'Distortion',
    description: 'Heavy guitar distortion',
    drive: 0.7,
    tone: 0.5,
  },
  fuzz: {
    name: 'Fuzz',
    description: 'Vintage fuzz tone',
    drive: 0.85,
    tone: 0.4,
  },
  heavy: {
    name: 'Heavy',
    description: 'Aggressive modern distortion',
    drive: 0.9,
    tone: 0.45,
  },
  brutal: {
    name: 'Brutal',
    description: 'Extreme clipping and saturation',
    drive: 1.0,
    tone: 0.35,
  },
};

export class DistortionEffect extends BaseEffect {
  private waveshaper: WaveShaperNode;
  private preGain: GainNode;
  private postGain: GainNode;
  private toneFilter: BiquadFilterNode;

  private drive: number = 0.5;
  private tone: number = 0.5;
  private currentPreset: DistortionPreset = 'overdrive';

  constructor(preset: DistortionPreset = 'overdrive') {
    super('Distortion Effect', 'distortion');

    // Load preset configuration
    const config = DISTORTION_PRESETS[preset];
    this.currentPreset = preset;
    this.drive = config.drive;
    this.tone = config.tone;

    // Create processing nodes
    this.preGain = this.engine.createGain(1.0);
    this.waveshaper = this.engine.getContext().createWaveShaper();
    this.postGain = this.engine.createGain(1.0);
    this.toneFilter = this.engine.createBiquadFilter('lowpass');

    // Set tone filter based on preset
    const toneFreq = 500 + this.tone * 7500;
    this.toneFilter.frequency.value = toneFreq;
    this.toneFilter.Q.value = 1;

    // Connect: input -> pre gain -> waveshaper -> post gain -> tone filter
    this.inputGain.connect(this.preGain);
    this.preGain.connect(this.waveshaper);
    this.waveshaper.connect(this.postGain);
    this.postGain.connect(this.toneFilter);

    // Connect to wet path
    this.connectWetPath(this.toneFilter);

    // Set initial drive and compensation
    this.updateDistortionCurve();
    const compensation = 1.0 / (1.0 + this.drive * 2);
    this.postGain.gain.value = compensation;

    // Set initial mix to 80% (typical for distortion)
    this.setMix(0.8);
  }

  private updateDistortionCurve(): void {
    const samples = 256;
    const curve = new Float32Array(samples);
    const amount = this.drive * 100; // Scale drive amount

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1; // -1 to 1

      // Soft clipping curve (smooth saturation)
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }

    this.waveshaper.curve = curve;
    this.waveshaper.oversample = '4x'; // Better quality
  }

  public setParameter(name: string, value: number): void {
    const now = this.engine.getCurrentTime();

    switch (name) {
      case 'drive':
      case 'amount': {
        this.drive = Math.max(0, Math.min(1, value));
        this.updateDistortionCurve();

        // Adjust post-gain to compensate for increased level
        const compensation = 1.0 / (1.0 + this.drive * 2);
        this.postGain.gain.linearRampToValueAtTime(compensation, now + 0.01);
        break;
      }

      case 'tone': {
        this.tone = Math.max(0, Math.min(1, value));
        // Map tone to filter frequency (500 Hz - 8000 Hz)
        const freq = 500 + this.tone * 7500;
        this.toneFilter.frequency.exponentialRampToValueAtTime(freq, now + 0.01);
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
      case 'drive':
      case 'amount':
        return this.drive;
      case 'tone':
        return this.tone;
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
        name: 'drive',
        min: 0,
        max: 1,
        default: 0.5,
        unit: 'ratio',
        type: 'continuous',
      },
      {
        name: 'tone',
        min: 0,
        max: 1,
        default: 0.5,
        unit: 'ratio',
        type: 'continuous',
      },
    ];
  }

  /**
   * Load a distortion preset
   */
  public loadPreset(preset: DistortionPreset): void {
    const config = DISTORTION_PRESETS[preset];
    if (!config) {
      console.warn(`Unknown distortion preset: ${preset}`);
      return;
    }

    this.currentPreset = preset;

    // Apply preset parameters
    this.setParameter('drive', config.drive);
    this.setParameter('tone', config.tone);
  }

  /**
   * Get the current preset name
   */
  public getCurrentPreset(): DistortionPreset {
    return this.currentPreset;
  }

  /**
   * Get all available presets
   */
  public getPresets(): Record<DistortionPreset, DistortionPresetConfig> {
    return DISTORTION_PRESETS;
  }
}
