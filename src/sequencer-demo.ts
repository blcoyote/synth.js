/**
 * Sequencer Demo
 * Demonstrates the 16-step sequencer with note programming
 */

import { AudioEngine } from './core';
import { BusManager } from './bus';
import { SineOscillator } from './components/oscillators';
import { ADSREnvelope } from './components/envelopes';
import { Sequencer } from './components/modulation';

let sequencer: Sequencer | null = null;
let voices: Map<number, { osc: SineOscillator; env: ADSREnvelope }> = new Map();
let masterBus: ReturnType<typeof BusManager.prototype.getMasterBus>;

const MAX_VOICES = 8;
const STEPS = 16;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const engine = AudioEngine.getInstance();
    await engine.initialize({ latencyHint: 'interactive' });

    const busManager = BusManager.getInstance();
    busManager.initialize();
    masterBus = busManager.getMasterBus();

    sequencer = new Sequencer({
      steps: STEPS,
      tempo: 120,
      swing: 0,
      mode: 'forward',
    });

    sequencer.onStep((stepIndex, stepData) => {
      playNote(stepData.pitch, stepData.velocity / 127, stepData.length);
      updateCurrentStepDisplay(stepIndex);
    });

    setupPlaybackControls();
    setupTimingControls();
    setupSequencerGrid();
    setupNoteControls();
    setupPresetButtons();

    console.log('✓ Audio system initialized');
  } catch (error) {
    console.error('Failed to initialize:', error);
    alert('Failed to initialize audio system.');
  }
});

function playNote(midiNote: number, velocity: number, gateLength: number) {
  if (!masterBus) return;

  if (voices.size >= MAX_VOICES) {
    const oldestVoiceId = voices.keys().next().value;
    if (oldestVoiceId !== undefined) {
      const voice = voices.get(oldestVoiceId);
      if (voice) {
        voice.osc.stop();
        voice.osc.disconnect();
        voices.delete(oldestVoiceId);
      }
    }
  }

  const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);

  const osc = new SineOscillator(frequency);
  const env = new ADSREnvelope({
    attack: 0.01,
    decay: 0.1,
    sustain: 0.7,
    release: 0.1,
  });

  osc.connect(env.getNode());
  env.connect(masterBus.getInputNode());

  osc.start();
  env.trigger(velocity);

  const voiceId = Date.now();
  voices.set(voiceId, { osc, env });

  const noteDuration = gateLength * 0.2;

  setTimeout(() => {
    const voice = voices.get(voiceId);
    if (voice) {
      voice.env.trigger(0);
      setTimeout(() => {
        if (voices.has(voiceId)) {
          voice.osc.stop();
          voice.osc.disconnect();
          voices.delete(voiceId);
        }
      }, 150);
    }
  }, noteDuration * 1000);
}

function setupPlaybackControls() {
  const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
  const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
  const statusEl = document.getElementById('status') as HTMLSpanElement;

  playBtn.addEventListener('click', () => {
    if (!sequencer) return;

    if (sequencer.isRunning()) {
      sequencer.pause();
      playBtn.textContent = '▶ Play';
      statusEl.textContent = 'Paused';
    } else {
      sequencer.start();
      playBtn.textContent = '⏸ Pause';
      statusEl.textContent = 'Playing';
    }
  });

  stopBtn.addEventListener('click', () => {
    if (!sequencer) return;
    sequencer.stop();
    playBtn.textContent = '▶ Play';
    statusEl.textContent = 'Stopped';
    updateCurrentStepDisplay(-1);
  });
}

function setupTimingControls() {
  const tempoSlider = document.getElementById('tempo') as HTMLInputElement;
  const tempoValue = document.getElementById('tempo-value') as HTMLSpanElement;
  const swingSlider = document.getElementById('swing') as HTMLInputElement;
  const swingValue = document.getElementById('swing-value') as HTMLSpanElement;

  tempoSlider.addEventListener('input', () => {
    const tempo = parseInt(tempoSlider.value);
    tempoValue.textContent = tempo + ' BPM';
    if (sequencer) {
      sequencer.setTempo(tempo);
    }
  });

  swingSlider.addEventListener('input', () => {
    const swing = parseInt(swingSlider.value);
    swingValue.textContent = swing + '%';
    if (sequencer) {
      sequencer.setSwing(swing / 100);
    }
  });
}

function setupSequencerGrid() {
  const gridEl = document.getElementById('sequencer-grid') as HTMLDivElement;
  if (!gridEl) {
    console.error('Could not find sequencer-grid element');
    return;
  }

  for (let i = 0; i < STEPS; i++) {
    const stepEl = document.createElement('div');
    stepEl.className = 'step';
    stepEl.dataset.step = i.toString();

    const numberEl = document.createElement('span');
    numberEl.className = 'step-number';
    numberEl.textContent = (i + 1).toString();
    stepEl.appendChild(numberEl);

    stepEl.addEventListener('click', () => {
      if (!sequencer) return;

      const pattern = sequencer.getPattern();
      const currentStep = pattern[i];
      if (currentStep) {
        currentStep.gate = !currentStep.gate;
        sequencer.setPattern(pattern);
        stepEl.classList.toggle('active', currentStep.gate);
        updateActiveStepsDisplay();
      }
    });

    gridEl.appendChild(stepEl);
  }

  updateActiveStepsDisplay();
}

// Helper function to convert MIDI note number to note name
function midiToNoteName(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const noteName = noteNames[midi % 12];
  return `${noteName}${octave}`;
}

function setupNoteControls() {
  const noteControlsEl = document.getElementById('note-controls') as HTMLDivElement;
  if (!noteControlsEl) {
    console.error('Could not find note-controls element');
    return;
  }

  for (let i = 0; i < STEPS; i++) {
    const selectEl = document.createElement('select');
    selectEl.className = 'note-select';
    selectEl.dataset.step = i.toString();

    // Generate options from C0 (MIDI 12) to C8 (MIDI 108)
    for (let midi = 12; midi <= 108; midi++) {
      const option = document.createElement('option');
      option.value = midi.toString();
      option.textContent = midiToNoteName(midi);
      if (midi === 60) {
        // C4 is default
        option.selected = true;
      }
      selectEl.appendChild(option);
    }

    selectEl.addEventListener('change', () => {
      if (!sequencer) return;

      const note = parseInt(selectEl.value);
      const pattern = sequencer.getPattern();
      const currentStep = pattern[i];
      if (currentStep) {
        currentStep.pitch = note;
        sequencer.setPattern(pattern);
      }
    });

    noteControlsEl.appendChild(selectEl);
  }
}
function setupPresetButtons() {
  const presetButtons = document.querySelectorAll('.preset-btn');

  presetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!sequencer) return;
      const preset = (btn as HTMLElement).dataset.preset;
      loadPreset(preset!);
    });
  });
}

function loadPreset(preset: string) {
  if (!sequencer) return;

  const pattern = sequencer.getPattern();

  pattern.forEach((step) => {
    step.gate = false;
    step.pitch = 60;
  });

  switch (preset) {
    case 'basic-beat': {
      const indices = [0, 4, 8, 12];
      indices.forEach((idx) => {
        const step = pattern[idx];
        if (step) step.gate = true;
      });
      break;
    }

    case 'offbeat': {
      const indices = [2, 6, 10, 14];
      indices.forEach((idx) => {
        const step = pattern[idx];
        if (step) step.gate = true;
      });
      break;
    }

    case 'gallop': {
      const indices = [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15];
      indices.forEach((idx) => {
        const step = pattern[idx];
        if (step) step.gate = true;
      });
      break;
    }

    case 'techno': {
      const indices = [0, 3, 6, 8, 11, 14];
      indices.forEach((idx) => {
        const step = pattern[idx];
        if (step) step.gate = true;
      });
      break;
    }

    case 'melody': {
      const melodySteps = [
        { idx: 0, pitch: 60 },
        { idx: 4, pitch: 62 },
        { idx: 8, pitch: 64 },
        { idx: 12, pitch: 67 },
      ];
      melodySteps.forEach(({ idx, pitch }) => {
        const step = pattern[idx];
        if (step) {
          step.gate = true;
          step.pitch = pitch;
        }
      });
      break;
    }

    case 'arpeggio': {
      const arpNotes = [60, 64, 67, 72, 67, 64];
      for (let i = 0; i < 12; i++) {
        const step = pattern[i];
        if (step) {
          step.gate = true;
          step.pitch = arpNotes[i % arpNotes.length];
        }
      }
      break;
    }

    case 'clear':
      break;
  }

  sequencer.setPattern(pattern);
  updateSequencerDisplay();
}

function updateSequencerDisplay() {
  if (!sequencer) return;

  const pattern = sequencer.getPattern();
  const stepElements = document.querySelectorAll('.step');
  const noteSelects = document.querySelectorAll('.note-select');

  stepElements.forEach((el, i) => {
    const step = pattern[i];
    if (step) {
      el.classList.toggle('active', step.gate);
    }
  });

  noteSelects.forEach((select, i) => {
    const step = pattern[i];
    if (step) {
      (select as HTMLSelectElement).value = step.pitch.toString();
    }
  });

  updateActiveStepsDisplay();
}

function updateCurrentStepDisplay(stepIndex: number) {
  const currentStepEl = document.getElementById('current-step') as HTMLSpanElement;
  const stepElements = document.querySelectorAll('.step');

  stepElements.forEach((el) => el.classList.remove('playing'));

  if (stepIndex >= 0 && stepIndex < STEPS) {
    currentStepEl.textContent = (stepIndex + 1).toString();
    stepElements[stepIndex]?.classList.add('playing');
  } else {
    currentStepEl.textContent = '-';
  }
}

function updateActiveStepsDisplay() {
  if (!sequencer) return;

  const pattern = sequencer.getPattern();
  const activeCount = pattern.filter((step) => step.gate).length;
  const activeStepsEl = document.getElementById('active-steps') as HTMLSpanElement;
  activeStepsEl.textContent = activeCount.toString();
}
