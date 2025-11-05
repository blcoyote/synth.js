/**
 * ReverbEffect - Simple reverb using multiple delays
 * 
 * Creates a sense of space and ambience using a network of
 * delays (Schroeder reverb algorithm).
 * 
 * Classic use: Room ambience, hall spaces, plate reverb simulation,
 * ambient pads, vocal depth
 * 
 * Parameters:
 * - decay: How long the reverb lasts (0-1)
 * - mix: Wet/dry balance
 * 
 * Note: This is a simplified reverb. Production reverbs use
 * convolution or more complex algorithms.
 */

import { BaseEffect } from './BaseEffect';
import type { ParameterDescriptor } from '../../core/types';

export class ReverbEffect extends BaseEffect {
  private delays: DelayNode[] = [];
  private gains: GainNode[] = [];
  private decayGain: GainNode;
  
  private decay: number = 0.5;

  constructor(decay: number = 0.5) {
    super('Reverb Effect', 'reverb');
    
    this.decay = decay;
    
    // Create a simple multi-tap delay reverb (safer than feedback loops)
    // Multiple delays at different times create reverb effect
    const delayTimes = [0.023, 0.029, 0.031, 0.037, 0.041, 0.043, 0.047, 0.053];
    
    // Create decay control
    this.decayGain = this.engine.createGain(1.0);
    
    // Create multiple parallel delays (no feedback - prevents runaway)
    for (let i = 0; i < delayTimes.length; i++) {
      const delay = this.engine.createDelay(0.2);
      const gain = this.engine.createGain(this.decay * (0.8 - i * 0.08)); // Decreasing amplitude
      
      delay.delayTime.value = delayTimes[i];
      
      // Simple parallel routing: input -> delay -> gain -> output
      this.inputGain.connect(delay);
      delay.connect(gain);
      gain.connect(this.decayGain);
      
      this.delays.push(delay);
      this.gains.push(gain);
    }
    
    // Connect to wet path
    this.connectWetPath(this.decayGain);
    
    // Set initial mix to 30% (typical for reverb)
    this.setMix(0.3);
  }

  public setParameter(name: string, value: number): void {
    const now = this.engine.getCurrentTime();
    
    switch (name) {
      case 'decay':
      case 'time': {
        this.decay = Math.max(0, Math.min(1, value));
        // Adjust gains for each tap - decreasing amplitude for later taps
        this.gains.forEach((gain, i) => {
          const amplitude = this.decay * (0.8 - i * 0.08);
          gain.gain.linearRampToValueAtTime(amplitude, now + 0.01);
        });
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
      case 'decay':
      case 'time':
        return this.decay;
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
        name: 'decay',
        min: 0,
        max: 1,
        default: 0.5,
        unit: 'ratio',
        type: 'continuous',
      },
    ];
  }
}
