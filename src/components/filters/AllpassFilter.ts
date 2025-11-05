/**
 * AllpassFilter - All-pass filter
 * 
 * Passes all frequencies equally (no amplitude change),
 * but changes the phase relationship between frequencies.
 * 
 * Classic use: Phaser effects, creating complex phase relationships,
 * building reverbs, subtle stereo widening
 * 
 * Not typically used alone but combined with other signals
 * to create phasing and comb filtering effects.
 */

import { BaseFilter } from './BaseFilter';

export class AllpassFilter extends BaseFilter {
  constructor(frequency: number = 1000) {
    super('Allpass Filter', 'allpass', frequency);
  }
}
