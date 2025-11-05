/**
 * NotchFilter - Notch filter (band-stop/band-reject)
 * 
 * Attenuates frequencies within a narrow band around the center frequency,
 * allows all other frequencies to pass.
 * 
 * Classic use: Removing specific frequency (60Hz hum, feedback),
 * creating phaser-like effects, removing resonances
 * 
 * The Q parameter controls the width of the notch:
 * - Low Q = wide notch
 * - High Q = narrow notch
 */

import { BaseFilter } from './BaseFilter';

export class NotchFilter extends BaseFilter {
  constructor(centerFrequency: number = 1000) {
    super('Notch Filter', 'notch', centerFrequency);
    // Default to narrow Q for notch
    this.setParameter('resonance', 10);
  }
}
