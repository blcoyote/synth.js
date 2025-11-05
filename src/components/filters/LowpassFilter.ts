/**
 * LowpassFilter - Low-pass filter
 * 
 * Allows frequencies below the cutoff to pass through,
 * attenuates frequencies above the cutoff.
 * 
 * Classic use: Removing high frequencies, warm bass sounds,
 * simulating analog warmth, creating darker tones
 * 
 * Slope: 12dB/octave (2-pole filter)
 */

import { BaseFilter } from './BaseFilter';

export class LowpassFilter extends BaseFilter {
  constructor(cutoffFrequency: number = 1000) {
    super('Lowpass Filter', 'lowpass', cutoffFrequency);
  }
}
