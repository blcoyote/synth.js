/**
 * Modulation Demo - ADSR Envelope and LFO demonstration
 */

import { AudioEngine } from './core';
import { BusManager } from './bus';
import { SawtoothOscillator } from './components/oscillators';
import { ADSREnvelope } from './components/envelopes';
import { LFO } from './components/modulation';

let initialized = false;
let oscillator: SawtoothOscillator | null = null;
let envelope: ADSREnvelope | null = null;
let lfo: LFO | null = null;
let isNoteActive = false;
let masterBus: ReturnType<typeof BusManager.prototype.getMasterBus>;

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

      // Create oscillator (A3 = 220 Hz)
      oscillator = new SawtoothOscillator(220);
      oscillator.setParameter('volume', 1.0); // Full volume, envelope will control

      // Create ADSR envelope for amplitude
      envelope = new ADSREnvelope({
        attack: 0.01,
        decay: 0.1,
        sustain: 0.7,
        release: 0.3,
      });

      // Create LFO for volume modulation
      lfo = new LFO({
        frequency: 2.0,
        depth: 0.3,
        waveform: 'sine',
      });

      // Signal chain: Oscillator -> Envelope -> Master Bus
      oscillator.connect(envelope.getNode());
      envelope.connect(masterBus.getInputNode());

      // LFO modulates the master bus input gain
      // Note: LFOs typically need to be offset since they output -1 to +1
      // For volume, we'll modulate around a center point in the control logic

      setupEnvelopeControls();
      setupLFOControls();
      setupTriggerControls();

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

function setupEnvelopeControls() {
  // Attack
  const attackSlider = document.getElementById('env-attack') as HTMLInputElement;
  const attackValue = document.getElementById('env-attack-value') as HTMLSpanElement;
  attackSlider.addEventListener('input', () => {
    const attack = parseFloat(attackSlider.value) / 1000; // Convert ms to seconds
    envelope?.setParameter('attack', attack);
    attackValue.textContent = `${attackSlider.value}ms`;
  });

  // Decay
  const decaySlider = document.getElementById('env-decay') as HTMLInputElement;
  const decayValue = document.getElementById('env-decay-value') as HTMLSpanElement;
  decaySlider.addEventListener('input', () => {
    const decay = parseFloat(decaySlider.value) / 1000;
    envelope?.setParameter('decay', decay);
    decayValue.textContent = `${decaySlider.value}ms`;
  });

  // Sustain
  const sustainSlider = document.getElementById('env-sustain') as HTMLInputElement;
  const sustainValue = document.getElementById('env-sustain-value') as HTMLSpanElement;
  sustainSlider.addEventListener('input', () => {
    const sustain = parseFloat(sustainSlider.value) / 100;
    envelope?.setParameter('sustain', sustain);
    sustainValue.textContent = `${sustainSlider.value}%`;
  });

  // Release
  const releaseSlider = document.getElementById('env-release') as HTMLInputElement;
  const releaseValue = document.getElementById('env-release-value') as HTMLSpanElement;
  releaseSlider.addEventListener('input', () => {
    const release = parseFloat(releaseSlider.value) / 1000;
    envelope?.setParameter('release', release);
    releaseValue.textContent = `${releaseSlider.value}ms`;
  });
}

function setupLFOControls() {
  // Rate
  const rateSlider = document.getElementById('lfo-rate') as HTMLInputElement;
  const rateValue = document.getElementById('lfo-rate-value') as HTMLSpanElement;
  rateSlider.addEventListener('input', () => {
    const rate = parseFloat(rateSlider.value) / 100; // 0.1 to 20 Hz
    lfo?.setParameter('frequency', rate);
    rateValue.textContent = `${rate.toFixed(1)} Hz`;
  });

  // Depth
  const depthSlider = document.getElementById('lfo-depth') as HTMLInputElement;
  const depthValue = document.getElementById('lfo-depth-value') as HTMLSpanElement;
  depthSlider.addEventListener('input', () => {
    const depth = parseFloat(depthSlider.value) / 100;
    lfo?.setParameter('depth', depth);
    depthValue.textContent = `${depthSlider.value}%`;
  });

  // Waveform
  const waveformSelect = document.getElementById('lfo-waveform') as HTMLSelectElement;
  const waveformValue = document.getElementById('lfo-wave-value') as HTMLSpanElement;
  waveformSelect.addEventListener('change', () => {
    const waveform = waveformSelect.value as 'sine' | 'triangle' | 'square' | 'sawtooth' | 'random';
    lfo?.setWaveform(waveform);
    waveformValue.textContent = waveformSelect.options[waveformSelect.selectedIndex].text;
  });

  // Toggle
  const toggleBtn = document.getElementById('lfo-toggle') as HTMLButtonElement;
  toggleBtn.addEventListener('click', () => {
    if (!lfo) return;

    if (lfo.isEnabled()) {
      lfo.stop();
      
      // Disconnect LFO and reset master gain
      lfo.disconnect();
      masterBus.setInputGain(0.8);
      
      toggleBtn.textContent = 'Start LFO';
      toggleBtn.classList.remove('active');
    } else {
      // Connect LFO to master bus input gain
      // LFO outputs -depth to +depth, we want to modulate around 0.8 (80% volume)
      lfo.connectToParam(masterBus.getInputNode().gain);
      
      // Set base volume
      masterBus.setInputGain(0.8);
      
      lfo.start();
      toggleBtn.textContent = 'Stop LFO';
      toggleBtn.classList.add('active');
    }
  });
}

function setupTriggerControls() {
  const triggerBtn = document.getElementById('trigger-btn') as HTMLButtonElement;

  // Button click
  triggerBtn.addEventListener('mousedown', () => {
    triggerNote();
    triggerBtn.classList.add('active');
  });

  triggerBtn.addEventListener('mouseup', () => {
    releaseNote();
    triggerBtn.classList.remove('active');
  });

  triggerBtn.addEventListener('mouseleave', () => {
    if (isNoteActive) {
      releaseNote();
      triggerBtn.classList.remove('active');
    }
  });

  // Keyboard spacebar
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isNoteActive && initialized) {
      e.preventDefault();
      triggerNote();
      triggerBtn.classList.add('active');
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && isNoteActive) {
      e.preventDefault();
      releaseNote();
      triggerBtn.classList.remove('active');
    }
  });
}

function triggerNote() {
  if (isNoteActive || !oscillator || !envelope) return;

  oscillator.start();
  envelope.trigger(1.0); // Full velocity
  isNoteActive = true;
}

function releaseNote() {
  if (!isNoteActive || !envelope) return;

  envelope.triggerRelease();
  isNoteActive = false;

  // Stop oscillator after release phase completes
  setTimeout(() => {
    if (oscillator && !isNoteActive) {
      oscillator.stop();
      // Recreate oscillator for next trigger
      oscillator = new SawtoothOscillator(220);
      oscillator.setParameter('volume', 1.0);
      oscillator.connect(envelope!.getNode());
    }
  }, envelope.getParameter('release') * 1000 + 100);
}
