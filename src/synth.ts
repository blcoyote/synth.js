/**
 * Modular Synthesizer
 * Full-featured synthesizer with multiple oscillators, effects chain,
 * step sequencer, and real-time parameter control
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
import { LFO, MultiTargetLFO, Sequencer, Arpeggiator } from './components/modulation';
import type { SequencerStep, ArpPattern, NoteDivision } from './components/modulation';
import { Lowpass12Filter, Lowpass24Filter } from './components/filters';
import {
  DelayEffect,
  ReverbEffect,
  DistortionEffect,
  ChorusEffect,
  ShimmerEffect,
  FlangerEffect,
  PhaserEffect,
  CompressorEffect,
  RingModulatorEffect,
} from './components/effects';
import { WaveSurferVisualizer } from './utils';
import {
  DEFAULT_OSCILLATOR_VOLUME,
  MAX_FILTER_MODULATION_DEPTH,
  MAX_TREMOLO_DEPTH,
  DEFAULT_EFFECT_MIX,
  MS_TO_SECONDS,
  PERCENT_TO_DECIMAL,
  LFO_RATE_SLIDER_FACTOR,
  LFO_PITCH_MODULATION_CENTS,
} from './synth/constants';

// Voice represents a single note being played
interface Voice {
  noteIndex: number;
  baseFrequency: number; // Original note frequency (before octave/detune)
  oscillators: Array<{
    oscillator: BaseOscillator;
    panNode: StereoPannerNode;
    envelope: ADSREnvelope;
    oscNum: number; // Which oscillator config this belongs to (1, 2, or 3)
  }>;
  isActive: boolean;
  releaseTimeout?: number;
}

// Import modular state modules
import {
  audioState,
  visualizationState,
  modulationState,
  voiceState,
  isInitialized,
  setInitialized,
} from './state';

// Note frequencies (C2 to C5) - Danish keyboard layout
const notes = [
  { note: 'C2', freq: 65.41, key: '<', white: true }, // Bottom row start
  { note: 'C#2', freq: 69.3, key: 'A', white: false },
  { note: 'D2', freq: 73.42, key: 'Z', white: true },
  { note: 'D#2', freq: 77.78, key: 'S', white: false },
  { note: 'E2', freq: 82.41, key: 'X', white: true },
  { note: 'F2', freq: 87.31, key: 'C', white: true },
  { note: 'F#2', freq: 92.5, key: 'F', white: false },
  { note: 'G2', freq: 98.0, key: 'V', white: true },
  { note: 'G#2', freq: 103.83, key: 'G', white: false },
  { note: 'A2', freq: 110.0, key: 'B', white: true },
  { note: 'A#2', freq: 116.54, key: 'H', white: false },
  { note: 'B2', freq: 123.47, key: 'N', white: true },
  { note: 'C3', freq: 130.81, key: 'M', white: true },
  { note: 'C#3', freq: 138.59, key: 'K', white: false },
  { note: 'D3', freq: 146.83, key: ',', white: true },
  { note: 'D#3', freq: 155.56, key: 'L', white: false },
  { note: 'E3', freq: 164.81, key: '.', white: true },
  { note: 'F3', freq: 174.61, key: '-', white: true },
  { note: 'F#3', freq: 185.0, key: null, white: false },
  { note: 'G3', freq: 196.0, key: 'Q', white: true }, // Top letter row
  { note: 'G#3', freq: 207.65, key: '2', white: false },
  { note: 'A3', freq: 220.0, key: 'W', white: true },
  { note: 'A#3', freq: 233.08, key: '3', white: false },
  { note: 'B3', freq: 246.94, key: 'E', white: true },
  { note: 'C4', freq: 261.63, key: 'R', white: true },
  { note: 'C#4', freq: 277.18, key: '5', white: false },
  { note: 'D4', freq: 293.66, key: 'T', white: true },
  { note: 'D#4', freq: 311.13, key: '6', white: false },
  { note: 'E4', freq: 329.63, key: 'Y', white: true },
  { note: 'F4', freq: 349.23, key: 'U', white: true },
  { note: 'F#4', freq: 369.99, key: '8', white: false },
  { note: 'G4', freq: 392.0, key: 'I', white: true },
  { note: 'G#4', freq: 415.3, key: '9', white: false },
  { note: 'A4', freq: 440.0, key: 'O', white: true },
  { note: 'A#4', freq: 466.16, key: '0', white: false },
  { note: 'B4', freq: 493.88, key: 'P', white: true },
  { note: 'C5', freq: 523.25, key: 'Å', white: true },
];

// Initialize audio system after user gesture
async function initializeAudioSystem() {
  const systemLed = document.getElementById('systemLed') as HTMLDivElement;
  const systemStatus = document.getElementById('systemStatus') as HTMLDivElement;

  if (isInitialized()) return;

  systemLed.classList.add('initializing');
  systemStatus.textContent = 'Initializing...';

  try {
    const engine = AudioEngine.getInstance();
    await engine.initialize({ latencyHint: 'interactive' });

    const busManager = BusManager.getInstance();
    busManager.initialize();
    audioState.setMasterBus(busManager.getMasterBus());

    // Create intermediate gain nodes for each oscillator with analysers
    const context = engine.getContext();
    const osc1Bus = context.createGain();
    const osc2Bus = context.createGain();
    const osc3Bus = context.createGain();

    const analyser1Node = context.createAnalyser();
    analyser1Node.fftSize = 2048;
    visualizationState.setAnalyser1(analyser1Node);
    
    const analyser2Node = context.createAnalyser();
    analyser2Node.fftSize = 2048;
    visualizationState.setAnalyser2(analyser2Node);
    
    const analyser3Node = context.createAnalyser();
    analyser3Node.fftSize = 2048;
    visualizationState.setAnalyser3(analyser3Node);

    // Connect: osc1Bus -> visualizationState.analyser1 -> masterBus
    osc1Bus.connect(visualizationState.analyser1);
    visualizationState.analyser1.connect(audioState.masterBus.getInputNode());

    // Connect: osc2Bus -> visualizationState.analyser2 -> masterBus
    osc2Bus.connect(visualizationState.analyser2);
    visualizationState.analyser2.connect(audioState.masterBus.getInputNode());

    // Connect: osc3Bus -> visualizationState.analyser3 -> masterBus
    osc3Bus.connect(visualizationState.analyser3);
    visualizationState.analyser3.connect(audioState.masterBus.getInputNode());

    // Store these buses globally so oscillators can connect to them
    (window as unknown as Record<string, GainNode>).osc1Bus = osc1Bus;
    (window as unknown as Record<string, GainNode>).osc2Bus = osc2Bus;
    (window as unknown as Record<string, GainNode>).osc3Bus = osc3Bus;

    // Create basic LFO for pitch modulation (shared across all voices)
    modulationState.setLfo(new LFO({
      frequency: 5.0,
      depth: 0.05,
      waveform: 'sine',
    }));

    // Create multi-target LFO for advanced modulation
    modulationState.setMultiLFO(new MultiTargetLFO({
      frequency: 5.0,
      waveform: 'sine',
    }));

    // Initialize oscillator configurations (not actual instances)
    voiceState.oscillatorConfigs.set(1, {
      enabled: true,
      waveform: 'sawtooth',
      octave: 0,
      detune: 0,
      volume: DEFAULT_OSCILLATOR_VOLUME,
      pan: 0,
    });

    voiceState.oscillatorConfigs.set(2, {
      enabled: false,
      waveform: 'sawtooth',
      octave: -1,
      detune: -7,
      volume: 0.5,
      pan: 0,
      fmEnabled: false,
      fmDepth: 0,
    });

    voiceState.oscillatorConfigs.set(3, {
      enabled: false,
      waveform: 'square',
      octave: 1,
      detune: 7,
      volume: 0.4,
      pan: 0,
      fmEnabled: false,
      fmDepth: 0,
    });

    // Create master filter and visualizationState.analyser
    const audioEngine = AudioEngine.getInstance();

    // Create initial filter (basic lowpass)
    if (audioState.filterSettings.type === 'lowpass12') {
      const filter = new Lowpass12Filter(audioState.filterSettings.cutoff);
      filter.setParameter('resonance', audioState.filterSettings.resonance);
      audioState.setCurrentCustomFilter(filter);
      audioState.setMasterFilter(filter);
    } else if (audioState.filterSettings.type === 'lowpass24') {
      const filter = new Lowpass24Filter(audioState.filterSettings.cutoff);
      filter.setParameter('resonance', audioState.filterSettings.resonance);
      audioState.setCurrentCustomFilter(filter);
      audioState.setMasterFilter(filter);
    } else {
      audioState.setCurrentCustomFilter(null);
      const filter = audioEngine.createBiquadFilter(audioState.filterSettings.type as BiquadFilterType);
      filter.frequency.value = audioState.filterSettings.cutoff;
      filter.Q.value = audioState.filterSettings.resonance;
      audioState.setMasterFilter(filter);
    }

    // Create visualizationState.analyser for visualization
    const analyserNode = audioEngine.createAnalyser();
    analyserNode.fftSize = 8192; // Increased for better frequency resolution
    analyserNode.smoothingTimeConstant = 0.75; // Slightly reduced for more responsive display
    visualizationState.setAnalyser(analyserNode);

    // Create effects chain
    audioState.setEffectsChain(new EffectsChain());

    // Signal chain: master bus -> filter -> effects chain -> visualizationState.analyser -> destination
    if (audioState.currentCustomFilter) {
      audioState.masterBus.connect(audioState.currentCustomFilter.getInputNode());
      audioState.currentCustomFilter.getOutputNode().connect(audioState.effectsChain.getInput());
    } else if (audioState.masterFilter) {
      audioState.masterBus.connect(audioState.masterFilter as BiquadFilterNode);
      (audioState.masterFilter as BiquadFilterNode).connect(audioState.effectsChain.getInput());
    } else {
      // Fallback: connect directly if no filter
      audioState.masterBus.connect(audioState.effectsChain.getInput());
    }
    audioState.effectsChain.getOutput().connect(visualizationState.analyser);
    visualizationState.analyser.connect(audioEngine.getDestination());

    setupOscillatorControls();
    setupEnvelopeControls();
    setupLFOControls();
    setupFilterControls();
    setupEffectsChain();
    setupKeyboard();
    setupWaveformVisualizer();
    setupMasterControls();
    setupSequencer();
    setupArpeggiator();
    setupCollapsibleSections();

    setInitialized(true);
    systemLed.classList.remove('initializing');
    systemLed.classList.add('ready');
    systemStatus.textContent = 'Ready';
  } catch (error) {
    console.error('Failed to initialize:', error);
    systemLed.classList.remove('initializing');
    systemStatus.textContent = 'Failed';
  }
}

// Set up UI and wait for user gesture to start audio
document.addEventListener('DOMContentLoaded', () => {
  const systemStatus = document.getElementById('systemStatus') as HTMLDivElement;
  systemStatus.textContent = 'Click anywhere to start';

  // Initialize audio on first user interaction
  const startAudio = () => {
    initializeAudioSystem();
    document.removeEventListener('click', startAudio);
    document.removeEventListener('keydown', startAudio);
  };

  document.addEventListener('click', startAudio, { once: true });
  document.addEventListener('keydown', startAudio, { once: true });
});

function setupOscillatorControls() {
  for (let oscNum = 1; oscNum <= 3; oscNum++) {
    // Toggle button
    const toggleBtn = document.getElementById(`osc${oscNum}-toggle`) as HTMLButtonElement;
    const powerIndicator = document.getElementById(`osc${oscNum}-power`) as HTMLDivElement;

    toggleBtn.addEventListener('click', () => {
      const config = voiceState.oscillatorConfigs.get(oscNum)!;
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
        const waveform = btn.getAttribute('data-wave') as
          | 'sine'
          | 'sawtooth'
          | 'square'
          | 'triangle';
        const config = voiceState.oscillatorConfigs.get(oscNum)!;
        config.waveform = waveform;

        // Update button states
        waveformBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        // Note: Waveform changes cannot be applied to currently playing notes
        // due to Web Audio API limitations (OscillatorNode type is immutable).
        // The new waveform will be applied to the next note played.
        // To apply immediately, we would need to stop and restart all voices.
      });
    });

    // Octave control
    const octaveSlider = document.getElementById(`osc${oscNum}-octave`) as HTMLInputElement;
    const octaveValue = document.getElementById(`osc${oscNum}-octave-value`) as HTMLSpanElement;
    octaveSlider.addEventListener('input', () => {
      const config = voiceState.oscillatorConfigs.get(oscNum)!;
      const newOctave = parseInt(octaveSlider.value);
      config.octave = newOctave;
      octaveValue.textContent = octaveSlider.value;

      // Update all active voices in real-time
      updateActiveVoiceParameters(oscNum, 'octave', newOctave);
    });

    // Detune control
    const detuneSlider = document.getElementById(`osc${oscNum}-detune`) as HTMLInputElement;
    const detuneValue = document.getElementById(`osc${oscNum}-detune-value`) as HTMLSpanElement;
    detuneSlider.addEventListener('input', () => {
      const config = voiceState.oscillatorConfigs.get(oscNum)!;
      const newDetune = parseInt(detuneSlider.value);
      config.detune = newDetune;
      detuneValue.textContent = `${detuneSlider.value}¢`;

      // Update all active voices in real-time
      updateActiveVoiceParameters(oscNum, 'detune', newDetune);
    });

    // Volume control
    const volumeSlider = document.getElementById(`osc${oscNum}-volume`) as HTMLInputElement;
    const volumeValue = document.getElementById(`osc${oscNum}-volume-value`) as HTMLSpanElement;
    volumeSlider.addEventListener('input', () => {
      const config = voiceState.oscillatorConfigs.get(oscNum)!;
      const newVolume = parseInt(volumeSlider.value) / 100;
      config.volume = newVolume;
      volumeValue.textContent = `${volumeSlider.value}%`;

      // Update all active voices in real-time
      voiceState.activeVoices.forEach((voice) => {
        voice.oscillators.forEach((oscData) => {
          if (oscData.oscNum === oscNum) {
            oscData.oscillator.setParameter('volume', newVolume);
          }
        });
      });
    });

    // Pan control
    const panSlider = document.getElementById(`osc${oscNum}-pan`) as HTMLInputElement;
    const panValue = document.getElementById(`osc${oscNum}-pan-value`) as HTMLSpanElement;
    panSlider.addEventListener('input', () => {
      const config = voiceState.oscillatorConfigs.get(oscNum)!;
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

      // Update all active voices in real-time
      voiceState.activeVoices.forEach((voice) => {
        voice.oscillators.forEach((oscData) => {
          if (oscData.oscNum === oscNum) {
            oscData.panNode.pan.value = panVal;
          }
        });
      });
    });

    // FM Modulation controls (only for oscillators 2 and 3)
    if (oscNum >= 2) {
      const fmToggleBtn = document.getElementById(`osc${oscNum}-fm-toggle`) as HTMLButtonElement;
      const fmDepthSlider = document.getElementById(`osc${oscNum}-fm-depth`) as HTMLInputElement;
      const fmDepthValue = document.getElementById(
        `osc${oscNum}-fm-depth-value`
      ) as HTMLSpanElement;

      fmToggleBtn?.addEventListener('click', () => {
        const config = voiceState.oscillatorConfigs.get(oscNum)!;
        config.fmEnabled = !config.fmEnabled;

        if (config.fmEnabled) {
          fmToggleBtn.textContent = 'Disable FM';
          fmToggleBtn.classList.add('active');
        } else {
          fmToggleBtn.textContent = 'Enable FM';
          fmToggleBtn.classList.remove('active');
        }
      });

      fmDepthSlider?.addEventListener('input', () => {
        const config = voiceState.oscillatorConfigs.get(oscNum)!;
        const newDepth = parseFloat(fmDepthSlider.value);
        config.fmDepth = newDepth;
        fmDepthValue.textContent = `${fmDepthSlider.value} Hz`;

        // Update all active voices in real-time
        voiceState.activeVoices.forEach((voice) => {
          voice.oscillators.forEach((oscData) => {
            if (oscData.oscNum === oscNum) {
              oscData.oscillator.setParameter('fmDepth', newDepth);
            }
          });
        });
      });
    }
  }
}

/**
 * Helper function to setup a single ADSR parameter control
 * Eliminates code duplication across envelope controls
 */
function setupEnvelopeParameter(
  envNum: 1 | 2 | 3,
  param: 'attack' | 'decay' | 'sustain' | 'release',
  valueTransform: (sliderValue: number) => number,
  displayFormat: (sliderValue: string) => string
): void {
  const slider = document.getElementById(`env${envNum}-${param}`) as HTMLInputElement;
  const valueDisplay = document.getElementById(`env${envNum}-${param}-value`) as HTMLSpanElement;

  if (!slider || !valueDisplay) {
    console.warn(`Envelope ${envNum} ${param} controls not found in DOM`);
    return;
  }

  slider.addEventListener('input', () => {
    const newValue = valueTransform(parseFloat(slider.value));
    voiceState.envelopeSettings[envNum][param] = newValue;
    valueDisplay.textContent = displayFormat(slider.value);

    // Update all active voices' envelopes in real-time
    voiceState.activeVoices.forEach((voice) => {
      voice.oscillators.forEach((oscData) => {
        if (oscData.oscNum === envNum) {
          // Update the envelope instance with new parameter
          oscData.envelope.setParameter(param, newValue);
        }
      });
    });
  });
}

function setupEnvelopeControls() {
  // Setup all three envelopes using the helper function
  // This eliminates ~100 lines of duplicated code

  const envelopes: Array<1 | 2 | 3> = [1, 2, 3];

  envelopes.forEach((envNum) => {
    // Attack: milliseconds to seconds
    setupEnvelopeParameter(
      envNum,
      'attack',
      (value) => value / MS_TO_SECONDS,
      (value) => `${value}ms`
    );

    // Decay: milliseconds to seconds
    setupEnvelopeParameter(
      envNum,
      'decay',
      (value) => value / MS_TO_SECONDS,
      (value) => `${value}ms`
    );

    // Sustain: percentage to decimal (0-1)
    setupEnvelopeParameter(
      envNum,
      'sustain',
      (value) => value / PERCENT_TO_DECIMAL,
      (value) => `${value}%`
    );

    // Release: milliseconds to seconds
    setupEnvelopeParameter(
      envNum,
      'release',
      (value) => value / MS_TO_SECONDS,
      (value) => `${value}ms`
    );
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

  // Mode radio buttons
  const freeModeRadio = document.getElementById('lfo-mode-free') as HTMLInputElement;
  const triggerModeRadio = document.getElementById('lfo-mode-trigger') as HTMLInputElement;

  // Target checkboxes
  const pitchCheckbox = document.getElementById('lfo-target-pitch') as HTMLInputElement;
  const volumeCheckbox = document.getElementById('lfo-target-volume') as HTMLInputElement;
  const panCheckbox = document.getElementById('lfo-target-pan') as HTMLInputElement;
  const filterCheckbox = document.getElementById('lfo-target-filter') as HTMLInputElement;

  // Rate control
  rateSlider.addEventListener('input', () => {
    const rate = parseFloat(rateSlider.value) / LFO_RATE_SLIDER_FACTOR; // 0.1 to 20 Hz
    modulationState.lfo?.setParameter('frequency', rate);
    modulationState.multiLFO?.setFrequency(rate);
    rateValue.textContent = `${rate.toFixed(1)} Hz`;
  });

  // Depth control
  depthSlider.addEventListener('input', () => {
    const depth = parseFloat(depthSlider.value) / 100;
    modulationState.lfo?.setParameter('depth', depth);

    // Update depth for all active targets in modulationState.multiLFO
    if (modulationState.multiLFO) {
      const depthValue = depth * LFO_PITCH_MODULATION_CENTS; // Scale for pitch modulation (cents)
      if (modulationState.multiLFO.hasTarget('pitch')) {
        modulationState.multiLFO.setTargetDepth('pitch', depthValue);
      }
      if (modulationState.multiLFO.hasTarget('volume')) {
        modulationState.multiLFO.setTargetDepth('volume', depth * MAX_TREMOLO_DEPTH); // Volume modulation (0-0.3)
      }
      if (modulationState.multiLFO.hasTarget('pan')) {
        modulationState.multiLFO.setTargetDepth('pan', depth); // Pan modulation (-1 to +1)
      }
      if (modulationState.multiLFO.hasTarget('filter')) {
        modulationState.multiLFO.setTargetDepth('filter', depth * MAX_FILTER_MODULATION_DEPTH); // Filter cutoff modulation (Hz)
      }
    }

    depthValue.textContent = `${depthSlider.value}%`;
  });

  // Waveform control
  waveformSelect.addEventListener('change', () => {
    const waveform = waveformSelect.value as 'sine' | 'triangle' | 'square' | 'sawtooth' | 'random';
    modulationState.lfo?.setWaveform(waveform);
    modulationState.multiLFO?.setWaveform(waveform);
  });

  // Mode selection
  freeModeRadio.addEventListener('change', () => {
    if (freeModeRadio.checked) {
      modulationState.lfoState.mode = 'free';
      // If LFO is enabled and filter target is active, start it immediately
      if (modulationState.lfoState.enabled && modulationState.lfoState.targets.filter && modulationState.multiLFO) {
        updateFilterLFOTarget();
        if (!modulationState.multiLFO.isEnabled()) {
          modulationState.multiLFO.start();
        }
      }
    }
  });

  triggerModeRadio.addEventListener('change', () => {
    if (triggerModeRadio.checked) {
      modulationState.lfoState.mode = 'trigger';
      // Stop free-running LFO (will restart on next note)
      if (modulationState.lfo?.isEnabled()) {
        modulationState.lfo.stop();
      }
      if (modulationState.multiLFO?.isEnabled()) {
        modulationState.multiLFO.stop();
      }
    }
  });

  // Helper function to update filter LFO target
  function updateFilterLFOTarget() {
    if (!modulationState.multiLFO || !audioState.masterFilter) return;

    const filterParam =
      'frequency' in audioState.masterFilter ? (audioState.masterFilter as BiquadFilterNode).frequency : null;

    if (filterParam && modulationState.lfoState.targets.filter) {
      const currentCutoff = filterParam.value;
      const depth =
        (parseFloat(depthSlider.value) / PERCENT_TO_DECIMAL) * MAX_FILTER_MODULATION_DEPTH;

      if (modulationState.multiLFO.hasTarget('filter')) {
        modulationState.multiLFO.setTargetDepth('filter', depth);
        modulationState.multiLFO.setTargetBaseline('filter', currentCutoff);
      } else {
        modulationState.multiLFO.addTarget('filter', filterParam, depth, currentCutoff);
      }
    }
  }

  // Target checkboxes
  pitchCheckbox.addEventListener('change', () => {
    modulationState.lfoState.targets.pitch = pitchCheckbox.checked;
  });

  volumeCheckbox.addEventListener('change', () => {
    modulationState.lfoState.targets.volume = volumeCheckbox.checked;
  });

  panCheckbox.addEventListener('change', () => {
    modulationState.lfoState.targets.pan = panCheckbox.checked;
  });

  filterCheckbox.addEventListener('change', () => {
    modulationState.lfoState.targets.filter = filterCheckbox.checked;

    if (filterCheckbox.checked) {
      updateFilterLFOTarget();
      // Start LFO if in free-running mode and enabled
      if (modulationState.lfoState.mode === 'free' && modulationState.lfoState.enabled && modulationState.multiLFO && !modulationState.multiLFO.isEnabled()) {
        modulationState.multiLFO.start();
      }
    } else {
      // Remove filter target
      modulationState.multiLFO?.removeTarget('filter');
      // Stop modulationState.multiLFO if no targets remain
      if (modulationState.multiLFO && !modulationState.lfoState.targets.volume && !modulationState.lfoState.targets.pan) {
        modulationState.multiLFO.stop();
      }
    }
  });

  // Toggle LFO
  toggleBtn.addEventListener('click', () => {
    if (!modulationState.lfo || !modulationState.multiLFO) return;

    modulationState.lfoState.enabled = !modulationState.lfoState.enabled;

    if (modulationState.lfoState.enabled) {
      toggleBtn.textContent = 'Disable LFO';
      toggleBtn.classList.add('active');
      powerIndicator.classList.add('on');

      // Start LFOs in free-running mode
      if (modulationState.lfoState.mode === 'free') {
        if (modulationState.lfoState.targets.pitch) {
          modulationState.lfo.start();
        }
        if (modulationState.lfoState.targets.volume || modulationState.lfoState.targets.pan || modulationState.lfoState.targets.filter) {
          // Set up filter target if needed
          if (modulationState.lfoState.targets.filter) {
            updateFilterLFOTarget();
          }
          modulationState.multiLFO.start();
        }
      }
      // In trigger mode, LFOs start when notes are played
    } else {
      toggleBtn.textContent = 'Enable LFO';
      toggleBtn.classList.remove('active');
      powerIndicator.classList.remove('on');

      // Stop all LFOs
      modulationState.lfo.stop();
      modulationState.multiLFO.stop();
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

  // Initialize filter visualizer with WaveSurfer.js
  const filterContainer = document.getElementById('audio-visualizer')?.parentElement;
  if (!filterContainer) {
    throw new Error('Filter visualizer container not found');
  }

  // Hide the canvas, use the container instead
  const filterCanvas = document.getElementById('audio-visualizer') as HTMLCanvasElement;
  filterCanvas.style.display = 'none';

  let filterNodeForViz: BiquadFilterNode | null = null;
  if (audioState.currentCustomFilter instanceof Lowpass24Filter) {
    filterNodeForViz = audioState.currentCustomFilter.getCascadedFrequencyResponse();
  } else if (audioState.currentCustomFilter) {
    filterNodeForViz = audioState.currentCustomFilter.getFilterNode();
  } else {
    filterNodeForViz = audioState.masterFilter as BiquadFilterNode | null;
  }

  const filterViz = new WaveSurferVisualizer({
    container: filterContainer,
    filterNode: filterNodeForViz,
    analyserNode: visualizationState.analyser,
    filterEnabled: audioState.filterSettings.enabled,
    cutoffFrequency: audioState.filterSettings.cutoff,
    sampleRate: AudioEngine.getInstance().getSampleRate(),
  });
  visualizationState.setFilterVisualizer(filterViz);
  filterViz.start();

  // Initialize slider to logarithmic value
  cutoffSlider.value = Math.log(audioState.filterSettings.cutoff).toString();
  const initialFreqDisplay =
    audioState.filterSettings.cutoff >= 1000
      ? `${(audioState.filterSettings.cutoff / 1000).toFixed(2)} kHz`
      : `${Math.round(audioState.filterSettings.cutoff)} Hz`;
  cutoffValue.textContent = initialFreqDisplay;

  // Initialize filter toggle button state
  if (audioState.filterSettings.enabled) {
    toggleBtn.textContent = 'Disable Filter';
    toggleBtn.classList.add('active');
    powerIndicator.classList.add('on');
  } else {
    toggleBtn.textContent = 'Enable Filter';
    toggleBtn.classList.remove('active');
    powerIndicator.classList.remove('on');
  }

  // Filter type
  typeSelect.addEventListener('change', () => {
    if (!audioState.masterFilter || !visualizationState.analyser) return;
    const newType = typeSelect.value as BiquadFilterType | 'lowpass12' | 'lowpass24';
    audioState.filterSettings.type = newType;

    // Disconnect old filter
    audioState.masterBus.disconnect();
    if (audioState.currentCustomFilter) {
      audioState.currentCustomFilter.disconnect();
    } else if (audioState.masterFilter) {
      (audioState.masterFilter as BiquadFilterNode).disconnect();
    }

    // Create new filter
    const audioEngine = AudioEngine.getInstance();
    if (newType === 'lowpass12') {
      const filter = new Lowpass12Filter(audioState.filterSettings.cutoff);
      filter.setParameter('resonance', audioState.filterSettings.resonance);
      audioState.setCurrentCustomFilter(filter);
      audioState.setMasterFilter(filter);
      audioState.masterBus.connect(filter.getInputNode());
      filter.getOutputNode().connect(audioState.effectsChain.getInput());
    } else if (newType === 'lowpass24') {
      const filter = new Lowpass24Filter(audioState.filterSettings.cutoff);
      filter.setParameter('resonance', audioState.filterSettings.resonance);
      audioState.setCurrentCustomFilter(filter);
      audioState.setMasterFilter(filter);
      audioState.masterBus.connect(filter.getInputNode());
      filter.getOutputNode().connect(audioState.effectsChain.getInput());
    } else {
      audioState.setCurrentCustomFilter(null);
      const filter = audioEngine.createBiquadFilter(newType as BiquadFilterType);
      filter.frequency.value = audioState.filterSettings.cutoff;
      filter.Q.value = audioState.filterSettings.resonance;
      audioState.setMasterFilter(filter);
      audioState.masterBus.connect(filter);
      filter.connect(audioState.effectsChain.getInput());
    }

    // Update filter visualizer filter node
    if (visualizationState.filterVisualizer) {
      let newFilterNode: BiquadFilterNode | null = null;
      if (audioState.currentCustomFilter instanceof Lowpass24Filter) {
        newFilterNode = audioState.currentCustomFilter.getCascadedFrequencyResponse();
      } else if (audioState.currentCustomFilter) {
        newFilterNode = audioState.currentCustomFilter.getFilterNode();
      } else {
        newFilterNode = audioState.masterFilter as BiquadFilterNode | null;
      }
      visualizationState.filterVisualizer.updateConfig({ filterNode: newFilterNode });
    }
  });

  // Cutoff frequency (logarithmic scale)
  cutoffSlider.addEventListener('input', () => {
    if (!audioState.masterFilter || !visualizationState.filterVisualizer) return;

    // Convert from logarithmic slider value to frequency
    // Slider range: log(MIN_FILTER_CUTOFF) to log(MAX_FILTER_CUTOFF) ≈ 2.996 to 9.903
    const logValue = parseFloat(cutoffSlider.value);
    audioState.filterSettings.cutoff = Math.exp(logValue); // e^x to get actual frequency

    if (audioState.currentCustomFilter) {
      audioState.currentCustomFilter.setParameter('cutoff', audioState.filterSettings.cutoff);
    } else {
      (audioState.masterFilter as BiquadFilterNode).frequency.value = audioState.filterSettings.cutoff;
    }

    // Format frequency display nicely
    const freqDisplay =
      audioState.filterSettings.cutoff >= 1000
        ? `${(audioState.filterSettings.cutoff / 1000).toFixed(2)} kHz`
        : `${Math.round(audioState.filterSettings.cutoff)} Hz`;
    cutoffValue.textContent = freqDisplay;
    visualizationState.filterVisualizer.updateConfig({ cutoffFrequency: audioState.filterSettings.cutoff });
  });

  // Resonance (Q)
  resonanceSlider.addEventListener('input', () => {
    if (!audioState.masterFilter) return;
    audioState.filterSettings.resonance = parseFloat(resonanceSlider.value) / 10;

    if (audioState.currentCustomFilter) {
      audioState.currentCustomFilter.setParameter('resonance', audioState.filterSettings.resonance);
    } else {
      (audioState.masterFilter as BiquadFilterNode).Q.value = audioState.filterSettings.resonance;
    }

    resonanceValue.textContent = audioState.filterSettings.resonance.toFixed(1);
  });

  // Toggle filter
  toggleBtn.addEventListener('click', () => {
    if (!audioState.masterFilter || !visualizationState.filterVisualizer) return;

    audioState.filterSettings.enabled = !audioState.filterSettings.enabled;

    if (audioState.filterSettings.enabled) {
      // Re-insert filter in chain: masterBus -> filter -> audioState.effectsChain -> visualizationState.analyser
      audioState.masterBus.disconnect();
      if (audioState.currentCustomFilter) {
        audioState.masterBus.connect(audioState.currentCustomFilter.getInputNode());
        audioState.currentCustomFilter.getOutputNode().connect(audioState.effectsChain.getInput());
      } else {
        audioState.masterBus.connect(audioState.masterFilter as BiquadFilterNode);
        (audioState.masterFilter as BiquadFilterNode).connect(audioState.effectsChain.getInput());
      }

      toggleBtn.textContent = 'Disable Filter';
      toggleBtn.classList.add('active');
      powerIndicator.classList.add('on');
    } else {
      // Bypass filter: masterBus -> audioState.effectsChain -> visualizationState.analyser
      audioState.masterBus.disconnect();
      if (audioState.currentCustomFilter) {
        audioState.currentCustomFilter.disconnect();
      } else {
        (audioState.masterFilter as BiquadFilterNode).disconnect();
      }
      audioState.masterBus.connect(audioState.effectsChain.getInput());

      toggleBtn.textContent = 'Enable Filter';
      toggleBtn.classList.remove('active');
      powerIndicator.classList.remove('on');
    }

    visualizationState.filterVisualizer.updateConfig({ filterEnabled: audioState.filterSettings.enabled });
  });
}

function setupWaveformVisualizer() {
  // Setup waveform visualizer for Oscillator 1
  const waveformCanvas1 = document.getElementById('oscillator-waveform') as HTMLCanvasElement;
  if (waveformCanvas1 && visualizationState.analyser1) {
    // Hide the old canvas
    waveformCanvas1.style.display = 'none';

    // Configure analyser for more stable waveform display
    visualizationState.analyser1.smoothingTimeConstant = 0.9; // More smoothing = more stable
    visualizationState.analyser1.fftSize = 2048; // Lower resolution = less jitter

    // Get the parent container
    const container1 = waveformCanvas1.parentElement;
    if (container1) {
      const viz1 = new WaveSurferVisualizer({
        container: container1,
        analyserNode: visualizationState.analyser1,
        mode: 'waveform',
        height: 120,
      });
      visualizationState.setWaveformVisualizer1(viz1);
      viz1.start();
    }
  }

  // Setup waveform visualizer for Oscillator 2
  const waveformCanvas2 = document.getElementById('oscillator2-waveform') as HTMLCanvasElement;
  if (waveformCanvas2 && visualizationState.analyser2) {
    // Hide the old canvas
    waveformCanvas2.style.display = 'none';

    // Configure analyser for more stable waveform display
    visualizationState.analyser2.smoothingTimeConstant = 0.9; // More smoothing = more stable
    visualizationState.analyser2.fftSize = 2048; // Lower resolution = less jitter

    // Get the parent container
    const container2 = waveformCanvas2.parentElement;
    if (container2) {
      const viz2 = new WaveSurferVisualizer({
        container: container2,
        analyserNode: visualizationState.analyser2,
        mode: 'waveform',
        height: 120,
      });
      visualizationState.setWaveformVisualizer2(viz2);
      viz2.start();
    }
  }

  // Setup waveform visualizer for Oscillator 3
  const waveformCanvas3 = document.getElementById('oscillator3-waveform') as HTMLCanvasElement;
  if (waveformCanvas3 && visualizationState.analyser3) {
    // Hide the old canvas
    waveformCanvas3.style.display = 'none';

    // Configure analyser for more stable waveform display
    visualizationState.analyser3.smoothingTimeConstant = 0.9; // More smoothing = more stable
    visualizationState.analyser3.fftSize = 2048; // Lower resolution = less jitter

    // Get the parent container
    const container3 = waveformCanvas3.parentElement;
    if (container3) {
      const viz3 = new WaveSurferVisualizer({
        container: container3,
        analyserNode: visualizationState.analyser3,
        mode: 'waveform',
        height: 120,
      });
      visualizationState.setWaveformVisualizer3(viz3);
      viz3.start();
    }
  }
}

function setupEffectsChain() {
  if (!audioState.effectsChain) return;

  const effectsList = document.getElementById('effects-list') as HTMLDivElement;
  const effectsCount = document.getElementById('effects-count') as HTMLSpanElement;
  const effectsToggle = document.getElementById('effects-toggle') as HTMLButtonElement;
  const effectsPower = document.getElementById('effects-power') as HTMLDivElement;

  // Add effect buttons
  document.getElementById('add-delay')?.addEventListener('click', () => addEffect('delay'));
  document.getElementById('add-reverb')?.addEventListener('click', () => addEffect('reverb'));
  document
    .getElementById('add-distortion')
    ?.addEventListener('click', () => addEffect('distortion'));
  document.getElementById('add-chorus')?.addEventListener('click', () => addEffect('chorus'));
  document.getElementById('add-shimmer')?.addEventListener('click', () => addEffect('shimmer'));
  document.getElementById('add-flanger')?.addEventListener('click', () => addEffect('flanger'));
  document.getElementById('add-phaser')?.addEventListener('click', () => addEffect('phaser'));
  document
    .getElementById('add-compressor')
    ?.addEventListener('click', () => addEffect('compressor'));
  document
    .getElementById('add-ringmodulator')
    ?.addEventListener('click', () => addEffect('ringmodulator'));

  // Bypass chain toggle
  effectsToggle.addEventListener('click', () => {
    const bypassed = audioState.effectsChain.isChainBypassed();
    audioState.effectsChain.bypassChain(!bypassed);

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

  function addEffect(
    type:
      | 'delay'
      | 'reverb'
      | 'distortion'
      | 'chorus'
      | 'shimmer'
      | 'flanger'
      | 'phaser'
      | 'compressor'
      | 'ringmodulator'
  ) {
    if (!audioState.effectsChain) return;

    let effect;
    switch (type) {
      case 'delay':
        effect = new DelayEffect('medium'); // Use preset instead of parameters
        effect.setParameter('mix', DEFAULT_EFFECT_MIX);
        break;
      case 'reverb':
        effect = new ReverbEffect('hall'); // Use preset instead of decay parameter
        effect.setParameter('mix', DEFAULT_EFFECT_MIX);
        break;
      case 'distortion':
        effect = new DistortionEffect('distortion'); // Use preset instead of drive parameter
        effect.setParameter('mix', DEFAULT_EFFECT_MIX);
        break;
      case 'chorus':
        effect = new ChorusEffect('classic'); // Use preset instead of parameters
        effect.setParameter('mix', DEFAULT_EFFECT_MIX);
        break;
      case 'shimmer':
        effect = new ShimmerEffect('ethereal'); // Use preset instead of parameters
        effect.setParameter('mix', DEFAULT_EFFECT_MIX);
        break;
      case 'flanger':
        effect = new FlangerEffect('classic'); // Use preset instead of parameters
        effect.setParameter('mix', DEFAULT_EFFECT_MIX);
        break;
      case 'phaser':
        effect = new PhaserEffect('classic'); // Use preset instead of parameters
        effect.setParameter('mix', DEFAULT_EFFECT_MIX);
        break;
      case 'compressor':
        effect = new CompressorEffect('medium'); // Use preset instead of parameters
        effect.setParameter('mix', 1.0); // Compressor usually at 100% unless parallel
        break;
      case 'ringmodulator':
        effect = new RingModulatorEffect('metallic'); // Use preset instead of parameters
        effect.setParameter('mix', 0.7); // Ring mod often sounds better with some dry signal
        break;
    }

    audioState.effectsChain.addEffect(effect);
    renderEffectsList();
  }

  function renderEffectsList() {
    if (!audioState.effectsChain) return;

    const effects = audioState.effectsChain.getEffects();
    effectsCount.textContent = effects.length.toString();

    if (effects.length === 0) {
      effectsList.innerHTML =
        '<div style="color: #666; text-align: center; font-size: 0.85rem;">No effects added</div>';
      return;
    }

    effectsList.innerHTML = '';

    effects.forEach((slot, index) => {
      const effectDiv = document.createElement('div');
      effectDiv.className = 'effect-slot' + (slot.bypassed ? ' bypassed' : '');

      const effectName = slot.effect.getName();
      const params = slot.effect.getParameters();

      // Check if this is a DelayEffect or ReverbEffect to show preset selector
      const isDelayEffect = slot.effect.getType() === 'Effect-delay';
      const isReverbEffect = slot.effect.getType() === 'Effect-reverb';
      const isDistortionEffect = slot.effect.getType() === 'Effect-distortion';
      const isChorusEffect = slot.effect.getType() === 'Effect-chorus';
      const isShimmerEffect = slot.effect.getType() === 'Effect-shimmer';
      const isFlangerEffect = slot.effect.getType() === 'Effect-flanger';
      const isPhaserEffect = slot.effect.getType() === 'Effect-phaser';
      const isCompressorEffect = slot.effect.getType() === 'Effect-compressor';
      const isRingModulatorEffect = slot.effect.getType() === 'Effect-ring-modulator';
      let presetSelector = '';

      if (isDelayEffect && 'getPresets' in slot.effect && 'getCurrentPreset' in slot.effect) {
        const delayEffect = slot.effect as DelayEffect;
        const presets = delayEffect.getPresets();
        const currentPreset = delayEffect.getCurrentPreset();

        presetSelector = `
          <div class="effect-param">
            <div class="effect-param-label">
              <span>Preset</span>
            </div>
            <select class="delay-preset-select" data-effect-id="${slot.id}">
              ${Object.entries(presets)
                .map(
                  ([key, config]) => `
                <option value="${key}" ${currentPreset === key ? 'selected' : ''}>${config.name}</option>
              `
                )
                .join('')}
            </select>
          </div>
        `;
      } else if (
        isReverbEffect &&
        'getPresets' in slot.effect &&
        'getCurrentPreset' in slot.effect
      ) {
        const reverbEffect = slot.effect as ReverbEffect;
        const presets = reverbEffect.getPresets();
        const currentPreset = reverbEffect.getCurrentPreset();

        presetSelector = `
          <div class="effect-param">
            <div class="effect-param-label">
              <span>Preset</span>
            </div>
            <select class="reverb-preset-select" data-effect-id="${slot.id}">
              ${Object.entries(presets)
                .map(
                  ([key, config]) => `
                <option value="${key}" ${currentPreset === key ? 'selected' : ''}>${config.name}</option>
              `
                )
                .join('')}
            </select>
          </div>
        `;
      } else if (
        isDistortionEffect &&
        'getPresets' in slot.effect &&
        'getCurrentPreset' in slot.effect
      ) {
        const distortionEffect = slot.effect as DistortionEffect;
        const presets = distortionEffect.getPresets();
        const currentPreset = distortionEffect.getCurrentPreset();

        presetSelector = `
          <div class="effect-param">
            <div class="effect-param-label">
              <span>Preset</span>
            </div>
            <select class="distortion-preset-select" data-effect-id="${slot.id}">
              ${Object.entries(presets)
                .map(
                  ([key, config]) => `
                <option value="${key}" ${currentPreset === key ? 'selected' : ''}>${config.name}</option>
              `
                )
                .join('')}
            </select>
          </div>
        `;
      } else if (
        isChorusEffect &&
        'getPresets' in slot.effect &&
        'getCurrentPreset' in slot.effect
      ) {
        const chorusEffect = slot.effect as ChorusEffect;
        const presets = chorusEffect.getPresets();
        const currentPreset = chorusEffect.getCurrentPreset();

        presetSelector = `
          <div class="effect-param">
            <div class="effect-param-label">
              <span>Preset</span>
            </div>
            <select class="chorus-preset-select" data-effect-id="${slot.id}">
              ${Object.entries(presets)
                .map(
                  ([key, config]) => `
                <option value="${key}" ${currentPreset === key ? 'selected' : ''}>${config.name}</option>
              `
                )
                .join('')}
            </select>
          </div>
        `;
      } else if (
        isShimmerEffect &&
        'getPresets' in slot.effect &&
        'getCurrentPreset' in slot.effect
      ) {
        const shimmerEffect = slot.effect as ShimmerEffect;
        const presets = shimmerEffect.getPresets();
        const currentPreset = shimmerEffect.getCurrentPreset();

        presetSelector = `
          <div class="effect-param">
            <div class="effect-param-label">
              <span>Preset</span>
            </div>
            <select class="shimmer-preset-select" data-effect-id="${slot.id}">
              ${Object.entries(presets)
                .map(
                  ([key, config]) => `
                <option value="${key}" ${currentPreset === key ? 'selected' : ''}>${config.name}</option>
              `
                )
                .join('')}
            </select>
          </div>
        `;
      } else if (
        isFlangerEffect &&
        'getPresets' in slot.effect &&
        'getCurrentPreset' in slot.effect
      ) {
        const flangerEffect = slot.effect as FlangerEffect;
        const presets = flangerEffect.getPresets();
        const currentPreset = flangerEffect.getCurrentPreset();

        presetSelector = `
          <div class="effect-param">
            <div class="effect-param-label">
              <span>Preset</span>
            </div>
            <select class="flanger-preset-select" data-effect-id="${slot.id}">
              ${Object.entries(presets)
                .map(
                  ([key, config]) => `
                <option value="${key}" ${currentPreset === key ? 'selected' : ''}>${config.name}</option>
              `
                )
                .join('')}
            </select>
          </div>
        `;
      } else if (
        isPhaserEffect &&
        'getPresets' in slot.effect &&
        'getCurrentPreset' in slot.effect
      ) {
        const phaserEffect = slot.effect as PhaserEffect;
        const presets = phaserEffect.getPresets();
        const currentPreset = phaserEffect.getCurrentPreset();

        presetSelector = `
          <div class="effect-param">
            <div class="effect-param-label">
              <span>Preset</span>
            </div>
            <select class="phaser-preset-select" data-effect-id="${slot.id}">
              ${Object.entries(presets)
                .map(
                  ([key, config]) => `
                <option value="${key}" ${currentPreset === key ? 'selected' : ''}>${config.name}</option>
              `
                )
                .join('')}
            </select>
          </div>
        `;
      } else if (
        isCompressorEffect &&
        'getPresets' in slot.effect &&
        'getCurrentPreset' in slot.effect
      ) {
        const compressorEffect = slot.effect as CompressorEffect;
        const presets = compressorEffect.getPresets();
        const currentPreset = compressorEffect.getCurrentPreset();

        presetSelector = `
          <div class="effect-param">
            <div class="effect-param-label">
              <span>Preset</span>
            </div>
            <select class="compressor-preset-select" data-effect-id="${slot.id}">
              ${Object.entries(presets)
                .map(
                  ([key, config]) => `
                <option value="${key}" ${currentPreset === key ? 'selected' : ''}>${config.name}</option>
              `
                )
                .join('')}
            </select>
          </div>
        `;
      } else if (isRingModulatorEffect && 'getPresetInfo' in slot.effect) {
        const ringModulatorEffect = slot.effect as RingModulatorEffect;
        const presets = RingModulatorEffect.getPresets();
        const currentPresetInfo = ringModulatorEffect.getPresetInfo();
        const currentPresetName = currentPresetInfo?.name.toLowerCase() || 'metallic';

        presetSelector = `
          <div class="effect-param">
            <div class="effect-param-label">
              <span>Preset</span>
            </div>
            <select class="ringmodulator-preset-select" data-effect-id="${slot.id}">
              ${presets
                .map(
                  (config) => `
                <option value="${config.name.toLowerCase()}" ${currentPresetName === config.name.toLowerCase() ? 'selected' : ''}>${config.name}</option>
              `
                )
                .join('')}
            </select>
          </div>
        `;
      }

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
          ${presetSelector}
          ${params
            .map((param) => {
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
          `;
            })
            .join('')}
        </div>
      `;

      effectsList.appendChild(effectDiv);
    });

    // Add event listeners for controls
    effectsList.querySelectorAll('[data-action="bypass"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const id = target.getAttribute('data-id')!;
        const slot = audioState.effectsChain.getEffects().find((s) => s.id === id);
        if (slot) {
          audioState.effectsChain.bypassEffect(id, !slot.bypassed);
          renderEffectsList();
        }
      });
    });

    effectsList.querySelectorAll('[data-action="remove"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const id = target.getAttribute('data-id')!;
        audioState.effectsChain.removeEffect(id);
        renderEffectsList();
      });
    });

    effectsList.querySelectorAll('input[type="range"]').forEach((slider) => {
      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const effectId = target.getAttribute('data-effect-id')!;
        const paramName = target.getAttribute('data-param-name')!;
        const value = parseFloat(target.value);

        const effect = audioState.effectsChain.getEffect(effectId);
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

    // Add event listeners for delay preset selectors
    effectsList.querySelectorAll('.delay-preset-select').forEach((select) => {
      select.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const effectId = target.getAttribute('data-effect-id')!;
        const presetName = target.value;

        const effect = audioState.effectsChain.getEffect(effectId) as DelayEffect;
        if (effect && 'loadPreset' in effect) {
          effect.loadPreset(presetName as any);
          // Re-render to update parameter displays
          renderEffectsList();
        }
      });
    });

    // Add event listeners for reverb preset selectors
    effectsList.querySelectorAll('.reverb-preset-select').forEach((select) => {
      select.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const effectId = target.getAttribute('data-effect-id')!;
        const presetName = target.value;

        const effect = audioState.effectsChain.getEffect(effectId) as ReverbEffect;
        if (effect && 'loadPreset' in effect) {
          effect.loadPreset(presetName as any);
          // Re-render to update parameter displays
          renderEffectsList();
        }
      });
    });

    // Add event listeners for distortion preset selectors
    effectsList.querySelectorAll('.distortion-preset-select').forEach((select) => {
      select.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const effectId = target.getAttribute('data-effect-id')!;
        const presetName = target.value;

        const effect = audioState.effectsChain.getEffect(effectId) as DistortionEffect;
        if (effect && 'loadPreset' in effect) {
          effect.loadPreset(presetName as any);
          // Re-render to update parameter displays
          renderEffectsList();
        }
      });
    });

    // Add event listeners for chorus preset selectors
    effectsList.querySelectorAll('.chorus-preset-select').forEach((select) => {
      select.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const effectId = target.getAttribute('data-effect-id')!;
        const presetName = target.value;

        const effect = audioState.effectsChain.getEffect(effectId) as ChorusEffect;
        if (effect && 'loadPreset' in effect) {
          effect.loadPreset(presetName as any);
          // Re-render to update parameter displays
          renderEffectsList();
        }
      });
    });

    // Add event listeners for shimmer preset selectors
    effectsList.querySelectorAll('.shimmer-preset-select').forEach((select) => {
      select.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const effectId = target.getAttribute('data-effect-id')!;
        const presetName = target.value;

        const effect = audioState.effectsChain.getEffect(effectId) as ShimmerEffect;
        if (effect && 'loadPreset' in effect) {
          effect.loadPreset(presetName as any);
          // Re-render to update parameter displays
          renderEffectsList();
        }
      });
    });

    // Add event listeners for flanger preset selectors
    effectsList.querySelectorAll('.flanger-preset-select').forEach((select) => {
      select.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const effectId = target.getAttribute('data-effect-id')!;
        const presetName = target.value;

        const effect = audioState.effectsChain.getEffect(effectId) as FlangerEffect;
        if (effect && 'loadPreset' in effect) {
          effect.loadPreset(presetName as any);
          // Re-render to update parameter displays
          renderEffectsList();
        }
      });
    });

    // Add event listeners for phaser preset selectors
    effectsList.querySelectorAll('.phaser-preset-select').forEach((select) => {
      select.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const effectId = target.getAttribute('data-effect-id')!;
        const presetName = target.value;

        const effect = audioState.effectsChain.getEffect(effectId) as PhaserEffect;
        if (effect && 'loadPreset' in effect) {
          effect.loadPreset(presetName as any);
          // Re-render to update parameter displays
          renderEffectsList();
        }
      });
    });

    // Add event listeners for compressor preset selectors
    effectsList.querySelectorAll('.compressor-preset-select').forEach((select) => {
      select.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const effectId = target.getAttribute('data-effect-id')!;
        const presetName = target.value;

        const effect = audioState.effectsChain.getEffect(effectId) as CompressorEffect;
        if (effect && 'loadPreset' in effect) {
          effect.loadPreset(presetName as any);
          // Re-render to update parameter displays
          renderEffectsList();
        }
      });
    });

    // Add event listeners for ring modulator preset selectors
    effectsList.querySelectorAll('.ringmodulator-preset-select').forEach((select) => {
      select.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const effectId = target.getAttribute('data-effect-id')!;
        const presetName = target.value;

        const effect = audioState.effectsChain.getEffect(effectId) as RingModulatorEffect;
        if (effect && 'loadPreset' in effect) {
          effect.loadPreset(presetName);
          // Re-render to update parameter displays
          renderEffectsList();
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

      // Create combined note and keyboard key label
      const noteLabel = document.createElement('div');
      noteLabel.classList.add('key-label');
      noteLabel.style.fontWeight = 'bold';
      noteLabel.style.fontSize = '14px';

      // Combine note and keyboard key in one line
      if (noteData.key) {
        noteLabel.innerHTML = `${noteData.note}<br><span style="font-size: 10px; opacity: 0.6;">${noteData.key}</span>`;
      } else {
        noteLabel.textContent = noteData.note;
      }

      keyDiv.appendChild(noteLabel);

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

      // Create combined note and keyboard key label
      const noteLabel = document.createElement('div');
      noteLabel.classList.add('key-label');
      noteLabel.style.fontWeight = 'bold';
      noteLabel.style.fontSize = '11px';

      // Combine note and keyboard key in one line
      if (noteData.key) {
        noteLabel.innerHTML = `${noteData.note}<br><span style="font-size: 9px; opacity: 0.7;">${noteData.key}</span>`;
      } else {
        noteLabel.textContent = noteData.note;
      }

      keyDiv.appendChild(noteLabel);

      keyDiv.addEventListener('mousedown', () => playNote(index));
      keyDiv.addEventListener('mouseup', () => releaseNote(index));
      keyDiv.addEventListener('mouseleave', () => releaseNote(index));

      keyboardContainer.appendChild(keyDiv);
      keyElements.set(index, keyDiv);
    }
  });

  // Computer keyboard support
  const keyMap = new Map(
    notes.filter((n) => n.key !== null).map((n) => [n.key!.toLowerCase(), notes.indexOf(n)])
  );
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
  // If note is still releasing, clean it up first to allow retrigger
  if (voiceState.activeVoices.has(noteIndex)) {
    cleanupVoice(noteIndex);
  }

  const noteData = notes[noteIndex];
  const baseFrequency = noteData.freq;

  // Create a new voice for this note
  const voice: Voice = {
    noteIndex,
    baseFrequency,
    oscillators: [],
    isActive: true,
  };

  // Create oscillators for each enabled config
  voiceState.oscillatorConfigs.forEach((config, oscNum) => {
    if (config.enabled) {
      const freq = baseFrequency * Math.pow(2, config.octave);

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

      // Create pan node
      const engine = AudioEngine.getInstance();
      const panNode = engine.getContext().createStereoPanner();
      panNode.pan.value = config.pan;

      // Create envelope for this oscillator
      const envelope = new ADSREnvelope(voiceState.envelopeSettings[oscNum as 1 | 2 | 3]);

      // Get the envelope's gain node for volume modulation
      const envelopeGain = envelope.getOutputNode() as GainNode;

      // Connect LFO targets (if enabled)
      if (modulationState.lfoState.enabled) {
        // Pitch modulation
        if (modulationState.lfoState.targets.pitch) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const oscNode = (oscillator as any).oscillatorNode as OscillatorNode;
          if (oscNode && oscNode.frequency) {
            // In trigger mode, start LFO on note press
            if (modulationState.lfoState.mode === 'trigger' && !modulationState.lfo.isEnabled()) {
              modulationState.lfo.start();
            }
            // Always connect to this oscillator's frequency
            modulationState.lfo?.connectToParam(oscNode.frequency);
          }
        }

        // Volume modulation (tremolo) - modulate envelope output gain
        if (modulationState.lfoState.targets.volume && modulationState.multiLFO && envelopeGain && envelopeGain.gain) {
          const targetName = `volume_${noteIndex}_${oscNum}`;
          const depth =
            (parseFloat((document.getElementById('lfo-depth') as HTMLInputElement).value) / 100) *
            0.3;
          const baseline = envelopeGain.gain.value;

          if (!modulationState.multiLFO.hasTarget(targetName)) {
            modulationState.multiLFO.addTarget(targetName, envelopeGain.gain, depth, baseline);
          }

          // Start modulationState.multiLFO in trigger mode
          if (modulationState.lfoState.mode === 'trigger' && !modulationState.multiLFO.isEnabled()) {
            modulationState.multiLFO.start();
          }
        }

        // Pan modulation (auto-pan)
        if (modulationState.lfoState.targets.pan && modulationState.multiLFO && panNode && panNode.pan) {
          const targetName = `pan_${noteIndex}_${oscNum}`;
          const depth =
            parseFloat((document.getElementById('lfo-depth') as HTMLInputElement).value) / 100;
          const baseline = panNode.pan.value;

          if (!modulationState.multiLFO.hasTarget(targetName)) {
            modulationState.multiLFO.addTarget(targetName, panNode.pan, depth, baseline);
          }

          // Start modulationState.multiLFO in trigger mode
          if (modulationState.lfoState.mode === 'trigger' && !modulationState.multiLFO.isEnabled()) {
            modulationState.multiLFO.start();
          }
        }
      }

      // Get the appropriate oscillator bus
      const oscBus =
        oscNum === 1
          ? (window as unknown as Record<string, GainNode>).osc1Bus
          : oscNum === 2
            ? (window as unknown as Record<string, GainNode>).osc2Bus
            : (window as unknown as Record<string, GainNode>).osc3Bus;

      // Check if this oscillator should do FM modulation
      const shouldModulateOsc1 = config.fmEnabled && oscNum >= 2;

      if (!shouldModulateOsc1) {
        // Normal audio path: Signal chain: oscillator -> pan -> envelope -> oscillator bus (-> visualizationState.analyser -> master bus)
        oscillator.connect(panNode);
        panNode.connect(envelope.getInputNode());
        envelope.connect(oscBus);
      }

      // Always start the oscillator (needed for both audio output and FM modulation)
      oscillator.start();

      // Trigger the envelope
      envelope.trigger(1.0);

      // Store oscillator data with metadata
      voice.oscillators.push({ oscillator, panNode, envelope, oscNum });
    }
  });

  // Now handle FM modulation connections
  // Connect FM modulators (osc 2 & 3) to oscillator 1's frequency parameter
  const engine = AudioEngine.getInstance();

  voice.oscillators.forEach((modulatorData, idx) => {
    // Find which oscillator number this is by matching config order
    let oscNum = 0;
    let currentIdx = 0;
    voiceState.oscillatorConfigs.forEach((cfg, num) => {
      if (cfg.enabled) {
        if (currentIdx === idx) oscNum = num;
        currentIdx++;
      }
    });

    const config = voiceState.oscillatorConfigs.get(oscNum);
    if (config?.fmEnabled && oscNum >= 2 && config.fmDepth && config.fmDepth > 0) {
      // Find oscillator 1 instances in this voice to modulate
      voice.oscillators.forEach((carrierData, carrierIdx) => {
        let carrierOscNum = 0;
        let carrierCurrentIdx = 0;
        voiceState.oscillatorConfigs.forEach((cfg, num) => {
          if (cfg.enabled) {
            if (carrierCurrentIdx === carrierIdx) carrierOscNum = num;
            carrierCurrentIdx++;
          }
        });

        if (carrierOscNum === 1) {
          // Get the carrier's (osc 1) frequency parameter
          const carrierNode = carrierData.oscillator.getOscillatorNode();

          if (carrierNode && carrierNode.frequency) {
            // Create a gain node to scale the FM depth
            const fmGain = engine.getContext().createGain();
            fmGain.gain.value = config.fmDepth || 0;

            // FM signal chain: modulator -> pan -> envelope -> fmGain -> carrier.frequency
            // The modulator is already started above, we just need to route it to FM instead of audio out
            modulatorData.oscillator.connect(modulatorData.panNode);
            modulatorData.panNode.connect(modulatorData.envelope.getInputNode());
            modulatorData.envelope.connect(fmGain);
            fmGain.connect(carrierNode.frequency);
          }
        }
      });
    }
  });

  // Store the voice
  voiceState.activeVoices.set(noteIndex, voice);

  // Visual feedback
  const keyElements = (window as unknown as Record<string, Map<number, HTMLDivElement>>)
    .keyElements;
  const keyDiv = keyElements.get(noteIndex);
  if (keyDiv) {
    keyDiv.classList.add('playing');
  }
}

function releaseNote(noteIndex: number) {
  const voice = voiceState.activeVoices.get(noteIndex);
  if (!voice) {
    return;
  }

  // Trigger envelope release for all oscillator envelopes
  voice.oscillators.forEach(({ envelope }) => {
    envelope.triggerRelease();
  });

  // Schedule cleanup after release phase (use longest release time)
  const maxReleaseTime = Math.max(
    voiceState.envelopeSettings[1].release,
    voiceState.envelopeSettings[2].release,
    voiceState.envelopeSettings[3].release
  );
  voice.releaseTimeout = window.setTimeout(
    () => {
      cleanupVoice(noteIndex);
    },
    maxReleaseTime * 1000 + 50
  );

  // Visual feedback
  const keyElements = (window as unknown as Record<string, Map<number, HTMLDivElement>>)
    .keyElements;
  const keyDiv = keyElements.get(noteIndex);
  if (keyDiv) {
    keyDiv.classList.remove('playing');
  }
}

function cleanupVoice(noteIndex: number) {
  const voice = voiceState.activeVoices.get(noteIndex);
  if (!voice) {
    return;
  }

  // Clear any pending timeout
  if (voice.releaseTimeout !== undefined) {
    clearTimeout(voice.releaseTimeout);
  }

  // Remove LFO targets for this voice
  if (modulationState.multiLFO) {
    const multiLFO = modulationState.multiLFO; // Capture for closure
    voiceState.oscillatorConfigs.forEach((_, oscNum) => {
      multiLFO.removeTarget(`volume_${noteIndex}_${oscNum}`);
      multiLFO.removeTarget(`pan_${noteIndex}_${oscNum}`);
    });
  }

  // Stop all oscillators and disconnect envelopes
  voice.oscillators.forEach(({ oscillator, panNode, envelope }) => {
    oscillator.stop();
    panNode.disconnect();
    envelope.disconnect();
  });

  // Remove from active voices
  voiceState.activeVoices.delete(noteIndex);

  // In trigger mode, stop LFOs when all notes are released
  if (modulationState.lfoState.mode === 'trigger' && voiceState.activeVoices.size === 0) {
    modulationState.lfo?.stop();
    modulationState.multiLFO?.stop();
  }
}

function setupMasterControls() {
  const masterVolume = document.getElementById('master-volume') as HTMLInputElement;
  const masterVolumeValue = document.getElementById('master-volume-value') as HTMLSpanElement;

  masterVolume.addEventListener('input', () => {
    const volume = parseInt(masterVolume.value) / 100;
    masterVolumeValue.textContent = `${masterVolume.value}%`;
    audioState.masterBus.setInputGain(volume);
  });
}

// Update all active voices when an oscillator parameter changes
function updateActiveVoiceParameters(
  oscNum: number,
  paramType: 'octave' | 'detune',
  value: number
) {
  const config = voiceState.oscillatorConfigs.get(oscNum);
  if (!config) return;

  voiceState.activeVoices.forEach((voice) => {
    voice.oscillators.forEach((oscData) => {
      // Only update oscillators that belong to the changed config
      if (oscData.oscNum === oscNum) {
        if (paramType === 'octave') {
          // Recalculate frequency with new octave
          const newFrequency = voice.baseFrequency * Math.pow(2, value);
          oscData.oscillator.setParameter('frequency', newFrequency);
        } else if (paramType === 'detune') {
          // Update detune parameter
          oscData.oscillator.setParameter('detune', value);
        }
      }
    });
  });
}

// Apply a pitch bend to all active voices (useful for pitch wheel, LFO modulation, etc.)
// bendAmount: semitones to bend (+/- 12 typical range, +/- 2 for standard pitch wheel)
function applyPitchBendToAllVoices(bendAmount: number) {
  const bendMultiplier = Math.pow(2, bendAmount / 12); // Convert semitones to frequency multiplier

  voiceState.activeVoices.forEach((voice) => {
    voice.oscillators.forEach((oscData) => {
      const config = voiceState.oscillatorConfigs.get(oscData.oscNum);
      if (config) {
        // Apply both the oscillator's octave setting AND the pitch bend
        const newFrequency = voice.baseFrequency * Math.pow(2, config.octave) * bendMultiplier;
        oscData.oscillator.setParameter('frequency', newFrequency);
      }
    });
  });
}

// Expose pitch bend function for future MIDI/UI integration
(window as any).applyPitchBend = applyPitchBendToAllVoices;

// Helper function to convert MIDI note to frequency
function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Helper function to convert MIDI note to note name
function midiToNoteName(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const noteName = noteNames[midi % 12];
  return `${noteName}${octave}`;
}

// Play note directly from MIDI number (supports full C1-C8 range)
function playMidiNote(midiNote: number) {
  // Use MIDI note number as unique identifier (offset to avoid conflicts with keyboard notes)
  const voiceId = 1000 + midiNote;

  // If note is still releasing, clean it up first to allow retrigger
  if (voiceState.activeVoices.has(voiceId)) {
    cleanupVoice(voiceId);
  }

  // Calculate frequency from MIDI note
  const baseFrequency = midiToFrequency(midiNote);

  // Create a new voice for this note
  const voice: Voice = {
    noteIndex: voiceId,
    baseFrequency,
    oscillators: [],
    isActive: true,
  };

  // Create oscillators for each enabled config
  voiceState.oscillatorConfigs.forEach((config, oscNum) => {
    if (config.enabled) {
      const freq = baseFrequency * Math.pow(2, config.octave);

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

      // Create pan node
      const engine = AudioEngine.getInstance();
      const panNode = engine.getContext().createStereoPanner();
      panNode.pan.value = config.pan;

      // Create envelope for this oscillator
      const envelope = new ADSREnvelope(voiceState.envelopeSettings[oscNum as 1 | 2 | 3]);

      // Get the envelope's gain node for volume modulation
      const envelopeGain = envelope.getOutputNode() as GainNode;

      // Connect LFO targets (if enabled)
      if (modulationState.lfoState.enabled) {
        // Pitch modulation
        if (modulationState.lfoState.targets.pitch) {
          // eslint-disable-line @typescript-eslint/no-explicit-any
          const oscNode = (oscillator as any).oscillatorNode as OscillatorNode;
          if (oscNode && oscNode.frequency) {
            // In trigger mode, start LFO on note press
            if (modulationState.lfoState.mode === 'trigger' && !modulationState.lfo!.isEnabled()) {
              modulationState.lfo!.start();
            }
            // Always connect to this oscillator's frequency
            modulationState.lfo?.connectToParam(oscNode.frequency);
          }
        }

        // Volume modulation (tremolo) - modulate envelope output gain
        if (modulationState.lfoState.targets.volume && modulationState.multiLFO && envelopeGain && envelopeGain.gain) {
          const targetName = `volume_${voiceId}_${oscNum}`;
          const depth =
            (parseFloat((document.getElementById('lfo-depth') as HTMLInputElement).value) / 100) *
            0.3;
          const baseline = envelopeGain.gain.value;

          if (!modulationState.multiLFO.hasTarget(targetName)) {
            modulationState.multiLFO.addTarget(targetName, envelopeGain.gain, depth, baseline);
          }

          // Start modulationState.multiLFO in trigger mode
          if (modulationState.lfoState.mode === 'trigger' && !modulationState.multiLFO.isEnabled()) {
            modulationState.multiLFO.start();
          }
        }

        // Pan modulation (auto-pan)
        if (modulationState.lfoState.targets.pan && modulationState.multiLFO && panNode && panNode.pan) {
          const targetName = `pan_${voiceId}_${oscNum}`;
          const depth =
            parseFloat((document.getElementById('lfo-depth') as HTMLInputElement).value) / 100;
          const baseline = panNode.pan.value;

          if (!modulationState.multiLFO.hasTarget(targetName)) {
            modulationState.multiLFO.addTarget(targetName, panNode.pan, depth, baseline);
          }

          // Start modulationState.multiLFO in trigger mode
          if (modulationState.lfoState.mode === 'trigger' && !modulationState.multiLFO.isEnabled()) {
            modulationState.multiLFO.start();
          }
        }
      }

      // Get the appropriate oscillator bus
      const oscBus =
        oscNum === 1
          ? (window as unknown as Record<string, GainNode>).osc1Bus
          : oscNum === 2
            ? (window as unknown as Record<string, GainNode>).osc2Bus
            : (window as unknown as Record<string, GainNode>).osc3Bus;

      // Check if this oscillator should do FM modulation
      const shouldModulateOsc1 = config.fmEnabled && oscNum >= 2;

      if (!shouldModulateOsc1) {
        // Normal audio path: Signal chain: oscillator -> pan -> envelope -> oscillator bus
        oscillator.connect(panNode);
        panNode.connect(envelope.getInputNode());
        envelope.connect(oscBus);
      }

      // Always start the oscillator
      oscillator.start();

      // Trigger the envelope
      envelope.trigger(1.0);

      // Store oscillator data
      voice.oscillators.push({ oscillator, panNode, envelope, oscNum });
    }
  });

  // Handle FM modulation connections (same logic as playNote)
  const engine = AudioEngine.getInstance();

  voice.oscillators.forEach((modulatorData, idx) => {
    let oscNum = 0;
    let currentIdx = 0;
    voiceState.oscillatorConfigs.forEach((cfg, num) => {
      if (cfg.enabled) {
        if (currentIdx === idx) oscNum = num;
        currentIdx++;
      }
    });

    const config = voiceState.oscillatorConfigs.get(oscNum);
    if (config?.fmEnabled && oscNum >= 2 && config.fmDepth && config.fmDepth > 0) {
      voice.oscillators.forEach((carrierData, carrierIdx) => {
        let carrierOscNum = 0;
        let carrierCurrentIdx = 0;
        voiceState.oscillatorConfigs.forEach((cfg, num) => {
          if (cfg.enabled) {
            if (carrierCurrentIdx === carrierIdx) carrierOscNum = num;
            carrierCurrentIdx++;
          }
        });

        if (carrierOscNum === 1) {
          const carrierNode = carrierData.oscillator.getOscillatorNode();

          if (carrierNode && carrierNode.frequency) {
            const fmGain = engine.getContext().createGain();
            fmGain.gain.value = config.fmDepth || 0;

            modulatorData.oscillator.connect(modulatorData.panNode);
            modulatorData.panNode.connect(modulatorData.envelope.getInputNode());
            modulatorData.envelope.connect(fmGain);
            fmGain.connect(carrierNode.frequency);
          }
        }
      });
    }
  });

  // Store active voice
  voiceState.activeVoices.set(voiceId, voice);
}

// Release note by MIDI number
function releaseMidiNote(midiNote: number) {
  const voiceId = 1000 + midiNote;
  releaseNote(voiceId);
}

function setupSequencer() {
  // Create modulationState.sequencer instance
  modulationState.setSequencer(new Sequencer({
    steps: 16,
    tempo: 120,
    swing: 0,
    mode: 'forward',
  }));

  // Setup step grid
  const stepGrid = document.getElementById('step-grid') as HTMLDivElement;
  for (let i = 0; i < 16; i++) {
    const stepBtn = document.createElement('button');
    stepBtn.className = 'step-button';
    stepBtn.dataset.step = i.toString();
    stepBtn.addEventListener('click', () => {
      const step = modulationState.sequencer!.getStep(i);
      if (step) {
        // Toggle gate
        modulationState.sequencer!.setStep(i, { gate: !step.gate });
        updateStepButton(i);

        // Select this step for editing
        modulationState.setSelectedStepIndex(i);
        updateStepEditor();
      }
    });
    stepGrid.appendChild(stepBtn);
  }

  // Initialize step buttons
  for (let i = 0; i < 16; i++) {
    updateStepButton(i);
  }

  // Transport controls
  const playBtn = document.getElementById('seq-play') as HTMLButtonElement;
  const stopBtn = document.getElementById('seq-stop') as HTMLButtonElement;
  const pauseBtn = document.getElementById('seq-pause') as HTMLButtonElement;
  const resetBtn = document.getElementById('seq-reset') as HTMLButtonElement;
  const powerIndicator = document.getElementById('modulationState.sequencer-power') as HTMLDivElement;

  playBtn.addEventListener('click', () => {
    modulationState.sequencer!.start();
    powerIndicator.classList.add('on');
  });

  stopBtn.addEventListener('click', () => {
    modulationState.sequencer!.stop();
    powerIndicator.classList.remove('on');
    updateAllStepButtons();
  });

  pauseBtn.addEventListener('click', () => {
    if (modulationState.sequencer!.isRunning()) {
      modulationState.sequencer!.pause();
      powerIndicator.classList.remove('on');
    } else {
      modulationState.sequencer!.resume();
      powerIndicator.classList.add('on');
    }
  });

  resetBtn.addEventListener('click', () => {
    modulationState.sequencer!.reset();
    updateAllStepButtons();
  });

  // Tempo control
  const tempoSlider = document.getElementById('seq-tempo') as HTMLInputElement;
  const tempoValue = document.getElementById('seq-tempo-value') as HTMLSpanElement;

  tempoSlider.addEventListener('input', () => {
    const tempo = parseInt(tempoSlider.value);
    modulationState.sequencer!.setTempo(tempo);
    tempoValue.textContent = `${tempo} BPM`;
  });

  // Swing control
  const swingSlider = document.getElementById('seq-swing') as HTMLInputElement;
  const swingValue = document.getElementById('seq-swing-value') as HTMLSpanElement;

  swingSlider.addEventListener('input', () => {
    const swing = parseInt(swingSlider.value) / 100;
    modulationState.sequencer!.setSwing(swing);
    swingValue.textContent = `${swingSlider.value}%`;
  });

  // Step count buttons
  const stepButtons = document.querySelectorAll('[data-steps]');
  stepButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const steps = parseInt(btn.getAttribute('data-steps')!);
      modulationState.sequencer!.setSteps(steps as 4 | 8 | 16 | 32);

      // Update active button
      stepButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // Rebuild step grid
      rebuildStepGrid(steps);
    });
  });

  // Playback mode selector
  const modeSelect = document.getElementById('seq-mode') as HTMLSelectElement;
  modeSelect.addEventListener('change', () => {
    modulationState.sequencer!.setMode(modeSelect.value as 'forward' | 'reverse' | 'pingpong' | 'random');
  });

  // Step editor - Note
  const noteSlider = document.getElementById('seq-note') as HTMLInputElement;
  const noteValue = document.getElementById('seq-note-value') as HTMLSpanElement;

  noteSlider.addEventListener('input', () => {
    if (modulationState.selectedStepIndex !== null) {
      const pitch = parseInt(noteSlider.value);
      modulationState.sequencer!.setStep(modulationState.selectedStepIndex, { pitch });
      noteValue.textContent = midiToNoteName(pitch);
      updateStepButton(modulationState.selectedStepIndex);
    }
  });

  // Step editor - Velocity
  const velocitySlider = document.getElementById('seq-velocity') as HTMLInputElement;
  const velocityValue = document.getElementById('seq-velocity-value') as HTMLSpanElement;

  velocitySlider.addEventListener('input', () => {
    if (modulationState.selectedStepIndex !== null) {
      const velocity = parseInt(velocitySlider.value);
      modulationState.sequencer!.setStep(modulationState.selectedStepIndex, { velocity });
      velocityValue.textContent = velocity.toString();
      updateStepButton(modulationState.selectedStepIndex);
    }
  });

  // Pattern tools
  const clearBtn = document.getElementById('seq-clear') as HTMLButtonElement;
  const randomBtn = document.getElementById('seq-random') as HTMLButtonElement;
  const basslineBtn = document.getElementById('seq-bassline') as HTMLButtonElement;

  clearBtn.addEventListener('click', () => {
    modulationState.sequencer!.clear();
    updateAllStepButtons();
  });

  randomBtn.addEventListener('click', () => {
    modulationState.sequencer!.randomize(0.5); // 50% density
    updateAllStepButtons();
  });

  basslineBtn.addEventListener('click', () => {
    modulationState.sequencer!.createBasslinePattern();
    updateAllStepButtons();
  });

  // Setup step callback to trigger notes
  modulationState.sequencer!.onStep((stepIndex: number, stepData: SequencerStep) => {
    if (stepData.gate) {
      // Use playMidiNote to support full C1-C8 range
      playMidiNote(stepData.pitch);

      // Release after step length
      const stepDuration = 60000 / modulationState.sequencer!.getTempo() / 4; // 16th note duration
      const noteDuration = stepDuration * stepData.length;

      setTimeout(() => {
        releaseMidiNote(stepData.pitch);
      }, noteDuration);
    }

    // Update visual feedback
    updateAllStepButtons();

    // Update current step display
    const currentStepDisplay = document.getElementById('seq-current-step') as HTMLSpanElement;
    currentStepDisplay.textContent = `Step: ${stepIndex + 1}`;
  });

  // Initialize first step as selected
  modulationState.setSelectedStepIndex(0);
  updateStepEditor();
}

function updateStepButton(index: number) {
  const stepBtn = document.querySelector(`[data-step="${index}"]`) as HTMLButtonElement;
  if (!stepBtn) return;

  const step = modulationState.sequencer!.getStep(index);
  if (!step) return;

  // Update gate state
  if (step.gate) {
    stepBtn.classList.add('active');
  } else {
    stepBtn.classList.remove('active');
  }

  // Update playing state
  if (modulationState.sequencer!.isRunning() && modulationState.sequencer!.getCurrentStep() === index) {
    stepBtn.classList.add('playing');
  } else {
    stepBtn.classList.remove('playing');
  }

  // Update selected state
  if (modulationState.selectedStepIndex === index) {
    stepBtn.classList.add('selected');
  } else {
    stepBtn.classList.remove('selected');
  }
}

function updateAllStepButtons() {
  const steps = modulationState.sequencer!.getSteps();
  for (let i = 0; i < steps; i++) {
    updateStepButton(i);
  }
}

function updateStepEditor() {
  if (modulationState.selectedStepIndex === null) return;

  const step = modulationState.sequencer!.getStep(modulationState.selectedStepIndex);
  if (!step) return;

  const editStepDisplay = document.getElementById('seq-edit-step') as HTMLSpanElement;
  const noteSlider = document.getElementById('seq-note') as HTMLInputElement;
  const noteValue = document.getElementById('seq-note-value') as HTMLSpanElement;
  const velocitySlider = document.getElementById('seq-velocity') as HTMLInputElement;
  const velocityValue = document.getElementById('seq-velocity-value') as HTMLSpanElement;

  editStepDisplay.textContent = `${modulationState.selectedStepIndex + 1}`;
  noteSlider.value = step.pitch.toString();
  noteValue.textContent = midiToNoteName(step.pitch);
  velocitySlider.value = step.velocity.toString();
  velocityValue.textContent = step.velocity.toString();

  updateAllStepButtons();
}

function rebuildStepGrid(steps: number) {
  const stepGrid = document.getElementById('step-grid') as HTMLDivElement;
  stepGrid.innerHTML = '';
  stepGrid.style.gridTemplateColumns = `repeat(${steps}, 1fr)`;

  for (let i = 0; i < steps; i++) {
    const stepBtn = document.createElement('button');
    stepBtn.className = 'step-button';
    stepBtn.dataset.step = i.toString();
    stepBtn.addEventListener('click', () => {
      const step = modulationState.sequencer!.getStep(i);
      if (step) {
        modulationState.sequencer!.setStep(i, { gate: !step.gate });
        updateStepButton(i);
        modulationState.setSelectedStepIndex(i);
        updateStepEditor();
      }
    });
    stepGrid.appendChild(stepBtn);
  }

  updateAllStepButtons();
}

function setupArpeggiator() {
  // Create modulationState.arpeggiator instance
  modulationState.setArpeggiator(new Arpeggiator({
    pattern: 'up',
    octaves: 2,
    tempo: 120,
    division: '1/16',
    gateLength: 0.8,
    swing: 0,
    humanize: 0,
  }));

  // Set initial chord (C major)
  modulationState.arpeggiator!.setChord(60, 'major');

  // Register note callback
  modulationState.arpeggiator!.onNote((note) => {
    // Use playMidiNote to support full C1-C8 range
    playMidiNote(note.pitch);

    // Calculate note duration
    const tempo = modulationState.arpeggiator!.getTempo();
    const division = modulationState.arpeggiator!.getDivision();
    const quarterNoteDuration = 60000 / tempo;

    let noteDuration = quarterNoteDuration / 4; // Default to 1/16
    switch (division) {
      case '1/4':
        noteDuration = quarterNoteDuration;
        break;
      case '1/8':
        noteDuration = quarterNoteDuration / 2;
        break;
      case '1/16':
        noteDuration = quarterNoteDuration / 4;
        break;
      case '1/8T':
        noteDuration = (quarterNoteDuration / 2) * (2 / 3);
        break;
      case '1/16T':
        noteDuration = (quarterNoteDuration / 4) * (2 / 3);
        break;
      case '1/32':
        noteDuration = quarterNoteDuration / 8;
        break;
    }

    const gateDuration = noteDuration * note.gate;

    // Release after gate duration
    setTimeout(() => {
      releaseMidiNote(note.pitch);
    }, gateDuration);
  });

  // Enable/Disable toggle
  const enableBtn = document.getElementById('arp-enable') as HTMLButtonElement;
  const powerIndicator = document.getElementById('modulationState.arpeggiator-power') as HTMLDivElement;

  enableBtn.addEventListener('click', () => {
    modulationState.setArpeggiatorEnabled(!modulationState.arpeggiatorEnabled);

    if (modulationState.arpeggiatorEnabled) {
      // Disable modulationState.sequencer if running
      if (modulationState.sequencer?.isRunning()) {
        modulationState.sequencer.stop();
        document.getElementById('modulationState.sequencer-power')?.classList.remove('on');
      }

      modulationState.arpeggiator!.start();
      powerIndicator.classList.add('on');
      enableBtn.textContent = '⏸ Pause';
    } else {
      modulationState.arpeggiator!.pause();
      powerIndicator.classList.remove('on');
      enableBtn.textContent = '▶ Play';
    }
  });

  // Stop button
  const stopBtn = document.getElementById('arp-stop') as HTMLButtonElement;
  stopBtn.addEventListener('click', () => {
    modulationState.arpeggiator!.stop();
    modulationState.setArpeggiatorEnabled(false);
    powerIndicator.classList.remove('on');
    enableBtn.textContent = '▶ Play';
  });

  // Tempo
  const tempoSlider = document.getElementById('arp-tempo') as HTMLInputElement;
  const tempoValue = document.getElementById('arp-tempo-value') as HTMLSpanElement;
  tempoSlider.addEventListener('input', () => {
    const tempo = parseInt(tempoSlider.value);
    modulationState.arpeggiator!.setTempo(tempo);
    tempoValue.textContent = `${tempo} BPM`;
  });

  // Octaves
  const octavesSlider = document.getElementById('arp-octaves') as HTMLInputElement;
  const octavesValue = document.getElementById('arp-octaves-value') as HTMLSpanElement;
  octavesSlider.addEventListener('input', () => {
    const octaves = parseInt(octavesSlider.value);
    modulationState.arpeggiator!.setOctaves(octaves);
    octavesValue.textContent = octaves.toString();
  });

  // Gate Length
  const gateSlider = document.getElementById('arp-gate') as HTMLInputElement;
  const gateValue = document.getElementById('arp-gate-value') as HTMLSpanElement;
  gateSlider.addEventListener('input', () => {
    const gate = parseFloat(gateSlider.value) / 100;
    modulationState.arpeggiator!.setGateLength(gate);
    gateValue.textContent = `${gateSlider.value}%`;
  });

  // Note Division
  const divisionSelect = document.getElementById('arp-division') as HTMLSelectElement;
  divisionSelect.addEventListener('change', () => {
    modulationState.arpeggiator!.setDivision(divisionSelect.value as NoteDivision);
  });

  // Pattern buttons
  const patterns: ArpPattern[] = [
    'up',
    'down',
    'updown',
    'updown2',
    'converge',
    'diverge',
    'random',
  ];

  patterns.forEach((pattern) => {
    const btn = document.getElementById(`arp-pattern-${pattern}`) as HTMLButtonElement;
    if (btn) {
      btn.addEventListener('click', () => {
        modulationState.arpeggiator!.setPattern(pattern);

        // Update active state
        patterns.forEach((p) => {
          document.getElementById(`arp-pattern-${p}`)?.classList.remove('active');
        });
        btn.classList.add('active');
      });
    }
  });

  // Chord type buttons
  const chordTypes: Array<{
    id: string;
    type: 'major' | 'minor' | 'major7' | 'minor7' | 'dom7' | 'sus4';
  }> = [
    { id: 'major', type: 'major' },
    { id: 'minor', type: 'minor' },
    { id: 'major7', type: 'major7' },
    { id: 'minor7', type: 'minor7' },
    { id: 'dom7', type: 'dom7' },
    { id: 'sus4', type: 'sus4' },
  ];

  const rootNoteSelect = document.getElementById('arp-root-note') as HTMLSelectElement;
  const rootOctaveSelect = document.getElementById('arp-root-octave') as HTMLSelectElement;

  // Helper to calculate MIDI note from note + octave
  const getRootMidiNote = (): number => {
    const note = parseInt(rootNoteSelect.value);
    const octave = parseInt(rootOctaveSelect.value);
    return (octave + 1) * 12 + note; // MIDI: C-1 = 0, C0 = 12, C1 = 24, etc.
  };

  chordTypes.forEach((chord) => {
    const btn = document.getElementById(`arp-chord-${chord.id}`) as HTMLButtonElement;
    if (btn) {
      btn.addEventListener('click', () => {
        const rootNote = getRootMidiNote();
        modulationState.arpeggiator!.setChord(rootNote, chord.type);

        // Update active state
        chordTypes.forEach((c) => {
          document.getElementById(`arp-chord-${c.id}`)?.classList.remove('active');
        });
        btn.classList.add('active');
      });
    }
  });

  // Root note or octave change - re-trigger active chord
  const updateChord = () => {
    const activeChordBtn = document.querySelector('.arp-chord-btn.active') as HTMLButtonElement;
    if (activeChordBtn) {
      activeChordBtn.click();
    }
  };

  rootNoteSelect.addEventListener('change', updateChord);
  rootOctaveSelect.addEventListener('change', updateChord);
}

function setupCollapsibleSections() {
  // Find all collapsible headers
  const collapsibleHeaders = document.querySelectorAll('.module-header.collapsible');

  collapsibleHeaders.forEach((header) => {
    // Initialize collapsed state based on content element
    const targetId = header.getAttribute('data-collapse');
    if (targetId) {
      const contentElement = document.getElementById(`${targetId}-content`);
      if (contentElement && contentElement.classList.contains('collapsed')) {
        header.classList.add('collapsed');
      }
    }

    header.addEventListener('click', () => {
      const targetId = header.getAttribute('data-collapse');
      if (!targetId) return;

      const contentElement = document.getElementById(`${targetId}-content`);
      if (!contentElement) return;

      // Toggle collapsed state
      const isCollapsed = contentElement.classList.contains('collapsed');

      if (isCollapsed) {
        // Expand
        contentElement.classList.remove('collapsed');
        header.classList.remove('collapsed');
      } else {
        // Collapse
        contentElement.classList.add('collapsed');
        header.classList.add('collapsed');
      }
    });
  });
}
