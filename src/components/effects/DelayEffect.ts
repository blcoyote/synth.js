/**
 * DelayEffect - Digital delay/echo effect with presets
 *
 * Creates rhythmic echoes by delaying the input signal.
 * Supports feedback for multiple repeats.
 *
 * Presets:
 * - Slapback: Quick 100ms echo (classic rockabilly)
 * - Short: 250ms clean digital delay
 * - Medium: 375ms balanced echo (eighth note at 120 BPM)
 * - Long: 750ms spacious delay (quarter note at 120 BPM)
 * - Tape: 400ms warm tape echo with moderate feedback
 * - Analog: 500ms vintage analog delay with high feedback
 * - Ping-Pong: 300ms stereo bouncing delay
 * - Dotted: 562ms dotted eighth note delay
 * - Ambient: 1000ms ethereal long delay with high feedback
 *
 * Parameters:
 * - preset: Delay style preset
 * - mix: Wet/dry balance
 */

import { BaseEffect } from './BaseEffect';
import type { ParameterDescriptor } from '../../core/types';

export type DelayPreset =
  | 'slapback'
  | 'short'
  | 'medium'
  | 'long'
  | 'tape'
  | 'analog'
  | 'pingpong'
  | 'dotted'
  | 'ambient';

interface DelayPresetConfig {
  delayTime: number;
  feedback: number;
  name: string;
  description: string;
}

export class DelayEffect extends BaseEffect {
  private delayNode: DelayNode;
  private feedbackGain: GainNode;

  private delayTime: number = 0.375;
  private feedback: number = 0.3;
  private currentPreset: DelayPreset = 'medium';

  private readonly presets: Record<DelayPreset, DelayPresetConfig> = {
    slapback: {
      delayTime: 0.1,
      feedback: 0.2,
      name: 'Slapback',
      description: 'Quick 100ms echo (classic rockabilly)',
    },
    short: {
      delayTime: 0.25,
      feedback: 0.25,
      name: 'Short Delay',
      description: 'Clean 250ms digital delay',
    },
    medium: {
      delayTime: 0.375,
      feedback: 0.3,
      name: 'Medium Delay',
      description: '375ms balanced echo (eighth note at 120 BPM)',
    },
    long: {
      delayTime: 0.75,
      feedback: 0.35,
      name: 'Long Delay',
      description: '750ms spacious delay (quarter note at 120 BPM)',
    },
    tape: {
      delayTime: 0.4,
      feedback: 0.45,
      name: 'Tape Echo',
      description: '400ms warm tape echo',
    },
    analog: {
      delayTime: 0.5,
      feedback: 0.55,
      name: 'Analog Delay',
      description: '500ms vintage analog delay',
    },
    pingpong: {
      delayTime: 0.3,
      feedback: 0.4,
      name: 'Ping-Pong',
      description: '300ms stereo bouncing delay',
    },
    dotted: {
      delayTime: 0.5625,
      feedback: 0.35,
      name: 'Dotted Eighth',
      description: '562ms dotted eighth note (120 BPM)',
    },
    ambient: {
      delayTime: 1.0,
      feedback: 0.6,
      name: 'Ambient',
      description: '1000ms ethereal long delay',
    },
  };

  constructor(preset: DelayPreset = 'medium') {
    super('Delay Effect', 'delay');

    this.currentPreset = preset;
    const presetConfig = this.presets[preset];
    this.delayTime = presetConfig.delayTime;
    this.feedback = presetConfig.feedback;

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

  /**
   * Load a delay preset
   */
  public loadPreset(preset: DelayPreset): void {
    if (!this.presets[preset]) {
      console.warn(`Unknown delay preset: ${preset}`);
      return;
    }

    this.currentPreset = preset;
    const config = this.presets[preset];

    this.setParameter('delayTime', config.delayTime);
    this.setParameter('feedback', config.feedback);
  }

  /**
   * Get the current preset name
   */
  public getCurrentPreset(): DelayPreset {
    return this.currentPreset;
  }

  /**
   * Get all available presets
   */
  public getPresets(): Record<DelayPreset, DelayPresetConfig> {
    return { ...this.presets };
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
