/**
 * Unit tests for Lowpass Filters (12dB and 24dB)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Lowpass12Filter, Lowpass24Filter } from '../../../src/components/filters';
import { AudioEngine } from '../../../src/core/AudioEngine';

describe('Lowpass Filters', () => {
  beforeEach(async () => {
    await AudioEngine.getInstance().initialize();
  });

  afterEach(() => {
    AudioEngine.getInstance().close();
  });

  describe('Lowpass12Filter', () => {
    it('should create a 12dB lowpass filter', () => {
      const filter = new Lowpass12Filter(1000);
      
      expect(filter).toBeDefined();
      expect(filter.getName()).toBe('Lowpass 12dB');
      expect(filter.getType()).toBe('Filter-lowpass');
    });

    it('should set cutoff frequency', () => {
      const filter = new Lowpass12Filter(1000);
      
      filter.setParameter('cutoff', 2000);
      
      expect(filter.getParameter('cutoff')).toBe(2000);
    });

    it('should set resonance', () => {
      const filter = new Lowpass12Filter(1000);
      
      filter.setParameter('resonance', 10);
      
      expect(filter.getParameter('resonance')).toBe(10);
    });

    it('should enable and disable', () => {
      const filter = new Lowpass12Filter(1000);
      
      expect(filter.isEnabled()).toBe(true);
      
      filter.disable();
      expect(filter.isEnabled()).toBe(false);
      
      filter.enable();
      expect(filter.isEnabled()).toBe(true);
    });

    it('should provide input and output nodes', () => {
      const filter = new Lowpass12Filter(1000);
      
      expect(filter.getInputNode()).toBeDefined();
      expect(filter.getOutputNode()).toBeDefined();
    });

    it('should disconnect properly', () => {
      const filter = new Lowpass12Filter(1000);
      
      expect(() => filter.disconnect()).not.toThrow();
    });
  });

  describe('Lowpass24Filter', () => {
    it('should create a 24dB lowpass filter', () => {
      const filter = new Lowpass24Filter(1000);
      
      expect(filter).toBeDefined();
      expect(filter.getName()).toBe('Lowpass 24dB');
      expect(filter.getType()).toBe('Filter-lowpass');
    });

    it('should have two filter stages', () => {
      const filter = new Lowpass24Filter(1000);
      
      const secondStage = filter.getSecondStage();
      expect(secondStage).toBeDefined();
      expect(secondStage.type).toBe('lowpass');
    });

    it('should set cutoff frequency on both stages', () => {
      const filter = new Lowpass24Filter(1000);
      const secondStage = filter.getSecondStage();
      
      filter.setParameter('cutoff', 2000);
      
      expect(filter.getParameter('cutoff')).toBe(2000);
      // Verify setTargetAtTime was called on second stage
      expect(secondStage.frequency.setTargetAtTime).toHaveBeenCalled();
    });

    it('should set resonance on both stages', () => {
      const filter = new Lowpass24Filter(1000);
      const secondStage = filter.getSecondStage();
      
      filter.setParameter('resonance', 10);
      
      expect(filter.getParameter('resonance')).toBe(10);
      // Verify setTargetAtTime was called on second stage
      expect(secondStage.Q.setTargetAtTime).toHaveBeenCalled();
    });

    it('should maintain sync when changing cutoff multiple times', () => {
      const filter = new Lowpass24Filter(1000);
      const secondStage = filter.getSecondStage();
      
      filter.setParameter('cutoff', 500);
      filter.setParameter('cutoff', 3000);
      filter.setParameter('cutoff', 1500);
      
      expect(filter.getParameter('cutoff')).toBe(1500);
      // Verify setTargetAtTime was called 3 times (after constructor)
      expect(secondStage.frequency.setTargetAtTime).toHaveBeenCalled();
    });

    it('should enable and disable', () => {
      const filter = new Lowpass24Filter(1000);
      
      expect(filter.isEnabled()).toBe(true);
      
      filter.disable();
      expect(filter.isEnabled()).toBe(false);
      
      filter.enable();
      expect(filter.isEnabled()).toBe(true);
    });

    it('should provide input and output nodes', () => {
      const filter = new Lowpass24Filter(1000);
      
      expect(filter.getInputNode()).toBeDefined();
      expect(filter.getOutputNode()).toBeDefined();
    });

    it('should disconnect both stages properly', () => {
      const filter = new Lowpass24Filter(1000);
      
      expect(() => filter.disconnect()).not.toThrow();
    });

    it('should handle very low cutoff frequencies', () => {
      const filter = new Lowpass24Filter(20);
      
      expect(filter.getParameter('cutoff')).toBe(20);
      expect(filter.getSecondStage().frequency.value).toBe(20);
    });

    it('should handle very high cutoff frequencies', () => {
      const filter = new Lowpass24Filter(20000);
      
      expect(filter.getParameter('cutoff')).toBe(20000);
      expect(filter.getSecondStage().frequency.value).toBe(20000);
    });
  });

  describe('Comparison between 12dB and 24dB', () => {
    it('should have same cutoff frequency for both types', () => {
      const filter12 = new Lowpass12Filter(1000);
      const filter24 = new Lowpass24Filter(1000);
      
      expect(filter12.getParameter('cutoff')).toBe(filter24.getParameter('cutoff'));
    });

    it('should both respond to parameter changes', () => {
      const filter12 = new Lowpass12Filter(1000);
      const filter24 = new Lowpass24Filter(1000);
      
      filter12.setParameter('cutoff', 2000);
      filter24.setParameter('cutoff', 2000);
      
      expect(filter12.getParameter('cutoff')).toBe(2000);
      expect(filter24.getParameter('cutoff')).toBe(2000);
    });

    it('should both support resonance control', () => {
      const filter12 = new Lowpass12Filter(1000);
      const filter24 = new Lowpass24Filter(1000);
      
      filter12.setParameter('resonance', 5);
      filter24.setParameter('resonance', 5);
      
      expect(filter12.getParameter('resonance')).toBe(5);
      expect(filter24.getParameter('resonance')).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid parameter changes on 24dB filter', () => {
      const filter = new Lowpass24Filter(1000);
      const secondStage = filter.getSecondStage();
      
      for (let i = 0; i < 100; i++) {
        filter.setParameter('cutoff', 100 + i * 50);
      }
      
      expect(filter.getParameter('cutoff')).toBe(100 + 99 * 50);
      // Verify second stage was updated (called 100 times after constructor)
      expect(secondStage.frequency.setTargetAtTime).toHaveBeenCalled();
    });

    it('should handle zero resonance', () => {
      const filter12 = new Lowpass12Filter(1000);
      const filter24 = new Lowpass24Filter(1000);
      
      filter12.setParameter('resonance', 0);
      filter24.setParameter('resonance', 0);

      // Zero resonance is clamped to 0.0001 to avoid division by zero
      expect(filter12.getParameter('resonance')).toBe(0.0001);
      expect(filter24.getParameter('resonance')).toBe(0.0001);
    });    it('should handle maximum resonance', () => {
      const filter12 = new Lowpass12Filter(1000);
      const filter24 = new Lowpass24Filter(1000);
      
      filter12.setParameter('resonance', 30);
      filter24.setParameter('resonance', 30);
      
      expect(filter12.getParameter('resonance')).toBe(30);
      expect(filter24.getParameter('resonance')).toBe(30);
    });
  });
});
