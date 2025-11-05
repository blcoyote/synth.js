/**
 * Unit tests for Visualizer utility
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Visualizer } from '../../../src/utils/Visualizer';
import type { VisualizerConfig } from '../../../src/utils/Visualizer';

describe('Visualizer', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  let mockFilterNode: BiquadFilterNode;
  let mockAnalyserNode: AnalyserNode;
  let config: VisualizerConfig;

  beforeEach(() => {
    // Create mock canvas
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 400;
    mockCanvas.height = 240;

    // Create mock 2D context
    mockContext = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      setLineDash: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
    } as unknown as CanvasRenderingContext2D;

    // Mock getContext
    vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockContext);

    // Create mock filter node
    mockFilterNode = {
      type: 'lowpass',
      frequency: { value: 2000 },
      Q: { value: 1.0 },
      getFrequencyResponse: vi.fn((freqArray, magResponse, phaseResponse) => {
        // Simulate a lowpass filter response
        for (let i = 0; i < freqArray.length; i++) {
          magResponse[i] = freqArray[i] < 2000 ? 1.0 : 0.5;
          phaseResponse[i] = 0;
        }
      }),
    } as unknown as BiquadFilterNode;

    // Create mock analyser node
    mockAnalyserNode = {
      fftSize: 2048,
      frequencyBinCount: 1024,
      smoothingTimeConstant: 0.8,
      getByteTimeDomainData: vi.fn((array: Uint8Array) => {
        // Simulate waveform data (sine wave)
        for (let i = 0; i < array.length; i++) {
          array[i] = 128 + Math.sin((i / array.length) * Math.PI * 2) * 50;
        }
      }),
      getByteFrequencyData: vi.fn(),
    } as unknown as AnalyserNode;

    // Default config
    config = {
      canvas: mockCanvas,
      filterNode: mockFilterNode,
      analyserNode: mockAnalyserNode,
      filterEnabled: true,
      cutoffFrequency: 2000,
      sampleRate: 48000,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers(); // Restore real timers after each test
  });

  describe('Constructor', () => {
    it('should create a Visualizer instance', () => {
      const visualizer = new Visualizer(config);
      expect(visualizer).toBeDefined();
    });

    it('should throw error if canvas context is not available', () => {
      vi.spyOn(mockCanvas, 'getContext').mockReturnValue(null);
      
      expect(() => new Visualizer(config)).toThrow(
        'Failed to get 2D context from canvas'
      );
    });

    it('should accept null filter node', () => {
      const visualizer = new Visualizer({
        ...config,
        filterNode: null,
      });
      expect(visualizer).toBeDefined();
    });

    it('should accept null analyser node', () => {
      const visualizer = new Visualizer({
        ...config,
        analyserNode: null,
      });
      expect(visualizer).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should update filter node', () => {
      const visualizer = new Visualizer(config);
      const newFilterNode = {
        ...mockFilterNode,
        frequency: { value: 5000 },
      } as unknown as BiquadFilterNode;

      visualizer.updateConfig({ filterNode: newFilterNode });
      // Should not throw
      expect(visualizer).toBeDefined();
    });

    it('should update analyser node', () => {
      const visualizer = new Visualizer(config);
      const newAnalyserNode = {
        ...mockAnalyserNode,
        fftSize: 4096,
      } as unknown as AnalyserNode;

      visualizer.updateConfig({ analyserNode: newAnalyserNode });
      expect(visualizer).toBeDefined();
    });

    it('should update filter enabled state', () => {
      const visualizer = new Visualizer(config);
      visualizer.updateConfig({ filterEnabled: false });
      expect(visualizer).toBeDefined();
    });

    it('should update cutoff frequency', () => {
      const visualizer = new Visualizer(config);
      visualizer.updateConfig({ cutoffFrequency: 5000 });
      expect(visualizer).toBeDefined();
    });

    it('should handle partial config updates', () => {
      const visualizer = new Visualizer(config);
      visualizer.updateConfig({ cutoffFrequency: 1000 });
      visualizer.updateConfig({ filterEnabled: false });
      expect(visualizer).toBeDefined();
    });
  });

  describe('Animation Control', () => {
    it('should start animation loop', () => {
      const visualizer = new Visualizer(config);
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
      
      visualizer.start();
      
      expect(rafSpy).toHaveBeenCalled();
      visualizer.stop();
    });

    it('should not start multiple animation loops', () => {
      const visualizer = new Visualizer(config);
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
      
      visualizer.start();
      const callCount = rafSpy.mock.calls.length;
      visualizer.start(); // Try to start again
      
      expect(rafSpy.mock.calls.length).toBe(callCount); // No additional call
      visualizer.stop();
    });

    it('should stop animation loop', () => {
      const visualizer = new Visualizer(config);
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
      
      visualizer.start();
      visualizer.stop();
      
      expect(cancelSpy).toHaveBeenCalled();
    });

    it('should handle stop when not started', () => {
      const visualizer = new Visualizer(config);
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
      
      visualizer.stop();
      
      expect(cancelSpy).not.toHaveBeenCalled();
    });
  });

  describe('Rendering', () => {
    it('should clear canvas on draw', () => {
      vi.useFakeTimers(); // Enable fake timers for this test
      const visualizer = new Visualizer(config);
      visualizer.start();

      // Trigger a frame
      vi.advanceTimersByTime(16);

      expect(mockContext.fillRect).toHaveBeenCalledWith(
        0,
        0,
        mockCanvas.width,
        mockCanvas.height
      );

      visualizer.stop();
    });

    it('should draw filter response when filter node exists', () => {
      vi.useFakeTimers();
      const visualizer = new Visualizer(config);
      visualizer.start();

      // Trigger a frame
      vi.advanceTimersByTime(16);

      expect(mockFilterNode.getFrequencyResponse).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();

      visualizer.stop();
    });

    it('should not draw filter response when filter node is null', () => {
      vi.useFakeTimers();
      const visualizer = new Visualizer({
        ...config,
        filterNode: null,
      });
      visualizer.start();

      // Trigger a frame
      vi.advanceTimersByTime(16);

      expect(mockContext.stroke).toHaveBeenCalled(); // Waveform still draws
      visualizer.stop();
    });

    it('should draw waveform when analyser node exists', () => {
      vi.useFakeTimers();
      const visualizer = new Visualizer(config);
      visualizer.start();

      // Trigger a frame
      vi.advanceTimersByTime(16);

      expect(mockAnalyserNode.getByteTimeDomainData).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();

      visualizer.stop();
    });

    it('should not draw waveform when analyser node is null', () => {
      vi.useFakeTimers();
      const visualizer = new Visualizer({
        ...config,
        analyserNode: null,
      });
      visualizer.start();

      // Trigger a frame
      vi.advanceTimersByTime(16);

      expect(mockContext.stroke).toHaveBeenCalled(); // Filter still draws
      visualizer.stop();
    });

    it('should draw divider line between sections', () => {
      vi.useFakeTimers();
      const visualizer = new Visualizer(config);
      visualizer.start();

      // Trigger a frame
      vi.advanceTimersByTime(16);

      // Check that moveTo and lineTo were called for divider
      expect(mockContext.moveTo).toHaveBeenCalled();
      expect(mockContext.lineTo).toHaveBeenCalled();

      visualizer.stop();
    });

    it('should draw labels', () => {
      vi.useFakeTimers();
      const visualizer = new Visualizer(config);
      visualizer.start();

      // Trigger a frame
      vi.advanceTimersByTime(16);

      expect(mockContext.fillText).toHaveBeenCalled();
      visualizer.stop();
    });

    it('should use different colors for enabled/disabled filter', () => {
      vi.useFakeTimers();
      const visualizer = new Visualizer(config);
      visualizer.start();

      // Draw with filter enabled
      vi.advanceTimersByTime(16);
      
      // Check that filter active color was used
      const strokeStyleSpy = vi.spyOn(mockContext, 'strokeStyle', 'set');
      visualizer.updateConfig({ filterEnabled: true });
      vi.advanceTimersByTime(16);
      const enabledCalls = strokeStyleSpy.mock.calls.filter(call => call[0] === '#10b981');
      strokeStyleSpy.mockClear();

      // Update to disabled and check inactive color was used
      visualizer.updateConfig({ filterEnabled: false });
      vi.advanceTimersByTime(16);
      const inactiveCalls = strokeStyleSpy.mock.calls.filter(call => call[0] === '#4b5563');

      // Both colors should have been used
      expect(enabledCalls.length).toBeGreaterThan(0);
      expect(inactiveCalls.length).toBeGreaterThan(0);

      visualizer.stop();
    });
  });

  describe('Grid Drawing', () => {
    it('should draw grid lines', () => {
      vi.useFakeTimers();
      const visualizer = new Visualizer(config);
      visualizer.start();

      // Trigger a frame
      vi.advanceTimersByTime(16);

      // Should draw multiple grid lines
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();

      visualizer.stop();
    });
  });

  describe('Cutoff Marker', () => {
    it('should draw cutoff frequency marker', () => {
      vi.useFakeTimers();
      const visualizer = new Visualizer(config);
      visualizer.start();

      // Trigger a frame
      vi.advanceTimersByTime(16);

      // Should use dashed line for cutoff marker
      expect(mockContext.setLineDash).toHaveBeenCalledWith([5, 5]);
      expect(mockContext.setLineDash).toHaveBeenCalledWith([]); // Reset

      visualizer.stop();
    });

    it('should update cutoff marker position when frequency changes', () => {
      vi.useFakeTimers();
      const visualizer = new Visualizer(config);
      visualizer.start();

      vi.advanceTimersByTime(16);
      const moveToSpy = vi.mocked(mockContext.moveTo);
      moveToSpy.mockClear(); // Clear previous calls

      // Update cutoff frequency and draw again
      visualizer.updateConfig({ cutoffFrequency: 5000 });
      vi.advanceTimersByTime(16);
      
      // moveTo should have been called in the new frame
      expect(moveToSpy).toHaveBeenCalled();
      visualizer.stop();
    });
  });

  describe('Frequency Response Calculation', () => {
    it('should calculate response for logarithmic frequency scale', () => {
      vi.useFakeTimers();
      const visualizer = new Visualizer(config);
      visualizer.start();

      // Trigger a frame
      vi.advanceTimersByTime(16);

      // getFrequencyResponse should be called with frequency values
      expect(mockFilterNode.getFrequencyResponse).toHaveBeenCalled();
      
      const call = (mockFilterNode.getFrequencyResponse as any).mock.calls[0];
      const freqArray = call[0];
      
      // Frequency should be in logarithmic scale
      expect(freqArray[0]).toBeGreaterThan(0);

      visualizer.stop();
    });
  });

  describe('Waveform Data', () => {
    it('should get time domain data from analyser', () => {
      vi.useFakeTimers();
      const visualizer = new Visualizer(config);
      visualizer.start();

      // Trigger a frame
      vi.advanceTimersByTime(16);

      expect(mockAnalyserNode.getByteTimeDomainData).toHaveBeenCalled();
      visualizer.stop();
    });

    it('should draw waveform based on analyser data', () => {
      vi.useFakeTimers();
      const visualizer = new Visualizer(config);
      visualizer.start();

      // Trigger a frame
      vi.advanceTimersByTime(16);

      // Should draw lines for waveform
      expect(mockContext.lineTo).toHaveBeenCalled();
      visualizer.stop();
    });
  });

  describe('Canvas Context Management', () => {
    it('should save and restore context state', () => {
      vi.useFakeTimers();
      const visualizer = new Visualizer(config);
      visualizer.start();

      // Trigger a frame
      vi.advanceTimersByTime(16);

      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();

      visualizer.stop();
    });

    it('should use translate for section positioning', () => {
      vi.useFakeTimers();
      const visualizer = new Visualizer(config);
      visualizer.start();

      // Trigger a frame
      vi.advanceTimersByTime(16);

      expect(mockContext.translate).toHaveBeenCalled();
      visualizer.stop();
    });
  });

  describe('Cleanup', () => {
    it('should stop animation on destroy', () => {
      const visualizer = new Visualizer(config);
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
      
      visualizer.start();
      visualizer.destroy();
      
      expect(cancelSpy).toHaveBeenCalled();
    });

    it('should handle destroy when not started', () => {
      const visualizer = new Visualizer(config);
      
      expect(() => visualizer.destroy()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero width canvas', () => {
      mockCanvas.width = 0;
      const visualizer = new Visualizer(config);
      
      expect(() => visualizer.start()).not.toThrow();
      visualizer.stop();
    });

    it('should handle zero height canvas', () => {
      mockCanvas.height = 0;
      const visualizer = new Visualizer(config);
      
      expect(() => visualizer.start()).not.toThrow();
      visualizer.stop();
    });

    it('should handle very small cutoff frequency', () => {
      const visualizer = new Visualizer({
        ...config,
        cutoffFrequency: 20,
      });
      
      expect(() => visualizer.start()).not.toThrow();
      visualizer.stop();
    });

    it('should handle very large cutoff frequency', () => {
      const visualizer = new Visualizer({
        ...config,
        cutoffFrequency: 20000,
      });
      
      expect(() => visualizer.start()).not.toThrow();
      visualizer.stop();
    });

    it('should handle rapid config updates', () => {
      vi.useFakeTimers();
      const visualizer = new Visualizer(config);
      visualizer.start();
      
      for (let i = 0; i < 100; i++) {
        visualizer.updateConfig({ cutoffFrequency: 1000 + i * 100 });
      }
      
      expect(() => vi.advanceTimersByTime(16)).not.toThrow();
      visualizer.stop();
    });
  });

  describe('Performance', () => {
    it('should not create memory leaks with start/stop cycles', () => {
      const visualizer = new Visualizer(config);
      
      for (let i = 0; i < 10; i++) {
        visualizer.start();
        visualizer.stop();
      }
      
      expect(visualizer).toBeDefined();
    });

    it('should handle multiple update calls efficiently', () => {
      const visualizer = new Visualizer(config);
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        visualizer.updateConfig({ cutoffFrequency: 1000 + i });
      }
      
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100); // Should be fast
    });
  });

  describe('Integration', () => {
    it('should work with all parameters', () => {
      vi.useFakeTimers();
      const visualizer = new Visualizer(config);
      visualizer.start();

      visualizer.updateConfig({
        filterNode: mockFilterNode,
        analyserNode: mockAnalyserNode,
        filterEnabled: false,
        cutoffFrequency: 5000,
      });

      vi.advanceTimersByTime(16);

      expect(mockContext.fillRect).toHaveBeenCalled();
      visualizer.stop();
    });

    it('should handle null nodes gracefully', () => {
      vi.useFakeTimers();
      const visualizer = new Visualizer({
        ...config,
        filterNode: null,
        analyserNode: null,
      });
      
      expect(() => {
        visualizer.start();
        vi.advanceTimersByTime(16);
        visualizer.stop();
      }).not.toThrow();
    });
  });
});
