/**
 * FilterPanel.test.tsx - Tests for FilterPanel component
 * Tests filter type selection, cutoff/resonance controls, and enable/bypass toggle
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPanel } from '../../../../src/synth-v2/components/FilterPanel';
import { SynthProvider } from '../../../../src/synth-v2/context/SynthContext';
import { SynthEngine } from '../../../../src/synth-v2/core/SynthEngine';

// Mock FilterVisualizer to avoid canvas issues in tests
vi.mock('../../../../src/synth-v2/components/common/FilterVisualizer', () => ({
  FilterVisualizer: () => <div className="filter-visualizer">Mock Visualizer</div>
}));

// Mock the state modules
vi.mock('../../../../src/state', () => {
  const mockFilterSettings = {
    enabled: false,
    type: 'lowpass',
    cutoff: 20000,
    resonance: 1.0
  };

  const mockAnalyser = {
    connect: vi.fn(),
    disconnect: vi.fn()
  } as any;

  // Initialize oscillator configs
  const configs = new Map<1 | 2 | 3, any>();
  configs.set(1, { enabled: true, waveform: 'sine', octave: 0, detune: 0, volume: 0.8, pan: 0 });
  configs.set(2, { enabled: false, waveform: 'sawtooth', octave: 0, detune: 0, volume: 0.8, pan: 0 });
  configs.set(3, { enabled: false, waveform: 'square', octave: 0, detune: 0, volume: 0.8, pan: 0 });

  return {
    audioState: {
      filterSettings: mockFilterSettings,
      masterFilter: null as BiquadFilterNode | null,
      currentCustomFilter: null as any,
      setMasterFilter: vi.fn(),
      setCurrentCustomFilter: vi.fn()
    },
    visualizationState: {
      analyser: mockAnalyser,
      analyser1: mockAnalyser,
      analyser2: mockAnalyser,
      analyser3: mockAnalyser,
      setAnalyser: vi.fn(),
      setAnalyser1: vi.fn(),
      setAnalyser2: vi.fn(),
      setAnalyser3: vi.fn(),
      getAnalyserOrNull: vi.fn(() => mockAnalyser),
      getAnalyser1OrNull: vi.fn(() => mockAnalyser),
      getAnalyser2OrNull: vi.fn(() => mockAnalyser),
      getAnalyser3OrNull: vi.fn(() => mockAnalyser)
    },
    voiceState: {
      oscillatorConfigs: configs,
      activeVoices: new Map()
    },
    modulationState: {}
  };
});

import { audioState, visualizationState } from '../../../../src/state';

describe('FilterPanel', () => {
  let synthEngine: SynthEngine;

  beforeEach(async () => {
    synthEngine = new SynthEngine();
    await synthEngine.initialize();

    // Reset filter settings to defaults
    audioState.filterSettings.enabled = false;
    audioState.filterSettings.type = 'lowpass';
    audioState.filterSettings.cutoff = 20000;
    audioState.filterSettings.resonance = 1.0;
  });

  const renderFilterPanel = () => {
    return render(
      <SynthProvider engine={synthEngine}>
        <FilterPanel />
      </SynthProvider>
    );
  };

  describe('Rendering', () => {
    it('should render the filter panel', () => {
      renderFilterPanel();
      expect(screen.getByText('Master Filter')).toBeInTheDocument();
    });

    it('should render the enable/disable toggle button', () => {
      renderFilterPanel();
      const toggleBtn = screen.getByRole('button', { name: /OFF/i });
      expect(toggleBtn).toBeInTheDocument();
    });

    it('should render filter type dropdown', () => {
      renderFilterPanel();
      const select = screen.getByLabelText(/Filter Type/i);
      expect(select).toBeInTheDocument();
    });

    it('should render cutoff slider', () => {
      renderFilterPanel();
      expect(screen.getByText(/Cutoff/i)).toBeInTheDocument();
    });

    it('should render resonance slider', () => {
      renderFilterPanel();
      expect(screen.getByText(/Resonance/i)).toBeInTheDocument();
    });

    it('should have disabled class when filter is off', () => {
      renderFilterPanel();
      const panel = screen.getByText('Master Filter').closest('.filter-panel');
      expect(panel).toHaveClass('disabled');
    });
  });

  describe('Filter Toggle', () => {
    it('should toggle filter on when button is clicked', () => {
      renderFilterPanel();
      const toggleBtn = screen.getByRole('button', { name: /OFF/i });
      
      fireEvent.click(toggleBtn);
      
      expect(audioState.filterSettings.enabled).toBe(true);
      expect(screen.getByRole('button', { name: /ON/i })).toBeInTheDocument();
    });

    it('should toggle filter off when button is clicked again', () => {
      audioState.filterSettings.enabled = true;
      renderFilterPanel();
      const toggleBtn = screen.getByRole('button', { name: /ON/i });
      
      fireEvent.click(toggleBtn);
      
      expect(audioState.filterSettings.enabled).toBe(false);
      expect(screen.getByRole('button', { name: /OFF/i })).toBeInTheDocument();
    });

    it('should update state when enabled', () => {
      renderFilterPanel();
      const toggleBtn = screen.getByRole('button', { name: /OFF/i });
      
      expect(audioState.filterSettings.enabled).toBe(false);
      
      fireEvent.click(toggleBtn);
      
      // State should be updated to enabled
      expect(audioState.filterSettings.enabled).toBe(true);
    });

    it('should update state when disabled', () => {
      audioState.filterSettings.enabled = true;
      renderFilterPanel();
      const toggleBtn = screen.getByRole('button', { name: /ON/i });
      
      fireEvent.click(toggleBtn);
      
      // State should be updated to disabled
      expect(audioState.filterSettings.enabled).toBe(false);
    });

    it('should remove disabled class when enabled', () => {
      renderFilterPanel();
      const panel = screen.getByText('Master Filter').closest('.filter-panel');
      const toggleBtn = screen.getByRole('button', { name: /OFF/i });
      
      fireEvent.click(toggleBtn);
      
      expect(panel).not.toHaveClass('disabled');
    });
  });

  describe('Filter Type Selection', () => {
    it('should change filter type when dropdown is changed', () => {
      renderFilterPanel();
      const select = screen.getByLabelText(/Filter Type/i) as HTMLSelectElement;
      
      fireEvent.change(select, { target: { value: 'highpass' } });
      
      expect(audioState.filterSettings.type).toBe('highpass');
      expect(select.value).toBe('highpass');
    });

    it('should have all filter type options', () => {
      renderFilterPanel();
      const select = screen.getByLabelText(/Filter Type/i) as HTMLSelectElement;
      const options = Array.from(select.options).map(opt => opt.value);
      
      expect(options).toContain('lowpass');
      expect(options).toContain('lowpass12');
      expect(options).toContain('lowpass24');
      expect(options).toContain('highpass');
      expect(options).toContain('bandpass');
      expect(options).toContain('notch');
      expect(options).toContain('allpass');
      expect(options).toContain('peaking');
      expect(options).toContain('lowshelf');
      expect(options).toContain('highshelf');
    });

    it('should update state when filter type changes', () => {
      renderFilterPanel();
      const select = screen.getByLabelText(/Filter Type/i);
      
      expect(audioState.filterSettings.type).toBe('lowpass');
      
      fireEvent.change(select, { target: { value: 'highpass' } });
      
      // State should be updated
      expect(audioState.filterSettings.type).toBe('highpass');
    });

    it('should update state for lowpass12 custom filter', () => {
      renderFilterPanel();
      const select = screen.getByLabelText(/Filter Type/i);
      
      fireEvent.change(select, { target: { value: 'lowpass12' } });
      
      expect(audioState.filterSettings.type).toBe('lowpass12');
    });

    it('should update state for lowpass24 custom filter', () => {
      renderFilterPanel();
      const select = screen.getByLabelText(/Filter Type/i);
      
      fireEvent.change(select, { target: { value: 'lowpass24' } });
      
      expect(audioState.filterSettings.type).toBe('lowpass24');
    });
  });

  describe('Cutoff Control', () => {
    it('should update cutoff state when slider changes', () => {
      audioState.filterSettings.enabled = true;
      renderFilterPanel();
      
      // Find the cutoff slider (it's the first slider in the filter controls)
      const sliders = screen.getAllByRole('slider');
      const cutoffSlider = sliders[0]; // First slider is cutoff
      
      fireEvent.change(cutoffSlider, { target: { value: '50' } });
      
      // Cutoff state should be updated (value will be logarithmic)
      expect(audioState.filterSettings.cutoff).toBeGreaterThan(20);
      expect(audioState.filterSettings.cutoff).toBeLessThan(20000);
    });

    it('should use logarithmic scale for cutoff state', () => {
      audioState.filterSettings.enabled = true;
      renderFilterPanel();
      
      const sliders = screen.getAllByRole('slider');
      const cutoffSlider = sliders[0];
      
      // Set to 25% of range
      fireEvent.change(cutoffSlider, { target: { value: '25' } });
      const freq25 = audioState.filterSettings.cutoff;
      
      // Set to 50% of range
      fireEvent.change(cutoffSlider, { target: { value: '50' } });
      const freq50 = audioState.filterSettings.cutoff;
      
      // Logarithmic scale means 50% is NOT double of 25%
      // It should be more than double due to log scaling
      expect(freq50 / freq25).toBeGreaterThan(2);
      expect(freq50).toBeGreaterThan(freq25 * 2);
    });

    it('should update cutoff state even when disabled', () => {
      audioState.filterSettings.enabled = false;
      renderFilterPanel();
      const initialCutoff = audioState.filterSettings.cutoff;
      
      const sliders = screen.getAllByRole('slider');
      const cutoffSlider = sliders[0];
      
      fireEvent.change(cutoffSlider, { target: { value: '50' } });
      
      // State should update (stored for when filter is re-enabled)
      expect(audioState.filterSettings.cutoff).not.toBe(initialCutoff);
    });

    it('should format frequency display correctly', () => {
      audioState.filterSettings.cutoff = 500;
      renderFilterPanel();
      
      // Should display in Hz for values < 1000
      expect(screen.getByText(/500 Hz/i)).toBeInTheDocument();
    });

    it('should format frequency display in kHz for high values', () => {
      audioState.filterSettings.cutoff = 5000;
      renderFilterPanel();
      
      // Should display in kHz for values >= 1000
      expect(screen.getByText(/5.00 kHz/i)).toBeInTheDocument();
    });
  });

  describe('Resonance Control', () => {
    it('should update resonance state when slider changes', () => {
      renderFilterPanel();
      
      const sliders = screen.getAllByRole('slider');
      const resonanceSlider = sliders[1]; // Second slider is resonance
      
      fireEvent.change(resonanceSlider, { target: { value: '30' } });
      
      // Resonance state should be updated (slider value / 10)
      expect(audioState.filterSettings.resonance).toBe(3.0);
    });

    it('should update resonance state for custom filters', () => {
      renderFilterPanel();
      const select = screen.getByLabelText(/Filter Type/i);
      
      // Switch to custom filter
      fireEvent.change(select, { target: { value: 'lowpass12' } });
      
      const sliders = screen.getAllByRole('slider');
      const resonanceSlider = sliders[1];
      
      fireEvent.change(resonanceSlider, { target: { value: '40' } });
      
      expect(audioState.filterSettings.resonance).toBe(4.0);
    });

    it('should format resonance display correctly', () => {
      audioState.filterSettings.resonance = 2.5;
      renderFilterPanel();
      
      expect(screen.getByText('2.5')).toBeInTheDocument();
    });
  });

  describe('FilterVisualizer Integration', () => {
    it('should render filter visualizer component', () => {
      renderFilterPanel();
      // Our mocked visualizer should render
      expect(screen.getByText('Mock Visualizer')).toBeInTheDocument();
    });

    it('should render visualizer within panel', () => {
      renderFilterPanel();
      const visualizer = screen.getByText('Mock Visualizer');
      expect(visualizer).toHaveClass('filter-visualizer');
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme cutoff values', () => {
      audioState.filterSettings.enabled = true;
      renderFilterPanel();
      
      const sliders = screen.getAllByRole('slider');
      const cutoffSlider = sliders[0];
      
      // Test minimum (0) - should be close to 20 Hz
      fireEvent.change(cutoffSlider, { target: { value: '0' } });
      expect(audioState.filterSettings.cutoff).toBeGreaterThan(19);
      expect(audioState.filterSettings.cutoff).toBeLessThan(25);
      
      // Test maximum (100) - should be close to 20 kHz
      fireEvent.change(cutoffSlider, { target: { value: '100' } });
      expect(audioState.filterSettings.cutoff).toBeGreaterThan(19000);
      expect(audioState.filterSettings.cutoff).toBeLessThanOrEqual(20000);
    });

    it('should handle extreme resonance values', () => {
      renderFilterPanel();
      
      const sliders = screen.getAllByRole('slider');
      const resonanceSlider = sliders[1];
      
      // Test minimum (0)
      fireEvent.change(resonanceSlider, { target: { value: '0' } });
      expect(audioState.filterSettings.resonance).toBe(0);
      
      // Test maximum (50 -> Q of 5.0)
      fireEvent.change(resonanceSlider, { target: { value: '50' } });
      expect(audioState.filterSettings.resonance).toBe(5.0);
    });

    it('should handle rapid filter type changes', () => {
      renderFilterPanel();
      const select = screen.getByLabelText(/Filter Type/i);
      
      // Rapidly change filter types
      fireEvent.change(select, { target: { value: 'highpass' } });
      fireEvent.change(select, { target: { value: 'bandpass' } });
      fireEvent.change(select, { target: { value: 'lowpass' } });
      
      // State should end up with lowpass
      expect(audioState.filterSettings.type).toBe('lowpass');
    });
  });
});
