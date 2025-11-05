/**
 * SquareOscillator - Square wave oscillator
 * 
 * Generates a square wave with odd harmonics only.
 * Ideal for:
 * - Hollow, woody tones
 * - Clarinet-like sounds
 * - Retro game music
 * - Electronic leads
 */

import { BaseOscillator } from './BaseOscillator';

export class SquareOscillator extends BaseOscillator {
  constructor(frequency: number = 440) {
    super('Square Oscillator', 'square', frequency);
  }
}
