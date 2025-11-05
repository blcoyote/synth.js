/**
 * Filter demo application
 */

import { AudioEngine } from './core';
import { BusManager } from './bus';
import {
  LowpassFilter,
  HighpassFilter,
  BandpassFilter,
  NotchFilter,
  AllpassFilter,
  PeakingFilter,
  LowshelfFilter,
  HighshelfFilter,
} from './components/filters';

let oscillator: OscillatorNode | null = null;
let isPlaying = false;
let initialized = false;

// Filter instances
const filters = {
  lowpass: null as LowpassFilter | null,
  highpass: null as HighpassFilter | null,
  bandpass: null as BandpassFilter | null,
  notch: null as NotchFilter | null,
  allpass: null as AllpassFilter | null,
  peaking: null as PeakingFilter | null,
  lowshelf: null as LowshelfFilter | null,
  highshelf: null as HighshelfFilter | null,
};

const activeFilters = new Set<string>();

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

      // Create all filters
      filters.lowpass = new LowpassFilter(1000);
      filters.highpass = new HighpassFilter(1000);
      filters.bandpass = new BandpassFilter(1000);
      filters.notch = new NotchFilter(1000);
      filters.allpass = new AllpassFilter(1000);
      filters.peaking = new PeakingFilter(1000, 0);
      filters.lowshelf = new LowshelfFilter(200, 0);
      filters.highshelf = new HighshelfFilter(3000, 0);

      setupOscillatorControls();
      setupFilterControls();

      initialized = true;
      initBtn.textContent = '✓ Initialized';
      initBtn.style.background = 'rgba(74, 222, 128, 0.4)';
    } catch (error) {
      console.error('Failed to initialize:', error);
      initBtn.disabled = false;
      initBtn.textContent = 'Initialize Audio System';
    }
  });
});

function setupOscillatorControls() {
  const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
  const oscFreq = document.getElementById('osc-freq') as HTMLInputElement;
  const oscFreqValue = document.getElementById('osc-freq-value') as HTMLSpanElement;
  const oscVol = document.getElementById('osc-vol') as HTMLInputElement;
  const oscVolValue = document.getElementById('osc-vol-value') as HTMLSpanElement;
  const waveButtons = document.querySelectorAll('.wave-btn');
  const waveformValue = document.getElementById('waveform-value') as HTMLSpanElement;

  let currentWaveform: OscillatorType = 'sawtooth';

  // Waveform selection
  waveButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      waveButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentWaveform = btn.getAttribute('data-wave') as OscillatorType;
      waveformValue.textContent =
        currentWaveform.charAt(0).toUpperCase() + currentWaveform.slice(1);

      if (isPlaying) {
        stopOscillator();
        startOscillator(currentWaveform);
      }
    });
  });

  // Frequency control
  oscFreq.addEventListener('input', () => {
    const freq = parseFloat(oscFreq.value);
    oscFreqValue.textContent = `${freq} Hz`;
    if (oscillator) {
      oscillator.frequency.value = freq;
    }
  });

  // Volume control
  oscVol.addEventListener('input', () => {
    oscVolValue.textContent = `${oscVol.value}%`;
    const busManager = BusManager.getInstance();
    const masterBus = busManager.getMasterBus();
    masterBus.setInputGain(parseFloat(oscVol.value) / 100);
  });

  // Play button
  playBtn.addEventListener('click', () => {
    if (!isPlaying) {
      startOscillator(currentWaveform);
      playBtn.textContent = '⏸ Stop Sound';
      playBtn.style.background = 'rgba(239, 68, 68, 0.3)';
    } else {
      stopOscillator();
      playBtn.textContent = '▶ Play Sound';
      playBtn.style.background = 'rgba(74, 222, 128, 0.3)';
    }
  });
}

function startOscillator(waveform: OscillatorType) {
  const engine = AudioEngine.getInstance();
  const busManager = BusManager.getInstance();
  const masterBus = busManager.getMasterBus();

  const oscFreq = document.getElementById('osc-freq') as HTMLInputElement;
  const freq = parseFloat(oscFreq.value);

  oscillator = engine.createOscillator(waveform, freq);

  // Connect through active filters or directly to bus
  let lastNode: AudioNode = oscillator;

  activeFilters.forEach((filterName) => {
    const filter = filters[filterName as keyof typeof filters];
    if (filter) {
      lastNode.connect(filter.getInputNode());
      lastNode = filter.getOutputNode();
    }
  });

  lastNode.connect(masterBus.getInputNode());
  oscillator.start();
  isPlaying = true;
}

function stopOscillator() {
  if (oscillator) {
    oscillator.stop();
    oscillator.disconnect();
    oscillator = null;
    isPlaying = false;
  }
}

function setupFilterControls() {
  Object.keys(filters).forEach((filterName) => {
    const toggleBtn = document.querySelector(
      `[data-filter="${filterName}"]`
    ) as HTMLButtonElement;
    const card = document.getElementById(`${filterName}-card`) as HTMLDivElement;

    // Toggle button
    toggleBtn.addEventListener('click', () => {
      const isActive = activeFilters.has(filterName);

      if (isActive) {
        activeFilters.delete(filterName);
        toggleBtn.textContent = 'OFF';
        toggleBtn.classList.remove('active');
        card.classList.remove('active');
      } else {
        activeFilters.add(filterName);
        toggleBtn.textContent = 'ON';
        toggleBtn.classList.add('active');
        card.classList.add('active');
      }

      // Restart oscillator to apply filter changes
      if (isPlaying) {
        const waveBtn = document.querySelector('.wave-btn.active') as HTMLButtonElement;
        const waveform = waveBtn.getAttribute('data-wave') as OscillatorType;
        stopOscillator();
        startOscillator(waveform);
      }
    });

    // Setup sliders based on filter type
    setupFilterSliders(filterName);
  });
}

function setupFilterSliders(filterName: string) {
  const filter = filters[filterName as keyof typeof filters];
  if (!filter) return;

  // Frequency slider
  const freqSlider = document.getElementById(
    `${filterName}-freq-slider`
  ) as HTMLInputElement;
  const freqValue = document.getElementById(`${filterName}-freq`) as HTMLSpanElement;

  if (freqSlider && freqValue) {
    freqSlider.addEventListener('input', () => {
      const freq = parseFloat(freqSlider.value);
      filter.setParameter('frequency', freq);
      freqValue.textContent = `${freq} Hz`;
    });
  }

  // Resonance slider
  const resSlider = document.getElementById(
    `${filterName}-res-slider`
  ) as HTMLInputElement;
  const resValue = document.getElementById(`${filterName}-res`) as HTMLSpanElement;

  if (resSlider && resValue) {
    resSlider.addEventListener('input', () => {
      const normalized = parseFloat(resSlider.value) / 100;
      filter.setResonanceNormalized(normalized);
      const q = filter.getParameter('resonance');
      resValue.textContent = q.toFixed(1);
    });
  }

  // Gain slider (for peaking and shelf filters)
  const gainSlider = document.getElementById(
    `${filterName}-gain-slider`
  ) as HTMLInputElement;
  const gainValue = document.getElementById(`${filterName}-gain`) as HTMLSpanElement;

  if (gainSlider && gainValue) {
    gainSlider.addEventListener('input', () => {
      const gain = parseFloat(gainSlider.value);
      filter.setParameter('gain', gain);
      gainValue.textContent = `${gain > 0 ? '+' : ''}${gain} dB`;
    });
  }
}
