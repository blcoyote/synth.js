/**
 * Factory Presets - Default presets for the synth
 * 
 * Collection of carefully crafted presets to get users started
 */

import type { PresetData } from './PresetManager';

export const FACTORY_PRESETS: PresetData[] = [
  {
    name: 'Init',
    author: 'Factory',
    description: 'Clean starting point - single sine wave',
    oscillators: {
      1: {
        enabled: true,
        waveform: 'sine',
        octave: 0,
        detune: 0,
        volume: 0.8,
        pan: 0,
        fmEnabled: false,
        fmDepth: 0,
      },
      2: {
        enabled: false,
        waveform: 'sine',
        octave: 0,
        detune: 0,
        volume: 0.5,
        pan: 0,
        fmEnabled: false,
        fmDepth: 0,
      },
      3: {
        enabled: false,
        waveform: 'sine',
        octave: 0,
        detune: 0,
        volume: 0.5,
        pan: 0,
        fmEnabled: false,
        fmDepth: 0,
      },
    },
    envelopes: {
      1: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
      2: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
      3: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
    },
  },

  {
    name: 'Bass',
    author: 'Factory',
    description: 'Deep sub bass with square wave',
    oscillators: {
      1: {
        enabled: true,
        waveform: 'square',
        octave: -1,
        detune: 0,
        volume: 0.9,
        pan: 0,
        fmEnabled: false,
        fmDepth: 0,
      },
      2: {
        enabled: true,
        waveform: 'sine',
        octave: -2,
        detune: 0,
        volume: 0.6,
        pan: 0,
        fmEnabled: false,
        fmDepth: 0,
      },
      3: {
        enabled: false,
        waveform: 'sine',
        octave: 0,
        detune: 0,
        volume: 0.5,
        pan: 0,
        fmEnabled: false,
        fmDepth: 0,
      },
    },
    envelopes: {
      1: { attack: 0.005, decay: 0.2, sustain: 0.5, release: 0.4 },
      2: { attack: 0.005, decay: 0.3, sustain: 0.6, release: 0.5 },
      3: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
    },
  },

  {
    name: 'Lead',
    author: 'Factory',
    description: 'Bright sawtooth lead with detuned oscillators',
    oscillators: {
      1: {
        enabled: true,
        waveform: 'sawtooth',
        octave: 0,
        detune: -10,
        volume: 0.7,
        pan: -0.3,
        fmEnabled: false,
        fmDepth: 0,
      },
      2: {
        enabled: true,
        waveform: 'sawtooth',
        octave: 0,
        detune: 10,
        volume: 0.7,
        pan: 0.3,
        fmEnabled: false,
        fmDepth: 0,
      },
      3: {
        enabled: true,
        waveform: 'square',
        octave: 1,
        detune: 0,
        volume: 0.3,
        pan: 0,
        fmEnabled: false,
        fmDepth: 0,
      },
    },
    envelopes: {
      1: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.2 },
      2: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.2 },
      3: { attack: 0.02, decay: 0.4, sustain: 0.5, release: 0.3 },
    },
  },

  {
    name: 'Pad',
    author: 'Factory',
    description: 'Warm, lush pad with slow attack',
    oscillators: {
      1: {
        enabled: true,
        waveform: 'sawtooth',
        octave: 0,
        detune: -8,
        volume: 0.5,
        pan: -0.4,
        fmEnabled: false,
        fmDepth: 0,
      },
      2: {
        enabled: true,
        waveform: 'sawtooth',
        octave: 0,
        detune: 8,
        volume: 0.5,
        pan: 0.4,
        fmEnabled: false,
        fmDepth: 0,
      },
      3: {
        enabled: true,
        waveform: 'triangle',
        octave: 1,
        detune: 0,
        volume: 0.3,
        pan: 0,
        fmEnabled: false,
        fmDepth: 0,
      },
    },
    envelopes: {
      1: { attack: 0.8, decay: 0.5, sustain: 0.7, release: 1.2 },
      2: { attack: 0.9, decay: 0.6, sustain: 0.7, release: 1.3 },
      3: { attack: 1.0, decay: 0.7, sustain: 0.6, release: 1.5 },
    },
  },

  {
    name: 'Pluck',
    author: 'Factory',
    description: 'Short, percussive pluck sound',
    oscillators: {
      1: {
        enabled: true,
        waveform: 'triangle',
        octave: 0,
        detune: 0,
        volume: 0.9,
        pan: 0,
        fmEnabled: false,
        fmDepth: 0,
      },
      2: {
        enabled: true,
        waveform: 'square',
        octave: 1,
        detune: 0,
        volume: 0.4,
        pan: 0,
        fmEnabled: false,
        fmDepth: 0,
      },
      3: {
        enabled: false,
        waveform: 'sine',
        octave: 0,
        detune: 0,
        volume: 0.5,
        pan: 0,
        fmEnabled: false,
        fmDepth: 0,
      },
    },
    envelopes: {
      1: { attack: 0.001, decay: 0.3, sustain: 0.0, release: 0.1 },
      2: { attack: 0.001, decay: 0.2, sustain: 0.0, release: 0.08 },
      3: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
    },
  },

  {
    name: 'FM Bell',
    author: 'Factory',
    description: 'Bright metallic bell using FM synthesis',
    oscillators: {
      1: {
        enabled: true,
        waveform: 'sine',
        octave: 0,
        detune: 0,
        volume: 0.8,
        pan: 0,
        fmEnabled: false,
        fmDepth: 0,
      },
      2: {
        enabled: true,
        waveform: 'sine',
        octave: 0,
        detune: 0,
        volume: 0.6,
        pan: 0,
        fmEnabled: true,
        fmDepth: 800,
      },
      3: {
        enabled: false,
        waveform: 'sine',
        octave: 0,
        detune: 0,
        volume: 0.5,
        pan: 0,
        fmEnabled: false,
        fmDepth: 0,
      },
    },
    envelopes: {
      1: { attack: 0.001, decay: 0.6, sustain: 0.3, release: 0.8 },
      2: { attack: 0.001, decay: 0.4, sustain: 0.2, release: 0.6 },
      3: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
    },
  },

  {
    name: 'FM Rhodes',
    author: 'Factory',
    description: 'Electric piano sound using FM',
    oscillators: {
      1: {
        enabled: true,
        waveform: 'sine',
        octave: 0,
        detune: 0,
        volume: 0.7,
        pan: 0,
        fmEnabled: false,
        fmDepth: 0,
      },
      2: {
        enabled: true,
        waveform: 'sine',
        octave: 1,
        detune: 0,
        volume: 0.5,
        pan: 0,
        fmEnabled: true,
        fmDepth: 400,
      },
      3: {
        enabled: true,
        waveform: 'sine',
        octave: 0,
        detune: 0,
        volume: 0.4,
        pan: 0,
        fmEnabled: true,
        fmDepth: 600,
      },
    },
    envelopes: {
      1: { attack: 0.005, decay: 0.5, sustain: 0.2, release: 0.6 },
      2: { attack: 0.005, decay: 0.4, sustain: 0.1, release: 0.5 },
      3: { attack: 0.005, decay: 0.3, sustain: 0.15, release: 0.4 },
    },
  },

  {
    name: 'Brass',
    author: 'Factory',
    description: 'Punchy brass section with FM',
    oscillators: {
      1: {
        enabled: true,
        waveform: 'sawtooth',
        octave: 0,
        detune: 0,
        volume: 0.7,
        pan: 0,
        fmEnabled: false,
        fmDepth: 0,
      },
      2: {
        enabled: true,
        waveform: 'sawtooth',
        octave: 0,
        detune: -5,
        volume: 0.6,
        pan: -0.3,
        fmEnabled: true,
        fmDepth: 300,
      },
      3: {
        enabled: true,
        waveform: 'square',
        octave: 0,
        detune: 5,
        volume: 0.4,
        pan: 0.3,
        fmEnabled: false,
        fmDepth: 0,
      },
    },
    envelopes: {
      1: { attack: 0.05, decay: 0.3, sustain: 0.7, release: 0.3 },
      2: { attack: 0.08, decay: 0.4, sustain: 0.6, release: 0.4 },
      3: { attack: 0.06, decay: 0.35, sustain: 0.65, release: 0.35 },
    },
  },
];

/**
 * Get a factory preset by name
 */
export function getFactoryPreset(name: string): PresetData | undefined {
  return FACTORY_PRESETS.find(p => p.name === name);
}

/**
 * Get all factory preset names
 */
export function getFactoryPresetNames(): string[] {
  return FACTORY_PRESETS.map(p => p.name);
}
