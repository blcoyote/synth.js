/**
 * Professional Synthesizer Interface Demo
 * Multiple oscillators with keyboard control
 */

import { AudioEngine } from './core';
import { BusManager, EffectsChain } from './bus';
import {
  SineOscillator,
  SawtoothOscillator,
  SquareOscillator,
  TriangleOscillator,
} from './components/oscillators';
import type { BaseOscillator } from './components/oscillators/BaseOscillator';
import { ADSREnvelope } from './components/envelopes';
import { LFO } from './components/modulation';
import { Lowpass12Filter, Lowpass24Filter } from './components/filters';
import { DelayEffect, ReverbEffect, DistortionEffect, ChorusEffect } from './components/effects';
import { Visualizer } from './utils';

// Voice represents a single note being played
interface Voice {
  noteIndex: number;
  oscillators: Array<{
    oscillator: BaseOscillator;
    panNode: StereoPannerNode;
    envelope: ADSREnvelope;
  }>;
  isActive: boolean;
  releaseTimeout?: number;
}

// Oscillator configuration (not the actual playing instances)
interface OscillatorConfig {
  enabled: boolean;
  waveform: 'sine' | 'sawtooth' | 'square' | 'triangle';
  octave: number;
  detune: number;
  volume: number;
  pan: number;
}

const oscillatorConfigs: Map<number, OscillatorConfig> = new Map();
const activeVoices: Map<number, Voice> = new Map(); // noteIndex -> Voice
let initialized = false;
let masterBus: ReturnType<typeof BusManager.prototype.getMasterBus>;
let effectsChain: EffectsChain | null = null;
let vibrato: LFO | null = null;
let masterFilter: BiquadFilterNode | Lowpass12Filter | Lowpass24Filter | null = null;
let currentCustomFilter: Lowpass12Filter | Lowpass24Filter | null = null;
let analyser: AnalyserNode | null = null;
let analyser1: AnalyserNode | null = null; // For oscillator 1 waveform
let analyser2: AnalyserNode | null = null; // For oscillator 2 waveform
let filterVisualizer: Visualizer | null = null;
let waveformVisualizer1: Visualizer | null = null;
let waveformVisualizer2: Visualizer | null = null;

// Filter settings
const filterSettings = {
  enabled: true,
  type: 'lowpass' as BiquadFilterType | 'lowpass12' | 'lowpass24',
  cutoff: 2000,
  resonance: 1.0,
};

// Envelope settings (one per oscillator)
const envelopeSettings = {
  1: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.7,
    release: 0.3,
  },
  2: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.7,
    release: 0.3,
  },
};

// Note frequencies (C2 to C4)
const notes = [
  { note: 'C2', freq: 65.41, key: 'Z', white: true },
  { note: 'C#2', freq: 69.30, key: 'S', white: false },
  { note: 'D2', freq: 73.42, key: 'X', white: true },
  { note: 'D#2', freq: 77.78, key: 'D', white: false },
  { note: 'E2', freq: 82.41, key: 'C', white: true },
  { note: 'F2', freq: 87.31, key: 'V', white: true },
  { note: 'F#2', freq: 92.50, key: 'G', white: false },
  { note: 'G2', freq: 98.00, key: 'B', white: true },
  { note: 'G#2', freq: 103.83, key: 'H', white: false },
  { note: 'A2', freq: 110.00, key: 'N', white: true },
  { note: 'A#2', freq: 116.54, key: 'J', white: false },
  { note: 'B2', freq: 123.47, key: 'M', white: true },
  { note: 'C3', freq: 130.81, key: 'Q', white: true },
  { note: 'C#3', freq: 138.59, key: '2', white: false },
  { note: 'D3', freq: 146.83, key: 'W', white: true },
  { note: 'D#3', freq: 155.56, key: '3', white: false },
  { note: 'E3', freq: 164.81, key: 'E', white: true },
  { note: 'F3', freq: 174.61, key: 'R', white: true },
  { note: 'F#3', freq: 185.00, key: '5', white: false },
  { note: 'G3', freq: 196.00, key: 'T', white: true },
  { note: 'G#3', freq: 207.65, key: '6', white: false },
  { note: 'A3', freq: 220.00, key: 'Y', white: true },
  { note: 'A#3', freq: 233.08, key: '7', white: false },
  { note: 'B3', freq: 246.94, key: 'U', white: true },
  { note: 'C4', freq: 261.63, key: 'I', white: true },
];

document.addEventListener('DOMContentLoaded', async () => {
  const initBtn = document.getElementById('initBtn') as HTMLButtonElement;

  // Auto-initialize on page load
  if (initialized) return;

  initBtn.disabled = true;
  initBtn.textContent = 'Initializing...';

  try {
    const engine = AudioEngine.getInstance();
    await engine.initialize({ latencyHint: 'interactive' });

      const busManager = BusManager.getInstance();
      busManager.initialize();
      masterBus = busManager.getMasterBus();

      // Create intermediate gain nodes for each oscillator with analysers
      const context = engine.getContext();
      const osc1Bus = context.createGain();
      const osc2Bus = context.createGain();
      
      analyser1 = context.createAnalyser();
      analyser1.fftSize = 2048;
      analyser2 = context.createAnalyser();
      analyser2.fftSize = 2048;
      
      // Connect: osc1Bus -> analyser1 -> masterBus
      osc1Bus.connect(analyser1);
      analyser1.connect(masterBus.getInputNode());
      
      // Connect: osc2Bus -> analyser2 -> masterBus
      osc2Bus.connect(analyser2);
      analyser2.connect(masterBus.getInputNode());
      
      // Store these buses globally so oscillators can connect to them
      (window as unknown as Record<string, GainNode>).osc1Bus = osc1Bus;
      (window as unknown as Record<string, GainNode>).osc2Bus = osc2Bus;

      // Create LFO for vibrato (shared across all voices)
      vibrato = new LFO({
        frequency: 5.0,
        depth: 0.05,
        waveform: 'sine',
      });

      // Initialize oscillator configurations (not actual instances)
      oscillatorConfigs.set(1, {
        enabled: true,
        waveform: 'sine',
        octave: 0,
        detune: 0,
        volume: 0.7,
        pan: 0,
      });

      oscillatorConfigs.set(2, {
        enabled: false,
        waveform: 'sawtooth',
        octave: -1,
        detune: -7,
        volume: 0.5,
        pan: 0,
      });

      // Create master filter and analyser
      const audioEngine = AudioEngine.getInstance();
      
      // Create initial filter (basic lowpass)
      if (filterSettings.type === 'lowpass12') {
        currentCustomFilter = new Lowpass12Filter(filterSettings.cutoff);
        currentCustomFilter.setParameter('resonance', filterSettings.resonance);
        masterFilter = currentCustomFilter;
      } else if (filterSettings.type === 'lowpass24') {
        currentCustomFilter = new Lowpass24Filter(filterSettings.cutoff);
        currentCustomFilter.setParameter('resonance', filterSettings.resonance);
        masterFilter = currentCustomFilter;
      } else {
        currentCustomFilter = null;
        masterFilter = audioEngine.createBiquadFilter(filterSettings.type as BiquadFilterType);
        masterFilter.frequency.value = filterSettings.cutoff;
        masterFilter.Q.value = filterSettings.resonance;
      }

      // Create analyser for visualization
      analyser = audioEngine.createAnalyser();
      analyser.fftSize = 8192; // Increased for better frequency resolution
      analyser.smoothingTimeConstant = 0.75; // Slightly reduced for more responsive display

      // Create effects chain
      effectsChain = new EffectsChain();

      // Signal chain: master bus -> filter -> effects chain -> analyser -> destination
      if (currentCustomFilter) {
        masterBus.connect(currentCustomFilter.getInputNode());
        currentCustomFilter.getOutputNode().connect(effectsChain.getInput());
      } else if (masterFilter) {
        masterBus.connect(masterFilter as BiquadFilterNode);
        (masterFilter as BiquadFilterNode).connect(effectsChain.getInput());
      }
      effectsChain.getOutput().connect(analyser);
      analyser.connect(audioEngine.getDestination());

      setupOscillatorControls();
      setupEnvelopeControls();
      setupLFOControls();
      setupFilterControls();
      setupEffectsChain();
      setupKeyboard();
      setupWaveformVisualizer();
      setupMasterControls();
      setupKnobs(); // Create knobs last, after all other setup

      initialized = true;
      initBtn.textContent = '✓ System Ready';
      initBtn.style.background = 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)';
    } catch (error) {
      console.error('Failed to initialize:', error);
      initBtn.disabled = false;
      initBtn.textContent = 'Initialize Audio System';
    }
});

function setupKnobs() {
  // TEMPORARILY DISABLED - Need to add CSS first
  // if (knobsCreated) return;
  // knobsCreated = true;
  
  // try {
  // // Oscillator 1 Volume Knob
  // new Knob('osc1-volume-knob', {
  //   min: 0,
  //   max: 100,
  //   value: 70,
  //   step: 1,
  //   label: 'Volume',
  //   unit: '%',
  //   onChange: (value) => {
  //     const config = oscillatorConfigs.get(1)!;
  //     config.volume = value / 100;
  //   },
  // });

  // // Oscillator 1 Pan Knob
  // new Knob('osc1-pan-knob', {
  //   min: -100,
  //   max: 100,
  //   value: 0,
  //   step: 1,
  //   label: 'Pan',
  //   onChange: (value) => {
  //     const config = oscillatorConfigs.get(1)!;
  //     config.pan = value / 100;
  //   },
  //   valueFormatter: (value) => {
  //     if (value < -10) return `${Math.abs(value)}% L`;
  //     if (value > 10) return `${value}% R`;
  //     return 'Center';
  //   },
  // });

  // // Oscillator 2 Volume Knob
  // new Knob('osc2-volume-knob', {
  //   min: 0,
  //   max: 100,
  //   value: 50,
  //   step: 1,
  //   label: 'Volume',
  //   unit: '%',
  //   onChange: (value) => {
  //     const config = oscillatorConfigs.get(2)!;
  //     config.volume = value / 100;
  //   },
  // });

  // // Oscillator 2 Pan Knob
  // new Knob('osc2-pan-knob', {
  //   min: -100,
  //   max: 100,
  //   value: 0,
  //   step: 1,
  //   label: 'Pan',
  //   onChange: (value) => {
  //     const config = oscillatorConfigs.get(2)!;
  //     config.pan = value / 100;
  //   },
  //   valueFormatter: (value) => {
  //     if (value < -10) return `${Math.abs(value)}% L`;
  //     if (value > 10) return `${value}% R`;
  //     return 'Center';
  //   },
  // });
  // } catch (error) {
  //   console.error('Error creating knobs:', error);
  // }
}function setupOscillatorControls() {
  for (let oscNum = 1; oscNum <= 2; oscNum++) {
    // Toggle button
    const toggleBtn = document.getElementById(`osc${oscNum}-toggle`) as HTMLButtonElement;
    const powerIndicator = document.getElementById(`osc${oscNum}-power`) as HTMLDivElement;

    toggleBtn.addEventListener('click', () => {
      const config = oscillatorConfigs.get(oscNum)!;
      config.enabled = !config.enabled;

      if (config.enabled) {
        toggleBtn.textContent = 'Disable Oscillator';
        toggleBtn.classList.add('active');
        powerIndicator.classList.add('on');
      } else {
        toggleBtn.textContent = 'Enable Oscillator';
        toggleBtn.classList.remove('active');
        powerIndicator.classList.remove('on');
      }
    });

    // Waveform buttons
    const waveformBtns = document.querySelectorAll(`[data-osc="${oscNum}"]`);
    waveformBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const waveform = btn.getAttribute('data-wave') as 'sine' | 'sawtooth' | 'square' | 'triangle';
        const config = oscillatorConfigs.get(oscNum)!;
        config.waveform = waveform;

        // Update button states
        waveformBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Octave control
    const octaveSlider = document.getElementById(`osc${oscNum}-octave`) as HTMLInputElement;
    const octaveValue = document.getElementById(`osc${oscNum}-octave-value`) as HTMLSpanElement;
    octaveSlider.addEventListener('input', () => {
      const config = oscillatorConfigs.get(oscNum)!;
      config.octave = parseInt(octaveSlider.value);
      octaveValue.textContent = octaveSlider.value;
    });

    // Detune control
    const detuneSlider = document.getElementById(`osc${oscNum}-detune`) as HTMLInputElement;
    const detuneValue = document.getElementById(`osc${oscNum}-detune-value`) as HTMLSpanElement;
    detuneSlider.addEventListener('input', () => {
      const config = oscillatorConfigs.get(oscNum)!;
      config.detune = parseInt(detuneSlider.value);
      detuneValue.textContent = `${detuneSlider.value}¢`;
    });

    // Volume control
    const volumeSlider = document.getElementById(`osc${oscNum}-volume`) as HTMLInputElement;
    const volumeValue = document.getElementById(`osc${oscNum}-volume-value`) as HTMLSpanElement;
    volumeSlider.addEventListener('input', () => {
      const config = oscillatorConfigs.get(oscNum)!;
      config.volume = parseInt(volumeSlider.value) / 100;
      volumeValue.textContent = `${volumeSlider.value}%`;
    });

    // Pan control
    const panSlider = document.getElementById(`osc${oscNum}-pan`) as HTMLInputElement;
    const panValue = document.getElementById(`osc${oscNum}-pan-value`) as HTMLSpanElement;
    panSlider.addEventListener('input', () => {
      const config = oscillatorConfigs.get(oscNum)!;
      const panVal = parseInt(panSlider.value) / 100;
      config.pan = panVal;

      // Update display
      if (panVal < -0.1) {
        panValue.textContent = `${Math.abs(Math.round(panVal * 100))}% L`;
      } else if (panVal > 0.1) {
        panValue.textContent = `${Math.round(panVal * 100)}% R`;
      } else {
        panValue.textContent = 'Center';
      }
    });
  }
}

function setupEnvelopeControls() {
  // Envelope 1
  const env1AttackSlider = document.getElementById('env1-attack') as HTMLInputElement;
  const env1AttackValue = document.getElementById('env1-attack-value') as HTMLSpanElement;
  env1AttackSlider.addEventListener('input', () => {
    envelopeSettings[1].attack = parseFloat(env1AttackSlider.value) / 1000;
    env1AttackValue.textContent = `${env1AttackSlider.value}ms`;
  });

  const env1DecaySlider = document.getElementById('env1-decay') as HTMLInputElement;
  const env1DecayValue = document.getElementById('env1-decay-value') as HTMLSpanElement;
  env1DecaySlider.addEventListener('input', () => {
    envelopeSettings[1].decay = parseFloat(env1DecaySlider.value) / 1000;
    env1DecayValue.textContent = `${env1DecaySlider.value}ms`;
  });

  const env1SustainSlider = document.getElementById('env1-sustain') as HTMLInputElement;
  const env1SustainValue = document.getElementById('env1-sustain-value') as HTMLSpanElement;
  env1SustainSlider.addEventListener('input', () => {
    envelopeSettings[1].sustain = parseFloat(env1SustainSlider.value) / 100;
    env1SustainValue.textContent = `${env1SustainSlider.value}%`;
  });

  const env1ReleaseSlider = document.getElementById('env1-release') as HTMLInputElement;
  const env1ReleaseValue = document.getElementById('env1-release-value') as HTMLSpanElement;
  env1ReleaseSlider.addEventListener('input', () => {
    envelopeSettings[1].release = parseFloat(env1ReleaseSlider.value) / 1000;
    env1ReleaseValue.textContent = `${env1ReleaseSlider.value}ms`;
  });

  // Envelope 2
  const env2AttackSlider = document.getElementById('env2-attack') as HTMLInputElement;
  const env2AttackValue = document.getElementById('env2-attack-value') as HTMLSpanElement;
  env2AttackSlider.addEventListener('input', () => {
    envelopeSettings[2].attack = parseFloat(env2AttackSlider.value) / 1000;
    env2AttackValue.textContent = `${env2AttackSlider.value}ms`;
  });

  const env2DecaySlider = document.getElementById('env2-decay') as HTMLInputElement;
  const env2DecayValue = document.getElementById('env2-decay-value') as HTMLSpanElement;
  env2DecaySlider.addEventListener('input', () => {
    envelopeSettings[2].decay = parseFloat(env2DecaySlider.value) / 1000;
    env2DecayValue.textContent = `${env2DecaySlider.value}ms`;
  });

  const env2SustainSlider = document.getElementById('env2-sustain') as HTMLInputElement;
  const env2SustainValue = document.getElementById('env2-sustain-value') as HTMLSpanElement;
  env2SustainSlider.addEventListener('input', () => {
    envelopeSettings[2].sustain = parseFloat(env2SustainSlider.value) / 100;
    env2SustainValue.textContent = `${env2SustainSlider.value}%`;
  });

  const env2ReleaseSlider = document.getElementById('env2-release') as HTMLInputElement;
  const env2ReleaseValue = document.getElementById('env2-release-value') as HTMLSpanElement;
  env2ReleaseSlider.addEventListener('input', () => {
    envelopeSettings[2].release = parseFloat(env2ReleaseSlider.value) / 1000;
    env2ReleaseValue.textContent = `${env2ReleaseSlider.value}ms`;
  });
}

function setupLFOControls() {
  const rateSlider = document.getElementById('lfo-rate') as HTMLInputElement;
  const rateValue = document.getElementById('lfo-rate-value') as HTMLSpanElement;
  const depthSlider = document.getElementById('lfo-depth') as HTMLInputElement;
  const depthValue = document.getElementById('lfo-depth-value') as HTMLSpanElement;
  const waveformSelect = document.getElementById('lfo-waveform') as HTMLSelectElement;
  const toggleBtn = document.getElementById('lfo-toggle') as HTMLButtonElement;
  const powerIndicator = document.getElementById('lfo-power') as HTMLDivElement;

  // Rate control
  rateSlider.addEventListener('input', () => {
    const rate = parseFloat(rateSlider.value) / 10; // 0.1 to 20 Hz
    vibrato?.setParameter('frequency', rate);
    rateValue.textContent = `${rate.toFixed(1)} Hz`;
  });

  // Depth control
  depthSlider.addEventListener('input', () => {
    const depth = parseFloat(depthSlider.value) / 100;
    vibrato?.setParameter('depth', depth);
    depthValue.textContent = `${depthSlider.value}%`;
  });

  // Waveform control
  waveformSelect.addEventListener('change', () => {
    const waveform = waveformSelect.value as 'sine' | 'triangle' | 'square' | 'sawtooth' | 'random';
    vibrato?.setWaveform(waveform);
  });

  // Toggle LFO
  toggleBtn.addEventListener('click', () => {
    if (!vibrato) return;

    if (vibrato.isEnabled()) {
      vibrato.stop();
      toggleBtn.textContent = 'Enable LFO';
      toggleBtn.classList.remove('active');
      powerIndicator.classList.remove('on');
    } else {
      vibrato.start();
      toggleBtn.textContent = 'Disable LFO';
      toggleBtn.classList.add('active');
      powerIndicator.classList.add('on');
    }
  });
}

function setupFilterControls() {
  const typeSelect = document.getElementById('filter-type') as HTMLSelectElement;
  const cutoffSlider = document.getElementById('filter-cutoff') as HTMLInputElement;
  const cutoffValue = document.getElementById('filter-cutoff-value') as HTMLSpanElement;
  const resonanceSlider = document.getElementById('filter-resonance') as HTMLInputElement;
  const resonanceValue = document.getElementById('filter-resonance-value') as HTMLSpanElement;
  const toggleBtn = document.getElementById('filter-toggle') as HTMLButtonElement;
  const powerIndicator = document.getElementById('filter-power') as HTMLDivElement;

  // Initialize filter visualizer (only shows filter response)
  const filterCanvas = document.getElementById('audio-visualizer') as HTMLCanvasElement;
  let filterNodeForViz: BiquadFilterNode | null = null;
  if (currentCustomFilter instanceof Lowpass24Filter) {
    filterNodeForViz = currentCustomFilter.getCascadedFrequencyResponse();
  } else if (currentCustomFilter) {
    filterNodeForViz = currentCustomFilter.getFilterNode();
  } else {
    filterNodeForViz = masterFilter as BiquadFilterNode | null;
  }
  filterVisualizer = new Visualizer({
    canvas: filterCanvas,
    filterNode: filterNodeForViz,
    analyserNode: analyser, // Pass analyser to show frequency spectrum
    filterEnabled: filterSettings.enabled,
    cutoffFrequency: filterSettings.cutoff,
    sampleRate: AudioEngine.getInstance().getSampleRate(),
    showFilter: true,
    showWaveform: false // Only show filter response
  });
  filterVisualizer.start();

  // Initialize slider to logarithmic value
  cutoffSlider.value = Math.log(filterSettings.cutoff).toString();
  const initialFreqDisplay = filterSettings.cutoff >= 1000 
    ? `${(filterSettings.cutoff / 1000).toFixed(2)} kHz`
    : `${Math.round(filterSettings.cutoff)} Hz`;
  cutoffValue.textContent = initialFreqDisplay;

  // Filter type
  typeSelect.addEventListener('change', () => {
    if (!masterFilter || !analyser) return;
    const newType = typeSelect.value as BiquadFilterType | 'lowpass12' | 'lowpass24';
    filterSettings.type = newType;
    
    // Disconnect old filter
    masterBus.disconnect();
    if (currentCustomFilter) {
      currentCustomFilter.disconnect();
    } else if (masterFilter) {
      (masterFilter as BiquadFilterNode).disconnect();
    }
    
    // Create new filter
    const audioEngine = AudioEngine.getInstance();
    if (newType === 'lowpass12') {
      currentCustomFilter = new Lowpass12Filter(filterSettings.cutoff);
      currentCustomFilter.setParameter('resonance', filterSettings.resonance);
      masterFilter = currentCustomFilter;
      masterBus.connect(currentCustomFilter.getInputNode());
      currentCustomFilter.getOutputNode().connect(analyser);
    } else if (newType === 'lowpass24') {
      currentCustomFilter = new Lowpass24Filter(filterSettings.cutoff);
      currentCustomFilter.setParameter('resonance', filterSettings.resonance);
      masterFilter = currentCustomFilter;
      masterBus.connect(currentCustomFilter.getInputNode());
      currentCustomFilter.getOutputNode().connect(analyser);
    } else {
      currentCustomFilter = null;
      masterFilter = audioEngine.createBiquadFilter(newType as BiquadFilterType);
      (masterFilter as BiquadFilterNode).frequency.value = filterSettings.cutoff;
      (masterFilter as BiquadFilterNode).Q.value = filterSettings.resonance;
      masterBus.connect(masterFilter as BiquadFilterNode);
      (masterFilter as BiquadFilterNode).connect(analyser);
    }
    
    // Update filter visualizer filter node
    if (filterVisualizer) {
      let newFilterNode: BiquadFilterNode | null = null;
      if (currentCustomFilter instanceof Lowpass24Filter) {
        newFilterNode = currentCustomFilter.getCascadedFrequencyResponse();
      } else if (currentCustomFilter) {
        newFilterNode = currentCustomFilter.getFilterNode();
      } else {
        newFilterNode = masterFilter as BiquadFilterNode | null;
      }
      filterVisualizer.updateConfig({ filterNode: newFilterNode });
    }
  });

  // Cutoff frequency (logarithmic scale)
  cutoffSlider.addEventListener('input', () => {
    if (!masterFilter || !filterVisualizer) return;
    
    // Convert from logarithmic slider value to frequency
    // Slider range: log(20) to log(20000) ≈ 2.996 to 9.903
    const logValue = parseFloat(cutoffSlider.value);
    filterSettings.cutoff = Math.exp(logValue); // e^x to get actual frequency
    
    if (currentCustomFilter) {
      currentCustomFilter.setParameter('cutoff', filterSettings.cutoff);
    } else {
      (masterFilter as BiquadFilterNode).frequency.value = filterSettings.cutoff;
    }
    
    // Format frequency display nicely
    const freqDisplay = filterSettings.cutoff >= 1000 
      ? `${(filterSettings.cutoff / 1000).toFixed(2)} kHz`
      : `${Math.round(filterSettings.cutoff)} Hz`;
    cutoffValue.textContent = freqDisplay;
    filterVisualizer.updateConfig({ cutoffFrequency: filterSettings.cutoff });
  });

  // Resonance (Q)
  resonanceSlider.addEventListener('input', () => {
    if (!masterFilter) return;
    filterSettings.resonance = parseFloat(resonanceSlider.value) / 10;
    
    if (currentCustomFilter) {
      currentCustomFilter.setParameter('resonance', filterSettings.resonance);
    } else {
      (masterFilter as BiquadFilterNode).Q.value = filterSettings.resonance;
    }
    
    resonanceValue.textContent = filterSettings.resonance.toFixed(1);
  });

  // Toggle filter
  toggleBtn.addEventListener('click', () => {
    if (!masterFilter || !filterVisualizer) return;

    filterSettings.enabled = !filterSettings.enabled;

    if (filterSettings.enabled) {
      // Re-insert filter in chain
      masterBus.disconnect();
      if (currentCustomFilter) {
        masterBus.connect(currentCustomFilter.getInputNode());
        currentCustomFilter.getOutputNode().connect(analyser!);
      } else {
        masterBus.connect(masterFilter as BiquadFilterNode);
        (masterFilter as BiquadFilterNode).connect(analyser!);
      }
      
      toggleBtn.textContent = 'Disable Filter';
      toggleBtn.classList.add('active');
      powerIndicator.classList.add('on');
    } else {
      // Bypass filter
      masterBus.disconnect();
      if (currentCustomFilter) {
        currentCustomFilter.disconnect();
      } else {
        (masterFilter as BiquadFilterNode).disconnect();
      }
      masterBus.connect(analyser!);
      
      toggleBtn.textContent = 'Enable Filter';
      toggleBtn.classList.remove('active');
      powerIndicator.classList.remove('on');
    }
    
    filterVisualizer.updateConfig({ filterEnabled: filterSettings.enabled });
  });
}

function setupWaveformVisualizer() {
  // Setup waveform visualizer for Oscillator 1
  const waveformCanvas1 = document.getElementById('oscillator-waveform') as HTMLCanvasElement;
  if (waveformCanvas1 && analyser1) {
    waveformVisualizer1 = new Visualizer({
      canvas: waveformCanvas1,
      filterNode: null, // No filter response needed
      analyserNode: analyser1,
      filterEnabled: false,
      cutoffFrequency: 0,
      sampleRate: AudioEngine.getInstance().getSampleRate(),
      showFilter: false, // Only show waveform
      showWaveform: true
    });
    waveformVisualizer1.start();
  }

  // Setup waveform visualizer for Oscillator 2
  const waveformCanvas2 = document.getElementById('oscillator2-waveform') as HTMLCanvasElement;
  if (waveformCanvas2 && analyser2) {
    waveformVisualizer2 = new Visualizer({
      canvas: waveformCanvas2,
      filterNode: null, // No filter response needed
      analyserNode: analyser2,
      filterEnabled: false,
      cutoffFrequency: 0,
      sampleRate: AudioEngine.getInstance().getSampleRate(),
      showFilter: false, // Only show waveform
      showWaveform: true
    });
    waveformVisualizer2.start();
  }
}

function setupEffectsChain() {
  if (!effectsChain) return;

  const effectsList = document.getElementById('effects-list') as HTMLDivElement;
  const effectsCount = document.getElementById('effects-count') as HTMLSpanElement;
  const effectsToggle = document.getElementById('effects-toggle') as HTMLButtonElement;
  const effectsPower = document.getElementById('effects-power') as HTMLDivElement;

  // Add effect buttons
  document.getElementById('add-delay')?.addEventListener('click', () => addEffect('delay'));
  document.getElementById('add-reverb')?.addEventListener('click', () => addEffect('reverb'));
  document.getElementById('add-distortion')?.addEventListener('click', () => addEffect('distortion'));
  document.getElementById('add-chorus')?.addEventListener('click', () => addEffect('chorus'));

  // Bypass chain toggle
  effectsToggle.addEventListener('click', () => {
    const bypassed = effectsChain!.isChainBypassed();
    effectsChain!.bypassChain(!bypassed);
    
    if (bypassed) {
      effectsToggle.classList.add('active');
      effectsToggle.textContent = 'Bypass Effects Chain';
      effectsPower.classList.add('on');
    } else {
      effectsToggle.classList.remove('active');
      effectsToggle.textContent = 'Enable Effects Chain';
      effectsPower.classList.remove('on');
    }
  });

  function addEffect(type: 'delay' | 'reverb' | 'distortion' | 'chorus') {
    if (!effectsChain) return;

    let effect;
    switch (type) {
      case 'delay':
        effect = new DelayEffect(0.3, 0.4);
        effect.setParameter('mix', 0.5);
        break;
      case 'reverb':
        effect = new ReverbEffect(2.0);
        effect.setParameter('mix', 0.3);
        break;
      case 'distortion':
        effect = new DistortionEffect(10);
        effect.setParameter('mix', 0.5);
        break;
      case 'chorus':
        effect = new ChorusEffect(1.5, 0.5);
        effect.setParameter('mix', 0.5);
        break;
    }

    effectsChain.addEffect(effect);
    renderEffectsList();
  }

  function renderEffectsList() {
    if (!effectsChain) return;

    const effects = effectsChain.getEffects();
    effectsCount.textContent = effects.length.toString();

    if (effects.length === 0) {
      effectsList.innerHTML = '<div style="color: #666; text-align: center; font-size: 0.85rem;">No effects added</div>';
      return;
    }

    effectsList.innerHTML = '';

    effects.forEach((slot, index) => {
      const effectDiv = document.createElement('div');
      effectDiv.className = 'effect-slot' + (slot.bypassed ? ' bypassed' : '');

      const effectName = slot.effect.getName();
      const params = slot.effect.getParameters();

      effectDiv.innerHTML = `
        <div class="effect-header">
          <div class="effect-name">${index + 1}. ${effectName}</div>
          <div class="effect-controls">
            <button class="effect-btn" data-action="bypass" data-id="${slot.id}">
              ${slot.bypassed ? 'Enable' : 'Bypass'}
            </button>
            <button class="effect-btn danger" data-action="remove" data-id="${slot.id}">Remove</button>
          </div>
        </div>
        <div class="effect-parameters">
          ${params.map(param => {
            const currentValue = slot.effect.getParameter(param.name);
            return `
            <div class="effect-param">
              <div class="effect-param-label">
                <span>${param.name}</span>
                <span class="effect-param-value" id="param-${slot.id}-${param.name}">${currentValue.toFixed(2)}</span>
              </div>
              <input type="range" 
                data-effect-id="${slot.id}" 
                data-param-name="${param.name}"
                min="${param.min}" 
                max="${param.max}" 
                step="0.01" 
                value="${currentValue}">
            </div>
          `}).join('')}
        </div>
      `;

      effectsList.appendChild(effectDiv);
    });

    // Add event listeners for controls
    effectsList.querySelectorAll('[data-action="bypass"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const id = target.getAttribute('data-id')!;
        const slot = effectsChain!.getEffects().find(s => s.id === id);
        if (slot) {
          effectsChain!.bypassEffect(id, !slot.bypassed);
          renderEffectsList();
        }
      });
    });

    effectsList.querySelectorAll('[data-action="remove"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const id = target.getAttribute('data-id')!;
        effectsChain!.removeEffect(id);
        renderEffectsList();
      });
    });

    effectsList.querySelectorAll('input[type="range"]').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const effectId = target.getAttribute('data-effect-id')!;
        const paramName = target.getAttribute('data-param-name')!;
        const value = parseFloat(target.value);

        const effect = effectsChain!.getEffect(effectId);
        if (effect) {
          effect.setParameter(paramName, value);
          
          // Update display
          const valueDisplay = document.getElementById(`param-${effectId}-${paramName}`);
          if (valueDisplay) {
            valueDisplay.textContent = value.toFixed(2);
          }
        }
      });
    });
  }
}

function setupKeyboard() {
  const keyboardContainer = document.getElementById('keyboard') as HTMLDivElement;
  const keyElements: Map<number, HTMLDivElement> = new Map();

  // First pass: create all white keys (they go in the back)
  let whiteKeyIndex = 0;
  const whiteKeyPositions: Map<number, number> = new Map();
  
  notes.forEach((noteData, index) => {
    if (noteData.white) {
      const keyDiv = document.createElement('div');
      keyDiv.classList.add('key', 'white');
      keyDiv.style.left = `${whiteKeyIndex * 62}px`;
      
      // Create note name label
      const noteLabel = document.createElement('div');
      noteLabel.classList.add('key-label');
      noteLabel.style.fontWeight = 'bold';
      noteLabel.style.fontSize = '14px';
      noteLabel.textContent = noteData.note;
      keyDiv.appendChild(noteLabel);

      // Create keyboard shortcut label
      const keyLabel = document.createElement('div');
      keyLabel.classList.add('key-label');
      keyLabel.style.fontSize = '11px';
      keyLabel.style.opacity = '0.6';
      keyLabel.style.marginTop = '4px';
      keyLabel.textContent = noteData.key;
      keyDiv.appendChild(keyLabel);

      keyDiv.addEventListener('mousedown', () => playNote(index));
      keyDiv.addEventListener('mouseup', () => releaseNote(index));
      keyDiv.addEventListener('mouseleave', () => releaseNote(index));

      keyboardContainer.appendChild(keyDiv);
      keyElements.set(index, keyDiv);
      
      whiteKeyPositions.set(index, whiteKeyIndex);
      whiteKeyIndex++;
    }
  });

  // Second pass: create all black keys (they go on top)
  notes.forEach((noteData, index) => {
    if (!noteData.white) {
      const keyDiv = document.createElement('div');
      keyDiv.classList.add('key', 'black');
      
      // Find the white key position just before this black key
      let prevWhiteKeyPos = 0;
      for (let i = index - 1; i >= 0; i--) {
        if (notes[i].white && whiteKeyPositions.has(i)) {
          prevWhiteKeyPos = whiteKeyPositions.get(i)!;
          break;
        }
      }
      
      // Position black key overlapping between white keys
      // White keys are 60px wide (+ 2px border = 62px spacing)
      // Black key is 40px wide, should be centered between white keys
      // Offset: 62px (white key width) - 20px (half of black key) = 42px from left edge
      keyDiv.style.left = `${prevWhiteKeyPos * 62 + 42}px`;
      
      // Create note name label
      const noteLabel = document.createElement('div');
      noteLabel.classList.add('key-label');
      noteLabel.style.fontWeight = 'bold';
      noteLabel.style.fontSize = '11px';
      noteLabel.textContent = noteData.note;
      keyDiv.appendChild(noteLabel);

      // Create keyboard shortcut label
      const keyLabel = document.createElement('div');
      keyLabel.classList.add('key-label');
      keyLabel.style.fontSize = '10px';
      keyLabel.style.opacity = '0.7';
      keyLabel.style.marginTop = '2px';
      keyLabel.textContent = noteData.key;
      keyDiv.appendChild(keyLabel);

      keyDiv.addEventListener('mousedown', () => playNote(index));
      keyDiv.addEventListener('mouseup', () => releaseNote(index));
      keyDiv.addEventListener('mouseleave', () => releaseNote(index));

      keyboardContainer.appendChild(keyDiv);
      keyElements.set(index, keyDiv);
    }
  });

  // Computer keyboard support
  const keyMap = new Map(notes.map((n, i) => [n.key.toLowerCase(), i]));
  const pressedKeys = new Set<string>();

  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (keyMap.has(key) && !pressedKeys.has(key)) {
      pressedKeys.add(key);
      const noteIndex = keyMap.get(key)!;
      playNote(noteIndex);
    }
  });

  document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (keyMap.has(key)) {
      pressedKeys.delete(key);
      const noteIndex = keyMap.get(key)!;
      releaseNote(noteIndex);
    }
  });

  // Store key elements for visual feedback
  (window as unknown as Record<string, unknown>).keyElements = keyElements;
}

function playNote(noteIndex: number) {
  // Don't play if note is already active
  if (activeVoices.has(noteIndex)) {
    return;
  }

  // Create a new voice for this note
  const voice: Voice = {
    noteIndex,
    oscillators: [],
    isActive: true,
  };

  // Create oscillators for each enabled config
  oscillatorConfigs.forEach((config, oscNum) => {
    if (config.enabled) {
      const noteData = notes[noteIndex];
      const freq = noteData.freq * Math.pow(2, config.octave);

      // Create oscillator based on waveform
      let oscillator: BaseOscillator;
      switch (config.waveform) {
        case 'sine':
          oscillator = new SineOscillator(freq);
          break;
        case 'sawtooth':
          oscillator = new SawtoothOscillator(freq);
          break;
        case 'square':
          oscillator = new SquareOscillator(freq);
          break;
        case 'triangle':
          oscillator = new TriangleOscillator(freq);
          break;
      }

      // Apply settings
      oscillator.setParameter('volume', config.volume);
      oscillator.setParameter('detune', config.detune);

      // Connect LFO to oscillator frequency for vibrato (if enabled)
      if (vibrato?.isEnabled()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const oscNode = (oscillator as any).oscillatorNode as OscillatorNode;
        if (oscNode && oscNode.frequency) {
          vibrato.connectToParam(oscNode.frequency);
        }
      }

      // Create pan node
      const engine = AudioEngine.getInstance();
      const panNode = engine.getContext().createStereoPanner();
      panNode.pan.value = config.pan;

      // Create envelope for this oscillator
      const envelope = new ADSREnvelope(envelopeSettings[oscNum as 1 | 2]);

      // Get the appropriate oscillator bus
      const oscBus = oscNum === 1 
        ? (window as unknown as Record<string, GainNode>).osc1Bus
        : (window as unknown as Record<string, GainNode>).osc2Bus;

      // Signal chain: oscillator -> pan -> envelope -> oscillator bus (-> analyser -> master bus)
      oscillator.connect(panNode);
      panNode.connect(envelope.getInputNode());
      envelope.connect(oscBus);

      oscillator.start();

      // Trigger the envelope
      envelope.trigger(1.0);

      voice.oscillators.push({ oscillator, panNode, envelope });
    }
  });

  // Store the voice
  activeVoices.set(noteIndex, voice);

  // Visual feedback
  const keyElements = (window as unknown as Record<string, Map<number, HTMLDivElement>>).keyElements;
  const keyDiv = keyElements.get(noteIndex);
  if (keyDiv) {
    keyDiv.classList.add('playing');
  }
}

function releaseNote(noteIndex: number) {
  const voice = activeVoices.get(noteIndex);
  if (!voice) {
    return;
  }

  // Trigger envelope release for all oscillator envelopes
  voice.oscillators.forEach(({ envelope }) => {
    envelope.triggerRelease();
  });

  // Schedule cleanup after release phase (use longest release time)
  const maxReleaseTime = Math.max(envelopeSettings[1].release, envelopeSettings[2].release);
  voice.releaseTimeout = window.setTimeout(() => {
    cleanupVoice(noteIndex);
  }, maxReleaseTime * 1000 + 50);

  // Visual feedback
  const keyElements = (window as unknown as Record<string, Map<number, HTMLDivElement>>).keyElements;
  const keyDiv = keyElements.get(noteIndex);
  if (keyDiv) {
    keyDiv.classList.remove('playing');
  }
}

function cleanupVoice(noteIndex: number) {
  const voice = activeVoices.get(noteIndex);
  if (!voice) {
    return;
  }

  // Clear any pending timeout
  if (voice.releaseTimeout !== undefined) {
    clearTimeout(voice.releaseTimeout);
  }

  // Stop all oscillators and disconnect envelopes
  voice.oscillators.forEach(({ oscillator, panNode, envelope }) => {
    oscillator.stop();
    panNode.disconnect();
    envelope.disconnect();
  });

  // Remove from active voices
  activeVoices.delete(noteIndex);
}

function setupMasterControls() {
  const masterVolume = document.getElementById('master-volume') as HTMLInputElement;
  const masterVolumeValue = document.getElementById('master-volume-value') as HTMLSpanElement;

  masterVolume.addEventListener('input', () => {
    const volume = parseInt(masterVolume.value) / 100;
    masterVolumeValue.textContent = `${masterVolume.value}%`;
    masterBus.setInputGain(volume);
  });
}
