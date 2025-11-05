/**
 * SawtoothOscillator - Sawtooth wave oscillator
 * 
 * Generates a sawtooth wave with all harmonics (odd and even).
 * Ideal for:
 * - Bright, buzzy leads
 * - Bass sounds
 * - String-like tones
 * - Classic analog synth sounds
 */

import { BaseOscillator } from './BaseOscillator';

export class SawtoothOscillator extends BaseOscillator {
  constructor(frequency: number = 440) {
    super('Sawtooth Oscillator', 'sawtooth', frequency);
  }
}
