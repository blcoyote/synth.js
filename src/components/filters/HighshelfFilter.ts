/**
 * HighshelfFilter - High-shelf filter
 * 
 * Boosts or cuts all frequencies above the corner frequency.
 * Flat response below the frequency.
 * 
 * Classic use: Treble boost/cut, brightening sounds,
 * de-essing, air/presence control
 * 
 * Parameters:
 * - frequency: Corner frequency where shelf begins
 * - gain: Amount of boost (+) or cut (-) in dB
 */

import { BaseFilter } from './BaseFilter';

export class HighshelfFilter extends BaseFilter {
  constructor(frequency: number = 3000, gainDb: number = 0) {
    super('Highshelf Filter', 'highshelf', frequency);
    this.setParameter('gain', gainDb);
  }
}
