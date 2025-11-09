/**
 * Slider - Reusable slider component with label and value display
 * Clean, simple, and follows real-time parameter update pattern
 * Memoized to prevent unnecessary re-renders (used 30+ times)
 */

import { useState, ChangeEvent, memo } from 'react';

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  initialValue?: number;
  unit?: string;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

export const Slider = memo(function Slider({
  label,
  min,
  max,
  step = 1,
  initialValue = 0,
  unit = '',
  onChange,
  formatValue,
}: SliderProps) {
  const [value, setValue] = useState(initialValue);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setValue(newValue);
    onChange(newValue);
  };

  const displayValue = formatValue
    ? formatValue(value)
    : `${value}${unit}`;

  return (
    <div className="slider-control">
      <label className="slider-label">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="slider-input"
      />
      <span className="slider-value">{displayValue}</span>
    </div>
  );
});


