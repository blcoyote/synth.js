/**
 * ADSREnvelope - Attack, Decay, Sustain, Release envelope generator
 * 
 * Classic ADSR envelope for controlling amplitude, filter cutoff, or any parameter over time.
 * Can be triggered and released independently.
 */

import { AudioEngine } from '../../core/AudioEngine';
import type { AudioComponent, ParameterDescriptor } from '../../core/types';

export interface EnvelopeConfig {
  attack?: number;   // Attack time in seconds (0-2s)
  decay?: number;    // Decay time in seconds (0-2s)
  sustain?: number;  // Sustain level (0-1)
  release?: number;  // Release time in seconds (0-5s)
}

export class ADSREnvelope implements AudioComponent {
  private engine: AudioEngine;
  private gainNode: GainNode;
  private attack: number;
  private decay: number;
  private sustain: number;
  private release: number;
  private isActive: boolean = false;
  private releaseStartTime: number = 0;

  constructor(config: EnvelopeConfig = {}) {
    this.engine = AudioEngine.getInstance();
    this.gainNode = this.engine.createGain(0); // Start at 0
    
    this.attack = config.attack ?? 0.01;   // 10ms default
    this.decay = config.decay ?? 0.1;      // 100ms default
    this.sustain = config.sustain ?? 0.7;  // 70% level default
    this.release = config.release ?? 0.3;  // 300ms default
  }

  /**
   * Get the envelope's gain node for connecting in signal chain
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
   * Trigger the envelope (Attack -> Decay -> Sustain)
   */
  public trigger(velocity: number = 1.0): void {
    const now = this.engine.getCurrentTime();
    const param = this.gainNode.gain;

    // Cancel any scheduled changes
    param.cancelScheduledValues(now);

    // Get current value for smooth retriggering
    const currentValue = param.value;
    
    // If retriggering while releasing, use exponential ramp for smoother transition
    if (!this.isActive && currentValue > 0.01) {
      // Quick fade to zero before starting new envelope (prevents clicks)
      param.setValueAtTime(currentValue, now);
      param.exponentialRampToValueAtTime(0.0001, now + 0.005); // 5ms fade
      
      // Start new envelope after fade
      const startTime = now + 0.005;
      param.setValueAtTime(0, startTime);
      param.linearRampToValueAtTime(velocity, startTime + this.attack);
      param.linearRampToValueAtTime(this.sustain * velocity, startTime + this.attack + this.decay);
    } else {
      // Normal triggering or retriggering from zero
      const startValue = this.isActive ? currentValue : 0;
      param.setValueAtTime(startValue, now);

      // Attack phase: ramp to peak (velocity scaled)
      const peakValue = velocity;
      param.linearRampToValueAtTime(peakValue, now + this.attack);

      // Decay phase: ramp to sustain level
      const sustainValue = this.sustain * velocity;
      param.linearRampToValueAtTime(sustainValue, now + this.attack + this.decay);
    }

    this.isActive = true;
  }

  /**
   * Release the envelope (Sustain -> Release -> 0)
   */
  public triggerRelease(): void {
    if (!this.isActive) return;

    const now = this.engine.getCurrentTime();
    const param = this.gainNode.gain;

    // Cancel future scheduled values but keep current
    param.cancelScheduledValues(now);
    
    // Start release from current value
    const currentValue = param.value;
    param.setValueAtTime(currentValue, now);

    // Release phase: use exponential ramp for smoother, more natural decay
    // Exponential ramps can't go to 0, so use a very small value
    if (currentValue > 0.0001) {
      param.exponentialRampToValueAtTime(0.0001, now + this.release);
    } else {
      // If already very quiet, just use linear
      param.linearRampToValueAtTime(0, now + this.release);
    }

    this.releaseStartTime = now;
    this.isActive = false;
  }

  /**
   * Check if envelope is currently in attack, decay, or sustain phase
   */
  public isTriggered(): boolean {
    return this.isActive;
  }

  /**
   * Check if envelope has fully released
   */
  public hasFinished(): boolean {
    if (this.isActive) return false;
    if (this.releaseStartTime === 0) return true;
    
    const now = this.engine.getCurrentTime();
    return (now - this.releaseStartTime) >= this.release;
  }

  /**
   * Reset envelope to initial state
   */
  public reset(): void {
    const now = this.engine.getCurrentTime();
    const param = this.gainNode.gain;
    param.cancelScheduledValues(now);
    param.setValueAtTime(0, now);
    this.isActive = false;
    this.releaseStartTime = 0;
  }

  // AudioComponent interface implementation
  public connect(destination: AudioNode): void {
    this.gainNode.connect(destination);
  }

  public disconnect(): void {
    this.gainNode.disconnect();
  }

  public setParameter(name: string, value: number): void {
    switch (name) {
      case 'attack':
        this.attack = Math.max(0.001, Math.min(2, value));
        break;
      case 'decay':
        this.decay = Math.max(0.001, Math.min(2, value));
        break;
      case 'sustain':
        this.sustain = Math.max(0, Math.min(1, value));
        break;
      case 'release':
        this.release = Math.max(0.001, Math.min(5, value));
        break;
      default:
        console.warn(`Unknown parameter: ${name}`);
    }
  }

  public getParameter(name: string): number {
    switch (name) {
      case 'attack':
        return this.attack;
      case 'decay':
        return this.decay;
      case 'sustain':
        return this.sustain;
      case 'release':
        return this.release;
      default:
        return 0;
    }
  }

  public enable(): void {
    // Envelope is always "enabled", controlled by trigger/release
  }

  public disable(): void {
    this.reset();
  }

  public isEnabled(): boolean {
    return true;
  }

  public getName(): string {
    return 'ADSREnvelope';
  }

  public getType(): string {
    return 'envelope';
  }

  public getParameters(): ParameterDescriptor[] {
    return [
      {
        name: 'attack',
        min: 0.001,
        max: 2,
        default: 0.01,
        unit: 's',
        type: 'continuous' as const,
      },
      {
        name: 'decay',
        min: 0.001,
        max: 2,
        default: 0.1,
        unit: 's',
        type: 'continuous' as const,
      },
      {
        name: 'sustain',
        min: 0,
        max: 1,
        default: 0.7,
        unit: '',
        type: 'continuous' as const,
      },
      {
        name: 'release',
        min: 0.001,
        max: 5,
        default: 0.3,
        unit: 's',
        type: 'continuous' as const,
      },
    ];
  }
}
