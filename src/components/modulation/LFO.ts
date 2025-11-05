/**
 * LFO - Low Frequency Oscillator
 * 
 * Modular modulation source that can be connected to any parameter.
 * Provides various waveforms for cyclic modulation.
 */

import { AudioEngine } from '../../core/AudioEngine';
import type { AudioComponent, ParameterDescriptor } from '../../core/types';

export type LFOWaveform = 'sine' | 'triangle' | 'square' | 'sawtooth' | 'random';

export interface LFOConfig {
  frequency?: number;  // LFO rate in Hz (0.01-20 Hz)
  depth?: number;      // Modulation depth (0-1)
  waveform?: LFOWaveform;
}

export class LFO implements AudioComponent {
  private engine: AudioEngine;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode;
  private frequency: number;
  private depth: number;
  private waveform: LFOWaveform;
  private enabled: boolean = false;
  private randomInterval: number | null = null;

  constructor(config: LFOConfig = {}) {
    this.engine = AudioEngine.getInstance();
    this.gainNode = this.engine.createGain(0);
    
    this.frequency = config.frequency ?? 1.0;  // 1 Hz default
    this.depth = config.depth ?? 0.5;          // 50% depth default
    this.waveform = config.waveform ?? 'sine';

    this.updateDepth();
  }

  /**
   * Get the LFO's output node for connecting to parameters
   */
  public getNode(): GainNode {
    return this.gainNode;
  }

  /**
   * Get input node (for AudioComponent interface)
   */
  public getInputNode(): AudioNode {
    return this.gainNode;
  }

  /**
   * Get output node (for AudioComponent interface)
   */
  public getOutputNode(): AudioNode {
    return this.gainNode;
  }

  /**
   * Start the LFO
   */
  public start(): void {
    if (this.enabled) return;

    if (this.waveform === 'random') {
      this.startRandomLFO();
    } else {
      this.startOscillatorLFO();
    }

    this.enabled = true;
  }

  /**
   * Stop the LFO
   */
  public stop(): void {
    if (!this.enabled) return;

    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator = null;
    }

    if (this.randomInterval !== null) {
      clearInterval(this.randomInterval);
      this.randomInterval = null;
    }

    // Reset gain to 0
    const now = this.engine.getCurrentTime();
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(0, now);

    this.enabled = false;
  }

  /**
   * Start standard oscillator-based LFO
   */
  private startOscillatorLFO(): void {
    this.oscillator = this.engine.createOscillator();
    this.oscillator.frequency.value = this.frequency;

    // Map our waveform types to OscillatorNode types
    if (this.waveform === 'random') {
      this.oscillator.type = 'sine'; // Fallback
    } else {
      this.oscillator.type = this.waveform;
    }

    this.oscillator.connect(this.gainNode);
    this.oscillator.start();
  }

  /**
   * Start random (sample & hold) LFO
   */
  private startRandomLFO(): void {
    const updateRate = 1000 / this.frequency; // Convert Hz to ms

    this.randomInterval = window.setInterval(() => {
      const randomValue = (Math.random() * 2 - 1) * this.depth; // -depth to +depth
      const now = this.engine.getCurrentTime();
      this.gainNode.gain.linearRampToValueAtTime(randomValue, now + updateRate / 2000);
    }, updateRate);
  }

  /**
   * Update depth (gain) of modulation
   */
  private updateDepth(): void {
    // LFO output range is typically -1 to +1
    // Depth scales this to -depth to +depth
    this.gainNode.gain.value = this.depth;
  }

  // AudioComponent interface implementation
  public connect(destination: AudioNode | AudioComponent): void {
    if ('getInputNode' in destination) {
      this.gainNode.connect((destination as AudioComponent).getInputNode());
    } else {
      this.gainNode.connect(destination as AudioNode);
    }
  }

  /**
   * Connect to an AudioParam for parameter modulation
   */
  public connectToParam(param: AudioParam): void {
    this.gainNode.connect(param);
  }

  public disconnect(): void {
    this.gainNode.disconnect();
  }

  public setParameter(name: string, value: number): void {
    const now = this.engine.getCurrentTime();

    switch (name) {
      case 'frequency':
      case 'rate': {
        this.frequency = Math.max(0.01, Math.min(20, value));
        if (this.oscillator) {
          this.oscillator.frequency.linearRampToValueAtTime(this.frequency, now + 0.01);
        }
        if (this.randomInterval !== null) {
          // Restart random LFO with new rate
          this.stop();
          this.start();
        }
        break;
      }
      case 'depth':
      case 'amount': {
        this.depth = Math.max(0, Math.min(1, value));
        this.gainNode.gain.linearRampToValueAtTime(this.depth, now + 0.01);
        break;
      }
      case 'waveform': {
        // Value should be 0-4 for waveform index
        const waveforms: LFOWaveform[] = ['sine', 'triangle', 'square', 'sawtooth', 'random'];
        const index = Math.floor(Math.max(0, Math.min(4, value)));
        this.waveform = waveforms[index];
        
        // Restart LFO if running
        if (this.enabled) {
          this.stop();
          this.start();
        }
        break;
      }
      default:
        console.warn(`Unknown parameter: ${name}`);
    }
  }

  public getParameter(name: string): number {
    switch (name) {
      case 'frequency':
      case 'rate':
        return this.frequency;
      case 'depth':
      case 'amount':
        return this.depth;
      case 'waveform': {
        const waveforms: LFOWaveform[] = ['sine', 'triangle', 'square', 'sawtooth', 'random'];
        return waveforms.indexOf(this.waveform);
      }
      default:
        return 0;
    }
  }

  public enable(): void {
    this.start();
  }

  public disable(): void {
    this.stop();
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getName(): string {
    return 'LFO';
  }

  public getType(): string {
    return 'modulation';
  }

  public getParameters(): ParameterDescriptor[] {
    return [
      {
        name: 'frequency',
        min: 0.01,
        max: 20,
        default: 1.0,
        unit: 'Hz',
        type: 'continuous' as const,
      },
      {
        name: 'depth',
        min: 0,
        max: 1,
        default: 0.5,
        unit: '',
        type: 'continuous' as const,
      },
      {
        name: 'waveform',
        min: 0,
        max: 4,
        default: 0,
        unit: '',
        type: 'discrete' as const,
      },
    ];
  }

  /**
   * Get current waveform
   */
  public getWaveform(): LFOWaveform {
    return this.waveform;
  }

  /**
   * Set waveform directly
   */
  public setWaveform(waveform: LFOWaveform): void {
    this.waveform = waveform;
    if (this.enabled) {
      this.stop();
      this.start();
    }
  }
}
