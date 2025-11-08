/**
 * LFOPanel - LFO (Low Frequency Oscillator) controls
 * Modulates parameters like filter cutoff, oscillator pitch, volume, pan
 */

import { useState } from 'react';
import { useSynthEngine } from '../context/SynthContext';
import { audioState } from '../../state';
import { Slider } from './common/Slider';
import './LFOPanel.css';

type LFOWaveform = 'sine' | 'triangle' | 'square' | 'sawtooth' | 'random';
type LFOMode = 'free' | 'trigger';

interface LFOTargets {
  pitch: boolean;
  volume: boolean;
  pan: boolean;
  filter: boolean;
}

export function LFOPanel() {
  const { engine: synthEngine } = useSynthEngine();
  
  // Safely get manager (will be null before initialization)
  let lfoManager;
  try {
    lfoManager = synthEngine.getLFOManager();
  } catch {
    lfoManager = null;
  }
  
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<LFOMode>('free');
  const [rate, setRate] = useState(5.0); // Hz
  const [depth, setDepth] = useState(50); // 0-100%
  const [waveform, setWaveform] = useState<LFOWaveform>('sine');
  const [targets, setTargets] = useState<LFOTargets>({
    pitch: false,
    volume: false,
    pan: false,
    filter: false,
  });

  // Handle enable/disable
  const handleToggle = () => {
    if (!lfoManager) return;
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    lfoManager.setEnabled(newEnabled);
  };

  // Handle mode change (free vs trigger)
  const handleModeChange = (newMode: LFOMode) => {
    if (!lfoManager) return;
    setMode(newMode);
    // In trigger mode, LFO starts on note press (handled in VoiceManager)
    // In free mode, LFO runs continuously
    if (newMode === 'free' && enabled) {
      lfoManager.setEnabled(true);
    } else if (newMode === 'trigger') {
      lfoManager.setEnabled(false); // Will be started on note trigger
    }
  };

  // Handle rate change
  const handleRateChange = (value: number) => {
    if (!lfoManager) return;
    setRate(value);
    lfoManager.setRate(value);
  };

  // Handle depth change
  const handleDepthChange = (value: number) => {
    if (!lfoManager) return;
    setDepth(value);
    // Update depth for all active targets
    const depthValue = value / 100; // Convert percentage to 0-1
    if (targets.filter) {
      lfoManager.setTargetDepth('filter', depthValue * 5000); // Max 5000 Hz for filter
    }
    // Note: Pitch, volume, pan depths would be updated here when implemented
  };

  // Handle waveform change
  const handleWaveformChange = (newWaveform: LFOWaveform) => {
    if (!lfoManager) return;
    setWaveform(newWaveform);
    lfoManager.setWaveform(newWaveform);
  };

  // Handle target toggle
  const handleTargetToggle = (target: keyof LFOTargets) => {
    if (!lfoManager) return;
    
    const newTargets = { ...targets, [target]: !targets[target] };
    setTargets(newTargets);

    const voiceManager = synthEngine.getVoiceManager();

    if (target === 'filter') {
      if (newTargets.filter) {
        // Add filter cutoff as target
        const filter = audioState.masterFilter;
        if (filter && 'frequency' in filter) {
          const currentCutoff = (filter as BiquadFilterNode).frequency.value;
          const depthValue = (depth / 100) * 5000; // Max 5000 Hz modulation
          lfoManager.addTarget('filter', (filter as BiquadFilterNode).frequency, depthValue, currentCutoff);
        }
      } else {
        lfoManager.removeTarget('filter');
      }
    } else if (target === 'pitch') {
      voiceManager.setLFOPitchTarget(newTargets.pitch, depth);
    } else if (target === 'volume') {
      voiceManager.setLFOVolumeTarget(newTargets.volume, depth);
    } else if (target === 'pan') {
      voiceManager.setLFOPanTarget(newTargets.pan, depth);
    }
  };

  return (
    <div className="lfo-panel">
      <div className="lfo-header">
        <h3>LFO</h3>
        <button 
          className={`lfo-toggle ${enabled ? 'active' : ''}`}
          onClick={handleToggle}
        >
          {enabled ? '● ON' : '○ OFF'}
        </button>
      </div>

      <div className="lfo-controls">
        {/* Mode Selector */}
        <div className="lfo-mode-selector">
          <label>Mode:</label>
          <div className="lfo-mode-buttons">
            <button
              className={`lfo-mode-btn ${mode === 'free' ? 'active' : ''}`}
              onClick={() => handleModeChange('free')}
            >
              Free-Running
            </button>
            <button
              className={`lfo-mode-btn ${mode === 'trigger' ? 'active' : ''}`}
              onClick={() => handleModeChange('trigger')}
            >
              Trigger
            </button>
          </div>
        </div>

        {/* Rate Control */}
        <Slider
          label="Rate"
          min={0.1}
          max={20}
          step={0.1}
          initialValue={rate}
          unit="Hz"
          onChange={handleRateChange}
        />

        {/* Depth Control */}
        <Slider
          label="Depth"
          min={0}
          max={100}
          step={1}
          initialValue={depth}
          unit="%"
          onChange={handleDepthChange}
        />

        {/* Waveform Selector */}
        <div className="lfo-waveform-selector">
          <label>Waveform:</label>
          <div className="lfo-waveform-buttons">
            {(['sine', 'triangle', 'square', 'sawtooth', 'random'] as LFOWaveform[]).map((wf) => (
              <button
                key={wf}
                className={`lfo-waveform-btn ${waveform === wf ? 'active' : ''}`}
                onClick={() => handleWaveformChange(wf)}
              >
                {wf}
              </button>
            ))}
          </div>
        </div>

        {/* Modulation Targets */}
        <div className="lfo-targets">
          <h4>Modulation Targets</h4>
          
          {/* Filter Cutoff */}
          <div className="lfo-target">
            <div className="lfo-target-header">
              <input
                type="checkbox"
                id="lfo-filter"
                checked={targets.filter}
                onChange={() => handleTargetToggle('filter')}
              />
              <label htmlFor="lfo-filter">Filter Cutoff</label>
            </div>
          </div>

          {/* Pitch */}
          <div className="lfo-target">
            <div className="lfo-target-header">
              <input
                type="checkbox"
                id="lfo-pitch"
                checked={targets.pitch}
                onChange={() => handleTargetToggle('pitch')}
              />
              <label htmlFor="lfo-pitch">Pitch</label>
            </div>
          </div>

          {/* Volume */}
          <div className="lfo-target">
            <div className="lfo-target-header">
              <input
                type="checkbox"
                id="lfo-volume"
                checked={targets.volume}
                onChange={() => handleTargetToggle('volume')}
              />
              <label htmlFor="lfo-volume">Volume</label>
            </div>
          </div>

          {/* Pan */}
          <div className="lfo-target">
            <div className="lfo-target-header">
              <input
                type="checkbox"
                id="lfo-pan"
                checked={targets.pan}
                onChange={() => handleTargetToggle('pan')}
              />
              <label htmlFor="lfo-pan">Pan</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
