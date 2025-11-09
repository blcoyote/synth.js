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

export type LFOWaveform = 'sine' | 'square' | 'triangle' | 'sawtooth' | 'random';

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
  
  // Precise timing for random LFO
  private nextRandomTime: number = 0;
  private scheduleAheadTime: number = 0.1; // Look ahead 100ms
  private scheduleInterval: number = 25; // Check every 25ms

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
      clearTimeout(this.randomInterval); // Changed from clearInterval
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
   * Start random (sample & hold) LFO with precise timing
   */
  private startRandomLFO(): void {
    // Initialize timing using AudioContext clock
    this.nextRandomTime = this.engine.getCurrentTime();
    this.scheduleRandomUpdates();
  }

  /**
   * Schedule random updates using look-ahead approach
   */
  private scheduleRandomUpdates(): void {
    if (!this.enabled || this.waveform !== 'random') return;

    const currentTime = this.engine.getCurrentTime();
    const updateInterval = 1.0 / this.frequency; // Convert Hz to seconds

    // Schedule all updates that fall within the look-ahead window
    while (this.nextRandomTime < currentTime + this.scheduleAheadTime) {
      this.scheduleRandomUpdate(this.nextRandomTime);
      this.nextRandomTime += updateInterval;
    }

    // Continue scheduling with regular checks
    this.randomInterval = window.setTimeout(() => {
      this.scheduleRandomUpdates();
    }, this.scheduleInterval);
  }

  /**
   * Schedule a single random update at precise time
   */
  private scheduleRandomUpdate(time: number): void {
    const updateInterval = 1.0 / this.frequency; // Transition time
    
    // Generate independent random values for each target
    this.targets.forEach((target, name) => {
      const randomValue = (Math.random() * 2 - 1) * target.depth; // -depth to +depth
      const newValue = target.baseline + randomValue;
      
      // Schedule smooth transition to new random value at exact time
      target.param.setValueAtTime(target.param.value, time);
      target.param.linearRampToValueAtTime(newValue, time + updateInterval / 2);
      this.randomValues.set(name, newValue);
    });
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
