/**
 * LFOManager Tests
 * 
 * Tests the LFO management system including:
 * - LFO enable/disable
 * - Rate and waveform changes
 * - Target management (add, remove, enable/disable)
 * - Depth and baseline adjustments
 * - Integration with MultiTargetLFO
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LFOManager } from '../../../src/core/LFOManager';
import { AudioEngine } from '../../../src/core/AudioEngine';

describe('LFOManager', () => {
  let lfoManager: LFOManager;

  beforeEach(async () => {
    // Initialize AudioEngine (required by MultiTargetLFO)
    const engine = AudioEngine.getInstance();
    await engine.initialize();
    
    lfoManager = new LFOManager();
  });

  describe('Initialization', () => {
    it('should create an LFO instance', () => {
      expect(lfoManager).toBeDefined();
      expect(lfoManager.getLFO()).toBeDefined();
    });

    it('should start disabled', () => {
      expect(lfoManager.isEnabled()).toBe(false);
    });

    it('should have no targets initially', () => {
      expect(lfoManager.getTargets()).toHaveLength(0);
    });
  });

  describe('Enable/Disable', () => {
    it('should enable the LFO', () => {
      lfoManager.setEnabled(true);
      expect(lfoManager.isEnabled()).toBe(true);
    });

    it('should disable the LFO', () => {
      lfoManager.setEnabled(true);
      lfoManager.setEnabled(false);
      expect(lfoManager.isEnabled()).toBe(false);
    });

    it('should start the underlying LFO when enabled', () => {
      const lfo = lfoManager.getLFO();
      const startSpy = vi.spyOn(lfo, 'start');
      
      lfoManager.setEnabled(true);
      
      expect(startSpy).toHaveBeenCalled();
    });

    it('should stop the underlying LFO when disabled', () => {
      const lfo = lfoManager.getLFO();
      lfoManager.setEnabled(true);
      
      const stopSpy = vi.spyOn(lfo, 'stop');
      lfoManager.setEnabled(false);
      
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('Rate Control', () => {
    it('should set LFO rate', () => {
      const lfo = lfoManager.getLFO();
      const setFreqSpy = vi.spyOn(lfo, 'setFrequency');
      
      lfoManager.setRate(10.0);
      
      expect(setFreqSpy).toHaveBeenCalledWith(10.0);
    });

    it('should accept different rate values', () => {
      const lfo = lfoManager.getLFO();
      const setFreqSpy = vi.spyOn(lfo, 'setFrequency');
      
      lfoManager.setRate(0.1);
      expect(setFreqSpy).toHaveBeenCalledWith(0.1);
      
      lfoManager.setRate(20.0);
      expect(setFreqSpy).toHaveBeenCalledWith(20.0);
    });
  });

  describe('Waveform Control', () => {
    it('should set LFO waveform', () => {
      const lfo = lfoManager.getLFO();
      const setWaveformSpy = vi.spyOn(lfo, 'setWaveform');
      
      lfoManager.setWaveform('triangle');
      
      expect(setWaveformSpy).toHaveBeenCalledWith('triangle');
    });

    it('should support all waveform types', () => {
      const lfo = lfoManager.getLFO();
      const setWaveformSpy = vi.spyOn(lfo, 'setWaveform');
      
      const waveforms: Array<'sine' | 'triangle' | 'square' | 'sawtooth' | 'random'> = 
        ['sine', 'triangle', 'square', 'sawtooth', 'random'];
      
      waveforms.forEach(wf => {
        lfoManager.setWaveform(wf);
        expect(setWaveformSpy).toHaveBeenCalledWith(wf);
      });
    });

    it('should stop and restart LFO when changing waveform if enabled', () => {
      const lfo = lfoManager.getLFO();
      lfoManager.setEnabled(true);
      
      const stopSpy = vi.spyOn(lfo, 'stop');
      const startSpy = vi.spyOn(lfo, 'start');
      
      lfoManager.setWaveform('square');
      
      expect(stopSpy).toHaveBeenCalled();
      expect(startSpy).toHaveBeenCalled();
    });

    it('should not restart LFO when changing waveform if disabled', () => {
      const lfo = lfoManager.getLFO();
      lfoManager.setEnabled(false);
      
      const startSpy = vi.spyOn(lfo, 'start');
      
      lfoManager.setWaveform('square');
      
      // Should not call start since LFO was not enabled
      expect(startSpy).not.toHaveBeenCalled();
    });
  });

  describe('Target Management', () => {
    let mockAudioParam: AudioParam;

    beforeEach(() => {
      // Create mock AudioParam
      mockAudioParam = {
        value: 440,
        setValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      } as unknown as AudioParam;
    });

    it('should add a target', () => {
      lfoManager.addTarget('pitch', mockAudioParam, 10, 440);
      
      expect(lfoManager.hasTarget('pitch')).toBe(true);
      expect(lfoManager.getTargets()).toContain('pitch');
    });

    it('should store target configuration', () => {
      lfoManager.addTarget('pitch', mockAudioParam, 10, 440);
      
      const config = lfoManager.getTargetConfig('pitch');
      expect(config).toBeDefined();
      expect(config?.enabled).toBe(true);
      expect(config?.depth).toBe(10);
      expect(config?.baseline).toBe(440);
    });

    it('should add multiple targets', () => {
      const mockParam2 = { ...mockAudioParam } as unknown as AudioParam;
      const mockParam3 = { ...mockAudioParam } as unknown as AudioParam;
      
      lfoManager.addTarget('pitch', mockAudioParam, 10, 440);
      lfoManager.addTarget('volume', mockParam2, 0.2, 0.5);
      lfoManager.addTarget('pan', mockParam3, 0.5, 0.0);
      
      expect(lfoManager.getTargets()).toHaveLength(3);
      expect(lfoManager.hasTarget('pitch')).toBe(true);
      expect(lfoManager.hasTarget('volume')).toBe(true);
      expect(lfoManager.hasTarget('pan')).toBe(true);
    });

    it('should remove a target', () => {
      lfoManager.addTarget('pitch', mockAudioParam, 10, 440);
      
      lfoManager.removeTarget('pitch');
      
      expect(lfoManager.hasTarget('pitch')).toBe(false);
      expect(lfoManager.getTargets()).toHaveLength(0);
    });

    it('should disable a target', () => {
      lfoManager.addTarget('pitch', mockAudioParam, 10, 440);
      
      lfoManager.setTargetEnabled('pitch', false);
      
      const config = lfoManager.getTargetConfig('pitch');
      expect(config?.enabled).toBe(false);
      expect(lfoManager.hasTarget('pitch')).toBe(false); // Removed from LFO
    });

    it('should handle non-existent target gracefully', () => {
      expect(() => {
        lfoManager.removeTarget('nonexistent');
      }).not.toThrow();
      
      expect(() => {
        lfoManager.setTargetEnabled('nonexistent', false);
      }).not.toThrow();
    });

    it('should clear all targets', () => {
      const mockParam2 = { ...mockAudioParam } as unknown as AudioParam;
      const mockParam3 = { ...mockAudioParam } as unknown as AudioParam;
      
      lfoManager.addTarget('pitch', mockAudioParam, 10, 440);
      lfoManager.addTarget('volume', mockParam2, 0.2, 0.5);
      lfoManager.addTarget('pan', mockParam3, 0.5, 0.0);
      
      lfoManager.clearTargets();
      
      expect(lfoManager.getTargets()).toHaveLength(0);
      expect(lfoManager.hasTarget('pitch')).toBe(false);
      expect(lfoManager.hasTarget('volume')).toBe(false);
      expect(lfoManager.hasTarget('pan')).toBe(false);
    });
  });

  describe('Target Depth Control', () => {
    let mockAudioParam: AudioParam;

    beforeEach(() => {
      mockAudioParam = {
        value: 440,
        setValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      } as unknown as AudioParam;
    });

    it('should update target depth', () => {
      lfoManager.addTarget('pitch', mockAudioParam, 10, 440);
      
      lfoManager.setTargetDepth('pitch', 20);
      
      const config = lfoManager.getTargetConfig('pitch');
      expect(config?.depth).toBe(20);
    });

    it('should propagate depth changes to underlying LFO', () => {
      const lfo = lfoManager.getLFO();
      const setDepthSpy = vi.spyOn(lfo, 'setTargetDepth');
      
      lfoManager.addTarget('pitch', mockAudioParam, 10, 440);
      lfoManager.setTargetDepth('pitch', 20);
      
      expect(setDepthSpy).toHaveBeenCalledWith('pitch', 20);
    });

    it('should handle depth changes for non-existent targets', () => {
      expect(() => {
        lfoManager.setTargetDepth('nonexistent', 20);
      }).not.toThrow();
    });
  });

  describe('Target Baseline Control', () => {
    let mockAudioParam: AudioParam;

    beforeEach(() => {
      mockAudioParam = {
        value: 440,
        setValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      } as unknown as AudioParam;
    });

    it('should update target baseline', () => {
      lfoManager.addTarget('pitch', mockAudioParam, 10, 440);
      
      lfoManager.setTargetBaseline('pitch', 880);
      
      const config = lfoManager.getTargetConfig('pitch');
      expect(config?.baseline).toBe(880);
    });

    it('should propagate baseline changes to underlying LFO', () => {
      const lfo = lfoManager.getLFO();
      const setBaselineSpy = vi.spyOn(lfo, 'setTargetBaseline');
      
      lfoManager.addTarget('pitch', mockAudioParam, 10, 440);
      lfoManager.setTargetBaseline('pitch', 880);
      
      expect(setBaselineSpy).toHaveBeenCalledWith('pitch', 880);
    });

    it('should handle baseline changes for non-existent targets', () => {
      expect(() => {
        lfoManager.setTargetBaseline('nonexistent', 880);
      }).not.toThrow();
    });
  });

  describe('Integration with MultiTargetLFO', () => {
    let mockAudioParam: AudioParam;

    beforeEach(() => {
      mockAudioParam = {
        value: 440,
        setValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      } as unknown as AudioParam;
    });

    it('should delegate target operations to MultiTargetLFO', () => {
      const lfo = lfoManager.getLFO();
      const addTargetSpy = vi.spyOn(lfo, 'addTarget');
      const removeTargetSpy = vi.spyOn(lfo, 'removeTarget');
      
      lfoManager.addTarget('pitch', mockAudioParam, 10, 440);
      expect(addTargetSpy).toHaveBeenCalledWith('pitch', mockAudioParam, 10, 440);
      
      lfoManager.removeTarget('pitch');
      expect(removeTargetSpy).toHaveBeenCalledWith('pitch');
    });

    it('should return the underlying LFO instance', () => {
      const lfo = lfoManager.getLFO();
      expect(lfo).toBeDefined();
      expect(typeof lfo.start).toBe('function');
      expect(typeof lfo.stop).toBe('function');
    });
  });

  describe('Real-world Usage Scenarios', () => {
    let mockFreqParam: AudioParam;
    let mockGainParam: AudioParam;
    let mockPanParam: AudioParam;

    beforeEach(() => {
      mockFreqParam = {
        value: 440,
        setValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      } as unknown as AudioParam;

      mockGainParam = {
        value: 0.5,
        setValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      } as unknown as AudioParam;

      mockPanParam = {
        value: 0,
        setValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      } as unknown as AudioParam;
    });

    it('should handle pitch vibrato setup', () => {
      // Setup pitch vibrato: ±10 Hz around 440 Hz at 5 Hz
      lfoManager.setRate(5.0);
      lfoManager.setWaveform('sine');
      lfoManager.addTarget('pitch', mockFreqParam, 10, 440);
      lfoManager.setEnabled(true);
      
      expect(lfoManager.isEnabled()).toBe(true);
      expect(lfoManager.hasTarget('pitch')).toBe(true);
      
      const config = lfoManager.getTargetConfig('pitch');
      expect(config?.depth).toBe(10);
      expect(config?.baseline).toBe(440);
    });

    it('should handle tremolo setup', () => {
      // Setup tremolo: ±0.2 amplitude around 0.5 at 8 Hz
      lfoManager.setRate(8.0);
      lfoManager.setWaveform('triangle');
      lfoManager.addTarget('volume', mockGainParam, 0.2, 0.5);
      lfoManager.setEnabled(true);
      
      expect(lfoManager.isEnabled()).toBe(true);
      expect(lfoManager.hasTarget('volume')).toBe(true);
      
      const config = lfoManager.getTargetConfig('volume');
      expect(config?.depth).toBe(0.2);
      expect(config?.baseline).toBe(0.5);
    });

    it('should handle auto-pan setup', () => {
      // Setup auto-pan: ±0.8 around center at 0.5 Hz
      lfoManager.setRate(0.5);
      lfoManager.setWaveform('sine');
      lfoManager.addTarget('pan', mockPanParam, 0.8, 0.0);
      lfoManager.setEnabled(true);
      
      expect(lfoManager.isEnabled()).toBe(true);
      expect(lfoManager.hasTarget('pan')).toBe(true);
      
      const config = lfoManager.getTargetConfig('pan');
      expect(config?.depth).toBe(0.8);
      expect(config?.baseline).toBe(0.0);
    });

    it('should handle multi-target modulation', () => {
      // Setup complex modulation: pitch + volume + pan
      lfoManager.setRate(3.0);
      lfoManager.setWaveform('sine');
      
      lfoManager.addTarget('pitch', mockFreqParam, 5, 440);
      lfoManager.addTarget('volume', mockGainParam, 0.1, 0.7);
      lfoManager.addTarget('pan', mockPanParam, 0.5, 0.0);
      
      lfoManager.setEnabled(true);
      
      expect(lfoManager.getTargets()).toHaveLength(3);
      expect(lfoManager.isEnabled()).toBe(true);
    });

    it('should handle dynamic target switching', () => {
      // Start with pitch modulation
      lfoManager.addTarget('pitch', mockFreqParam, 10, 440);
      lfoManager.setEnabled(true);
      
      // Switch to volume modulation
      lfoManager.removeTarget('pitch');
      lfoManager.addTarget('volume', mockGainParam, 0.2, 0.5);
      
      expect(lfoManager.hasTarget('pitch')).toBe(false);
      expect(lfoManager.hasTarget('volume')).toBe(true);
      expect(lfoManager.getTargets()).toHaveLength(1);
    });

    it('should handle depth adjustments during playback', () => {
      lfoManager.addTarget('pitch', mockFreqParam, 5, 440);
      lfoManager.setEnabled(true);
      
      // Increase vibrato depth
      lfoManager.setTargetDepth('pitch', 20);
      
      const config = lfoManager.getTargetConfig('pitch');
      expect(config?.depth).toBe(20);
      expect(lfoManager.isEnabled()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid enable/disable toggles', () => {
      for (let i = 0; i < 10; i++) {
        lfoManager.setEnabled(true);
        lfoManager.setEnabled(false);
      }
      
      expect(lfoManager.isEnabled()).toBe(false);
    });

    it('should handle adding same target multiple times', () => {
      const mockParam = {
        value: 440,
        setValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      } as unknown as AudioParam;
      
      lfoManager.addTarget('pitch', mockParam, 10, 440);
      lfoManager.addTarget('pitch', mockParam, 20, 880);
      
      // Should replace/update the target
      const config = lfoManager.getTargetConfig('pitch');
      expect(config?.depth).toBe(20);
      expect(config?.baseline).toBe(880);
    });

    it('should handle removing target that was never added', () => {
      expect(() => {
        lfoManager.removeTarget('never_added');
      }).not.toThrow();
    });

    it('should maintain state after clearing all targets', () => {
      const mockParam = {
        value: 440,
        setValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      } as unknown as AudioParam;
      
      lfoManager.addTarget('pitch', mockParam, 10, 440);
      lfoManager.setEnabled(true);
      lfoManager.clearTargets();
      
      // LFO should still be enabled, just with no targets
      expect(lfoManager.isEnabled()).toBe(true);
      expect(lfoManager.getTargets()).toHaveLength(0);
    });
  });
});

