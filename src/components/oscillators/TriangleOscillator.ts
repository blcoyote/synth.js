/**
 * TriangleOscillator - Triangle wave oscillator
 * 
 * Generates a triangle wave with odd harmonics (softer than square).
 * Ideal for:
 * - Soft flute-like tones
 * - Mellow bass
 * - Subtle leads
 * - Warm pad sounds
 */

import { BaseOscillator } from './BaseOscillator';

export class TriangleOscillator extends BaseOscillator {
  constructor(frequency: number = 440) {
    super('Triangle Oscillator', 'triangle', frequency);
  }
}
