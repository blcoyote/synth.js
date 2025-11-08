/**
 * FilterPanel - Master filter controls
 * Includes filter type selection, cutoff (logarithmic), resonance, and enable/bypass toggle
 */

import { useState, useEffect } from 'react';
import { useSynthEngine } from '../context/SynthContext';
import { audioState, visualizationState } from '../../state';
import { Lowpass12Filter, Lowpass24Filter } from '../../components/filters';
import { Slider } from './common/Slider';
import { FilterVisualizer } from './common/FilterVisualizer';
import './FilterPanel.css';

const MIN_CUTOFF = 20; // 20 Hz
const MAX_CUTOFF = 20000; // 20 kHz

export function FilterPanel() {
  const { engine } = useSynthEngine();
  
  // Safely get manager (will be null before initialization)
  let audioEngine;
  try {
    audioEngine = engine.getAudioEngine();
  } catch {
    audioEngine = null;
  }

  const [enabled, setEnabled] = useState(audioState.filterSettings.enabled);
  const [filterType, setFilterType] = useState(audioState.filterSettings.type);
  const [cutoff, setCutoff] = useState(audioState.filterSettings.cutoff);
  const [resonance, setResonance] = useState(audioState.filterSettings.resonance);

  // Sync enabled state with audioState (updated by CollapsiblePanel)
  useEffect(() => {
    const interval = setInterval(() => {
      if (audioState.filterSettings.enabled !== enabled) {
        setEnabled(audioState.filterSettings.enabled);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [enabled]);

  // Format frequency for display
  const formatFrequency = (freq: number): string => {
    if (freq >= 1000) {
      return `${(freq / 1000).toFixed(2)} kHz`;
    }
    return `${Math.round(freq)} Hz`;
  };

  // Handle filter type change
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!audioEngine) return;
    
    const newType = e.target.value as BiquadFilterType | 'lowpass12' | 'lowpass24';
    audioState.filterSettings.type = newType;
    setFilterType(newType);

    // Disconnect old filter
    const masterGainNode = engine.getVoiceManager().getMasterGainNode();
    masterGainNode.disconnect();
    
    if (audioState.currentCustomFilter) {
      audioState.currentCustomFilter.disconnect();
    } else if (audioState.masterFilter) {
      (audioState.masterFilter as BiquadFilterNode).disconnect();
    }

    const context = audioEngine.getContext();
    const spectrumAnalyser = visualizationState.analyser;
    
    // Create new filter and reconnect through analyser
    // Signal chain: masterGain -> filter -> spectrumAnalyser -> destination
    if (newType === 'lowpass12') {
      const filter = new Lowpass12Filter(cutoff);
      filter.setParameter('resonance', resonance);
      audioState.setCurrentCustomFilter(filter);
      audioState.setMasterFilter(filter);
      masterGainNode.connect(filter.getInputNode());
      filter.getOutputNode().connect(spectrumAnalyser);
      spectrumAnalyser.connect(context.destination);
    } else if (newType === 'lowpass24') {
      const filter = new Lowpass24Filter(cutoff);
      filter.setParameter('resonance', resonance);
      audioState.setCurrentCustomFilter(filter);
      audioState.setMasterFilter(filter);
      masterGainNode.connect(filter.getInputNode());
      filter.getOutputNode().connect(spectrumAnalyser);
      spectrumAnalyser.connect(context.destination);
    } else {
      audioState.setCurrentCustomFilter(null);
      const filter = context.createBiquadFilter();
      filter.type = newType as BiquadFilterType;
      filter.frequency.value = audioState.filterSettings.enabled ? cutoff : MAX_CUTOFF;
      filter.Q.value = resonance;
      audioState.setMasterFilter(filter);
      masterGainNode.connect(filter);
      filter.connect(spectrumAnalyser);
      spectrumAnalyser.connect(context.destination);
    }
  };

  // Handle cutoff change (logarithmic scale)
  const handleCutoffChange = (value: number) => {
    // Convert linear slider (0-100) to logarithmic frequency
    const logMin = Math.log(MIN_CUTOFF);
    const logMax = Math.log(MAX_CUTOFF);
    const logValue = logMin + (value / 100) * (logMax - logMin);
    const newCutoff = Math.exp(logValue);
    
    audioState.filterSettings.cutoff = newCutoff;
    setCutoff(newCutoff);

    if (audioState.filterSettings.enabled) {
      if (audioState.currentCustomFilter) {
        audioState.currentCustomFilter.setParameter('cutoff', newCutoff);
      } else if (audioState.masterFilter) {
        (audioState.masterFilter as BiquadFilterNode).frequency.value = newCutoff;
      }
    }
  };

  // Handle resonance change
  const handleResonanceChange = (value: number) => {
    const newResonance = value / 10; // Slider 0-50 -> Q 0-5
    audioState.filterSettings.resonance = newResonance;
    setResonance(newResonance);

    if (audioState.currentCustomFilter) {
      audioState.currentCustomFilter.setParameter('resonance', newResonance);
    } else if (audioState.masterFilter) {
      (audioState.masterFilter as BiquadFilterNode).Q.value = newResonance;
    }
  };

  // Calculate initial slider position from frequency
  const getSliderValueFromFrequency = (freq: number): number => {
    const logMin = Math.log(MIN_CUTOFF);
    const logMax = Math.log(MAX_CUTOFF);
    const logFreq = Math.log(freq);
    return ((logFreq - logMin) / (logMax - logMin)) * 100;
  };

  // Get the appropriate filter node for visualization
  const getFilterNodeForViz = (): BiquadFilterNode | null => {
    if (audioState.currentCustomFilter instanceof Lowpass24Filter) {
      return audioState.currentCustomFilter.getCascadedFrequencyResponse();
    } else if (audioState.currentCustomFilter) {
      return audioState.currentCustomFilter.getFilterNode();
    } else if (audioState.masterFilter) {
      return audioState.masterFilter as BiquadFilterNode;
    }
    return null;
  };

  return (
    <div className="filter-panel">
      {/* Filter Visualization */}
      <FilterVisualizer
        analyserNode={visualizationState.getAnalyserOrNull()}
        filterNode={getFilterNodeForViz()}
        filterEnabled={enabled}
        cutoffFrequency={cutoff}
        height={240}
      />

      <div className="filter-controls">
        {/* Filter Type */}
        <div className="control-group">
          <label htmlFor="filter-type">Filter Type</label>
          <select 
            id="filter-type"
            value={filterType}
            onChange={handleTypeChange}
            className="filter-type-select"
          >
            <option value="lowpass">Lowpass</option>
            <option value="lowpass12">Lowpass 12dB</option>
            <option value="lowpass24">Lowpass 24dB</option>
            <option value="highpass">Highpass</option>
            <option value="bandpass">Bandpass</option>
            <option value="notch">Notch</option>
            <option value="allpass">Allpass</option>
            <option value="peaking">Peaking</option>
            <option value="lowshelf">Low Shelf</option>
            <option value="highshelf">High Shelf</option>
          </select>
        </div>

        {/* Cutoff Frequency */}
        <Slider
          label="Cutoff"
          min={0}
          max={100}
          initialValue={getSliderValueFromFrequency(cutoff)}
          onChange={handleCutoffChange}
          formatValue={() => formatFrequency(cutoff)}
        />

        {/* Resonance */}
        <Slider
          label="Resonance"
          min={0}
          max={50}
          initialValue={resonance * 10}
          onChange={handleResonanceChange}
          formatValue={(val: number) => (val / 10).toFixed(1)}
        />
      </div>
    </div>
  );
}
