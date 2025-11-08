/**
 * Slider Component Tests
 * Tests slider interaction, value display, and callbacks
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Slider } from '../../../../src/synth-v2/components/common/Slider';

describe('Slider', () => {
  describe('Rendering', () => {
    it('should render with label', () => {
      const onChange = vi.fn();
      render(<Slider label="Volume" min={0} max={100} onChange={onChange} />);

      expect(screen.getByText('Volume')).toBeInTheDocument();
    });

    it('should render slider input', () => {
      const onChange = vi.fn();
      render(<Slider label="Volume" min={0} max={100} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('type', 'range');
    });

    it('should display initial value', () => {
      const onChange = vi.fn();
      render(
        <Slider label="Volume" min={0} max={100} initialValue={50} onChange={onChange} />
      );

      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should display value with unit', () => {
      const onChange = vi.fn();
      render(
        <Slider label="Volume" min={0} max={100} initialValue={75} unit="%" onChange={onChange} />
      );

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should use custom formatValue function', () => {
      const onChange = vi.fn();
      const formatValue = (val: number) => (val === 0 ? 'Center' : `${val}`);

      render(
        <Slider
          label="Pan"
          min={-100}
          max={100}
          initialValue={0}
          onChange={onChange}
          formatValue={formatValue}
        />
      );

      expect(screen.getByText('Center')).toBeInTheDocument();
    });
  });

  describe('Slider Configuration', () => {
    it('should set correct min and max attributes', () => {
      const onChange = vi.fn();
      render(<Slider label="Volume" min={0} max={100} onChange={onChange} />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.min).toBe('0');
      expect(slider.max).toBe('100');
    });

    it('should set custom step value', () => {
      const onChange = vi.fn();
      render(<Slider label="Volume" min={0} max={100} step={5} onChange={onChange} />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.step).toBe('5');
    });

    it('should default to step of 1', () => {
      const onChange = vi.fn();
      render(<Slider label="Volume" min={0} max={100} onChange={onChange} />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.step).toBe('1');
    });

    it('should set initial value correctly', () => {
      const onChange = vi.fn();
      render(<Slider label="Volume" min={0} max={100} initialValue={60} onChange={onChange} />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.value).toBe('60');
    });

    it('should default to 0 when no initial value provided', () => {
      const onChange = vi.fn();
      render(<Slider label="Volume" min={0} max={100} onChange={onChange} />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.value).toBe('0');
    });
  });

  describe('User Interaction', () => {
    it('should call onChange when slider value changes', () => {
      const onChange = vi.fn();
      render(<Slider label="Volume" min={0} max={100} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '75' } });

      expect(onChange).toHaveBeenCalledWith(75);
    });

    it('should update displayed value when slider changes', () => {
      const onChange = vi.fn();
      render(<Slider label="Volume" min={0} max={100} initialValue={0} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '80' } });

      expect(screen.getByText('80')).toBeInTheDocument();
    });

    it('should handle multiple value changes', () => {
      const onChange = vi.fn();
      render(<Slider label="Volume" min={0} max={100} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      
      fireEvent.change(slider, { target: { value: '25' } });
      fireEvent.change(slider, { target: { value: '50' } });
      fireEvent.change(slider, { target: { value: '75' } });

      expect(onChange).toHaveBeenCalledTimes(3);
      expect(onChange).toHaveBeenNthCalledWith(1, 25);
      expect(onChange).toHaveBeenNthCalledWith(2, 50);
      expect(onChange).toHaveBeenNthCalledWith(3, 75);
    });

    it('should handle negative values', () => {
      const onChange = vi.fn();
      render(<Slider label="Pan" min={-100} max={100} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '-50' } });

      expect(onChange).toHaveBeenCalledWith(-50);
      expect(screen.getByText('-50')).toBeInTheDocument();
    });

    it('should handle decimal values', () => {
      const onChange = vi.fn();
      render(<Slider label="Fine" min={0} max={10} step={0.1} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '5.5' } });

      expect(onChange).toHaveBeenCalledWith(5.5);
    });
  });

  describe('Value Formatting', () => {
    it('should format positive pan values', () => {
      const onChange = vi.fn();
      const formatValue = (val: number) => {
        if (val > 10) return `${Math.round(val)}% R`;
        if (val < -10) return `${Math.abs(Math.round(val))}% L`;
        return 'Center';
      };

      render(
        <Slider
          label="Pan"
          min={-100}
          max={100}
          initialValue={50}
          onChange={onChange}
          formatValue={formatValue}
        />
      );

      expect(screen.getByText('50% R')).toBeInTheDocument();
    });

    it('should format negative pan values', () => {
      const onChange = vi.fn();
      const formatValue = (val: number) => {
        if (val > 10) return `${Math.round(val)}% R`;
        if (val < -10) return `${Math.abs(Math.round(val))}% L`;
        return 'Center';
      };

      render(
        <Slider
          label="Pan"
          min={-100}
          max={100}
          initialValue={-50}
          onChange={onChange}
          formatValue={formatValue}
        />
      );

      expect(screen.getByText('50% L')).toBeInTheDocument();
    });

    it('should format center pan value', () => {
      const onChange = vi.fn();
      const formatValue = (val: number) => {
        if (val > 10) return `${Math.round(val)}% R`;
        if (val < -10) return `${Math.abs(Math.round(val))}% L`;
        return 'Center';
      };

      render(
        <Slider
          label="Pan"
          min={-100}
          max={100}
          initialValue={0}
          onChange={onChange}
          formatValue={formatValue}
        />
      );

      expect(screen.getByText('Center')).toBeInTheDocument();
    });

    it('should format octave values with +/- signs', () => {
      const onChange = vi.fn();
      const formatValue = (val: number) => (val >= 0 ? `+${val}` : `${val}`);

      render(
        <Slider
          label="Octave"
          min={-2}
          max={2}
          initialValue={1}
          onChange={onChange}
          formatValue={formatValue}
        />
      );

      expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('should update formatted value when slider changes', () => {
      const onChange = vi.fn();
      const formatValue = (val: number) => `Level ${val}`;

      render(
        <Slider
          label="Volume"
          min={0}
          max={10}
          initialValue={5}
          onChange={onChange}
          formatValue={formatValue}
        />
      );

      expect(screen.getByText('Level 5')).toBeInTheDocument();

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '8' } });

      expect(screen.getByText('Level 8')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle min value', () => {
      const onChange = vi.fn();
      render(<Slider label="Volume" min={0} max={100} initialValue={0} onChange={onChange} />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.value).toBe('0');
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle max value', () => {
      const onChange = vi.fn();
      render(<Slider label="Volume" min={0} max={100} initialValue={100} onChange={onChange} />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.value).toBe('100');
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should handle zero as a valid value', () => {
      const onChange = vi.fn();
      render(<Slider label="Volume" min={-50} max={50} initialValue={0} onChange={onChange} />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.value).toBe('0');
    });
  });
});
