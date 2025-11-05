/**
 * DelayEffect - Digital delay/echo effect
 * 
 * Creates rhythmic echoes by delaying the input signal.
 * Supports feedback for multiple repeats.
 * 
 * Classic use: Slapback echo, ping-pong delay, rhythmic echoes,
 * ambient textures, doubling effects
 * 
 * Parameters:
 * - delayTime: Time between echoes (0-2 seconds)
 * - feedback: Amount of signal fed back (0-0.9)
 * - mix: Wet/dry balance
 */

import { BaseEffect } from './BaseEffect';
import type { ParameterDescriptor } from '../../core/types';

export class DelayEffect extends BaseEffect {
  private delayNode: DelayNode;
  private feedbackGain: GainNode;
  
  private delayTime: number = 0.375; // 375ms (eighth note at 120 BPM)
  private feedback: number = 0.3;

  constructor(delayTime: number = 0.375, feedback: number = 0.3) {
    super('Delay Effect', 'delay');
    
    this.delayTime = delayTime;
    this.feedback = Math.min(feedback, 0.9); // Ensure feedback never exceeds 0.9
    
    // Create delay nodes
    this.delayNode = this.engine.createDelay(2.0); // Max 2 seconds
    this.feedbackGain = this.engine.createGain(this.feedback);
    
    // Connect wet signal path: input -> delay -> wet gain
    this.inputGain.connect(this.delayNode);
    this.delayNode.connect(this.feedbackGain);
    
    // Feedback loop: delayed signal back to delay input
    this.feedbackGain.connect(this.delayNode);
    
    // Connect to wet gain
    this.connectWetPath(this.delayNode);
    
    // Set initial delay time
    this.delayNode.delayTime.value = this.delayTime;
  }

  public setParameter(name: string, value: number): void {
    const now = this.engine.getCurrentTime();
    
    switch (name) {
      case 'delayTime':
      case 'time':
        this.delayTime = Math.max(0, Math.min(2.0, value));
        this.delayNode.delayTime.linearRampToValueAtTime(this.delayTime, now + 0.01);
        break;
        
      case 'feedback':
        // Limit to 0.9 to prevent runaway feedback
        this.feedback = Math.max(0, Math.min(0.9, value));
        this.feedbackGain.gain.linearRampToValueAtTime(this.feedback, now + 0.01);
        break;
        
      case 'mix':
        this.setMix(value);
        break;
        
      default:
        console.warn(`Unknown parameter: ${name}`);
    }
  }

  public getParameter(name: string): number {
    switch (name) {
      case 'delayTime':
      case 'time':
        return this.delayTime;
      case 'feedback':
        return this.feedback;
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
        name: 'delayTime',
        min: 0,
        max: 2.0,
        default: 0.375,
        unit: 'seconds',
        type: 'continuous',
      },
      {
        name: 'feedback',
        min: 0,
        max: 0.9,
        default: 0.3,
        unit: 'ratio',
        type: 'continuous',
      },
    ];
  }

  /**
   * Set delay time from tempo (BPM) and note division
   */
  public setTempo(bpm: number, division: number = 4): void {
    // division: 1=whole, 2=half, 4=quarter, 8=eighth, 16=sixteenth
    const beatDuration = 60 / bpm;
    const delayTime = (beatDuration * 4) / division;
    this.setParameter('delayTime', delayTime);
  }
}
