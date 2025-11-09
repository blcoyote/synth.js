/**
 * LFOPanel - LFO (Low Frequency Oscillator) controls
 * Modulates parameters like filter cutoff, oscillator pitch, volume, pan
 */

import { useState, useCallback } from 'react';
import { useSynthEngine } from '../context/SynthContext';
import { audioState } from "../state";
import { Slider } from './common/Slider';
import { Switch } from './common/Switch';
import { LFOVisualizer } from './LFOVisualizer';
import { EnvelopeVisualizer } from './EnvelopeVisualizer';
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

  // ADSR envelope for LFO amplitude
  const [attack, setAttack] = useState(0); // seconds
  const [decay, setDecay] = useState(0); // seconds
  const [sustain, setSustain] = useState(1); // 0-1
  const [release, setRelease] = useState(0); // seconds

  // Handle mode change (free vs trigger)
  const handleModeChange = useCallback((newMode: LFOMode) => {
    if (!lfoManager) return;
    setMode(newMode);
    // In trigger mode, LFO starts on note press (handled in VoiceManager)
    // In free mode, LFO runs continuously
    // Note: Enable state is now controlled by CollapsiblePanel
  }, [lfoManager]);

  // Handle rate change
  const handleRateChange = useCallback((value: number) => {
    if (!lfoManager) return;
    setRate(value);
    lfoManager.setRate(value);
  }, [lfoManager]);

  // Handle depth change
  const handleDepthChange = useCallback((value: number) => {
    if (!lfoManager) return;
    setDepth(value);
    // Update depth for all active targets
    const depthValue = value / 100; // Convert percentage to 0-1
    if (targets.filter) {
      lfoManager.setTargetDepth('filter', depthValue * 5000); // Max 5000 Hz for filter
    }
    // Note: Pitch, volume, pan depths would be updated here when implemented
  }, [lfoManager, targets.filter]);

  // Handle waveform change
  const handleWaveformChange = useCallback((newWaveform: LFOWaveform) => {
    if (!lfoManager) return;
    setWaveform(newWaveform);
    lfoManager.setWaveform(newWaveform);
  }, [lfoManager]);

  // Handle target toggle
  const handleTargetToggle = useCallback((target: keyof LFOTargets) => {
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
  }, [lfoManager, synthEngine, targets, depth]);

  // ADSR envelope handlers
  const handleAttackChange = useCallback((value: number) => {
    const seconds = value / 1000;
    setAttack(seconds);
    // TODO: Apply envelope to LFO amplitude
  }, []);

  const handleDecayChange = useCallback((value: number) => {
    const seconds = value / 1000;
    setDecay(seconds);
    // TODO: Apply envelope to LFO amplitude
  }, []);

  const handleSustainChange = useCallback((value: number) => {
    const level = value / 100;
    setSustain(level);
    // TODO: Apply envelope to LFO amplitude
  }, []);

  const handleReleaseChange = useCallback((value: number) => {
    const seconds = value / 1000;
    setRelease(seconds);
    // TODO: Apply envelope to LFO amplitude
  }, []);

  return (
    <div className="lfo-panel">
      {/* LFO Waveform Visualizer */}
      <div className="lfo-visualizer-container">
        <LFOVisualizer
          waveform={waveform}
          rate={rate}
          depth={depth}
          attack={attack}
          decay={decay}
          sustain={sustain}
          release={release}
        />
      </div>

      <div className="lfo-controls">
        {/* Mode Selector */}
        <div className="lfo-mode-selector">
          <label>Mode:</label>
          <div className="lfo-mode-buttons">
            <button
              className={`lfo-mode-btn primary ${mode === 'free' ? 'active' : ''}`}
              onClick={() => handleModeChange('free')}
            >
              Free-Running
            </button>
            <button
              className={`lfo-mode-btn primary ${mode === 'trigger' ? 'active' : ''}`}
              onClick={() => handleModeChange('trigger')}
            >
              Trigger
            </button>
          </div>
        </div>

        {/* Waveform Selector */}
        <div className="lfo-waveform-selector">
          <label>Waveform:</label>
          <div className="lfo-waveform-buttons">
            {(['sine', 'triangle', 'square', 'sawtooth', 'random'] as LFOWaveform[]).map((wf) => (
              <button
                key={wf}
                className={`lfo-waveform-btn primary ${waveform === wf ? 'active' : ''}`}
                onClick={() => handleWaveformChange(wf)}
              >
                {wf}
              </button>
            ))}
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

        {/* ADSR Envelope Section */}
        <div className="lfo-envelope-section">
          <h4>Amplitude Envelope</h4>
          
          {/* Visual display of ADSR curve */}
          <div className="lfo-envelope-visualizer-container">
            <EnvelopeVisualizer
              attack={attack}
              decay={decay}
              sustain={sustain}
              release={release}
            />
          </div>
          
          <Slider
            label="Attack"
            min={1}
            max={2000}
            initialValue={attack * 1000}
            unit="ms"
            onChange={handleAttackChange}
          />

          <Slider
            label="Decay"
            min={1}
            max={2000}
            initialValue={decay * 1000}
            unit="ms"
            onChange={handleDecayChange}
          />

          <Slider
            label="Sustain"
            min={0}
            max={100}
            initialValue={sustain * 100}
            unit="%"
            onChange={handleSustainChange}
          />

          <Slider
            label="Release"
            min={10}
            max={5000}
            initialValue={release * 1000}
            unit="ms"
            onChange={handleReleaseChange}
          />
        </div>

        {/* Modulation Targets */}
        <div className="lfo-targets">
          <h4>Modulation Targets</h4>
          
          {/* Filter Cutoff */}
          <div className="lfo-target">
            <div className="lfo-target-header">
              <Switch
                checked={targets.filter}
                onChange={() => handleTargetToggle('filter')}
                label="Filter Cutoff"
              />
            </div>
          </div>

          {/* Pitch */}
          <div className="lfo-target">
            <div className="lfo-target-header">
              <Switch
                checked={targets.pitch}
                onChange={() => handleTargetToggle('pitch')}
                label="Pitch"
              />
            </div>
          </div>

          {/* Volume */}
          <div className="lfo-target">
            <div className="lfo-target-header">
              <Switch
                checked={targets.volume}
                onChange={() => handleTargetToggle('volume')}
                label="Volume"
              />
            </div>
          </div>

          {/* Pan */}
          <div className="lfo-target">
            <div className="lfo-target-header">
              <Switch
                checked={targets.pan}
                onChange={() => handleTargetToggle('pan')}
                label="Pan"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


