/**
 * Effects demo - Dynamic bus routing demonstration
 */

import { AudioEngine } from './core';
import { BusManager } from './bus';
import { SawtoothOscillator } from './components/oscillators';
import {
  DelayEffect,
  ReverbEffect,
  DistortionEffect,
  ChorusEffect,
  FlangerEffect,
  PhaserEffect,
  CompressorEffect,
  RingModulatorEffect,
} from './components/effects';

let oscillator: SawtoothOscillator | null = null;
let isPlaying = false;

// Effect instances
const effects = {
  delay: null as DelayEffect | null,
  reverb: null as ReverbEffect | null,
  distortion: null as DistortionEffect | null,
  chorus: null as ChorusEffect | null,
  flanger: null as FlangerEffect | null,
  phaser: null as PhaserEffect | null,
  compressor: null as CompressorEffect | null,
  ringmodulator: null as RingModulatorEffect | null,
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
    effects.flanger = new FlangerEffect('classic');
    effects.phaser = new PhaserEffect('classic');
    effects.compressor = new CompressorEffect('medium');
    effects.ringmodulator = new RingModulatorEffect('metallic');

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
  setupFlangerControls();
  setupPhaserControls();
  setupCompressorControls();
  setupRingModulatorControls();
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

function setupFlangerControls() {
  const presetSelect = document.getElementById('flanger-preset') as HTMLSelectElement;
  const mixSlider = document.getElementById('flanger-mix-slider') as HTMLInputElement;
  const mixValue = document.getElementById('flanger-mix') as HTMLSpanElement;
  const infoDiv = document.getElementById('flanger-info') as HTMLDivElement;

  // Populate preset selector
  if (effects.flanger && presetSelect) {
    const presets = effects.flanger.getPresets();
    Object.entries(presets).forEach(([key, config]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = config.name;
      presetSelect.appendChild(option);
    });
    presetSelect.value = effects.flanger.getCurrentPreset();
    updateFlangerInfo();
  }

  presetSelect?.addEventListener('change', () => {
    const preset = presetSelect.value as any;
    effects.flanger?.loadPreset(preset);
    updateFlangerInfo();
  });

  mixSlider.addEventListener('input', () => {
    const mix = parseFloat(mixSlider.value) / 100;
    effects.flanger?.setParameter('mix', mix);
    mixValue.textContent = `${mixSlider.value}%`;
  });

  function updateFlangerInfo() {
    if (!effects.flanger || !infoDiv) return;
    const presets = effects.flanger.getPresets();
    const currentPreset = effects.flanger.getCurrentPreset();
    const config = presets[currentPreset];

    infoDiv.innerHTML = `
      <strong>${config.name}</strong>: ${config.description}<br>
      <small>Rate: ${config.rate.toFixed(1)} Hz | Depth: ${(config.depth * 100).toFixed(0)}% | Feedback: ${(config.feedback * 100).toFixed(0)}%</small>
    `;
  }
}

function setupPhaserControls() {
  const presetSelect = document.getElementById('phaser-preset') as HTMLSelectElement;
  const mixSlider = document.getElementById('phaser-mix-slider') as HTMLInputElement;
  const mixValue = document.getElementById('phaser-mix') as HTMLSpanElement;
  const infoDiv = document.getElementById('phaser-info') as HTMLDivElement;

  // Populate preset selector
  if (effects.phaser && presetSelect) {
    const presets = effects.phaser.getPresets();
    Object.entries(presets).forEach(([key, config]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = config.name;
      presetSelect.appendChild(option);
    });
    presetSelect.value = effects.phaser.getCurrentPreset();
    updatePhaserInfo();
  }

  presetSelect?.addEventListener('change', () => {
    const preset = presetSelect.value as any;
    effects.phaser?.loadPreset(preset);
    updatePhaserInfo();
  });

  mixSlider.addEventListener('input', () => {
    const mix = parseFloat(mixSlider.value) / 100;
    effects.phaser?.setParameter('mix', mix);
    mixValue.textContent = `${mixSlider.value}%`;
  });

  function updatePhaserInfo() {
    if (!effects.phaser || !infoDiv) return;
    const presets = effects.phaser.getPresets();
    const currentPreset = effects.phaser.getCurrentPreset();
    const config = presets[currentPreset];

    infoDiv.innerHTML = `
      <strong>${config.name}</strong>: ${config.description}<br>
      <small>Rate: ${config.rate.toFixed(1)} Hz | Depth: ${(config.depth * 100).toFixed(0)}% | Feedback: ${(config.feedback * 100).toFixed(0)}% | Stages: ${config.stages}</small>
    `;
  }
}

function setupCompressorControls() {
  const presetSelect = document.getElementById('compressor-preset') as HTMLSelectElement;
  const mixSlider = document.getElementById('compressor-mix-slider') as HTMLInputElement;
  const mixValue = document.getElementById('compressor-mix') as HTMLSpanElement;
  const infoDiv = document.getElementById('compressor-info') as HTMLDivElement;

  // Populate preset selector
  if (effects.compressor && presetSelect) {
    const presets = effects.compressor.getPresets();
    Object.entries(presets).forEach(([key, config]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = config.name;
      presetSelect.appendChild(option);
    });
    presetSelect.value = effects.compressor.getCurrentPreset();
    updateCompressorInfo();
  }

  presetSelect?.addEventListener('change', () => {
    const preset = presetSelect.value as any;
    effects.compressor?.loadPreset(preset);
    updateCompressorInfo();
  });

  mixSlider.addEventListener('input', () => {
    const mix = parseFloat(mixSlider.value) / 100;
    effects.compressor?.setParameter('mix', mix);
    mixValue.textContent = `${mixSlider.value}%`;
  });

  function updateCompressorInfo() {
    if (!effects.compressor || !infoDiv) return;
    const presets = effects.compressor.getPresets();
    const currentPreset = effects.compressor.getCurrentPreset();
    const config = presets[currentPreset];

    infoDiv.innerHTML = `
      <strong>${config.name}</strong>: ${config.description}<br>
      <small>Threshold: ${config.threshold.toFixed(0)} dB | Ratio: ${config.ratio.toFixed(1)}:1 | Attack: ${(config.attack * 1000).toFixed(1)} ms | Release: ${(config.release * 1000).toFixed(0)} ms</small>
    `;
  }
}

function setupRingModulatorControls() {
  const presetSelect = document.getElementById('ringmodulator-preset') as HTMLSelectElement;
  const mixSlider = document.getElementById('ringmodulator-mix-slider') as HTMLInputElement;
  const mixValue = document.getElementById('ringmodulator-mix') as HTMLSpanElement;
  const infoDiv = document.getElementById('ringmodulator-info') as HTMLDivElement;

  // Populate preset selector
  if (effects.ringmodulator && presetSelect) {
    const presets = RingModulatorEffect.getPresets();
    presets.forEach((config) => {
      const option = document.createElement('option');
      option.value = config.name.toLowerCase();
      option.textContent = config.name;
      presetSelect.appendChild(option);
    });
    presetSelect.value = 'metallic';
    updateRingModulatorInfo();
  }

  presetSelect?.addEventListener('change', () => {
    const preset = presetSelect.value;
    effects.ringmodulator?.loadPreset(preset);
    updateRingModulatorInfo();
  });

  mixSlider.addEventListener('input', () => {
    const mix = parseFloat(mixSlider.value) / 100;
    effects.ringmodulator?.setParameter('mix', mix);
    mixValue.textContent = `${mixSlider.value}%`;
  });

  function updateRingModulatorInfo() {
    if (!effects.ringmodulator || !infoDiv) return;
    const presetInfo = effects.ringmodulator.getPresetInfo();
    if (!presetInfo) return;

    infoDiv.innerHTML = `
      <strong>${presetInfo.name}</strong>: ${presetInfo.description}<br>
      <small>Carrier: ${presetInfo.carrierFrequency.toFixed(1)} Hz | Waveform: ${presetInfo.carrierWaveform}</small>
    `;
  }
}
