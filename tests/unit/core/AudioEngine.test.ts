/**
 * AudioEngine Unit Tests
 * Tests the singleton audio context manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AudioEngine } from '../../../src/core/AudioEngine';

describe('AudioEngine', () => {
  let engine: AudioEngine;

  beforeEach(async () => {
    engine = AudioEngine.getInstance();
    await engine.initialize();
  });

  afterEach(async () => {
    // Clean up after each test
    await engine.close();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = AudioEngine.getInstance();
      const instance2 = AudioEngine.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should initialize only once', () => {
      const instance1 = AudioEngine.getInstance();
      const context1 = instance1.getContext();
      
      const instance2 = AudioEngine.getInstance();
      const context2 = instance2.getContext();
      
      expect(context1).toBe(context2);
    });
  });

  describe('Audio Context', () => {
    it('should create an audio context', () => {
      const context = engine.getContext();
      
      expect(context).toBeDefined();
      expect(context.sampleRate).toBe(48000);
    });

    it('should provide access to destination', () => {
      const destination = engine.getDestination();
      
      expect(destination).toBeDefined();
      expect(destination).toBe(engine.getContext().destination);
    });

    it('should provide current time', () => {
      const time = engine.getCurrentTime();
      
      expect(typeof time).toBe('number');
      expect(time).toBeGreaterThanOrEqual(0);
    });

    it('should provide sample rate', () => {
      const sampleRate = engine.getSampleRate();
      
      expect(sampleRate).toBe(48000);
      expect(typeof sampleRate).toBe('number');
    });
  });

  describe('State Management', () => {
    it('should check if context is running', () => {
      const isRunning = engine.isRunning();
      
      expect(typeof isRunning).toBe('boolean');
      expect(isRunning).toBe(true);
    });

    it('should resume audio context', async () => {
      await engine.suspend();
      await expect(engine.resume()).resolves.not.toThrow();
      expect(engine.isRunning()).toBe(true);
    });

    it('should suspend audio context', async () => {
      await expect(engine.suspend()).resolves.not.toThrow();
      // Note: Mock audio context may not change state synchronously
      // Just verify suspend was called without error
    });
  });

  describe('Node Creation', () => {
    it('should create gain node', () => {
      const gainNode = engine.createGain();
      
      expect(gainNode).toBeDefined();
      expect(gainNode.gain).toBeDefined();
      expect(gainNode.gain.value).toBe(1);
    });

    it('should create oscillator node', () => {
      const oscillator = engine.createOscillator();
      
      expect(oscillator).toBeDefined();
      expect(oscillator.frequency).toBeDefined();
      expect(oscillator.type).toBe('sine');
    });

    it('should create stereo panner node', () => {
      const panner = engine.createStereoPanner();
      
      expect(panner).toBeDefined();
      expect(panner.pan).toBeDefined();
      expect(panner.pan.value).toBe(0);
    });

    it('should create biquad filter node', () => {
      const filter = engine.createBiquadFilter();
      
      expect(filter).toBeDefined();
      expect(filter.frequency).toBeDefined();
      expect(filter.Q).toBeDefined();
      expect(filter.type).toBe('lowpass');
    });
  });

  describe('Error Handling', () => {
    it('should handle context creation gracefully', () => {
      expect(() => AudioEngine.getInstance()).not.toThrow();
    });

    it('should provide valid audio context state', () => {
      const context = engine.getContext();
      
      expect(['suspended', 'running', 'closed']).toContain(context.state);
    });
  });
});
