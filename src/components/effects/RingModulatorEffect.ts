/**
 * RingModulatorEffect - Ring modulation effect using carrier oscillator
 *
 * Ring modulation creates metallic, inharmonic timbres by multiplying
 * the input signal with a carrier oscillator. This produces sum and
 * difference frequencies (f1 + f2 and f1 - f2).
 */

import { BaseEffect } from './BaseEffect';
import type { ParameterDescriptor } from '../../core/types';

interface RingModulatorPreset {
  name: string;
  carrierFrequency: number;
  carrierWaveform: OscillatorType;
  mix: number;
  description: string;
}

export class RingModulatorEffect extends BaseEffect {
  private carrierOscillator: OscillatorNode;
  private modulatorGain: GainNode;

  private carrierFrequency: number = 100;
  private carrierWaveformType: OscillatorType = 'sine';
  private currentPreset: string = 'metallic';

  private static readonly PRESETS: Record<string, RingModulatorPreset> = {
    metallic: {
      name: 'Metallic',
      carrierFrequency: 200,
      carrierWaveform: 'sine',
      mix: 0.7,
      description: 'Classic metallic ring mod tone',
    },
    harmonic: {
      name: 'Harmonic',
      carrierFrequency: 440,
      carrierWaveform: 'sine',
      mix: 0.5,
      description: 'Musical harmonic modulation',
    },
    inharmonic: {
      name: 'Inharmonic',
      carrierFrequency: 137,
      carrierWaveform: 'square',
      mix: 0.8,
      description: 'Dissonant inharmonic tones',
    },
    tremolo: {
      name: 'Tremolo',
      carrierFrequency: 6,
      carrierWaveform: 'sine',
      mix: 0.3,
      description: 'Slow amplitude modulation',
    },
    radio: {
      name: 'Radio',
      carrierFrequency: 1000,
      carrierWaveform: 'sine',
      mix: 0.6,
      description: 'AM radio-style modulation',
    },
    robot: {
      name: 'Robot',
      carrierFrequency: 300,
      carrierWaveform: 'square',
      mix: 0.9,
      description: 'Robotic voice effect',
    },
    bell: {
      name: 'Bell',
      carrierFrequency: 880,
      carrierWaveform: 'sine',
      mix: 0.4,
      description: 'Bell-like tones',
    },
  };

  constructor(preset: string = 'metallic') {
    super('Ring Modulator', 'ring-modulator');

    const context = this.engine.getContext();

    // Create carrier oscillator
    this.carrierOscillator = context.createOscillator();
    this.carrierOscillator.type = this.carrierWaveformType;
    this.carrierOscillator.frequency.value = this.carrierFrequency;

    // Create modulator gain (acts as multiplier)
    this.modulatorGain = context.createGain();
    this.modulatorGain.gain.value = 1.0;

    // Connect: input -> modulatorGain -> wetGain
    // Carrier oscillator controls the gain of modulatorGain
    this.getInputNode().connect(this.modulatorGain);
    this.modulatorGain.connect(this.wetGain);

    // Connect carrier to modulator gain
    this.carrierOscillator.connect(this.modulatorGain.gain);

    // Start the carrier oscillator
    this.carrierOscillator.start();

    // Load default preset
    this.loadPreset(preset);
  }

  /**
   * Load a preset configuration
   */
  public loadPreset(presetName: string): void {
    const preset = RingModulatorEffect.PRESETS[presetName];
    if (!preset) {
      console.warn(`Preset "${presetName}" not found`);
      return;
    }

    this.setParameter('carrierFrequency', preset.carrierFrequency);
    this.setCarrierWaveform(preset.carrierWaveform);
    this.setParameter('mix', preset.mix);

    this.currentPreset = presetName;
  }

  /**
   * Get all available presets
   */
  public static getPresets(): RingModulatorPreset[] {
    return Object.values(RingModulatorEffect.PRESETS);
  }

  /**
   * Get current preset info
   */
  public getPresetInfo(): RingModulatorPreset | null {
    if (!this.currentPreset) return null;
    return RingModulatorEffect.PRESETS[this.currentPreset];
  }

  public setParameter(name: string, value: number): void {
    const now = this.engine.getContext().currentTime;

    switch (name) {
      case 'carrierFrequency':
        this.carrierFrequency = Math.max(0.1, Math.min(5000, value));
        this.carrierOscillator.frequency.setValueAtTime(this.carrierFrequency, now);
        break;

      case 'mix':
        this.setMix(value);
        break;

      default:
        console.warn(`Unknown parameter: ${name}`);
    }
  }

  /**
   * Set carrier waveform (separate method since it's not numeric)
   */
  public setCarrierWaveform(waveform: OscillatorType): void {
    if (['sine', 'square', 'sawtooth', 'triangle'].includes(waveform)) {
      this.carrierWaveformType = waveform;
      this.updateCarrierWaveform();
    }
  }

  public getParameter(name: string): number {
    switch (name) {
      case 'carrierFrequency':
        return this.carrierFrequency;
      case 'mix':
        return this.getMix();
      default:
        console.warn(`Unknown parameter: ${name}`);
        return 0;
    }
  }

  /**
   * Get carrier waveform (separate method since it's not numeric)
   */
  public getCarrierWaveform(): OscillatorType {
    return this.carrierWaveformType;
  }

  /**
   * Update carrier oscillator waveform
   * Web Audio API doesn't allow changing oscillator type after start,
   * so we need to recreate it
   */
  private updateCarrierWaveform(): void {
    const context = this.engine.getContext();

    // Disconnect old oscillator
    this.carrierOscillator.disconnect();
    this.carrierOscillator.stop();

    // Create new oscillator with new waveform
    this.carrierOscillator = context.createOscillator();
    this.carrierOscillator.type = this.carrierWaveformType;
    this.carrierOscillator.frequency.value = this.carrierFrequency;

    // Reconnect
    this.carrierOscillator.connect(this.modulatorGain.gain);
    this.carrierOscillator.start();
  }

  public getParameters(): ParameterDescriptor[] {
    return [
      {
        name: 'carrierFrequency',
        min: 0.1,
        max: 5000,
        default: 100,
        unit: 'Hz',
        type: 'continuous',
      },
      {
        name: 'mix',
        min: 0,
        max: 1,
        default: 0.7,
        unit: 'ratio',
        type: 'continuous',
      },
    ];
  }

  public disconnect(): void {
    this.carrierOscillator.stop();
    this.carrierOscillator.disconnect();
    this.modulatorGain.disconnect();
    super.disconnect();
  }
}
