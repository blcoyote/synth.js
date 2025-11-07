/**
 * Oscillator demo application
 */

import { AudioEngine } from './core';
import { BusManager } from './bus';
import {
  SineOscillator,
  SawtoothOscillator,
  SquareOscillator,
  TriangleOscillator,
} from './components/oscillators';

// Oscillator instances
let sineOsc: SineOscillator;
let sawOsc: SawtoothOscillator;
let squareOsc: SquareOscillator;
let triangleOsc: TriangleOscillator;

document.addEventListener('DOMContentLoaded', async () => {
  // Auto-initialize on page load
  try {
    // Initialize audio system
    const engine = AudioEngine.getInstance();
    await engine.initialize({ latencyHint: 'interactive' });

    const busManager = BusManager.getInstance();
    busManager.initialize();

    const masterBus = busManager.getMasterBus();

    // Create oscillators
    sineOsc = new SineOscillator(440);
    sawOsc = new SawtoothOscillator(440);
    squareOsc = new SquareOscillator(440);
    triangleOsc = new TriangleOscillator(440);

    // Connect all to master bus
    sineOsc.connect(masterBus.getInputNode());
    sawOsc.connect(masterBus.getInputNode());
    squareOsc.connect(masterBus.getInputNode());
    triangleOsc.connect(masterBus.getInputNode());

    // Setup controls
    setupOscillatorControls('sine', sineOsc);
    setupOscillatorControls('saw', sawOsc);
    setupOscillatorControls('square', squareOsc);
    setupOscillatorControls('triangle', triangleOsc);

    // Setup note buttons
    setupNoteButtons();

    console.log('✓ Audio system initialized');
  } catch (error) {
    console.error('Failed to initialize:', error);
    alert('Failed to initialize audio system. Please refresh the page to try again.');
  }
});

function setupOscillatorControls(
  name: string,
  oscillator: SineOscillator | SawtoothOscillator | SquareOscillator | TriangleOscillator
) {
  const freqSlider = document.getElementById(`${name}-freq`) as HTMLInputElement;
  const freqValue = document.getElementById(`${name}-freq-value`) as HTMLSpanElement;
  const volSlider = document.getElementById(`${name}-vol`) as HTMLInputElement;
  const volValue = document.getElementById(`${name}-vol-value`) as HTMLSpanElement;
  const startBtn = document.getElementById(`${name}-start`) as HTMLButtonElement;
  const stopBtn = document.getElementById(`${name}-stop`) as HTMLButtonElement;
  const card = document.getElementById(`${name}-card`) as HTMLDivElement;

  // Frequency control
  freqSlider.addEventListener('input', () => {
    const freq = parseFloat(freqSlider.value);
    oscillator.setParameter('frequency', freq);
    freqValue.textContent = `${freq} Hz`;
  });

  // Volume control
  volSlider.addEventListener('input', () => {
    const vol = parseFloat(volSlider.value) / 100;
    oscillator.setParameter('volume', vol);
    volValue.textContent = `${volSlider.value}%`;
  });

  // Start button
  startBtn.addEventListener('click', () => {
    if (!oscillator.isOscillatorPlaying()) {
      oscillator.start();
      card.classList.add('playing');
      startBtn.disabled = true;
      stopBtn.disabled = false;
    }
  });

  // Stop button
  stopBtn.addEventListener('click', () => {
    if (oscillator.isOscillatorPlaying()) {
      oscillator.stop();
      card.classList.remove('playing');
      startBtn.disabled = false;
      stopBtn.disabled = true;
    }
  });

  // Initial state
  stopBtn.disabled = true;
}

function setupNoteButtons() {
  const noteButtons = document.querySelectorAll('.note-btn');

  noteButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const oscType = button.getAttribute('data-osc');
      const noteName = button.getAttribute('data-note');

      if (!oscType || !noteName) return;

      let oscillator: SineOscillator | SawtoothOscillator | SquareOscillator | TriangleOscillator;

      switch (oscType) {
        case 'sine':
          oscillator = sineOsc;
          break;
        case 'saw':
          oscillator = sawOsc;
          break;
        case 'square':
          oscillator = squareOsc;
          break;
        case 'triangle':
          oscillator = triangleOsc;
          break;
        default:
          return;
      }

      // Set note
      oscillator.setNoteName(noteName);

      // Update frequency display
      const freq = Math.round(oscillator.getParameter('frequency'));
      const freqValue = document.getElementById(`${oscType}-freq-value`) as HTMLSpanElement;
      const freqSlider = document.getElementById(`${oscType}-freq`) as HTMLInputElement;
      freqValue.textContent = `${freq} Hz`;
      freqSlider.value = freq.toString();

      // Start if not playing
      if (!oscillator.isOscillatorPlaying()) {
        const startBtn = document.getElementById(`${oscType}-start`) as HTMLButtonElement;
        startBtn.click();
      }
    });
  });
}
