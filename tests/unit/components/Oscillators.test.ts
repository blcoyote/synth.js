/**
 * Oscillator Component Tests
 * Tests all oscillator types for consistent interface and functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AudioEngine } from '../../../src/core/AudioEngine';
import { SineOscillator } from '../../../src/components/oscillators/SineOscillator';
import { SawtoothOscillator } from '../../../src/components/oscillators/SawtoothOscillator';
import { SquareOscillator } from '../../../src/components/oscillators/SquareOscillator';
import { TriangleOscillator } from '../../../src/components/oscillators/TriangleOscillator';

describe('Oscillators', () => {
  let engine: AudioEngine;

  beforeEach(async () => {
    engine = AudioEngine.getInstance();
    await engine.initialize();
  });

  afterEach(async () => {
    await engine.close();
  });

  describe('SineOscillator', () => {
    it('should create a sine oscillator', () => {
      const osc = new SineOscillator();
      
      expect(osc).toBeDefined();
      expect(osc.getName()).toBe('Sine Oscillator');
    });

    it('should set and get frequency via parameters', () => {
      const osc = new SineOscillator();
      
      osc.setParameter('frequency', 880);
      expect(osc.getParameter('frequency')).toBe(880);
    });

    it('should set and get detune via parameters', () => {
      const osc = new SineOscillator();
      
      osc.setParameter('detune', 100);
      expect(osc.getParameter('detune')).toBe(100);
    });

    it('should start and stop', () => {
      const osc = new SineOscillator();
      
      expect(() => osc.start()).not.toThrow();
      expect(() => osc.stop()).not.toThrow();
    });

    it('should connect to destination', () => {
      const osc = new SineOscillator();
      const destination = engine.getDestination();
      
      expect(() => osc.connect(destination)).not.toThrow();
    });

    it('should disconnect', () => {
      const osc = new SineOscillator();
      
      expect(() => osc.disconnect()).not.toThrow();
    });
  });

  describe('SawtoothOscillator', () => {
    it('should create a sawtooth oscillator', () => {
      const osc = new SawtoothOscillator();
      
      expect(osc).toBeDefined();
      expect(osc.getName()).toBe('Sawtooth Oscillator');
    });

    it('should handle frequency changes', () => {
      const osc = new SawtoothOscillator();
      
      osc.setParameter('frequency', 220);
      expect(osc.getParameter('frequency')).toBe(220);
      
      osc.setParameter('frequency', 440);
      expect(osc.getParameter('frequency')).toBe(440);
    });
  });

  describe('SquareOscillator', () => {
    it('should create a square oscillator', () => {
      const osc = new SquareOscillator();
      
      expect(osc).toBeDefined();
      expect(osc.getName()).toBe('Square Oscillator');
    });

    it('should set frequency via parameters', () => {
      const osc = new SquareOscillator();
      
      osc.setParameter('frequency', 440);
      expect(osc.getParameter('frequency')).toBe(440);
    });
  });

  describe('TriangleOscillator', () => {
    it('should create a triangle oscillator', () => {
      const osc = new TriangleOscillator();
      
      expect(osc).toBeDefined();
      expect(osc.getName()).toBe('Triangle Oscillator');
    });

    it('should handle detune properly', () => {
      const osc = new TriangleOscillator();
      
      osc.setParameter('detune', 50);
      expect(osc.getParameter('detune')).toBe(50);
      
      osc.setParameter('detune', -50);
      expect(osc.getParameter('detune')).toBe(-50);
    });
  });

  describe('Oscillator Interface Consistency', () => {
    const oscillatorTypes = [
      SineOscillator,
      SawtoothOscillator,
      SquareOscillator,
      TriangleOscillator,
    ];

    oscillatorTypes.forEach((OscillatorClass) => {
      describe(`${OscillatorClass.name}`, () => {
        it('should implement getName()', () => {
          const osc = new OscillatorClass();
          
          expect(typeof osc.getName()).toBe('string');
          expect(osc.getName().length).toBeGreaterThan(0);
        });

        it('should implement setParameter() and getParameter() for frequency', () => {
          const osc = new OscillatorClass();
          
          osc.setParameter('frequency', 880);
          expect(osc.getParameter('frequency')).toBe(880);
        });

        it('should implement setParameter() and getParameter() for detune', () => {
          const osc = new OscillatorClass();
          
          osc.setParameter('detune', 100);
          expect(osc.getParameter('detune')).toBe(100);
        });

        it('should implement start() and stop()', () => {
          const osc = new OscillatorClass();
          
          expect(() => osc.start()).not.toThrow();
          expect(() => osc.stop()).not.toThrow();
        });

        it('should implement connect() and disconnect()', () => {
          const osc = new OscillatorClass();
          const destination = engine.getDestination();
          
          expect(() => osc.connect(destination)).not.toThrow();
          expect(() => osc.disconnect()).not.toThrow();
        });

        it('should accept valid frequency range', () => {
          const osc = new OscillatorClass();
          
          // Low frequency
          osc.setParameter('frequency', 20);
          expect(osc.getParameter('frequency')).toBeGreaterThanOrEqual(20);
          
          // Mid frequency
          osc.setParameter('frequency', 440);
          expect(osc.getParameter('frequency')).toBe(440);
          
          // High frequency
          osc.setParameter('frequency', 10000);
          expect(osc.getParameter('frequency')).toBeLessThanOrEqual(10000);
        });

        it('should accept valid detune range', () => {
          const osc = new OscillatorClass();
          
          // Negative detune
          osc.setParameter('detune', -1200);
          expect(osc.getParameter('detune')).toBeGreaterThanOrEqual(-1200);
          
          // Zero detune
          osc.setParameter('detune', 0);
          expect(osc.getParameter('detune')).toBe(0);
          
          // Positive detune
          osc.setParameter('detune', 1200);
          expect(osc.getParameter('detune')).toBeLessThanOrEqual(1200);
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very low frequencies', () => {
      const osc = new SineOscillator();
      
      osc.setParameter('frequency', 1);
      expect(osc.getParameter('frequency')).toBeGreaterThan(0);
    });

    it('should handle very high frequencies', () => {
      const osc = new SineOscillator();
      
      osc.setParameter('frequency', 20000);
      expect(osc.getParameter('frequency')).toBeLessThan(24000); // Below Nyquist
    });

    it('should not crash on rapid start/stop', () => {
      const osc = new SineOscillator();
      
      expect(() => {
        osc.start();
        osc.stop();
        osc.start();
        osc.stop();
      }).not.toThrow();
    });

    it('should handle multiple connections', () => {
      const osc = new SineOscillator();
      const gain1 = engine.createGain();
      const gain2 = engine.createGain();
      
      expect(() => {
        osc.connect(gain1);
        osc.connect(gain2);
      }).not.toThrow();
    });
  });
});
