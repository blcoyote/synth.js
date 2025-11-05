/**
 * SineOscillator - Pure sine wave oscillator
 * 
 * Generates a pure sine wave tone with no harmonics.
 * Ideal for:
 * - Sub bass
 * - Test tones
 * - Modulation sources (LFO)
 * - Pure tonal content
 */

import { BaseOscillator } from './BaseOscillator';

export class SineOscillator extends BaseOscillator {
  constructor(frequency: number = 440) {
    super('Sine Oscillator', 'sine', frequency);
  }
}
