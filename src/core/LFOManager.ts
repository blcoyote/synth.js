/**
 * LFOManager - Manages LFO for V2 synth
 *
 * Responsibilities:
 * - Create and manage MultiTargetLFO instance
 * - Route LFO to multiple targets (pitch, filter, effects)
 * - Handle target enable/disable
 * - Update LFO parameters (rate, waveform, depth)
 *
 * @remarks
 * Uses dependency injection - receives references to what it needs to modulate
 */

import { MultiTargetLFO, type LFOWaveform } from '../components/modulation/MultiTargetLFO';

export interface LFOTargetConfig {
  enabled: boolean;
  depth: number;
  baseline?: number;
}

export type LFOMode = 'free' | 'trigger';

export class LFOManager {
  private lfo: MultiTargetLFO;
  private targets: Map<string, LFOTargetConfig> = new Map();
  private enabled: boolean = false;
  private mode: LFOMode = 'free';

  // Amplitude envelope parameters
  private envelopeAttack: number = 0;
  private envelopeDecay: number = 0;
  private envelopeSustain: number = 1;
  private envelopeRelease: number = 0;

  constructor() {
    // Create LFO with default settings
    this.lfo = new MultiTargetLFO({
      frequency: 5.0, // 5 Hz default
      waveform: 'sine',
    });
  }

  /**
   * Enable/disable the LFO
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) {
      this.lfo.start();
    } else {
      this.lfo.stop();
    }
  }

  /**
   * Check if LFO is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set LFO rate (frequency in Hz)
   */
  setRate(rate: number): void {
    this.lfo.setFrequency(rate);
  }

  /**
   * Set LFO waveform
   */
  setWaveform(waveform: LFOWaveform): void {
    const wasEnabled = this.enabled;
    if (wasEnabled) {
      this.lfo.stop();
    }
    this.lfo.setWaveform(waveform);
    if (wasEnabled) {
      this.lfo.start();
    }
  }

  /**
   * Add a modulation target
   */
  addTarget(name: string, param: AudioParam, depth: number, baseline?: number): void {
    this.targets.set(name, {
      enabled: true,
      depth,
      baseline,
    });

    this.lfo.addTarget(name, param, depth, baseline);
  }

  /**
   * Remove a modulation target
   */
  removeTarget(name: string): void {
    this.lfo.removeTarget(name);
    this.targets.delete(name);
  }

  /**
   * Enable/disable a specific target
   * Note: Due to architecture, removing/re-adding requires the caller to provide the AudioParam
   */
  setTargetEnabled(name: string, enabled: boolean): void {
    const target = this.targets.get(name);
    if (!target) return;

    target.enabled = enabled;

    if (!enabled) {
      this.lfo.removeTarget(name);
    }
    // To re-enable, caller must use addTarget() with the AudioParam reference
  }

  /**
   * Set depth for a specific target
   */
  setTargetDepth(name: string, depth: number): void {
    const target = this.targets.get(name);
    if (target) {
      target.depth = depth;
      this.lfo.setTargetDepth(name, depth);
    }
  }

  /**
   * Update baseline for a target (center value to oscillate around)
   */
  setTargetBaseline(name: string, baseline: number): void {
    const target = this.targets.get(name);
    if (target) {
      target.baseline = baseline;
      this.lfo.setTargetBaseline(name, baseline);
    }
  }

  /**
   * Get all active target names
   */
  getTargets(): string[] {
    return this.lfo.getTargets();
  }

  /**
   * Check if target exists
   */
  hasTarget(name: string): boolean {
    return this.lfo.hasTarget(name);
  }

  /**
   * Get target configuration
   */
  getTargetConfig(name: string): LFOTargetConfig | undefined {
    return this.targets.get(name);
  }

  /**
   * Clear all targets
   */
  clearTargets(): void {
    this.getTargets().forEach((name) => {
      this.removeTarget(name);
    });
    this.targets.clear();
  }

  /**
   * Get the underlying LFO instance
   */
  getLFO(): MultiTargetLFO {
    return this.lfo;
  }

  /**
   * Set LFO mode (free-running or trigger)
   * In trigger mode the LFO phase resets on every note-on.
   */
  setMode(mode: LFOMode): void {
    this.mode = mode;
  }

  /**
   * Get current LFO mode
   */
  getMode(): LFOMode {
    return this.mode;
  }

  /**
   * Set attack time for the LFO amplitude envelope (seconds)
   */
  setEnvelopeAttack(attack: number): void {
    this.envelopeAttack = attack;
    this.lfo.setEnvelopeParams(this.envelopeAttack, this.envelopeDecay, this.envelopeSustain, this.envelopeRelease);
  }

  /**
   * Set decay time for the LFO amplitude envelope (seconds)
   */
  setEnvelopeDecay(decay: number): void {
    this.envelopeDecay = decay;
    this.lfo.setEnvelopeParams(this.envelopeAttack, this.envelopeDecay, this.envelopeSustain, this.envelopeRelease);
  }

  /**
   * Set sustain level for the LFO amplitude envelope (0–1)
   */
  setEnvelopeSustain(sustain: number): void {
    this.envelopeSustain = sustain;
    this.lfo.setEnvelopeParams(this.envelopeAttack, this.envelopeDecay, this.envelopeSustain, this.envelopeRelease);
  }

  /**
   * Set release time for the LFO amplitude envelope (seconds)
   */
  setEnvelopeRelease(release: number): void {
    this.envelopeRelease = release;
    this.lfo.setEnvelopeParams(this.envelopeAttack, this.envelopeDecay, this.envelopeSustain, this.envelopeRelease);
  }

  /**
   * Trigger LFO amplitude envelope release phase.
   * Call on note-off when mode is 'trigger'.
   */
  triggerRelease(): void {
    if (this.mode === 'trigger' && this.enabled) {
      this.lfo.releaseAmplitudeEnvelope();
    }
  }

  /**
   * Retrigger the LFO (reset phase to 0).
   * Only has an effect when mode is 'trigger' and the LFO is enabled.
   * Called by VoiceManager on each note-on event.
   */
  retrigger(): void {
    if (this.mode === 'trigger' && this.enabled) {
      this.lfo.retrigger();
      this.lfo.triggerAmplitudeEnvelope();
    }
  }
}
