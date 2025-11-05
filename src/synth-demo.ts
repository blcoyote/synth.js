/**
 * Professional Synthesizer Interface Demo
 * Multiple oscillators with keyboard control
 */

import { AudioEngine } from './core';
import { BusManager } from './bus';
import {
  SineOscillator,
  SawtoothOscillator,
  SquareOscillator,
  TriangleOscillator,
} from './components/oscillators';
import type { BaseOscillator } from './components/oscillators/BaseOscillator';
import { ADSREnvelope } from './components/envelopes';
import { LFO } from './components/modulation';

// Voice represents a single note being played
interface Voice {
  noteIndex: number;
  oscillators: Array<{
    oscillator: BaseOscillator;
    panNode: StereoPannerNode;
  }>;
  envelope: ADSREnvelope;
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
let vibrato: LFO | null = null;

// Envelope settings (shared across all voices)
const envelopeSettings = {
  attack: 0.01,
  decay: 0.1,
  sustain: 0.7,
  release: 0.3,
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

document.addEventListener('DOMContentLoaded', () => {
  const initBtn = document.getElementById('initBtn') as HTMLButtonElement;

  initBtn.addEventListener('click', async () => {
    if (initialized) return;

    initBtn.disabled = true;
    initBtn.textContent = 'Initializing...';

    try {
      const engine = AudioEngine.getInstance();
      await engine.initialize({ latencyHint: 'interactive' });

      const busManager = BusManager.getInstance();
      busManager.initialize();
      masterBus = busManager.getMasterBus();

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

      setupOscillatorControls();
      setupEnvelopeControls();
      setupLFOControls();
      setupKeyboard();
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
  // Attack
  const attackSlider = document.getElementById('env-attack') as HTMLInputElement;
  const attackValue = document.getElementById('env-attack-value') as HTMLSpanElement;
  attackSlider.addEventListener('input', () => {
    envelopeSettings.attack = parseFloat(attackSlider.value) / 1000;
    attackValue.textContent = `${attackSlider.value}ms`;
  });

  // Decay
  const decaySlider = document.getElementById('env-decay') as HTMLInputElement;
  const decayValue = document.getElementById('env-decay-value') as HTMLSpanElement;
  decaySlider.addEventListener('input', () => {
    envelopeSettings.decay = parseFloat(decaySlider.value) / 1000;
    decayValue.textContent = `${decaySlider.value}ms`;
  });

  // Sustain
  const sustainSlider = document.getElementById('env-sustain') as HTMLInputElement;
  const sustainValue = document.getElementById('env-sustain-value') as HTMLSpanElement;
  sustainSlider.addEventListener('input', () => {
    envelopeSettings.sustain = parseFloat(sustainSlider.value) / 100;
    sustainValue.textContent = `${sustainSlider.value}%`;
  });

  // Release
  const releaseSlider = document.getElementById('env-release') as HTMLInputElement;
  const releaseValue = document.getElementById('env-release-value') as HTMLSpanElement;
  releaseSlider.addEventListener('input', () => {
    envelopeSettings.release = parseFloat(releaseSlider.value) / 1000;
    releaseValue.textContent = `${releaseSlider.value}ms`;
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
    envelope: new ADSREnvelope(envelopeSettings),
    isActive: true,
  };

  // Create oscillators for each enabled config
  oscillatorConfigs.forEach((config) => {
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

      // Signal chain: oscillator -> pan -> envelope
      oscillator.connect(panNode);
      panNode.connect(voice.envelope.getInputNode());

      oscillator.start();

      voice.oscillators.push({ oscillator, panNode });
    }
  });

  // Connect voice envelope to master bus
  voice.envelope.connect(masterBus.getInputNode());

  // Trigger the envelope
  voice.envelope.trigger(1.0);

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

  // Trigger envelope release
  voice.envelope.triggerRelease();

  // Schedule cleanup after release phase
  const releaseTime = envelopeSettings.release;
  voice.releaseTimeout = window.setTimeout(() => {
    cleanupVoice(noteIndex);
  }, releaseTime * 1000 + 50);

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

  // Stop all oscillators
  voice.oscillators.forEach(({ oscillator, panNode }) => {
    oscillator.stop();
    panNode.disconnect();
  });

  // Disconnect envelope
  voice.envelope.disconnect();

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
