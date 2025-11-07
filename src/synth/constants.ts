/**
 * Synthesizer Constants
 *
 * Centralized constants for default values, ranges, and magic numbers
 * used throughout the synthesizer application.
 */

// =============================================================================
// AUDIO PARAMETERS
// =============================================================================

/**
 * Default oscillator volume (0-1)
 * Used for initial voice settings
 */
export const DEFAULT_OSCILLATOR_VOLUME = 0.7;

/**
 * Default envelope sustain level (0-1)
 * 70% sustain provides good balance between punch and sustainability
 */
export const DEFAULT_ENVELOPE_SUSTAIN = 0.7;

/**
 * Default envelope release time in seconds
 * 300ms provides natural-sounding decay
 */
export const DEFAULT_ENVELOPE_RELEASE = 0.3;

// =============================================================================
// FILTER PARAMETERS
// =============================================================================

/**
 * Default filter cutoff frequency in Hz
 * 2000 Hz is a good starting point for lowpass filtering
 */
export const DEFAULT_FILTER_CUTOFF = 2000;

/**
 * Maximum filter modulation depth in Hz
 * Used for LFO and envelope modulation of filter cutoff
 */
export const MAX_FILTER_MODULATION_DEPTH = 2000;

// =============================================================================
// LFO (Low Frequency Oscillator) PARAMETERS
// =============================================================================

/**
 * Maximum tremolo (volume LFO) depth (0-1)
 * 30% modulation prevents excessive volume swings
 */
export const MAX_TREMOLO_DEPTH = 0.3;

/**
 * LFO pitch modulation depth in cents per 100% depth
 * 50 cents = half a semitone modulation at full depth
 */
export const LFO_PITCH_MODULATION_CENTS = 50;

// =============================================================================
// EFFECTS PARAMETERS
// =============================================================================

/**
 * Default effect wet/dry mix ratio (0-1)
 * 70% wet signal creates obvious but not overwhelming effects
 */
export const DEFAULT_EFFECT_MIX = 0.7;

/**
 * Default delay time in seconds
 * 300ms (0.3s) provides clear rhythmic delays
 */
export const DEFAULT_DELAY_TIME = 0.3;

/**
 * Default delay feedback amount (0-1)
 * 50% feedback creates several audible repeats
 */
export const DEFAULT_DELAY_FEEDBACK = 0.5;

/**
 * Default reverb decay ratio (0-1)
 * 0.8 creates medium-length reverb tail
 */
export const DEFAULT_REVERB_DECAY = 0.8;

/**
 * Default chorus rate in Hz
 * 2.5 Hz creates noticeable but musical chorus effect
 */
export const DEFAULT_CHORUS_RATE = 2.5;

/**
 * Default chorus depth (0-1)
 * 70% depth creates rich, thick chorus sound
 */
export const DEFAULT_CHORUS_DEPTH = 0.7;

/**
 * Default shimmer amount (0-1)
 * 70% shimmer creates obvious ethereal effect
 */
export const DEFAULT_SHIMMER_AMOUNT = 0.7;

// =============================================================================
// UI CONVERSION CONSTANTS
// =============================================================================

/**
 * Milliseconds to seconds conversion factor
 * Used for ADSR time parameters (attack, decay, release)
 */
export const MS_TO_SECONDS = 1000;

/**
 * Percentage to decimal conversion factor
 * Used for sustain level and other percentage-based controls
 */
export const PERCENT_TO_DECIMAL = 100;

/**
 * LFO rate slider to Hz conversion factor
 * Slider value / 10 = Hz (range 0.1 to 20 Hz)
 */
export const LFO_RATE_SLIDER_FACTOR = 10;
