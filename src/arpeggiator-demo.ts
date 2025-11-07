/**
 * Arpeggiator Demo
 * Demonstrates the arpeggiator with various patterns and chord progressions
 */

import { AudioEngine } from './core';
import { BusManager } from './bus';
import { SineOscillator } from './components/oscillators';
import { ADSREnvelope } from './components/envelopes';
import { Arpeggiator, type ArpPattern, type NoteDivision } from './components/modulation';

let initialized = false;
let arpeggiator: Arpeggiator | null = null;
let voices: Map<number, { osc: SineOscillator; env: ADSREnvelope }> = new Map();
let masterBus: ReturnType<typeof BusManager.prototype.getMasterBus>;

const MAX_VOICES = 8; // Polyphony limit

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

      // Create arpeggiator with default settings
      arpeggiator = new Arpeggiator({
        pattern: 'up',
        octaves: 2,
        tempo: 120,
        division: '1/16',
        gateLength: 0.8,
        swing: 0,
        humanize: 0,
      });

      // Set initial chord (C major)
      arpeggiator.setChord(60, 'major');

      // Register note callback
      arpeggiator.onNote((note) => {
        playNote(note.pitch, note.velocity / 127, note.gate);
      });

      setupControls();
      setupPatternButtons();
      setupChordButtons();
      setupProgressionButtons();

      initialized = true;
      initBtn.textContent = '✓ System Ready';
      initBtn.style.background = 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)';

      // Update display
      updateSequenceDisplay();
    } catch (error) {
      console.error('Failed to initialize:', error);
      initBtn.disabled = false;
      initBtn.textContent = 'Initialize Audio System';
    }
  });
});

function playNote(midiNote: number, velocity: number, gateLength: number) {
  if (!masterBus) return;

  // Clean up old voices if we exceed polyphony
  if (voices.size >= MAX_VOICES) {
    const oldestVoiceId = voices.keys().next().value;
    if (oldestVoiceId !== undefined) {
      const voice = voices.get(oldestVoiceId);
      if (voice) {
        voice.env.triggerRelease();
        setTimeout(() => {
          voice.osc.disconnect();
          voice.osc.stop();
          voices.delete(oldestVoiceId);
        }, 500);
      }
    }
  }

  // Convert MIDI note to frequency
  const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);

  // Create oscillator and envelope for this note
  const osc = new SineOscillator(frequency);
  osc.setParameter('volume', velocity * 0.3); // Scale down volume

  const env = new ADSREnvelope({
    attack: 0.005,
    decay: 0.05,
    sustain: 0.7,
    release: 0.1,
  });

  // Connect: Oscillator -> Envelope -> Master
  osc.connect(env.getNode());
  env.connect(masterBus.getInputNode());

  // Start oscillator
  osc.start();

  // Trigger envelope
  env.trigger(velocity);

  // Store voice
  const voiceId = Date.now() + Math.random();
  voices.set(voiceId, { osc, env });

  // Calculate note duration based on gate length
  const tempo = arpeggiator!.getTempo();
  const division = arpeggiator!.getDivision();
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

  const gateDuration = noteDuration * gateLength;

  // Schedule release
  setTimeout(() => {
    env.triggerRelease();
    // Clean up after release
    setTimeout(() => {
      osc.disconnect();
      osc.stop();
      voices.delete(voiceId);
    }, 200);
  }, gateDuration);
}

function setupControls() {
  // Tempo
  const tempoSlider = document.getElementById('tempo') as HTMLInputElement;
  const tempoValue = document.getElementById('tempo-value') as HTMLSpanElement;
  tempoSlider.addEventListener('input', () => {
    const tempo = parseInt(tempoSlider.value);
    arpeggiator?.setTempo(tempo);
    tempoValue.textContent = `${tempo} BPM`;
  });

  // Octaves
  const octavesSlider = document.getElementById('octaves') as HTMLInputElement;
  const octavesValue = document.getElementById('octaves-value') as HTMLSpanElement;
  octavesSlider.addEventListener('input', () => {
    const octaves = parseInt(octavesSlider.value);
    arpeggiator?.setOctaves(octaves);
    octavesValue.textContent = octaves.toString();
    updateSequenceDisplay();
  });

  // Gate Length
  const gateSlider = document.getElementById('gate') as HTMLInputElement;
  const gateValue = document.getElementById('gate-value') as HTMLSpanElement;
  gateSlider.addEventListener('input', () => {
    const gate = parseFloat(gateSlider.value) / 100;
    arpeggiator?.setGateLength(gate);
    gateValue.textContent = `${gateSlider.value}%`;
  });

  // Swing
  const swingSlider = document.getElementById('swing') as HTMLInputElement;
  const swingValue = document.getElementById('swing-value') as HTMLSpanElement;
  swingSlider.addEventListener('input', () => {
    const swing = parseFloat(swingSlider.value) / 100;
    arpeggiator?.setSwing(swing);
    swingValue.textContent = `${swingSlider.value}%`;
  });

  // Humanize
  const humanizeSlider = document.getElementById('humanize') as HTMLInputElement;
  const humanizeValue = document.getElementById('humanize-value') as HTMLSpanElement;
  humanizeSlider.addEventListener('input', () => {
    const humanize = parseFloat(humanizeSlider.value) / 100;
    arpeggiator?.setHumanize(humanize);
    humanizeValue.textContent = `${humanizeSlider.value}%`;
  });

  // Note Division
  const divisionSelect = document.getElementById('division') as HTMLSelectElement;
  divisionSelect.addEventListener('change', () => {
    arpeggiator?.setDivision(divisionSelect.value as NoteDivision);
  });

  // Play/Stop buttons
  const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
  const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;

  playBtn.addEventListener('click', () => {
    if (!initialized || !arpeggiator) return;

    if (arpeggiator.isRunning()) {
      arpeggiator.pause();
      playBtn.textContent = '▶ Play';
    } else {
      arpeggiator.start();
      playBtn.textContent = '⏸ Pause';
    }
  });

  stopBtn.addEventListener('click', () => {
    if (!initialized || !arpeggiator) return;
    arpeggiator.stop();
    playBtn.textContent = '▶ Play';
  });
}

function setupPatternButtons() {
  const patterns: ArpPattern[] = [
    'up',
    'down',
    'updown',
    'downup',
    'updown2',
    'downup2',
    'converge',
    'diverge',
    'pinchedUp',
    'pinchedDown',
    'random',
    'shuffle',
    'chord',
  ];

  const container = document.getElementById('pattern-buttons');
  if (!container) return;

  patterns.forEach((pattern) => {
    const btn = document.createElement('button');
    btn.textContent = pattern;
    btn.className = 'pattern-btn';
    if (pattern === 'up') btn.classList.add('active');

    btn.addEventListener('click', () => {
      arpeggiator?.setPattern(pattern);
      updateSequenceDisplay();

      // Update active state
      container.querySelectorAll('.pattern-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });

    container.appendChild(btn);
  });
}

function setupChordButtons() {
  const chords: Array<{
    name: string;
    type: 'major' | 'minor' | 'major7' | 'minor7' | 'dom7' | 'sus4' | 'sus2' | 'dim' | 'aug';
  }> = [
    { name: 'Major', type: 'major' },
    { name: 'Minor', type: 'minor' },
    { name: 'Maj7', type: 'major7' },
    { name: 'Min7', type: 'minor7' },
    { name: 'Dom7', type: 'dom7' },
    { name: 'Sus4', type: 'sus4' },
    { name: 'Sus2', type: 'sus2' },
    { name: 'Dim', type: 'dim' },
    { name: 'Aug', type: 'aug' },
  ];

  const container = document.getElementById('chord-buttons');
  if (!container) return;

  const rootNoteSelect = document.getElementById('root-note') as HTMLSelectElement;
  const rootOctaveSelect = document.getElementById('root-octave') as HTMLSelectElement;

  // Helper to calculate MIDI note from note + octave
  const getRootMidiNote = (): number => {
    const note = parseInt(rootNoteSelect.value);
    const octave = parseInt(rootOctaveSelect.value);
    return (octave + 1) * 12 + note; // MIDI: C-1 = 0, C0 = 12, C1 = 24, etc.
  };

  chords.forEach((chord) => {
    const btn = document.createElement('button');
    btn.textContent = chord.name;
    btn.className = 'chord-btn';
    if (chord.type === 'major') btn.classList.add('active');

    btn.addEventListener('click', () => {
      const rootNote = getRootMidiNote();
      arpeggiator?.setChord(rootNote, chord.type);
      updateSequenceDisplay();

      // Update active state
      container.querySelectorAll('.chord-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });

    container.appendChild(btn);
  });

  // Root note or octave change - re-trigger active chord
  const updateChord = () => {
    const activeChordBtn = container.querySelector('.chord-btn.active');
    if (activeChordBtn) {
      (activeChordBtn as HTMLButtonElement).click();
    }
  };

  rootNoteSelect.addEventListener('change', updateChord);
  rootOctaveSelect.addEventListener('change', updateChord);
}

function setupProgressionButtons() {
  const progressions = Arpeggiator.getProgressionNames();
  const container = document.getElementById('progression-buttons');
  if (!container) return;

  const rootNoteSelect = document.getElementById('root-note') as HTMLSelectElement;
  const rootOctaveSelect = document.getElementById('root-octave') as HTMLSelectElement;

  // Helper to calculate MIDI note from note + octave
  const getRootMidiNote = (): number => {
    const note = parseInt(rootNoteSelect.value);
    const octave = parseInt(rootOctaveSelect.value);
    return (octave + 1) * 12 + note; // MIDI: C-1 = 0, C0 = 12, C1 = 24, etc.
  };

  progressions.forEach((progName) => {
    const progression = Arpeggiator.getProgression(progName);
    if (!progression) return;

    const btn = document.createElement('button');
    btn.textContent = progression.name;
    btn.className = 'progression-btn';

    btn.addEventListener('click', () => {
      const rootNote = getRootMidiNote();
      arpeggiator?.loadProgression(progName, rootNote);
      updateSequenceDisplay();

      // Update active state
      container.querySelectorAll('.progression-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // Clear chord button active state
      document
        .getElementById('chord-buttons')
        ?.querySelectorAll('.chord-btn')
        .forEach((b) => b.classList.remove('active'));
    });

    container.appendChild(btn);
  });
}

function updateSequenceDisplay() {
  if (!arpeggiator) return;

  const sequence = arpeggiator.getSequence();
  const notesDisplay = document.getElementById('notes-display');
  const sequenceDisplay = document.getElementById('sequence-display');

  if (notesDisplay) {
    const notes = arpeggiator.getNotes();
    notesDisplay.textContent = `Current Notes: ${notes.map((n) => midiToNoteName(n)).join(', ')}`;
  }

  if (sequenceDisplay) {
    const pattern = arpeggiator.getPattern();
    if (pattern === 'random' || pattern === 'shuffle') {
      sequenceDisplay.textContent = `Pattern: ${pattern} (${sequence.length} notes)`;
    } else {
      sequenceDisplay.textContent = `Sequence: ${sequence.map((n) => midiToNoteName(n)).join(' → ')}`;
    }
  }
}

function midiToNoteName(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const note = noteNames[midi % 12];
  return `${note}${octave}`;
}
