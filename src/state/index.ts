/**
 * Modular State Management
 * 
 * Organized state modules for the synthesizer application.
 * Each module groups related functionality for better maintainability.
 */

// Audio routing and effects
export { audioState } from './audioState';

// Visualization and analysers
export { visualizationState } from './visualizationState';

// Modulation sources (LFO, sequencer, arpeggiator)
export { modulationState } from './modulationState';

// Voice and oscillator management
export { voiceState } from './voiceState';
export type { Voice, OscillatorConfig } from './voiceState';

// Initialization flag
let _initialized = false;

export function isInitialized(): boolean {
  return _initialized;
}

export function setInitialized(value: boolean): void {
  _initialized = value;
}
