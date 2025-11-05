/**
 * HighpassFilter - High-pass filter
 * 
 * Allows frequencies above the cutoff to pass through,
 * attenuates frequencies below the cutoff.
 * 
 * Classic use: Removing low frequencies, reducing rumble,
 * creating thin/bright sounds, removing muddiness
 * 
 * Slope: 12dB/octave (2-pole filter)
 */

import { BaseFilter } from './BaseFilter';

export class HighpassFilter extends BaseFilter {
  constructor(cutoffFrequency: number = 1000) {
    super('Highpass Filter', 'highpass', cutoffFrequency);
  }
}
