/**
 * BaseEffect - Abstract base class for all audio effects
 * 
 * Provides common functionality for effect components including:
 * - Wet/dry mix control
 * - Bypass functionality
 * - Input/output gain
 * - Enable/disable functionality
 * - Connection management
 */

import type { AudioEffect, ParameterDescriptor } from '../../core/types';
import { AudioEngine } from '../../core/AudioEngine';

export abstract class BaseEffect implements AudioEffect {
  protected engine: AudioEngine;
  protected inputGain: GainNode;
  protected outputGain: GainNode;
  protected wetGain: GainNode;
  protected dryGain: GainNode;
  protected enabled: boolean = true;
  protected bypassed: boolean = false;
  protected name: string;
  protected effectType: string;
  
  // Current parameter values
  protected mix: number = 0.5; // 0 = dry, 1 = wet

  constructor(name: string, type: string) {
    this.engine = AudioEngine.getInstance();
    this.name = name;
    this.effectType = type;
    
    // Create nodes for wet/dry mixing
    this.inputGain = this.engine.createGain(1.0);
    this.dryGain = this.engine.createGain(1.0 - this.mix);
    this.wetGain = this.engine.createGain(this.mix);
    this.outputGain = this.engine.createGain(1.0);
    
    // Connect dry path: input -> dry gain -> output
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);
  }

  /**
   * Connect the wet signal path
   * Must be called by subclasses after creating their effect nodes
   */
  protected connectWetPath(effectOutput: AudioNode): void {
    // Wet path: input -> [effect processing] -> wet gain -> output
    effectOutput.connect(this.wetGain);
    this.wetGain.connect(this.outputGain);
  }

  /**
   * Set wet/dry mix (0 = fully dry, 1 = fully wet)
   */
  public setMix(value: number): void {
    this.mix = Math.max(0, Math.min(1, value));
    const now = this.engine.getCurrentTime();
    
    // Linear mix - more obvious effect
    // Dry signal fades out as mix increases
    const dryGain = 1 - this.mix;
    // Wet signal fades in as mix increases
    const wetGain = this.mix;
    
    this.dryGain.gain.linearRampToValueAtTime(dryGain, now + 0.01);
    this.wetGain.gain.linearRampToValueAtTime(wetGain, now + 0.01);
  }

  public getMix(): number {
    return this.mix;
  }

  /**
   * Bypass the effect (passes signal through unchanged)
   */
  public bypass(shouldBypass: boolean): void {
    this.bypassed = shouldBypass;
    
    if (shouldBypass) {
      // Full dry signal
      this.setMix(0);
    } else {
      // Restore mix level
      this.setMix(this.mix);
    }
  }

  public isBypassed(): boolean {
    return this.bypassed;
  }

  // AudioComponent interface implementation

  public connect(destination: AudioNode | AudioEffect): void {
    if ('getInputNode' in destination) {
      this.outputGain.connect(destination.getInputNode());
    } else {
      this.outputGain.connect(destination);
    }
  }

  public disconnect(): void {
    this.outputGain.disconnect();
  }

  public abstract setParameter(name: string, value: number): void;
  public abstract getParameter(name: string): number;

  public enable(): void {
    this.enabled = true;
    this.outputGain.gain.value = 1.0;
  }

  public disable(): void {
    this.enabled = false;
    this.outputGain.gain.value = 0;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getName(): string {
    return this.name;
  }

  public getType(): string {
    return `Effect-${this.effectType}`;
  }

  public abstract getParameters(): ParameterDescriptor[];

  public getInputNode(): AudioNode {
    return this.inputGain;
  }

  public getOutputNode(): AudioNode {
    return this.outputGain;
  }

  /**
   * Get common parameters that all effects have
   */
  protected getCommonParameters(): ParameterDescriptor[] {
    return [
      {
        name: 'mix',
        min: 0,
        max: 1,
        default: 0.5,
        unit: 'ratio',
        type: 'continuous',
      },
    ];
  }
}
