/**
 * FilterPanel - Master filter controls
 * Includes filter type selection, cutoff (logarithmic), resonance, and enable/bypass toggle
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSynthEngine } from '../context/SynthContext';
import { audioState, visualizationState } from "../state";
import { Lowpass12Filter, Lowpass24Filter } from "../components/filters";
import { Slider } from './common/Slider';
import { Switch } from './common/Switch';
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

  const [enabled, setEnabled] = useState(true); // Default enabled
  const [filterType, setFilterType] = useState(audioState.filterSettings.type);
  const [cutoff, setCutoff] = useState(audioState.filterSettings.cutoff);
  const [resonance, setResonance] = useState(audioState.filterSettings.resonance);

  // Memoize logarithmic scale constants (expensive Math.log calculations)
  const logScale = useMemo(() => ({
    logMin: Math.log(MIN_CUTOFF),
    logMax: Math.log(MAX_CUTOFF),
    range: Math.log(MAX_CUTOFF) - Math.log(MIN_CUTOFF),
  }), []); // Constants never change

  // Handle filter enable/disable toggle
  const handleEnabledChange = useCallback((newEnabled: boolean) => {
    setEnabled(newEnabled);
    audioState.filterSettings.enabled = newEnabled;
    
    if (!audioEngine) return;
    
    if (newEnabled) {
      // Enable filter with current cutoff
      if (audioState.currentCustomFilter) {
        audioState.currentCustomFilter.setParameter('cutoff', cutoff);
      } else if (audioState.masterFilter) {
        (audioState.masterFilter as BiquadFilterNode).frequency.value = cutoff;
      }
    } else {
      // Bypass filter (set cutoff to max)
      if (audioState.currentCustomFilter) {
        audioState.currentCustomFilter.setParameter('cutoff', MAX_CUTOFF);
      } else if (audioState.masterFilter) {
        (audioState.masterFilter as BiquadFilterNode).frequency.value = MAX_CUTOFF;
      }
    }
  }, [audioEngine, cutoff]);

  // Initialize filter as enabled on mount
  useEffect(() => {
    if (!audioEngine) return;
    audioState.filterSettings.enabled = true;
  }, [audioEngine]);

  // Format frequency for display
  const formatFrequency = useCallback((freq: number): string => {
    if (freq >= 1000) {
      return `${(freq / 1000).toFixed(2)} kHz`;
    }
    return `${Math.round(freq)} Hz`;
  }, []);

  // Handle filter type change
  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
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
    const effectsManager = audioState.getEffectsManager();
    
    // Create new filter and reconnect through effects and analyser
    // Signal chain: masterGain -> filter -> effects -> analyser -> destination
    if (newType === 'lowpass12') {
      const filter = new Lowpass12Filter(cutoff);
      filter.setParameter('resonance', resonance);
      audioState.setCurrentCustomFilter(filter);
      audioState.setMasterFilter(filter);
      masterGainNode.connect(filter.getInputNode());
      filter.getOutputNode().connect(effectsManager.getInputNode());
      effectsManager.getOutputNode().connect(spectrumAnalyser);
      spectrumAnalyser.connect(context.destination);
    } else if (newType === 'lowpass24') {
      const filter = new Lowpass24Filter(cutoff);
      filter.setParameter('resonance', resonance);
      audioState.setCurrentCustomFilter(filter);
      audioState.setMasterFilter(filter);
      masterGainNode.connect(filter.getInputNode());
      filter.getOutputNode().connect(effectsManager.getInputNode());
      effectsManager.getOutputNode().connect(spectrumAnalyser);
      spectrumAnalyser.connect(context.destination);
    } else {
      audioState.setCurrentCustomFilter(null);
      const filter = context.createBiquadFilter();
      filter.type = newType as BiquadFilterType;
      filter.frequency.value = audioState.filterSettings.enabled ? cutoff : MAX_CUTOFF;
      filter.Q.value = resonance;
      audioState.setMasterFilter(filter);
      masterGainNode.connect(filter);
      filter.connect(effectsManager.getInputNode());
      effectsManager.getOutputNode().connect(spectrumAnalyser);
      spectrumAnalyser.connect(context.destination);
    }
  }, [audioEngine, engine, cutoff, resonance]);

  // Handle cutoff change (logarithmic scale)
  const handleCutoffChange = useCallback((value: number) => {
    // Convert linear slider (0-100) to logarithmic frequency using memoized constants
    const logValue = logScale.logMin + (value / 100) * logScale.range;
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
  }, [logScale]);

  // Handle resonance change
  const handleResonanceChange = useCallback((value: number) => {
    const newResonance = value / 10; // Slider 0-50 -> Q 0-5
    audioState.filterSettings.resonance = newResonance;
    setResonance(newResonance);

    if (audioState.currentCustomFilter) {
      audioState.currentCustomFilter.setParameter('resonance', newResonance);
    } else if (audioState.masterFilter) {
      (audioState.masterFilter as BiquadFilterNode).Q.value = newResonance;
    }
  }, []);

  // Memoize initial slider position calculation (uses expensive Math.log)
  const sliderValue = useMemo(() => {
    const logFreq = Math.log(cutoff);
    return ((logFreq - logScale.logMin) / logScale.range) * 100;
  }, [cutoff, logScale]);

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
        <div className="control-group">
          {/* Filter Enable/Disable */}
          <Switch
            label="Filter Enabled"
            checked={enabled}
            onChange={handleEnabledChange}
          />

          {/* Filter Type */}
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

          {/* Cutoff Frequency */}
          <Slider
            label="Cutoff"
            min={0}
            max={100}
            initialValue={sliderValue}
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
    </div>
  );
}


