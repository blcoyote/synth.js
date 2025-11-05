/**
 * Main application entry point
 */

import { initializeSynthesizer, playTestTone } from './index';
import { AudioEngine } from './core';
import { BusManager } from './bus';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const initBtn = document.getElementById('initBtn') as HTMLButtonElement;
  const testToneBtn = document.getElementById('testToneBtn') as HTMLButtonElement;
  const engineIndicator = document.getElementById('engineIndicator') as HTMLSpanElement;
  const engineStatus = document.getElementById('engineStatus') as HTMLSpanElement;
  const sampleRate = document.getElementById('sampleRate') as HTMLSpanElement;
  const busCount = document.getElementById('busCount') as HTMLSpanElement;
  const consoleEl = document.getElementById('console') as HTMLDivElement;

  // Console logging
  const originalLog = console.log;
  console.log = function (...args: any[]) {
    originalLog.apply(console, args);
    const line = document.createElement('div');
    line.className = 'console-line';
    line.textContent = args.join(' ');
    consoleEl.appendChild(line);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  };

  // Update status display
  function updateStatus() {
    const engine = AudioEngine.getInstance();
    const busManager = BusManager.getInstance();

    try {
      const isRunning = engine.isRunning();
      engineIndicator.className = `indicator ${isRunning ? 'active' : 'inactive'}`;
      engineStatus.textContent = isRunning ? 'Running' : 'Suspended';
      sampleRate.textContent = `${engine.getSampleRate()} Hz`;
      busCount.textContent = String(busManager.getBusNames().length);
    } catch (e) {
      // Not initialized yet
    }
  }

  // Initialize button
  initBtn.addEventListener('click', async () => {
    initBtn.disabled = true;
    initBtn.textContent = 'Initializing...';

    try {
      await initializeSynthesizer();
      testToneBtn.disabled = false;
      initBtn.textContent = '✓ Initialized';
      updateStatus();
    } catch (error) {
      initBtn.disabled = false;
      initBtn.textContent = 'Initialize System';
      console.error('Initialization failed:', error);
    }
  });

  // Test tone button
  testToneBtn.addEventListener('click', () => {
    playTestTone();
  });

  console.log('🎵 Modular Synthesizer ready. Click "Initialize System" to begin.');
});
