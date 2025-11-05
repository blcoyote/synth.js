/**
 * ChorusEffect - Chorus/doubling effect
 * 
 * Creates a thickening effect by mixing slightly detuned and
 * delayed copies of the signal. Uses LFO modulation.
 * 
 * Classic use: Thickening sounds, stereo width, 80s synth pads,
 * guitar chorus, vocal doubling
 * 
 * Parameters:
 * - rate: LFO speed (0.1-10 Hz)
 * - depth: Modulation amount (0-1)
 * - mix: Wet/dry balance
 */

import { BaseEffect } from './BaseEffect';
import type { ParameterDescriptor } from '../../core/types';

export class ChorusEffect extends BaseEffect {
  private delayNode: DelayNode;
  private lfo: OscillatorNode;
  private lfoGain: GainNode;
  
  private rate: number = 1.5; // Hz
  private depth: number = 0.5;

  constructor(rate: number = 1.5, depth: number = 0.5) {
    super('Chorus Effect', 'chorus');
    
    this.rate = rate;
    this.depth = depth;
    
    // Create delay for chorus effect (centered around 20ms)
    this.delayNode = this.engine.createDelay(0.1);
    this.delayNode.delayTime.value = 0.02; // Base delay 20ms
    
    // Create LFO to modulate delay time
    this.lfo = this.engine.createOscillator('sine', this.rate);
    this.lfoGain = this.engine.createGain(this.depth * 0.008); // Max ±8ms modulation
    
    // Connect LFO to modulate delay time
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.delayNode.delayTime);
    
    // Connect audio path
    this.inputGain.connect(this.delayNode);
    this.connectWetPath(this.delayNode);
    
    // Start LFO
    this.lfo.start();
    
    // Set initial mix to 50% (typical for chorus)
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
        // Scale depth to delay time modulation (0-8ms)
        const modAmount = this.depth * 0.008;
        this.lfoGain.gain.linearRampToValueAtTime(modAmount, now + 0.01);
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
        default: 1.5,
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
    ];
  }
}
