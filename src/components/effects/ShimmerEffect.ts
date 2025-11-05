/**
 * ShimmerEffect - Shimmer reverb effect
 * 
 * Creates an ethereal, ambient shimmer by combining reverb with
 * pitch-shifted harmonics. The effect adds octave-up reflections
 * that create a dreamy, celestial quality.
 * 
 * Classic use: Ambient pads, atmospheric textures, dream pop,
 * cinematic soundscapes, post-rock guitars
 * 
 * Parameters:
 * - decay: How long the shimmer lasts (0-1)
 * - shimmer: Amount of pitch-shifted signal (0-1)
 * - mix: Wet/dry balance
 * 
 * Implementation: Uses pitch shifting (via delay modulation) and
 * multi-tap delays to create the shimmering reverb tail.
 */

import { BaseEffect } from './BaseEffect';
import type { ParameterDescriptor } from '../../core/types';

export class ShimmerEffect extends BaseEffect {
  private delays: DelayNode[] = [];
  private gains: GainNode[] = [];
  private decayGain: GainNode;
  
  // Pitch shifting components
  private pitchShiftDelay: DelayNode;
  private pitchShiftGain: GainNode;
  private pitchShiftLFO: OscillatorNode;
  private pitchShiftLFOGain: GainNode;
  
  private decay: number = 0.5;
  private shimmer: number = 0.5;

  constructor(decay: number = 0.5, shimmer: number = 0.5) {
    super('Shimmer Effect', 'shimmer');
    
    this.decay = decay;
    this.shimmer = shimmer;
    
    // Create multi-tap delay reverb (base reverb)
    const delayTimes = [0.029, 0.037, 0.041, 0.043, 0.049, 0.053, 0.061, 0.067];
    
    // Create decay control
    this.decayGain = this.engine.createGain(1.0);
    
    // Create parallel delays for reverb base
    for (let i = 0; i < delayTimes.length; i++) {
      const delay = this.engine.createDelay(0.2);
      const gain = this.engine.createGain(this.decay * (0.4 - i * 0.03));
      
      delay.delayTime.value = delayTimes[i];
      
      // Input -> delay -> gain -> output
      this.inputGain.connect(delay);
      delay.connect(gain);
      gain.connect(this.decayGain);
      
      this.delays.push(delay);
      this.gains.push(gain);
    }
    
    // Create pitch shift section (octave up simulation)
    // We'll use a short delay with LFO modulation to create pitch shift effect
    this.pitchShiftDelay = this.engine.createDelay(0.1);
    this.pitchShiftDelay.delayTime.value = 0.025; // 25ms base
    
    this.pitchShiftGain = this.engine.createGain(this.shimmer * 0.8);
    
    // Create LFO for pitch shifting (fast modulation creates pitch change)
    this.pitchShiftLFO = this.engine.createOscillator('sine', 7.0);
    this.pitchShiftLFOGain = this.engine.createGain(0.005); // Larger modulation for pitch effect
    
    // Connect pitch shift LFO
    this.pitchShiftLFO.connect(this.pitchShiftLFOGain);
    this.pitchShiftLFOGain.connect(this.pitchShiftDelay.delayTime);
    
    // Connect pitch shift audio path
    this.inputGain.connect(this.pitchShiftDelay);
    this.pitchShiftDelay.connect(this.pitchShiftGain);
    this.pitchShiftGain.connect(this.decayGain);
    
    // Start LFO
    this.pitchShiftLFO.start();
    
    // Connect to wet path
    this.connectWetPath(this.decayGain);
    
    // Set initial mix to 40% (typical for shimmer)
    this.setMix(0.4);
  }

  public setParameter(name: string, value: number): void {
    const now = this.engine.getCurrentTime();
    
    switch (name) {
      case 'decay':
      case 'time': {
        this.decay = Math.max(0, Math.min(1, value));
        // Adjust gains for each tap
        this.gains.forEach((gain, i) => {
          const amplitude = this.decay * (0.4 - i * 0.03);
          gain.gain.linearRampToValueAtTime(amplitude, now + 0.01);
        });
        break;
      }
        
      case 'shimmer':
      case 'amount': {
        this.shimmer = Math.max(0, Math.min(1, value));
        // Adjust pitch-shifted signal amount
        const shimmerAmount = this.shimmer * 0.8;
        this.pitchShiftGain.gain.linearRampToValueAtTime(shimmerAmount, now + 0.01);
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
      case 'shimmer':
      case 'amount':
        return this.shimmer;
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
      {
        name: 'shimmer',
        min: 0,
        max: 1,
        default: 0.5,
        unit: 'ratio',
        type: 'continuous',
      },
    ];
  }

  public disconnect(): void {
    // Stop LFO
    try {
      this.pitchShiftLFO.stop();
    } catch (e) {
      // Already stopped
    }
    super.disconnect();
  }
}
