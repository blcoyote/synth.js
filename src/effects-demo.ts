/**
 * Effects demo - Dynamic bus routing demonstration
 */

import { AudioEngine } from './core';
import { BusManager } from './bus';
import { SawtoothOscillator } from './components/oscillators';
import { DelayEffect, ReverbEffect, DistortionEffect, ChorusEffect } from './components/effects';

let oscillator: SawtoothOscillator | null = null;
let isPlaying = false;

// Effect instances
const effects = {
  delay: null as DelayEffect | null,
  reverb: null as ReverbEffect | null,
  distortion: null as DistortionEffect | null,
  chorus: null as ChorusEffect | null,
};

// Track effect IDs assigned by the bus (not just effect names)
const effectIdsInBus = new Map<string, string>(); // effectName -> effectId in bus

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const engine = AudioEngine.getInstance();
    await engine.initialize({ latencyHint: 'interactive' });

    const busManager = BusManager.getInstance();
    busManager.initialize();

    // Create all effects
    effects.delay = new DelayEffect(0.375, 0.3);
    effects.reverb = new ReverbEffect(0.5);
    effects.distortion = new DistortionEffect(0.5);
    effects.chorus = new ChorusEffect(1.5, 0.5);

    setupOscillatorControls();
    setupEffectControls();

    console.log('✓ Audio system initialized');
  } catch (error) {
    console.error('Failed to initialize:', error);
    alert('Failed to initialize audio system. Please refresh the page to try again.');
  }
});

function setupOscillatorControls() {
  const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
  const oscFreq = document.getElementById('osc-freq') as HTMLInputElement;
  const oscFreqValue = document.getElementById('osc-freq-value') as HTMLSpanElement;
  const oscVol = document.getElementById('osc-vol') as HTMLInputElement;
  const oscVolValue = document.getElementById('osc-vol-value') as HTMLSpanElement;

  // Frequency control
  oscFreq.addEventListener('input', () => {
    const freq = parseFloat(oscFreq.value);
    oscFreqValue.textContent = `${freq} Hz`;
    if (oscillator) {
      oscillator.setParameter('frequency', freq);
    }
  });

  // Volume control
  oscVol.addEventListener('input', () => {
    oscVolValue.textContent = `${oscVol.value}%`;
    if (oscillator) {
      oscillator.setParameter('volume', parseFloat(oscVol.value) / 100);
    }
  });

  // Play button
  playBtn.addEventListener('click', () => {
    if (!isPlaying) {
      startOscillator();
      playBtn.textContent = '⏸ Stop Sound';
      playBtn.style.background = 'rgba(239, 68, 68, 0.3)';
    } else {
      stopOscillator();
      playBtn.textContent = '▶ Play Sound';
      playBtn.style.background = 'rgba(74, 222, 128, 0.3)';
    }
  });
}

function startOscillator() {
  const busManager = BusManager.getInstance();
  const masterBus = busManager.getMasterBus();

  const oscFreq = document.getElementById('osc-freq') as HTMLInputElement;
  const oscVol = document.getElementById('osc-vol') as HTMLInputElement;
  const freq = parseFloat(oscFreq.value);
  const vol = parseFloat(oscVol.value) / 100;

  oscillator = new SawtoothOscillator(freq);
  oscillator.setParameter('volume', vol);
  oscillator.connect(masterBus.getInputNode());
  oscillator.start();
  isPlaying = true;
}

function stopOscillator() {
  if (oscillator) {
    oscillator.stop();
    oscillator = null;
    isPlaying = false;
  }
}

function setupEffectControls() {
  // Setup toggle buttons
  const toggleButtons = document.querySelectorAll('.toggle-btn');

  toggleButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const effectName = button.getAttribute('data-effect') as string;
      const effect = effects[effectName as keyof typeof effects];
      const card = document.getElementById(`${effectName}-card`) as HTMLDivElement;
      const busManager = BusManager.getInstance();
      const masterBus = busManager.getMasterBus();

      if (!effect) return;

      if (effectIdsInBus.has(effectName)) {
        // Remove from bus using the tracked effect ID
        const effectId = effectIdsInBus.get(effectName)!;
        effectIdsInBus.delete(effectName);
        masterBus.removeEffect(effectId);
        button.textContent = 'Add to Bus';
        button.classList.remove('active');
        card.classList.remove('active');
      } else {
        // Add to bus and store the returned effect ID
        const effectId = masterBus.addEffect(effect);
        effectIdsInBus.set(effectName, effectId);
        button.textContent = 'Remove from Bus';
        button.classList.add('active');
        card.classList.add('active');
      }

      console.log('Bus effects:', Array.from(effectIdsInBus.keys()));
    });
  });

  // Setup effect parameters
  setupDelayControls();
  setupReverbControls();
  setupDistortionControls();
  setupChorusControls();
}

function setupDelayControls() {
  const timeSlider = document.getElementById('delay-time-slider') as HTMLInputElement;
  const timeValue = document.getElementById('delay-time') as HTMLSpanElement;
  const feedbackSlider = document.getElementById('delay-feedback-slider') as HTMLInputElement;
  const feedbackValue = document.getElementById('delay-feedback') as HTMLSpanElement;
  const mixSlider = document.getElementById('delay-mix-slider') as HTMLInputElement;
  const mixValue = document.getElementById('delay-mix') as HTMLSpanElement;

  timeSlider.addEventListener('input', () => {
    const time = parseFloat(timeSlider.value) / 1000;
    effects.delay?.setParameter('delayTime', time);
    timeValue.textContent = `${timeSlider.value} ms`;
  });

  feedbackSlider.addEventListener('input', () => {
    const feedback = parseFloat(feedbackSlider.value) / 100;
    effects.delay?.setParameter('feedback', feedback);
    feedbackValue.textContent = `${feedbackSlider.value}%`;
  });

  mixSlider.addEventListener('input', () => {
    const mix = parseFloat(mixSlider.value) / 100;
    effects.delay?.setParameter('mix', mix);
    mixValue.textContent = `${mixSlider.value}%`;
  });
}

function setupReverbControls() {
  const decaySlider = document.getElementById('reverb-decay-slider') as HTMLInputElement;
  const decayValue = document.getElementById('reverb-decay') as HTMLSpanElement;
  const mixSlider = document.getElementById('reverb-mix-slider') as HTMLInputElement;
  const mixValue = document.getElementById('reverb-mix') as HTMLSpanElement;

  decaySlider.addEventListener('input', () => {
    const decay = parseFloat(decaySlider.value) / 100;
    effects.reverb?.setParameter('decay', decay);
    decayValue.textContent = `${decaySlider.value}%`;
  });

  mixSlider.addEventListener('input', () => {
    const mix = parseFloat(mixSlider.value) / 100;
    effects.reverb?.setParameter('mix', mix);
    mixValue.textContent = `${mixSlider.value}%`;
  });
}

function setupDistortionControls() {
  const driveSlider = document.getElementById('distortion-drive-slider') as HTMLInputElement;
  const driveValue = document.getElementById('distortion-drive') as HTMLSpanElement;
  const toneSlider = document.getElementById('distortion-tone-slider') as HTMLInputElement;
  const toneValue = document.getElementById('distortion-tone') as HTMLSpanElement;
  const mixSlider = document.getElementById('distortion-mix-slider') as HTMLInputElement;
  const mixValue = document.getElementById('distortion-mix') as HTMLSpanElement;

  driveSlider.addEventListener('input', () => {
    const drive = parseFloat(driveSlider.value) / 100;
    effects.distortion?.setParameter('drive', drive);
    driveValue.textContent = `${driveSlider.value}%`;
  });

  toneSlider.addEventListener('input', () => {
    const tone = parseFloat(toneSlider.value) / 100;
    effects.distortion?.setParameter('tone', tone);
    toneValue.textContent = `${toneSlider.value}%`;
  });

  mixSlider.addEventListener('input', () => {
    const mix = parseFloat(mixSlider.value) / 100;
    effects.distortion?.setParameter('mix', mix);
    mixValue.textContent = `${mixSlider.value}%`;
  });
}

function setupChorusControls() {
  const rateSlider = document.getElementById('chorus-rate-slider') as HTMLInputElement;
  const rateValue = document.getElementById('chorus-rate') as HTMLSpanElement;
  const depthSlider = document.getElementById('chorus-depth-slider') as HTMLInputElement;
  const depthValue = document.getElementById('chorus-depth') as HTMLSpanElement;
  const mixSlider = document.getElementById('chorus-mix-slider') as HTMLInputElement;
  const mixValue = document.getElementById('chorus-mix') as HTMLSpanElement;

  rateSlider.addEventListener('input', () => {
    const rate = parseFloat(rateSlider.value) / 10; // Scale 1-100 to 0.1-10 Hz
    effects.chorus?.setParameter('rate', rate);
    rateValue.textContent = `${rate.toFixed(1)} Hz`;
  });

  depthSlider.addEventListener('input', () => {
    const depth = parseFloat(depthSlider.value) / 100;
    effects.chorus?.setParameter('depth', depth);
    depthValue.textContent = `${depthSlider.value}%`;
  });

  mixSlider.addEventListener('input', () => {
    const mix = parseFloat(mixSlider.value) / 100;
    effects.chorus?.setParameter('mix', mix);
    mixValue.textContent = `${mixSlider.value}%`;
  });
}
