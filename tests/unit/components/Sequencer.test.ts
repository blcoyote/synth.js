/**
 * Sequencer Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Sequencer } from '../../../src/components/modulation/Sequencer';
import type { SequencerStep } from '../../../src/components/modulation/Sequencer';

describe('Sequencer', () => {
  let sequencer: Sequencer;

  beforeEach(() => {
    sequencer = new Sequencer();
  });

  afterEach(() => {
    sequencer.dispose();
  });

  describe('Initialization', () => {
    it('should create a sequencer with default settings', () => {
      expect(sequencer.getSteps()).toBe(16);
      expect(sequencer.getTempo()).toBe(120);
      expect(sequencer.getSwing()).toBe(0);
      expect(sequencer.getMode()).toBe('forward');
      expect(sequencer.isRunning()).toBe(false);
    });

    it('should create a sequencer with custom settings', () => {
      const customSequencer = new Sequencer({
        steps: 8,
        tempo: 140,
        swing: 0.3,
        mode: 'reverse',
      });
      
      expect(customSequencer.getSteps()).toBe(8);
      expect(customSequencer.getTempo()).toBe(140);
      expect(customSequencer.getSwing()).toBe(0.3);
      expect(customSequencer.getMode()).toBe('reverse');
      
      customSequencer.dispose();
    });

    it('should initialize with all gates off', () => {
      const pattern = sequencer.getPattern();
      expect(pattern).toHaveLength(16);
      pattern.forEach((step: SequencerStep) => {
        expect(step.gate).toBe(false);
      });
    });
  });

  describe('Step Management', () => {
    it('should set and get individual steps', () => {
      sequencer.setStep(0, { gate: true, pitch: 60, velocity: 100 });
      
      const step = sequencer.getStep(0);
      expect(step).not.toBeNull();
      expect(step!.gate).toBe(true);
      expect(step!.pitch).toBe(60);
      expect(step!.velocity).toBe(100);
    });

    it('should partially update steps', () => {
      sequencer.setStep(0, { gate: true });
      sequencer.setStep(0, { pitch: 72 });
      
      const step = sequencer.getStep(0);
      expect(step!.gate).toBe(true);
      expect(step!.pitch).toBe(72);
    });

    it('should handle invalid step indices', () => {
      sequencer.setStep(-1, { gate: true });
      sequencer.setStep(100, { gate: true });
      
      expect(sequencer.getStep(-1)).toBeNull();
      expect(sequencer.getStep(100)).toBeNull();
    });

    it('should clear all steps', () => {
      sequencer.setStep(0, { gate: true });
      sequencer.setStep(5, { gate: true });
      sequencer.setStep(10, { gate: true });
      
      sequencer.clear();
      
      const pattern = sequencer.getPattern();
      pattern.forEach((step: SequencerStep) => {
        expect(step.gate).toBe(false);
      });
    });

    it('should randomize pattern', () => {
      sequencer.randomize(1.0); // 100% density
      
      const pattern = sequencer.getPattern();
      const activeSteps = pattern.filter((step: SequencerStep) => step.gate).length;
      
      // With 100% density, most/all steps should be active
      expect(activeSteps).toBeGreaterThan(12);
    });
  });

  describe('Playback Control', () => {
    it('should start playback', () => {
      sequencer.start();
      expect(sequencer.isRunning()).toBe(true);
    });

    it('should stop playback', () => {
      sequencer.start();
      sequencer.stop();
      expect(sequencer.isRunning()).toBe(false);
      expect(sequencer.getCurrentStep()).toBe(0);
    });

    it('should pause and resume playback', () => {
      sequencer.start();
      const currentStep = sequencer.getCurrentStep();
      
      sequencer.pause();
      expect(sequencer.isRunning()).toBe(false);
      
      sequencer.resume();
      expect(sequencer.isRunning()).toBe(true);
    });

    it('should reset to beginning', () => {
      sequencer.start();
      sequencer.reset();
      expect(sequencer.getCurrentStep()).toBe(0);
    });
  });

  describe('Parameter Control', () => {
    it('should set and get tempo', () => {
      sequencer.setTempo(140);
      expect(sequencer.getTempo()).toBe(140);
    });

    it('should clamp tempo to valid range', () => {
      sequencer.setTempo(500);
      expect(sequencer.getTempo()).toBe(300);
      
      sequencer.setTempo(10);
      expect(sequencer.getTempo()).toBe(40);
    });

    it('should set and get swing', () => {
      sequencer.setSwing(0.5);
      expect(sequencer.getSwing()).toBe(0.5);
    });

    it('should clamp swing to 0-1', () => {
      sequencer.setSwing(2);
      expect(sequencer.getSwing()).toBe(1);
      
      sequencer.setSwing(-0.5);
      expect(sequencer.getSwing()).toBe(0);
    });

    it('should change step count', () => {
      sequencer.setSteps(8);
      expect(sequencer.getSteps()).toBe(8);
      expect(sequencer.getPattern()).toHaveLength(8);
    });

    it('should preserve steps when changing step count', () => {
      sequencer.setStep(0, { gate: true, pitch: 60 });
      sequencer.setStep(5, { gate: true, pitch: 65 });
      
      sequencer.setSteps(8);
      
      expect(sequencer.getStep(0)!.gate).toBe(true);
      expect(sequencer.getStep(5)!.gate).toBe(true);
    });
  });

  describe('Playback Modes', () => {
    it('should set forward mode', () => {
      sequencer.setMode('forward');
      expect(sequencer.getMode()).toBe('forward');
    });

    it('should set reverse mode', () => {
      sequencer.setMode('reverse');
      expect(sequencer.getMode()).toBe('reverse');
    });

    it('should set pingpong mode', () => {
      sequencer.setMode('pingpong');
      expect(sequencer.getMode()).toBe('pingpong');
    });

    it('should set random mode', () => {
      sequencer.setMode('random');
      expect(sequencer.getMode()).toBe('random');
    });
  });

  describe('Pattern Management', () => {
    it('should save a pattern', () => {
      sequencer.setStep(0, { gate: true, pitch: 60 });
      sequencer.savePattern('test-pattern');
      
      const names = sequencer.getPatternNames();
      expect(names).toContain('test-pattern');
    });

    it('should load a saved pattern', () => {
      sequencer.setStep(0, { gate: true, pitch: 60 });
      sequencer.setStep(5, { gate: true, pitch: 72 });
      sequencer.savePattern('test-pattern');
      
      sequencer.clear();
      expect(sequencer.getStep(0)!.gate).toBe(false);
      
      sequencer.loadPattern('test-pattern');
      expect(sequencer.getStep(0)!.gate).toBe(true);
      expect(sequencer.getStep(0)!.pitch).toBe(60);
      expect(sequencer.getStep(5)!.gate).toBe(true);
      expect(sequencer.getStep(5)!.pitch).toBe(72);
    });

    it('should delete a pattern', () => {
      sequencer.savePattern('test-pattern');
      const deleted = sequencer.deletePattern('test-pattern');
      
      expect(deleted).toBe(true);
      expect(sequencer.getPatternNames()).not.toContain('test-pattern');
    });

    it('should return false when loading nonexistent pattern', () => {
      const loaded = sequencer.loadPattern('nonexistent');
      expect(loaded).toBe(false);
    });
  });

  describe('Preset Patterns', () => {
    it('should create a bassline pattern', () => {
      sequencer.createBasslinePattern();
      
      const pattern = sequencer.getPattern();
      const activeSteps = pattern.filter((step: SequencerStep) => step.gate);
      
      expect(activeSteps.length).toBeGreaterThan(0);
      activeSteps.forEach((step: SequencerStep) => {
        expect(step.pitch).toBeGreaterThanOrEqual(36);
        expect(step.pitch).toBeLessThanOrEqual(48);
      });
    });

    it('should create an arpeggio pattern', () => {
      sequencer.createArpeggioPattern(60);
      
      const pattern = sequencer.getPattern();
      expect(pattern.every((step: SequencerStep) => step.gate)).toBe(true);
    });
  });

  describe('Callbacks', () => {
    it('should trigger step callback', () => {
      return new Promise<void>((resolve, reject) => {
        let callbackTriggered = false;
        
        sequencer.setStep(0, { gate: true, pitch: 60 });
        sequencer.onStep((step: number, data: SequencerStep) => {
          callbackTriggered = true;
          try {
            expect(step).toBe(0);
            expect(data.pitch).toBe(60);
            sequencer.stop();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        
        sequencer.start();
        
        setTimeout(() => {
          if (!callbackTriggered) {
            reject(new Error('Step callback was not triggered'));
          }
        }, 1000);
      });
    });
  });
});
