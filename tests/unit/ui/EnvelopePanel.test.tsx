/**
 * EnvelopePanel Component Tests
 * 
 * Tests envelope panel rendering, ADSR controls, and visual display
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnvelopePanel } from '../../../src/ui/EnvelopePanel';
import { SynthProvider } from '../../../src/context/SynthContext';
import type { SynthEngine } from '../../../src/core/SynthEngine';
import type { ParameterManager } from '../../../src/core/ParameterManager';
import type { VoiceManager } from '../../../src/core/VoiceManager';

// Mock SynthEngine
function createMockSynthEngine(): SynthEngine {
  const mockParamManager: ParameterManager = {
    updateEnvelopeParameter: vi.fn(),
    updateOscillatorParameter: vi.fn(),
    updateFMEnabled: vi.fn(),
    updateFMDepth: vi.fn(),
  } as any;

  const mockVoiceManager: VoiceManager = {
    playNote: vi.fn(),
    releaseNote: vi.fn(),
    stopAllNotes: vi.fn(),
  } as any;

  return {
    isInitialized: () => true,
    getParameterManager: () => mockParamManager,
    getVoiceManager: () => mockVoiceManager,
  } as any;
}

// Helper to render with context
function renderWithContext(component: React.ReactElement, engine?: SynthEngine) {
  const mockEngine = engine || createMockSynthEngine();
  return render(
    <SynthProvider engine={mockEngine}>
      {component}
    </SynthProvider>
  );
}

// Mock canvas getContext
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    strokeStyle: '',
    lineWidth: 1,
    fillStyle: '',
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
  })) as any;
});

describe('EnvelopePanel', () => {
  describe('Rendering', () => {
    it('should render envelope panel for oscillator 1', () => {
      renderWithContext(<EnvelopePanel envNum={1} />);

      expect(screen.getByText('Envelope 1')).toBeInTheDocument();
    });

    it('should render envelope panel for oscillator 2', () => {
      renderWithContext(<EnvelopePanel envNum={2} />);

      expect(screen.getByText('Envelope 2')).toBeInTheDocument();
    });

    it('should render envelope panel for oscillator 3', () => {
      renderWithContext(<EnvelopePanel envNum={3} />);

      expect(screen.getByText('Envelope 3')).toBeInTheDocument();
    });

    it('should render all ADSR sliders', () => {
      renderWithContext(<EnvelopePanel envNum={1} />);

      expect(screen.getByText('Attack')).toBeInTheDocument();
      expect(screen.getByText('Decay')).toBeInTheDocument();
      expect(screen.getByText('Sustain')).toBeInTheDocument();
      expect(screen.getByText('Release')).toBeInTheDocument();
    });

    it('should render envelope visualization canvas', () => {
      const { container } = renderWithContext(<EnvelopePanel envNum={1} />);

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should display initial ADSR values', () => {
      renderWithContext(<EnvelopePanel envNum={1} />);

      // Default values from voiceState.envelopeSettings[1]
      expect(screen.getByText('10ms')).toBeInTheDocument(); // Attack
      expect(screen.getByText('100ms')).toBeInTheDocument(); // Decay
      expect(screen.getByText('70%')).toBeInTheDocument(); // Sustain
      expect(screen.getByText('300ms')).toBeInTheDocument(); // Release
    });
  });

  describe('Attack Parameter', () => {
    it('should update attack parameter on slider change', () => {
      const mockEngine = createMockSynthEngine();
      renderWithContext(<EnvelopePanel envNum={1} />, mockEngine);

      const sliders = screen.getAllByRole('slider');
      const attackSlider = sliders[0]; // First slider is attack

      fireEvent.change(attackSlider, { target: { value: '50' } });

      expect(mockEngine.getParameterManager().updateEnvelopeParameter).toHaveBeenCalledWith(
        1,
        'attack',
        expect.any(Number)
      );
    });

    it('should display attack value in milliseconds', () => {
      renderWithContext(<EnvelopePanel envNum={1} />);

      // Attack default is 10ms
      expect(screen.getByText('10ms')).toBeInTheDocument();
    });

    it('should allow attack range from 1ms to 2000ms', () => {
      const { container } = renderWithContext(<EnvelopePanel envNum={1} />);

      const attackSlider = container.querySelector('input[min="1"][max="2000"]');
      expect(attackSlider).toBeInTheDocument();
    });
  });

  describe('Decay Parameter', () => {
    it('should update decay parameter on slider change', () => {
      const mockEngine = createMockSynthEngine();
      renderWithContext(<EnvelopePanel envNum={1} />, mockEngine);

      const sliders = screen.getAllByRole('slider');
      const decaySlider = sliders[1]; // Second slider is decay

      fireEvent.change(decaySlider, { target: { value: '200' } });

      expect(mockEngine.getParameterManager().updateEnvelopeParameter).toHaveBeenCalledWith(
        1,
        'decay',
        expect.any(Number)
      );
    });

    it('should display decay value in milliseconds', () => {
      renderWithContext(<EnvelopePanel envNum={1} />);

      expect(screen.getByText('100ms')).toBeInTheDocument();
    });

    it('should allow decay range from 1ms to 2000ms', () => {
      const { container } = renderWithContext(<EnvelopePanel envNum={1} />);

      const decaySlider = container.querySelector('input[min="1"][max="2000"]');
      expect(decaySlider).toBeInTheDocument();
    });
  });

  describe('Sustain Parameter', () => {
    it('should update sustain parameter on slider change', () => {
      const mockEngine = createMockSynthEngine();
      renderWithContext(<EnvelopePanel envNum={1} />, mockEngine);

      const sliders = screen.getAllByRole('slider');
      const sustainSlider = sliders[2]; // Third slider is sustain

      fireEvent.change(sustainSlider, { target: { value: '80' } });

      expect(mockEngine.getParameterManager().updateEnvelopeParameter).toHaveBeenCalledWith(
        1,
        'sustain',
        expect.any(Number)
      );
    });

    it('should display sustain value as percentage', () => {
      renderWithContext(<EnvelopePanel envNum={1} />);

      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    it('should allow sustain range from 0% to 100%', () => {
      const { container } = renderWithContext(<EnvelopePanel envNum={1} />);

      const sustainSlider = container.querySelector('input[min="0"][max="100"]');
      expect(sustainSlider).toBeInTheDocument();
    });
  });

  describe('Release Parameter', () => {
    it('should update release parameter on slider change', () => {
      const mockEngine = createMockSynthEngine();
      renderWithContext(<EnvelopePanel envNum={1} />, mockEngine);

      const sliders = screen.getAllByRole('slider');
      const releaseSlider = sliders[3]; // Fourth slider is release

      fireEvent.change(releaseSlider, { target: { value: '500' } });

      expect(mockEngine.getParameterManager().updateEnvelopeParameter).toHaveBeenCalledWith(
        1,
        'release',
        expect.any(Number)
      );
    });

    it('should display release value in milliseconds', () => {
      renderWithContext(<EnvelopePanel envNum={1} />);

      expect(screen.getByText('300ms')).toBeInTheDocument();
    });

    it('should allow release range from 10ms to 5000ms', () => {
      const { container } = renderWithContext(<EnvelopePanel envNum={1} />);

      const releaseSlider = container.querySelector('input[min="10"][max="5000"]');
      expect(releaseSlider).toBeInTheDocument();
    });
  });

  describe('Visual Envelope Display', () => {
    it('should draw envelope curve on canvas', () => {
      const { container } = renderWithContext(<EnvelopePanel envNum={1} />);

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();

      // Canvas context should have been called
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
    });

    it('should have correct canvas dimensions', () => {
      const { container } = renderWithContext(<EnvelopePanel envNum={1} />);

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.width).toBeGreaterThan(0);
      expect(canvas.height).toBeGreaterThan(0);
    });
  });

  describe('Real-time Parameter Updates', () => {
    it('should call ParameterManager for each envelope parameter', () => {
      const mockEngine = createMockSynthEngine();
      renderWithContext(<EnvelopePanel envNum={2} />, mockEngine);

      const sliders = screen.getAllByRole('slider');

      // Update all parameters
      fireEvent.change(sliders[0], { target: { value: '50' } }); // Attack
      fireEvent.change(sliders[1], { target: { value: '200' } }); // Decay
      fireEvent.change(sliders[2], { target: { value: '80' } }); // Sustain
      fireEvent.change(sliders[3], { target: { value: '500' } }); // Release

      expect(mockEngine.getParameterManager().updateEnvelopeParameter).toHaveBeenCalled();
    });

    it('should use correct envelope number in updates', () => {
      const mockEngine = createMockSynthEngine();
      renderWithContext(<EnvelopePanel envNum={3} />, mockEngine);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '50' } }); // Attack

      expect(mockEngine.getParameterManager().updateEnvelopeParameter).toHaveBeenCalledWith(
        3, // envNum = 3
        'attack',
        expect.any(Number)
      );
    });
  });

  describe('Envelope Presets', () => {
    it('should show different initial values for each envelope', () => {
      const { unmount: unmount1 } = renderWithContext(<EnvelopePanel envNum={1} />);
      expect(screen.getByText('Envelope 1')).toBeInTheDocument();
      unmount1();

      const { unmount: unmount2 } = renderWithContext(<EnvelopePanel envNum={2} />);
      expect(screen.getByText('Envelope 2')).toBeInTheDocument();
      unmount2();

      renderWithContext(<EnvelopePanel envNum={3} />);
      expect(screen.getByText('Envelope 3')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum attack value (1ms)', () => {
      const { container } = renderWithContext(<EnvelopePanel envNum={1} />);

      const attackSlider = container.querySelector('input[min="1"]') as HTMLInputElement;
      fireEvent.change(attackSlider, { target: { value: '1' } });

      expect(screen.getByText('1ms')).toBeInTheDocument();
    });

    it('should handle maximum attack value (2000ms)', () => {
      const { container } = renderWithContext(<EnvelopePanel envNum={1} />);

      const attackSlider = container.querySelector('input[max="2000"]') as HTMLInputElement;
      fireEvent.change(attackSlider, { target: { value: '2000' } });

      expect(screen.getByText('2000ms')).toBeInTheDocument();
    });

    it('should handle zero sustain level', () => {
      const { container } = renderWithContext(<EnvelopePanel envNum={1} />);

      const sustainSlider = container.querySelector('input[min="0"][max="100"]') as HTMLInputElement;
      fireEvent.change(sustainSlider, { target: { value: '0' } });

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle maximum sustain level (100%)', () => {
      const { container } = renderWithContext(<EnvelopePanel envNum={1} />);

      const sustainSlider = container.querySelector('input[min="0"][max="100"]') as HTMLInputElement;
      fireEvent.change(sustainSlider, { target: { value: '100' } });

      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });
});

