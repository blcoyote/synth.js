/**
 * LowshelfFilter - Low-shelf filter
 * 
 * Boosts or cuts all frequencies below the corner frequency.
 * Flat response above the frequency.
 * 
 * Classic use: Bass boost/cut, warming up sounds,
 * removing low-end, tonal balance adjustments
 * 
 * Parameters:
 * - frequency: Corner frequency where shelf begins
 * - gain: Amount of boost (+) or cut (-) in dB
 */

import { BaseFilter } from './BaseFilter';

export class LowshelfFilter extends BaseFilter {
  constructor(frequency: number = 200, gainDb: number = 0) {
    super('Lowshelf Filter', 'lowshelf', frequency);
    this.setParameter('gain', gainDb);
  }
}
