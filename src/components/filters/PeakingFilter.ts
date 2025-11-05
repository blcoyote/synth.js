/**
 * PeakingFilter - Peaking EQ filter
 * 
 * Boosts or cuts frequencies around the center frequency.
 * 
 * Classic use: EQ adjustments, emphasizing specific frequencies,
 * removing problem frequencies, tone shaping
 * 
 * Parameters:
 * - frequency: Center frequency of the peak/cut
 * - Q: Width of the affected band (higher = narrower)
 * - gain: Amount of boost (+) or cut (-) in dB
 */

import { BaseFilter } from './BaseFilter';

export class PeakingFilter extends BaseFilter {
  constructor(centerFrequency: number = 1000, gainDb: number = 0) {
    super('Peaking Filter', 'peaking', centerFrequency);
    this.setParameter('resonance', 1);
    this.setParameter('gain', gainDb);
  }
}
