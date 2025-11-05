/**
 * Unit tests for audio effects
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DelayEffect } from '../../../../src/components/effects/DelayEffect';
import { ReverbEffect } from '../../../../src/components/effects/ReverbEffect';
import { DistortionEffect } from '../../../../src/components/effects/DistortionEffect';
import { ChorusEffect } from '../../../../src/components/effects/ChorusEffect';
import { ShimmerEffect } from '../../../../src/components/effects/ShimmerEffect';
import { AudioEngine } from '../../../../src/core/AudioEngine';

describe('Audio Effects', () => {
  let engine: AudioEngine;

  beforeEach(async () => {
    engine = AudioEngine.getInstance();
    await engine.initialize();
  });

  afterEach(() => {
    engine.close();
  });

  describe('DelayEffect', () => {
    it('should create a delay effect with default parameters', () => {
      const delay = new DelayEffect();
      expect(delay).toBeDefined();
      expect(delay.getName()).toBe('Delay Effect');
      expect(delay.getType()).toBe('Effect-delay');
    });

    it('should create a delay effect with custom parameters', () => {
      const delay = new DelayEffect(0.5, 0.4);
      expect(delay.getParameter('delayTime')).toBe(0.5);
      expect(delay.getParameter('feedback')).toBe(0.4);
    });

    it('should set and get delay time', () => {
      const delay = new DelayEffect();
      delay.setParameter('delayTime', 0.75);
      expect(delay.getParameter('delayTime')).toBe(0.75);
    });

    it('should set and get feedback', () => {
      const delay = new DelayEffect();
      delay.setParameter('feedback', 0.6);
      expect(delay.getParameter('feedback')).toBe(0.6);
    });

    it('should limit feedback to 0.9', () => {
      const delay = new DelayEffect();
      delay.setParameter('feedback', 1.5);
      expect(delay.getParameter('feedback')).toBe(0.9);
    });

    it('should set and get mix', () => {
      const delay = new DelayEffect();
      delay.setParameter('mix', 0.7);
      expect(delay.getParameter('mix')).toBe(0.7);
    });

    it('should provide parameter descriptors', () => {
      const delay = new DelayEffect();
      const params = delay.getParameters();
      expect(params).toBeDefined();
      expect(params.length).toBeGreaterThan(0);
      
      const delayTimeParam = params.find(p => p.name === 'delayTime');
      expect(delayTimeParam).toBeDefined();
      expect(delayTimeParam?.min).toBe(0);
      expect(delayTimeParam?.max).toBe(2.0);
    });

    it('should set delay time from tempo', () => {
      const delay = new DelayEffect();
      delay.setTempo(120, 8); // Eighth note at 120 BPM
      expect(delay.getParameter('delayTime')).toBeCloseTo(0.25, 2);
    });

    it('should connect and disconnect', () => {
      const delay = new DelayEffect();
      expect(() => delay.connect(engine.getDestination())).not.toThrow();
      expect(() => delay.disconnect()).not.toThrow();
    });
  });

  describe('ReverbEffect', () => {
    it('should create a reverb effect with default parameters', () => {
      const reverb = new ReverbEffect();
      expect(reverb).toBeDefined();
      expect(reverb.getName()).toBe('Reverb Effect');
      expect(reverb.getType()).toBe('Effect-reverb');
    });

    it('should create a reverb effect with custom decay', () => {
      const reverb = new ReverbEffect(0.7);
      expect(reverb.getParameter('decay')).toBe(0.7);
    });

    it('should set and get decay parameter', () => {
      const reverb = new ReverbEffect();
      reverb.setParameter('decay', 0.8);
      expect(reverb.getParameter('decay')).toBe(0.8);
    });

    it('should handle "time" as alias for decay', () => {
      const reverb = new ReverbEffect();
      reverb.setParameter('time', 0.6);
      expect(reverb.getParameter('time')).toBe(0.6);
      expect(reverb.getParameter('decay')).toBe(0.6);
    });

    it('should set and get mix', () => {
      const reverb = new ReverbEffect();
      reverb.setParameter('mix', 0.4);
      expect(reverb.getParameter('mix')).toBe(0.4);
    });

    it('should provide parameter descriptors', () => {
      const reverb = new ReverbEffect();
      const params = reverb.getParameters();
      expect(params).toBeDefined();
      
      const decayParam = params.find(p => p.name === 'decay');
      expect(decayParam).toBeDefined();
      expect(decayParam?.min).toBe(0);
      expect(decayParam?.max).toBe(1);
    });

    it('should connect and disconnect', () => {
      const reverb = new ReverbEffect();
      expect(() => reverb.connect(engine.getDestination())).not.toThrow();
      expect(() => reverb.disconnect()).not.toThrow();
    });
  });

  describe('DistortionEffect', () => {
    it('should create a distortion effect with default parameters', () => {
      const distortion = new DistortionEffect();
      expect(distortion).toBeDefined();
      expect(distortion.getName()).toBe('Distortion Effect');
      expect(distortion.getType()).toBe('Effect-distortion');
    });

    it('should create a distortion effect with custom drive', () => {
      const distortion = new DistortionEffect(0.7);
      expect(distortion.getParameter('drive')).toBe(0.7);
    });

    it('should set and get drive parameter', () => {
      const distortion = new DistortionEffect();
      distortion.setParameter('drive', 0.6);
      expect(distortion.getParameter('drive')).toBe(0.6);
    });

    it('should handle "amount" as alias for drive', () => {
      const distortion = new DistortionEffect();
      distortion.setParameter('amount', 0.75);
      expect(distortion.getParameter('amount')).toBe(0.75);
      expect(distortion.getParameter('drive')).toBe(0.75);
    });

    it('should set and get tone parameter', () => {
      const distortion = new DistortionEffect();
      distortion.setParameter('tone', 0.8);
      expect(distortion.getParameter('tone')).toBe(0.8);
    });

    it('should clamp drive between 0 and 1', () => {
      const distortion = new DistortionEffect();
      distortion.setParameter('drive', 1.5);
      expect(distortion.getParameter('drive')).toBe(1);
      
      distortion.setParameter('drive', -0.5);
      expect(distortion.getParameter('drive')).toBe(0);
    });

    it('should provide parameter descriptors', () => {
      const distortion = new DistortionEffect();
      const params = distortion.getParameters();
      expect(params).toBeDefined();
      
      const driveParam = params.find(p => p.name === 'drive');
      expect(driveParam).toBeDefined();
      
      const toneParam = params.find(p => p.name === 'tone');
      expect(toneParam).toBeDefined();
    });

    it('should connect and disconnect', () => {
      const distortion = new DistortionEffect();
      expect(() => distortion.connect(engine.getDestination())).not.toThrow();
      expect(() => distortion.disconnect()).not.toThrow();
    });
  });

  describe('ChorusEffect', () => {
    it('should create a chorus effect with default parameters', () => {
      const chorus = new ChorusEffect();
      expect(chorus).toBeDefined();
      expect(chorus.getName()).toBe('Chorus Effect');
      expect(chorus.getType()).toBe('Effect-chorus');
    });

    it('should create a chorus effect with custom parameters', () => {
      const chorus = new ChorusEffect(2.0, 0.6);
      expect(chorus.getParameter('rate')).toBe(2.0);
      expect(chorus.getParameter('depth')).toBe(0.6);
    });

    it('should set and get rate parameter', () => {
      const chorus = new ChorusEffect();
      chorus.setParameter('rate', 3.0);
      expect(chorus.getParameter('rate')).toBe(3.0);
    });

    it('should handle "speed" as alias for rate', () => {
      const chorus = new ChorusEffect();
      chorus.setParameter('speed', 2.5);
      expect(chorus.getParameter('speed')).toBe(2.5);
      expect(chorus.getParameter('rate')).toBe(2.5);
    });

    it('should set and get depth parameter', () => {
      const chorus = new ChorusEffect();
      chorus.setParameter('depth', 0.7);
      expect(chorus.getParameter('depth')).toBe(0.7);
    });

    it('should handle "amount" as alias for depth', () => {
      const chorus = new ChorusEffect();
      chorus.setParameter('amount', 0.8);
      expect(chorus.getParameter('amount')).toBe(0.8);
      expect(chorus.getParameter('depth')).toBe(0.8);
    });

    it('should clamp rate between 0.1 and 10', () => {
      const chorus = new ChorusEffect();
      chorus.setParameter('rate', 15);
      expect(chorus.getParameter('rate')).toBe(10);
      
      chorus.setParameter('rate', 0.05);
      expect(chorus.getParameter('rate')).toBe(0.1);
    });

    it('should provide parameter descriptors', () => {
      const chorus = new ChorusEffect();
      const params = chorus.getParameters();
      expect(params).toBeDefined();
      
      const rateParam = params.find(p => p.name === 'rate');
      expect(rateParam).toBeDefined();
      
      const depthParam = params.find(p => p.name === 'depth');
      expect(depthParam).toBeDefined();
    });

    it('should connect and disconnect', () => {
      const chorus = new ChorusEffect();
      expect(() => chorus.connect(engine.getDestination())).not.toThrow();
      expect(() => chorus.disconnect()).not.toThrow();
    });
  });

  describe('ShimmerEffect', () => {
    it('should create a shimmer effect with default parameters', () => {
      const shimmer = new ShimmerEffect();
      expect(shimmer).toBeDefined();
      expect(shimmer.getName()).toBe('Shimmer Effect');
      expect(shimmer.getType()).toBe('Effect-shimmer');
    });

    it('should create a shimmer effect with custom parameters', () => {
      const shimmer = new ShimmerEffect(0.7, 0.6);
      expect(shimmer.getParameter('decay')).toBe(0.7);
      expect(shimmer.getParameter('shimmer')).toBe(0.6);
    });

    it('should set and get decay parameter', () => {
      const shimmer = new ShimmerEffect();
      shimmer.setParameter('decay', 0.8);
      expect(shimmer.getParameter('decay')).toBe(0.8);
    });

    it('should handle "time" as alias for decay', () => {
      const shimmer = new ShimmerEffect();
      shimmer.setParameter('time', 0.6);
      expect(shimmer.getParameter('time')).toBe(0.6);
      expect(shimmer.getParameter('decay')).toBe(0.6);
    });

    it('should set and get shimmer parameter', () => {
      const shimmer = new ShimmerEffect();
      shimmer.setParameter('shimmer', 0.75);
      expect(shimmer.getParameter('shimmer')).toBe(0.75);
    });

    it('should handle "amount" as alias for shimmer', () => {
      const shimmer = new ShimmerEffect();
      shimmer.setParameter('amount', 0.7);
      expect(shimmer.getParameter('amount')).toBe(0.7);
      expect(shimmer.getParameter('shimmer')).toBe(0.7);
    });

    it('should provide parameter descriptors', () => {
      const shimmer = new ShimmerEffect();
      const params = shimmer.getParameters();
      expect(params).toBeDefined();
      
      const decayParam = params.find(p => p.name === 'decay');
      expect(decayParam).toBeDefined();
      
      const shimmerParam = params.find(p => p.name === 'shimmer');
      expect(shimmerParam).toBeDefined();
    });

    it('should connect and disconnect', () => {
      const shimmer = new ShimmerEffect();
      expect(() => shimmer.connect(engine.getDestination())).not.toThrow();
      expect(() => shimmer.disconnect()).not.toThrow();
    });
  });

  describe('BaseEffect Common Functionality', () => {
    it('should support bypass functionality', () => {
      const delay = new DelayEffect();
      
      delay.bypass(true);
      expect(delay.isBypassed()).toBe(true);
      
      delay.bypass(false);
      expect(delay.isBypassed()).toBe(false);
    });

    it('should support enable/disable functionality', () => {
      const delay = new DelayEffect();
      
      expect(delay.isEnabled()).toBe(true);
      
      delay.disable();
      expect(delay.isEnabled()).toBe(false);
      
      delay.enable();
      expect(delay.isEnabled()).toBe(true);
    });

    it('should get input and output nodes', () => {
      const delay = new DelayEffect();
      
      const input = delay.getInputNode();
      expect(input).toBeDefined();
      
      const output = delay.getOutputNode();
      expect(output).toBeDefined();
    });

    it('should handle unknown parameters gracefully', () => {
      const delay = new DelayEffect();
      expect(() => delay.setParameter('unknownParam', 0.5)).not.toThrow();
      expect(delay.getParameter('unknownParam')).toBe(0);
    });

    it('should return common parameters from all effects', () => {
      const effects = [
        new DelayEffect(),
        new ReverbEffect(),
        new DistortionEffect(),
        new ChorusEffect(),
        new ShimmerEffect(),
      ];

      effects.forEach(effect => {
        const params = effect.getParameters();
        const mixParam = params.find(p => p.name === 'mix');
        expect(mixParam).toBeDefined();
        expect(mixParam?.min).toBe(0);
        expect(mixParam?.max).toBe(1);
      });
    });
  });
});
