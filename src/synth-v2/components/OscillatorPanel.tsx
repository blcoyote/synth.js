/**
 * OscillatorPanel - Controls for a single oscillator
 * Includes waveform, volume, pan, octave, and detune controls
 */

import { useState } from 'react';
import { useSynthEngine } from '../context/SynthContext';
import { Slider } from './common/Slider';

interface OscillatorPanelProps {
  oscNum: 1 | 2 | 3;
}

export function OscillatorPanel({ oscNum }: OscillatorPanelProps) {
  const { engine, voiceState } = useSynthEngine();
  const paramManager = engine.getParameterManager();
  const config = voiceState.oscillatorConfigs.get(oscNum);

  // If config doesn't exist yet (before initialization), use defaults
  const [enabled, setEnabled] = useState(config?.enabled ?? (oscNum === 1));
  const [waveform, setWaveform] = useState<'sine' | 'sawtooth' | 'square' | 'triangle'>(
    config?.waveform ?? 'sine'
  );

  const handleToggle = () => {
    if (!config) return;
    config.enabled = !config.enabled;
    setEnabled(config.enabled);
  };

  const handleWaveformChange = (newWaveform: 'sine' | 'sawtooth' | 'square' | 'triangle') => {
    if (!config) return;
    config.waveform = newWaveform;
    setWaveform(newWaveform);
  };

  const handleVolumeChange = (value: number) => {
    paramManager.updateOscillatorParameter(oscNum, 'volume', value / 100);
  };

  const handlePanChange = (value: number) => {
    paramManager.updateOscillatorParameter(oscNum, 'pan', value / 100);
  };

  const handleOctaveChange = (value: number) => {
    paramManager.updateOscillatorParameter(oscNum, 'octave', value);
  };

  const handleDetuneChange = (value: number) => {
    paramManager.updateOscillatorParameter(oscNum, 'detune', value);
  };

  return (
    <div className={`oscillator-panel ${!enabled ? 'disabled' : ''}`}>
      <div className="osc-header">
        <h3>Oscillator {oscNum}</h3>
        <button 
          className={`toggle-btn ${enabled ? 'active' : ''}`}
          onClick={handleToggle}
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {enabled && (
        <>
          <div className="waveform-selector">
            <label>Waveform</label>
            <div className="waveform-buttons">
              {(['sine', 'sawtooth', 'square', 'triangle'] as const).map((wave) => (
                <button
                  key={wave}
                  className={`wave-btn ${waveform === wave ? 'active' : ''}`}
                  onClick={() => handleWaveformChange(wave)}
                >
                  {wave}
                </button>
              ))}
            </div>
          </div>

          <Slider
            label="Volume"
            min={0}
            max={100}
            initialValue={(config?.volume ?? 0.8) * 100}
            unit="%"
            onChange={handleVolumeChange}
          />

          <Slider
            label="Pan"
            min={-100}
            max={100}
            initialValue={(config?.pan ?? 0) * 100}
            onChange={handlePanChange}
            formatValue={(val: number) => {
              if (val < -10) return `${Math.abs(Math.round(val))}% L`;
              if (val > 10) return `${Math.round(val)}% R`;
              return 'Center';
            }}
          />

          <Slider
            label="Octave"
            min={-2}
            max={2}
            initialValue={config?.octave ?? 0}
            onChange={handleOctaveChange}
            formatValue={(val: number) => (val >= 0 ? `+${val}` : `${val}`)}
          />

          <Slider
            label="Detune"
            min={-100}
            max={100}
            initialValue={config?.detune ?? 0}
            unit="¢"
            onChange={handleDetuneChange}
          />
        </>
      )}
    </div>
  );
}
