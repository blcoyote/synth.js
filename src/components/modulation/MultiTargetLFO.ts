/**
 * MultiTargetLFO - Enhanced LFO that can modulate multiple parameters simultaneously
 * 
 * Supports routing a single LFO to multiple destinations with independent depth control:
 * - Oscillator pitch (vibrato)
 * - Oscillator volume (tremolo)
 * - Oscillator pan (auto-pan)
 * - Filter cutoff
 * - Effect parameters
 */

import { AudioEngine } from '../../core/AudioEngine';
import type { LFOWaveform } from './LFO';

export interface LFOTarget {
  param: AudioParam;
  depth: number;      // Modulation depth for this specific target
  baseline: number;   // Center value around which to modulate
}

export interface MultiTargetLFOConfig {
  frequency?: number;      // LFO rate in Hz (0.01-20 Hz)
  waveform?: LFOWaveform;
}

export class MultiTargetLFO {
  private engine: AudioEngine;
  private oscillator: OscillatorNode | null = null;
  private frequency: number;
  private waveform: LFOWaveform;
  private enabled: boolean = false;
  private targets: Map<string, LFOTarget> = new Map();
  private gainNodes: Map<string, GainNode> = new Map(); // One gain per target for independent depth
  private randomInterval: number | null = null;
  private randomValues: Map<string, number> = new Map(); // Store random values per target

  constructor(config: MultiTargetLFOConfig = {}) {
    this.engine = AudioEngine.getInstance();
    this.frequency = config.frequency ?? 5.0;  // 5 Hz default for vibrato
    this.waveform = config.waveform ?? 'sine';
  }

  /**
   * Add a modulation target
   */
  public addTarget(name: string, param: AudioParam, depth: number, baseline?: number): void {
    // Store baseline value (current value if not specified)
    const baselineValue = baseline ?? param.value;

    // Create dedicated gain node for this target's depth control
    const gainNode = this.engine.createGain(depth);
    this.gainNodes.set(name, gainNode);

    // Store target info
    this.targets.set(name, {
      param,
      depth,
      baseline: baselineValue,
    });

    // If LFO is already running, connect this new target
    if (this.enabled && this.oscillator) {
      this.oscillator.connect(gainNode);
      gainNode.connect(param);
    }
  }

  /**
   * Remove a modulation target
   */
  public removeTarget(name: string): void {
    const gainNode = this.gainNodes.get(name);
    if (gainNode) {
      gainNode.disconnect();
      this.gainNodes.delete(name);
    }

    const target = this.targets.get(name);
    if (target) {
      // Reset parameter to baseline
      const now = this.engine.getCurrentTime();
      target.param.cancelScheduledValues(now);
      target.param.setValueAtTime(target.baseline, now);
      this.targets.delete(name);
    }

    this.randomValues.delete(name);
  }

  /**
   * Update depth for a specific target
   */
  public setTargetDepth(name: string, depth: number): void {
    const target = this.targets.get(name);
    const gainNode = this.gainNodes.get(name);
    
    if (target && gainNode) {
      target.depth = depth;
      const now = this.engine.getCurrentTime();
      gainNode.gain.linearRampToValueAtTime(depth, now + 0.01);
    }
  }

  /**
   * Update baseline value for a specific target
   */
  public setTargetBaseline(name: string, baseline: number): void {
    const target = this.targets.get(name);
    if (target) {
      target.baseline = baseline;
      // The LFO will now oscillate around this new baseline
    }
  }

  /**
   * Get current targets
   */
  public getTargets(): string[] {
    return Array.from(this.targets.keys());
  }

  /**
   * Check if a target exists
   */
  public hasTarget(name: string): boolean {
    return this.targets.has(name);
  }

  /**
   * Start the LFO (modulates all targets)
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

    // Reset all target parameters to their baselines
    const now = this.engine.getCurrentTime();
    this.targets.forEach((target) => {
      target.param.cancelScheduledValues(now);
      target.param.setValueAtTime(target.baseline, now);
    });

    this.enabled = false;
  }

  /**
   * Start standard oscillator-based LFO
   */
  private startOscillatorLFO(): void {
    this.oscillator = this.engine.createOscillator();
    this.oscillator.frequency.value = this.frequency;
    this.oscillator.type = this.waveform === 'random' ? 'sine' : this.waveform;

    // Connect oscillator to all target gain nodes
    this.gainNodes.forEach((gainNode, name) => {
      this.oscillator!.connect(gainNode);
      const target = this.targets.get(name);
      if (target) {
        gainNode.connect(target.param);
      }
    });

    this.oscillator.start();
  }

  /**
   * Start random (sample & hold) LFO
   */
  private startRandomLFO(): void {
    const updateRate = 1000 / this.frequency; // Convert Hz to ms

    this.randomInterval = window.setInterval(() => {
      const now = this.engine.getCurrentTime();
      
      // Generate independent random values for each target
      this.targets.forEach((target, name) => {
        const randomValue = (Math.random() * 2 - 1) * target.depth; // -depth to +depth
        const newValue = target.baseline + randomValue;
        
        // Smooth transition to new random value
        target.param.linearRampToValueAtTime(newValue, now + updateRate / 2000);
        this.randomValues.set(name, newValue);
      });
    }, updateRate);
  }

  /**
   * Set LFO frequency (rate)
   */
  public setFrequency(frequency: number): void {
    this.frequency = Math.max(0.01, Math.min(20, frequency));
    
    if (this.oscillator) {
      const now = this.engine.getCurrentTime();
      this.oscillator.frequency.linearRampToValueAtTime(this.frequency, now + 0.01);
    }
    
    if (this.randomInterval !== null) {
      // Restart random LFO with new rate
      const wasEnabled = this.enabled;
      this.stop();
      if (wasEnabled) this.start();
    }
  }

  /**
   * Set LFO waveform
   */
  public setWaveform(waveform: LFOWaveform): void {
    this.waveform = waveform;
    
    // Restart LFO if running
    if (this.enabled) {
      const wasEnabled = this.enabled;
      this.stop();
      if (wasEnabled) this.start();
    }
  }

  /**
   * Check if LFO is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get current frequency
   */
  public getFrequency(): number {
    return this.frequency;
  }

  /**
   * Get current waveform
   */
  public getWaveform(): LFOWaveform {
    return this.waveform;
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    this.stop();
    
    // Disconnect all gain nodes
    this.gainNodes.forEach(gainNode => {
      gainNode.disconnect();
    });
    
    this.gainNodes.clear();
    this.targets.clear();
    this.randomValues.clear();
  }
}
