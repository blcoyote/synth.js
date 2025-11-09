/**
 * OscillatorPanel Component Tests
 * Tests oscillator controls, parameter updates, and UI interactions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OscillatorPanel } from '../../../src/ui/OscillatorPanel';
import { SynthProvider } from '../../../src/context/SynthContext';

// Create mock configs that will be shared across tests
let mockOscillatorConfigs: Map<1 | 2 | 3, any>;

// Mock the state modules
vi.mock('../../../src/state', () => {
  // Initialize configs inside the factory
  const configs = new Map<1 | 2 | 3, any>();
  configs.set(1, { enabled: true, waveform: 'sine', octave: 0, detune: 0, volume: 0.8, pan: 0 });
  configs.set(2, { enabled: false, waveform: 'sawtooth', octave: 0, detune: 0, volume: 0.8, pan: 0 });
  configs.set(3, { enabled: false, waveform: 'square', octave: 0, detune: 0, volume: 0.8, pan: 0 });

  return {
    voiceState: { oscillatorConfigs: configs },
    audioState: {},
    modulationState: {},
    visualizationState: {
      getAnalyser1OrNull: vi.fn(() => null),
      getAnalyser2OrNull: vi.fn(() => null),
      getAnalyser3OrNull: vi.fn(() => null),
    },
  };
});

// Import the mocked state after vi.mock
import { voiceState } from '../../../src/state';

// Mock oscillator config type
interface OscillatorConfig {
  enabled: boolean;
  waveform: 'sine' | 'sawtooth' | 'square' | 'triangle';
  octave: number;
  detune: number;
  volume: number;
  pan: number;
}

// Mock the synth engine
const createMockEngine = () => {
  const mockParameterManager = {
    updateOscillatorParameter: vi.fn(),
    updateFMEnabled: vi.fn(),
  };

  return {
    getParameterManager: vi.fn(() => mockParameterManager),
    parameterManager: mockParameterManager,
  };
};

describe('OscillatorPanel', () => {
  let mockEngine: ReturnType<typeof createMockEngine>;

  beforeEach(() => {
    // Create new mock engine for each test
    mockEngine = createMockEngine();
    
    // Reset the mocked state before each test
    mockOscillatorConfigs = voiceState.oscillatorConfigs as Map<1 | 2 | 3, any>;
    
    // Reset configs to initial state
    mockOscillatorConfigs.clear();
    mockOscillatorConfigs.set(1, { enabled: true, waveform: 'sine', octave: 0, detune: 0, volume: 0.8, pan: 0 });
    mockOscillatorConfigs.set(2, { enabled: false, waveform: 'sawtooth', octave: 0, detune: 0, volume: 0.8, pan: 0 });
    mockOscillatorConfigs.set(3, { enabled: false, waveform: 'square', octave: 0, detune: 0, volume: 0.8, pan: 0 });
    
    // Reset mock call counts
    vi.clearAllMocks();
  });

  const renderPanel = (oscNum: 1 | 2 | 3 = 1) => {
    return render(
      <SynthProvider engine={mockEngine as any}>
        <OscillatorPanel oscNum={oscNum} />
      </SynthProvider>
    );
  };

  describe('Waveform Selection', () => {
    it('should render all waveform options', () => {
      renderPanel(1);
      
      expect(screen.getByText('sine')).toBeInTheDocument();
      expect(screen.getByText('sawtooth')).toBeInTheDocument();
      expect(screen.getByText('square')).toBeInTheDocument();
      expect(screen.getByText('triangle')).toBeInTheDocument();
    });

    it('should highlight current waveform', () => {
      renderPanel(1);
      
      const sineBtn = screen.getByText('sine');
      expect(sineBtn.className).toContain('active');
    });

    it('should change waveform on click', () => {
      renderPanel(1);
      
      const sawtoothBtn = screen.getByText('sawtooth');
      fireEvent.click(sawtoothBtn);
      
      const config = mockOscillatorConfigs.get(1)!;
      expect(config.waveform).toBe('sawtooth');
    });

    it('should update active state after waveform change', () => {
      renderPanel(1);
      
      const squareBtn = screen.getByText('square');
      fireEvent.click(squareBtn);
      
      expect(squareBtn.className).toContain('active');
    });

    it('should switch between all waveforms', () => {
      renderPanel(1);
      const config = mockOscillatorConfigs.get(1)!;
      
      fireEvent.click(screen.getByText('sawtooth'));
      expect(config.waveform).toBe('sawtooth');
      
      fireEvent.click(screen.getByText('square'));
      expect(config.waveform).toBe('square');
      
      fireEvent.click(screen.getByText('triangle'));
      expect(config.waveform).toBe('triangle');
      
      fireEvent.click(screen.getByText('sine'));
      expect(config.waveform).toBe('sine');
    });
  });

  describe('Volume Control', () => {
    it('should render volume slider', () => {
      renderPanel(1);
      
      expect(screen.getByText('Volume')).toBeInTheDocument();
      const sliders = screen.getAllByRole('slider');
      expect(sliders.length).toBeGreaterThan(0);
    });

    it('should call updateOscillatorParameter on volume change', () => {
      renderPanel(1);
      
      const volumeSlider = screen.getAllByRole('slider')[0]; // First slider is volume
      fireEvent.change(volumeSlider, { target: { value: '50' } });
      
      expect(mockEngine.parameterManager.updateOscillatorParameter).toHaveBeenCalledWith(
        1,
        'volume',
        0.5 // 50 / 100 = 0.5
      );
    });

    it('should handle volume range 0-100', () => {
      renderPanel(1);
      
      const volumeSlider = screen.getAllByRole('slider')[0];
      
      fireEvent.change(volumeSlider, { target: { value: '0' } });
      expect(mockEngine.parameterManager.updateOscillatorParameter).toHaveBeenCalledWith(1, 'volume', 0);
      
      fireEvent.change(volumeSlider, { target: { value: '100' } });
      expect(mockEngine.parameterManager.updateOscillatorParameter).toHaveBeenCalledWith(1, 'volume', 1);
    });
  });

  describe('Pan Control', () => {
    it('should render pan slider', () => {
      renderPanel(1);
      expect(screen.getByText('Pan')).toBeInTheDocument();
    });

    it('should call updateOscillatorParameter on pan change', () => {
      renderPanel(1);
      
      const panSlider = screen.getAllByRole('slider')[1]; // Second slider is pan
      fireEvent.change(panSlider, { target: { value: '50' } });
      
      expect(mockEngine.parameterManager.updateOscillatorParameter).toHaveBeenCalledWith(
        1,
        'pan',
        0.5 // 50 / 100 = 0.5
      );
    });

    it('should handle negative pan values', () => {
      renderPanel(1);
      
      const panSlider = screen.getAllByRole('slider')[1];
      fireEvent.change(panSlider, { target: { value: '-50' } });
      
      expect(mockEngine.parameterManager.updateOscillatorParameter).toHaveBeenCalledWith(
        1,
        'pan',
        -0.5 // -50 / 100 = -0.5
      );
    });

    it('should handle pan range -100 to 100', () => {
      renderPanel(1);
      
      const panSlider = screen.getAllByRole('slider')[1];
      
      fireEvent.change(panSlider, { target: { value: '-100' } });
      expect(mockEngine.parameterManager.updateOscillatorParameter).toHaveBeenCalledWith(1, 'pan', -1);
      
      fireEvent.change(panSlider, { target: { value: '100' } });
      expect(mockEngine.parameterManager.updateOscillatorParameter).toHaveBeenCalledWith(1, 'pan', 1);
    });
  });

  describe('Octave Control', () => {
    it('should render octave slider', () => {
      renderPanel(1);
      expect(screen.getByText('Octave')).toBeInTheDocument();
    });

    it('should call updateOscillatorParameter on octave change', () => {
      renderPanel(1);
      
      const octaveSlider = screen.getAllByRole('slider')[2]; // Third slider is octave
      fireEvent.change(octaveSlider, { target: { value: '1' } });
      
      expect(mockEngine.parameterManager.updateOscillatorParameter).toHaveBeenCalledWith(
        1,
        'octave',
        1
      );
    });

    it('should handle negative octave values', () => {
      renderPanel(1);
      
      const octaveSlider = screen.getAllByRole('slider')[2];
      fireEvent.change(octaveSlider, { target: { value: '-2' } });
      
      expect(mockEngine.parameterManager.updateOscillatorParameter).toHaveBeenCalledWith(
        1,
        'octave',
        -2
      );
    });

    it('should handle octave range -2 to 2', () => {
      renderPanel(1);
      
      const octaveSlider = screen.getAllByRole('slider')[2];
      
      fireEvent.change(octaveSlider, { target: { value: '-2' } });
      expect(mockEngine.parameterManager.updateOscillatorParameter).toHaveBeenCalledWith(1, 'octave', -2);
      
      fireEvent.change(octaveSlider, { target: { value: '2' } });
      expect(mockEngine.parameterManager.updateOscillatorParameter).toHaveBeenCalledWith(1, 'octave', 2);
    });
  });

  describe('Detune Control', () => {
    it('should render detune slider', () => {
      renderPanel(1);
      expect(screen.getByText('Detune')).toBeInTheDocument();
    });

    it('should call updateOscillatorParameter on detune change', () => {
      renderPanel(1);
      
      const detuneSlider = screen.getAllByRole('slider')[3]; // Fourth slider is detune
      fireEvent.change(detuneSlider, { target: { value: '50' } });
      
      expect(mockEngine.parameterManager.updateOscillatorParameter).toHaveBeenCalledWith(
        1,
        'detune',
        50
      );
    });

    it('should handle negative detune values', () => {
      renderPanel(1);
      
      const detuneSlider = screen.getAllByRole('slider')[3];
      fireEvent.change(detuneSlider, { target: { value: '-25' } });
      
      expect(mockEngine.parameterManager.updateOscillatorParameter).toHaveBeenCalledWith(
        1,
        'detune',
        -25
      );
    });

    it('should handle detune range -100 to 100 cents', () => {
      renderPanel(1);
      
      const detuneSlider = screen.getAllByRole('slider')[3];
      
      fireEvent.change(detuneSlider, { target: { value: '-100' } });
      expect(mockEngine.parameterManager.updateOscillatorParameter).toHaveBeenCalledWith(1, 'detune', -100);
      
      fireEvent.change(detuneSlider, { target: { value: '100' } });
      expect(mockEngine.parameterManager.updateOscillatorParameter).toHaveBeenCalledWith(1, 'detune', 100);
    });
  });

  describe('Multiple Oscillators', () => {
    it('should independently control oscillator 1', () => {
      renderPanel(1);
      
      const volumeSlider = screen.getAllByRole('slider')[0];
      fireEvent.change(volumeSlider, { target: { value: '60' } });
      
      expect(mockEngine.parameterManager.updateOscillatorParameter).toHaveBeenCalledWith(1, 'volume', 0.6);
    });

    it('should independently control oscillator 2', () => {
      // First enable oscillator 2
      mockOscillatorConfigs.get(2)!.enabled = true;
      renderPanel(2);
      
      const volumeSlider = screen.getAllByRole('slider')[0];
      fireEvent.change(volumeSlider, { target: { value: '40' } });
      
      expect(mockEngine.parameterManager.updateOscillatorParameter).toHaveBeenCalledWith(2, 'volume', 0.4);
    });

    it('should independently control oscillator 3', () => {
      // Follow the exact same pattern as oscillator 2 - enable before render
      mockOscillatorConfigs.get(3)!.enabled = true;
      renderPanel(3);
      
      const volumeSlider = screen.getAllByRole('slider')[0];
      fireEvent.change(volumeSlider, { target: { value: '70' } });
      
      expect(mockEngine.parameterManager.updateOscillatorParameter).toHaveBeenCalledWith(3, 'volume', 0.7);
    });
  });

  describe('Context Integration', () => {
    it('should throw error when used outside SynthProvider', () => {
      // Suppress console error for this test
      vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<OscillatorPanel oscNum={1} />);
      }).toThrow('useSynthEngine must be used within a SynthProvider');
    });

    it('should access parameter manager from engine', () => {
      renderPanel(1);
      
      expect(mockEngine.getParameterManager).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle config being undefined initially', () => {
      // Remove config to test undefined case
      mockOscillatorConfigs.delete(1);
      
      // Should not crash, just render with defaults
      expect(() => renderPanel(1)).not.toThrow();
    });

    it('should handle rapid parameter changes', () => {
      renderPanel(1);
      
      const volumeSlider = screen.getAllByRole('slider')[0];
      
      fireEvent.change(volumeSlider, { target: { value: '10' } });
      fireEvent.change(volumeSlider, { target: { value: '50' } });
      fireEvent.change(volumeSlider, { target: { value: '90' } });
      
      expect(mockEngine.parameterManager.updateOscillatorParameter).toHaveBeenCalledTimes(3);
    });

    it('should handle all controls being changed in sequence', () => {
      renderPanel(1);
      
      const sliders = screen.getAllByRole('slider');
      
      fireEvent.change(sliders[0], { target: { value: '50' } }); // Volume
      fireEvent.change(sliders[1], { target: { value: '25' } }); // Pan
      fireEvent.change(sliders[2], { target: { value: '1' } }); // Octave
      fireEvent.change(sliders[3], { target: { value: '10' } }); // Detune
      
      expect(mockEngine.parameterManager.updateOscillatorParameter).toHaveBeenCalledTimes(4);
    });
  });
});

