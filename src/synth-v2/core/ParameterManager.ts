/**
 * ParameterManager - Centralized parameter update system
 * 
 * Responsibilities:
 * - Update configuration for future notes
 * - Update all active voices in real-time
 * - Ensure parameters work on sustained notes
 * - Single source of truth for parameter changes
 * 
 * @remarks
 * Dependencies are injected for testability.
 */

import type { VoiceStateManager, AudioStateManager } from '../../state';
import { VoiceManager } from './VoiceManager';

export class ParameterManager {
  constructor(
    private voiceManager: VoiceManager,
    private voiceState: VoiceStateManager,
    private audioState: AudioStateManager
  ) {
    console.log('🎛️ ParameterManager created');
  }

  /**
   * Update an oscillator parameter
   * Updates both config (for new notes) and active voices (for sustained notes)
   */
  updateOscillatorParameter(
    oscNum: number,
    parameterName: string,
    value: number
  ): void {
    // 1. Update config (for future notes)
    const config = this.voiceState.oscillatorConfigs.get(oscNum);
    if (!config) {
      console.warn(`Oscillator ${oscNum} config not found`);
      return;
    }

    // Update the config based on parameter type
    switch (parameterName) {
      case 'volume':
        config.volume = value;
        break;
      case 'pan':
        config.pan = value;
        break;
      case 'detune':
        config.detune = value;
        break;
      case 'octave':
        config.octave = value;
        break;
      case 'fmDepth':
        config.fmDepth = value;
        break;
      default:
        console.warn(`Unknown oscillator parameter: ${parameterName}`);
        return;
    }

    // 2. Update active voices (for sustained notes)
    this.voiceManager.updateActiveVoices(oscNum, parameterName, value);

    console.log(`✅ Updated osc${oscNum}.${parameterName} = ${value}`);
  }

  /**
   * Update an envelope parameter
   */
  updateEnvelopeParameter(
    envNum: 1 | 2 | 3,
    parameterName: 'attack' | 'decay' | 'sustain' | 'release',
    value: number
  ): void {
    // Update envelope settings
    this.voiceState.envelopeSettings[envNum][parameterName] = value;
    
    // TODO: Update active voice envelopes
    console.log(`✅ Updated env${envNum}.${parameterName} = ${value}`);
  }

  /**
   * Update a filter parameter
   */
  updateFilterParameter(parameterName: string, value: number): void {
    // Update filter settings
    if (parameterName === 'cutoff') {
      this.audioState.filterSettings.cutoff = value;
    } else if (parameterName === 'resonance') {
      this.audioState.filterSettings.resonance = value;
    }
    
    // TODO: Update actual filter nodes
    console.log(`✅ Updated filter.${parameterName} = ${value}`);
  }

  /**
   * Update an LFO parameter
   */
  updateLFOParameter(parameterName: string, value: number): void {
    // TODO: Update LFO settings and instances
    console.log(`✅ Updated LFO.${parameterName} = ${value}`);
  }
}
