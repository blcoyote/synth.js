/**
 * Lowpass12Filter - Low-pass filter with 12dB/octave slope
 * 
 * Allows frequencies below the cutoff to pass through,
 * attenuates frequencies above the cutoff with a gentle slope.
 * 
 * Classic use: Removing high frequencies, warm bass sounds,
 * simulating analog warmth, creating darker tones
 * 
 * Slope: 12dB/octave (2-pole filter, single biquad)
 */

import { BaseFilter } from './BaseFilter';

export class Lowpass12Filter extends BaseFilter {
  constructor(cutoffFrequency: number = 1000) {
    super('Lowpass 12dB', 'lowpass', cutoffFrequency);
  }
}

// Keep old name for backward compatibility
export class LowpassFilter extends Lowpass12Filter {}
