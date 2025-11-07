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
    effects.delay = new DelayEffect('medium');
    effects.reverb = new ReverbEffect('hall');
    effects.distortion = new DistortionEffect('overdrive');
    effects.chorus = new ChorusEffect('classic');

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
  const presetSelect = document.getElementById('delay-preset') as HTMLSelectElement;
  const mixSlider = document.getElementById('delay-mix-slider') as HTMLInputElement;
  const mixValue = document.getElementById('delay-mix') as HTMLSpanElement;

  // Populate preset options
  if (effects.delay) {
    const presets = effects.delay.getPresets();
    Object.entries(presets).forEach(([key, config]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = config.name;
      presetSelect.appendChild(option);
    });
    presetSelect.value = effects.delay.getCurrentPreset();
  }

  presetSelect.addEventListener('change', () => {
    effects.delay?.loadPreset(presetSelect.value as any);
    // Update info display
    updateDelayInfo();
  });

  mixSlider.addEventListener('input', () => {
    const mix = parseFloat(mixSlider.value) / 100;
    effects.delay?.setParameter('mix', mix);
    mixValue.textContent = `${mixSlider.value}%`;
  });

  // Initial info display
  updateDelayInfo();
}

function updateDelayInfo() {
  const infoDiv = document.getElementById('delay-info');
  if (!effects.delay || !infoDiv) return;

  const presets = effects.delay.getPresets();
  const currentPreset = effects.delay.getCurrentPreset();
  const config = presets[currentPreset];

  infoDiv.innerHTML = `
    <strong>${config.name}</strong><br>
    ${config.description}<br>
    <small>Time: ${(config.delayTime * 1000).toFixed(0)}ms | Feedback: ${(config.feedback * 100).toFixed(0)}%</small>
  `;
}

function setupReverbControls() {
  const presetSelect = document.getElementById('reverb-preset') as HTMLSelectElement;
  const mixSlider = document.getElementById('reverb-mix-slider') as HTMLInputElement;
  const mixValue = document.getElementById('reverb-mix') as HTMLSpanElement;
  const infoDiv = document.getElementById('reverb-info') as HTMLDivElement;

  // Populate preset selector
  if (effects.reverb && presetSelect) {
    const presets = effects.reverb.getPresets();
    Object.entries(presets).forEach(([key, config]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = config.name;
      presetSelect.appendChild(option);
    });
    presetSelect.value = effects.reverb.getCurrentPreset();
    updateReverbInfo();
  }

  presetSelect?.addEventListener('change', () => {
    const preset = presetSelect.value as any;
    effects.reverb?.loadPreset(preset);
    updateReverbInfo();
  });

  mixSlider.addEventListener('input', () => {
    const mix = parseFloat(mixSlider.value) / 100;
    effects.reverb?.setParameter('mix', mix);
    mixValue.textContent = `${mixSlider.value}%`;
  });

  function updateReverbInfo() {
    if (!effects.reverb || !infoDiv) return;
    const presets = effects.reverb.getPresets();
    const currentPreset = effects.reverb.getCurrentPreset();
    const config = presets[currentPreset];

    infoDiv.innerHTML = `
      <strong>${config.name}</strong>: ${config.description}<br>
      <small>Decay: ${(config.decay * 100).toFixed(0)}% | Pre-delay: ${config.predelay}ms | Size: ${(config.size * 100).toFixed(0)}%</small>
    `;
  }
}

function setupDistortionControls() {
  const presetSelect = document.getElementById('distortion-preset') as HTMLSelectElement;
  const mixSlider = document.getElementById('distortion-mix-slider') as HTMLInputElement;
  const mixValue = document.getElementById('distortion-mix') as HTMLSpanElement;
  const infoDiv = document.getElementById('distortion-info') as HTMLDivElement;

  // Populate preset selector
  if (effects.distortion && presetSelect) {
    const presets = effects.distortion.getPresets();
    Object.entries(presets).forEach(([key, config]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = config.name;
      presetSelect.appendChild(option);
    });
    presetSelect.value = effects.distortion.getCurrentPreset();
    updateDistortionInfo();
  }

  presetSelect?.addEventListener('change', () => {
    const preset = presetSelect.value as any;
    effects.distortion?.loadPreset(preset);
    updateDistortionInfo();
  });

  mixSlider.addEventListener('input', () => {
    const mix = parseFloat(mixSlider.value) / 100;
    effects.distortion?.setParameter('mix', mix);
    mixValue.textContent = `${mixSlider.value}%`;
  });

  function updateDistortionInfo() {
    if (!effects.distortion || !infoDiv) return;
    const presets = effects.distortion.getPresets();
    const currentPreset = effects.distortion.getCurrentPreset();
    const config = presets[currentPreset];

    infoDiv.innerHTML = `
      <strong>${config.name}</strong>: ${config.description}<br>
      <small>Drive: ${(config.drive * 100).toFixed(0)}% | Tone: ${(config.tone * 100).toFixed(0)}%</small>
    `;
  }
}

function setupChorusControls() {
  const presetSelect = document.getElementById('chorus-preset') as HTMLSelectElement;
  const mixSlider = document.getElementById('chorus-mix-slider') as HTMLInputElement;
  const mixValue = document.getElementById('chorus-mix') as HTMLSpanElement;
  const infoDiv = document.getElementById('chorus-info') as HTMLDivElement;

  // Populate preset selector
  if (effects.chorus && presetSelect) {
    const presets = effects.chorus.getPresets();
    Object.entries(presets).forEach(([key, config]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = config.name;
      presetSelect.appendChild(option);
    });
    presetSelect.value = effects.chorus.getCurrentPreset();
    updateChorusInfo();
  }

  presetSelect?.addEventListener('change', () => {
    const preset = presetSelect.value as any;
    effects.chorus?.loadPreset(preset);
    updateChorusInfo();
  });

  mixSlider.addEventListener('input', () => {
    const mix = parseFloat(mixSlider.value) / 100;
    effects.chorus?.setParameter('mix', mix);
    mixValue.textContent = `${mixSlider.value}%`;
  });

  function updateChorusInfo() {
    if (!effects.chorus || !infoDiv) return;
    const presets = effects.chorus.getPresets();
    const currentPreset = effects.chorus.getCurrentPreset();
    const config = presets[currentPreset];

    infoDiv.innerHTML = `
      <strong>${config.name}</strong>: ${config.description}<br>
      <small>Rate: ${config.rate.toFixed(1)} Hz | Depth: ${(config.depth * 100).toFixed(0)}%</small>
    `;
  }
}
