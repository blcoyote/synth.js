/**
 * BandpassFilter - Band-pass filter
 * 
 * Allows frequencies within a band (around the center frequency) to pass,
 * attenuates frequencies outside this band.
 * 
 * Classic use: Telephone/radio effects, vocal formants,
 * isolating specific frequency ranges, wah-wah effects
 * 
 * The Q parameter controls the width of the band:
 * - Low Q = wide band
 * - High Q = narrow band
 */

import { BaseFilter } from './BaseFilter';

export class BandpassFilter extends BaseFilter {
  constructor(centerFrequency: number = 1000) {
    super('Bandpass Filter', 'bandpass', centerFrequency);
    // Default to moderate Q for bandpass
    this.setParameter('resonance', 5);
  }
}
