/**
 * ParameterManager Tests
 * 
 * Tests parameter updates for oscillators, envelopes, and filters
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParameterManager } from '../../../src/core/ParameterManager';
import type { VoiceManager } from '../../../src/core/VoiceManager';
import type { VoiceStateManager, AudioStateManager } from '../../../src/state';

// Mock VoiceManager
function createMockVoiceManager(): VoiceManager {
  return {
    updateActiveVoices: vi.fn(),
    playNote: vi.fn(),
    releaseNote: vi.fn(),
    stopAllNotes: vi.fn(),
    getActiveVoiceCount: vi.fn(() => 0),
  } as any;
}

// Mock VoiceStateManager
function createMockVoiceState(): VoiceStateManager {
  return {
    oscillatorConfigs: new Map([
      [1, {
        enabled: true,
        waveform: 'sine',
        octave: 0,
        detune: 0,
        volume: 0.8,
        pan: 0,
      }],
      [2, {
        enabled: false,
        waveform: 'sawtooth',
        octave: -1,
        detune: -7,
        volume: 0.6,
        pan: 0,
      }],
      [3, {
        enabled: false,
        waveform: 'square',
        octave: 1,
        detune: 7,
        volume: 0.5,
        pan: 0,
      }],
    ]),
    envelopeSettings: {
      1: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
      2: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
      3: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
    },
    activeVoices: new Map(),
    clearActiveVoices: vi.fn(),
    getVoice: vi.fn(),
    setVoice: vi.fn(),
    deleteVoice: vi.fn(),
    initializeOscillatorConfig: vi.fn(),
  } as any;
}

// Mock AudioStateManager
function createMockAudioState(): AudioStateManager {
  return {
    filterSettings: {
      type: 'lowpass12',
      cutoff: 2000,
      resonance: 1.0,
      enabled: false,
    },
    masterBus: null,
    setMasterBus: vi.fn(),
  } as any;
}

describe('ParameterManager', () => {
  let paramManager: ParameterManager;
  let mockVoiceManager: VoiceManager;
  let mockVoiceState: VoiceStateManager;
  let mockAudioState: AudioStateManager;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockVoiceManager = createMockVoiceManager();
    mockVoiceState = createMockVoiceState();
    mockAudioState = createMockAudioState();
    
    // Suppress console logs during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Create parameter manager with mocked dependencies
    paramManager = new ParameterManager(
      mockVoiceManager,
      mockVoiceState,
      mockAudioState
    );
  });

  describe('Constructor', () => {
    it('should create a parameter manager with injected dependencies', () => {
      expect(paramManager).toBeDefined();
    });
  });

  describe('updateOscillatorParameter', () => {
    it('should update oscillator volume in config', () => {
      const config = mockVoiceState.oscillatorConfigs.get(1)!;
      expect(config.volume).toBe(0.8);
      
      paramManager.updateOscillatorParameter(1, 'volume', 0.5);
      
      expect(config.volume).toBe(0.5);
    });

    it('should update oscillator pan in config', () => {
      const config = mockVoiceState.oscillatorConfigs.get(1)!;
      expect(config.pan).toBe(0);
      
      paramManager.updateOscillatorParameter(1, 'pan', 0.75);
      
      expect(config.pan).toBe(0.75);
    });

    it('should update oscillator detune in config', () => {
      const config = mockVoiceState.oscillatorConfigs.get(1)!;
      expect(config.detune).toBe(0);
      
      paramManager.updateOscillatorParameter(1, 'detune', 10);
      
      expect(config.detune).toBe(10);
    });

    it('should update oscillator octave in config', () => {
      const config = mockVoiceState.oscillatorConfigs.get(1)!;
      expect(config.octave).toBe(0);
      
      paramManager.updateOscillatorParameter(1, 'octave', 2);
      
      expect(config.octave).toBe(2);
    });

    it('should update oscillator fmDepth in config', () => {
      const config = mockVoiceState.oscillatorConfigs.get(1)!;
      
      paramManager.updateOscillatorParameter(1, 'fmDepth', 0.5);
      
      expect(config.fmDepth).toBe(0.5);
    });

    it('should call voiceManager to update active voices', () => {
      paramManager.updateOscillatorParameter(1, 'volume', 0.5);
      
      expect(mockVoiceManager.updateActiveVoices).toHaveBeenCalledWith(
        1,
        'volume',
        0.5
      );
    });

    it('should handle invalid oscillator number gracefully', () => {
      paramManager.updateOscillatorParameter(999, 'volume', 0.5);
      
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('config not found'));
      expect(mockVoiceManager.updateActiveVoices).not.toHaveBeenCalled();
    });

    it('should handle unknown parameter name gracefully', () => {
      paramManager.updateOscillatorParameter(1, 'invalidParam', 0.5);
      
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown oscillator parameter'));
      expect(mockVoiceManager.updateActiveVoices).not.toHaveBeenCalled();
    });

    it('should update multiple oscillators independently', () => {
      paramManager.updateOscillatorParameter(1, 'volume', 0.5);
      paramManager.updateOscillatorParameter(2, 'volume', 0.3);
      paramManager.updateOscillatorParameter(3, 'volume', 0.7);
      
      expect(mockVoiceState.oscillatorConfigs.get(1)!.volume).toBe(0.5);
      expect(mockVoiceState.oscillatorConfigs.get(2)!.volume).toBe(0.3);
      expect(mockVoiceState.oscillatorConfigs.get(3)!.volume).toBe(0.7);
    });

    it('should update config for future notes', () => {
      // Config is updated immediately
      const config = mockVoiceState.oscillatorConfigs.get(1)!;
      
      paramManager.updateOscillatorParameter(1, 'volume', 0.2);
      
      // New notes will use this config
      expect(config.volume).toBe(0.2);
    });

    it('should update active voices for sustained notes', () => {
      // Active voices are updated via voiceManager
      paramManager.updateOscillatorParameter(1, 'volume', 0.2);
      
      expect(mockVoiceManager.updateActiveVoices).toHaveBeenCalledWith(
        1,
        'volume',
        0.2
      );
    });
  });

  describe('updateEnvelopeParameter', () => {
    it('should update envelope attack', () => {
      paramManager.updateEnvelopeParameter(1, 'attack', 0.05);
      
      expect(mockVoiceState.envelopeSettings[1].attack).toBe(0.05);
    });

    it('should update envelope decay', () => {
      paramManager.updateEnvelopeParameter(2, 'decay', 0.2);
      
      expect(mockVoiceState.envelopeSettings[2].decay).toBe(0.2);
    });

    it('should update envelope sustain', () => {
      paramManager.updateEnvelopeParameter(3, 'sustain', 0.5);
      
      expect(mockVoiceState.envelopeSettings[3].sustain).toBe(0.5);
    });

    it('should update envelope release', () => {
      paramManager.updateEnvelopeParameter(1, 'release', 0.8);
      
      expect(mockVoiceState.envelopeSettings[1].release).toBe(0.8);
    });

    it('should handle all three envelope instances', () => {
      paramManager.updateEnvelopeParameter(1, 'attack', 0.01);
      paramManager.updateEnvelopeParameter(2, 'attack', 0.02);
      paramManager.updateEnvelopeParameter(3, 'attack', 0.03);
      
      expect(mockVoiceState.envelopeSettings[1].attack).toBe(0.01);
      expect(mockVoiceState.envelopeSettings[2].attack).toBe(0.02);
      expect(mockVoiceState.envelopeSettings[3].attack).toBe(0.03);
    });

    it('should update all ADSR parameters independently', () => {
      paramManager.updateEnvelopeParameter(1, 'attack', 0.02);
      paramManager.updateEnvelopeParameter(1, 'decay', 0.15);
      paramManager.updateEnvelopeParameter(1, 'sustain', 0.6);
      paramManager.updateEnvelopeParameter(1, 'release', 0.5);
      
      expect(mockVoiceState.envelopeSettings[1]).toEqual({
        attack: 0.02,
        decay: 0.15,
        sustain: 0.6,
        release: 0.5,
      });
    });
  });

  describe('updateFilterParameter', () => {
    it('should update filter cutoff', () => {
      paramManager.updateFilterParameter('cutoff', 5000);
      
      expect(mockAudioState.filterSettings.cutoff).toBe(5000);
    });

    it('should update filter resonance', () => {
      paramManager.updateFilterParameter('resonance', 5.0);
      
      expect(mockAudioState.filterSettings.resonance).toBe(5.0);
    });

    it('should handle unknown filter parameters gracefully', () => {
      const originalCutoff = mockAudioState.filterSettings.cutoff;
      
      paramManager.updateFilterParameter('unknownParam', 100);
      
      // Should not change anything
      expect(mockAudioState.filterSettings.cutoff).toBe(originalCutoff);
    });
  });

  describe('Integration - Real-time Parameter Updates', () => {
    it('should update both config and active voices atomically', () => {
      const config = mockVoiceState.oscillatorConfigs.get(1)!;
      
      paramManager.updateOscillatorParameter(1, 'volume', 0.3);
      
      // Config updated
      expect(config.volume).toBe(0.3);
      
      // Active voices updated
      expect(mockVoiceManager.updateActiveVoices).toHaveBeenCalledWith(
        1,
        'volume',
        0.3
      );
    });

    it('should handle rapid parameter changes', () => {
      // Simulate slider movement
      [0.1, 0.2, 0.3, 0.4, 0.5].forEach(value => {
        paramManager.updateOscillatorParameter(1, 'volume', value);
      });
      
      const config = mockVoiceState.oscillatorConfigs.get(1)!;
      expect(config.volume).toBe(0.5); // Final value
      
      expect(mockVoiceManager.updateActiveVoices).toHaveBeenCalledTimes(5);
    });

    it('should handle multiple parameter updates to same oscillator', () => {
      paramManager.updateOscillatorParameter(1, 'volume', 0.5);
      paramManager.updateOscillatorParameter(1, 'pan', 0.75);
      paramManager.updateOscillatorParameter(1, 'detune', 10);
      
      const config = mockVoiceState.oscillatorConfigs.get(1)!;
      expect(config.volume).toBe(0.5);
      expect(config.pan).toBe(0.75);
      expect(config.detune).toBe(10);
      
      expect(mockVoiceManager.updateActiveVoices).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary values for volume (0.0)', () => {
      paramManager.updateOscillatorParameter(1, 'volume', 0.0);
      
      expect(mockVoiceState.oscillatorConfigs.get(1)!.volume).toBe(0.0);
    });

    it('should handle boundary values for volume (1.0)', () => {
      paramManager.updateOscillatorParameter(1, 'volume', 1.0);
      
      expect(mockVoiceState.oscillatorConfigs.get(1)!.volume).toBe(1.0);
    });

    it('should handle negative pan values', () => {
      paramManager.updateOscillatorParameter(1, 'pan', -1.0);
      
      expect(mockVoiceState.oscillatorConfigs.get(1)!.pan).toBe(-1.0);
    });

    it('should handle positive pan values', () => {
      paramManager.updateOscillatorParameter(1, 'pan', 1.0);
      
      expect(mockVoiceState.oscillatorConfigs.get(1)!.pan).toBe(1.0);
    });

    it('should handle negative detune values', () => {
      paramManager.updateOscillatorParameter(1, 'detune', -100);
      
      expect(mockVoiceState.oscillatorConfigs.get(1)!.detune).toBe(-100);
    });

    it('should handle positive octave shifts', () => {
      paramManager.updateOscillatorParameter(1, 'octave', 2);
      
      expect(mockVoiceState.oscillatorConfigs.get(1)!.octave).toBe(2);
    });

    it('should handle negative octave shifts', () => {
      paramManager.updateOscillatorParameter(1, 'octave', -2);
      
      expect(mockVoiceState.oscillatorConfigs.get(1)!.octave).toBe(-2);
    });
  });

  describe('FM Synthesis Parameters', () => {
    describe('updateFMEnabled', () => {
      it('should enable FM modulation for oscillator 2', () => {
        const config = mockVoiceState.oscillatorConfigs.get(2)!;
        expect(config.fmEnabled).toBeFalsy();
        
        paramManager.updateFMEnabled(2, true);
        
        expect(config.fmEnabled).toBe(true);
      });

      it('should enable FM modulation for oscillator 3', () => {
        const config = mockVoiceState.oscillatorConfigs.get(3)!;
        expect(config.fmEnabled).toBeFalsy();
        
        paramManager.updateFMEnabled(3, true);
        
        expect(config.fmEnabled).toBe(true);
      });

      it('should disable FM modulation', () => {
        const config = mockVoiceState.oscillatorConfigs.get(2)!;
        config.fmEnabled = true;
        
        paramManager.updateFMEnabled(2, false);
        
        expect(config.fmEnabled).toBe(false);
      });

      it('should toggle FM state', () => {
        const config = mockVoiceState.oscillatorConfigs.get(2)!;
        
        paramManager.updateFMEnabled(2, true);
        expect(config.fmEnabled).toBe(true);
        
        paramManager.updateFMEnabled(2, false);
        expect(config.fmEnabled).toBe(false);
        
        paramManager.updateFMEnabled(2, true);
        expect(config.fmEnabled).toBe(true);
      });

      it('should handle both oscillators independently', () => {
        paramManager.updateFMEnabled(2, true);
        paramManager.updateFMEnabled(3, false);
        
        expect(mockVoiceState.oscillatorConfigs.get(2)!.fmEnabled).toBe(true);
        expect(mockVoiceState.oscillatorConfigs.get(3)!.fmEnabled).toBe(false);
      });

      it('should handle invalid oscillator number gracefully', () => {
        // @ts-expect-error - testing invalid input
        paramManager.updateFMEnabled(1, true);
        
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('config not found'));
      });

      it('should only affect new notes, not active voices', () => {
        paramManager.updateFMEnabled(2, true);
        
        // FM routing happens during note creation, not on active voices
        expect(mockVoiceManager.updateActiveVoices).not.toHaveBeenCalled();
      });
    });

    describe('updateFMDepth', () => {
      it('should update FM depth for oscillator 2', () => {
        paramManager.updateFMDepth(2, 500);
        
        expect(mockVoiceState.oscillatorConfigs.get(2)!.fmDepth).toBe(500);
      });

      it('should update FM depth for oscillator 3', () => {
        paramManager.updateFMDepth(3, 1000);
        
        expect(mockVoiceState.oscillatorConfigs.get(3)!.fmDepth).toBe(1000);
      });

      it('should update both config and active voices', () => {
        paramManager.updateFMDepth(2, 750);
        
        expect(mockVoiceState.oscillatorConfigs.get(2)!.fmDepth).toBe(750);
        expect(mockVoiceManager.updateActiveVoices).toHaveBeenCalledWith(2, 'fmDepth', 750);
      });

      it('should handle zero depth', () => {
        paramManager.updateFMDepth(2, 0);
        
        expect(mockVoiceState.oscillatorConfigs.get(2)!.fmDepth).toBe(0);
      });

      it('should handle maximum depth', () => {
        paramManager.updateFMDepth(2, 5000);
        
        expect(mockVoiceState.oscillatorConfigs.get(2)!.fmDepth).toBe(5000);
      });

      it('should update depth for both oscillators independently', () => {
        paramManager.updateFMDepth(2, 300);
        paramManager.updateFMDepth(3, 800);
        
        expect(mockVoiceState.oscillatorConfigs.get(2)!.fmDepth).toBe(300);
        expect(mockVoiceState.oscillatorConfigs.get(3)!.fmDepth).toBe(800);
      });

      it('should affect active voices immediately', () => {
        vi.clearAllMocks();
        
        paramManager.updateFMDepth(2, 1500);
        
        expect(mockVoiceManager.updateActiveVoices).toHaveBeenCalledTimes(1);
        expect(mockVoiceManager.updateActiveVoices).toHaveBeenCalledWith(2, 'fmDepth', 1500);
      });
    });

    describe('FM Integration', () => {
      it('should work with both FM enabled and depth set', () => {
        paramManager.updateFMEnabled(2, true);
        paramManager.updateFMDepth(2, 600);
        
        const config = mockVoiceState.oscillatorConfigs.get(2)!;
        expect(config.fmEnabled).toBe(true);
        expect(config.fmDepth).toBe(600);
      });

      it('should allow depth changes when FM is disabled', () => {
        paramManager.updateFMEnabled(2, false);
        paramManager.updateFMDepth(2, 400);
        
        const config = mockVoiceState.oscillatorConfigs.get(2)!;
        expect(config.fmEnabled).toBe(false);
        expect(config.fmDepth).toBe(400);
      });

      it('should allow enabling FM with existing depth', () => {
        paramManager.updateFMDepth(2, 700);
        paramManager.updateFMEnabled(2, true);
        
        const config = mockVoiceState.oscillatorConfigs.get(2)!;
        expect(config.fmEnabled).toBe(true);
        expect(config.fmDepth).toBe(700);
      });

      it('should maintain depth when toggling FM on/off', () => {
        paramManager.updateFMDepth(2, 900);
        paramManager.updateFMEnabled(2, true);
        paramManager.updateFMEnabled(2, false);
        
        expect(mockVoiceState.oscillatorConfigs.get(2)!.fmDepth).toBe(900);
      });
    });
  });
});
