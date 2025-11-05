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
    
    // Create a simple reverb using multiple delays
    // (Schroeder reverb - comb filters + allpass filters)
    const combDelayTimes = [0.037, 0.041, 0.043, 0.047]; // Prime-based delays
    const allpassDelayTimes = [0.007, 0.011];
    
    // Create decay control
    this.decayGain = this.engine.createGain(this.decay);
    
    // Create comb filters (feedback delays)
    let lastNode: AudioNode = this.inputGain;
    
    for (const delayTime of combDelayTimes) {
      const delay = this.engine.createDelay(0.1);
      const gain = this.engine.createGain(0.5);
      
      delay.delayTime.value = delayTime;
      
      // Connect: input -> delay -> gain -> back to delay (feedback)
      lastNode.connect(delay);
      delay.connect(gain);
      gain.connect(delay);
      
      this.delays.push(delay);
      this.gains.push(gain);
      
      lastNode = delay;
    }
    
    // Create allpass filters (phase-shifting delays)
    for (const delayTime of allpassDelayTimes) {
      const delay = this.engine.createDelay(0.1);
      const gain = this.engine.createGain(0.7);
      
      delay.delayTime.value = delayTime;
      
      lastNode.connect(delay);
      delay.connect(gain);
      gain.connect(delay);
      
      this.delays.push(delay);
      this.gains.push(gain);
      
      lastNode = delay;
    }
    
    // Connect final output through decay control
    lastNode.connect(this.decayGain);
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
        // Adjust feedback gains for decay time
        const feedbackGain = this.decay * 0.84; // Scale to prevent runaway
        this.gains.forEach(gain => {
          gain.gain.linearRampToValueAtTime(feedbackGain, now + 0.01);
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
