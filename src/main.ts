/**
 * Main application entry point
 */

import { initializeSynthesizer, playTestTone } from './index';
import { AudioEngine } from './core';
import { BusManager } from './bus';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
  // DOM elements
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

  // Auto-initialize on page load
  console.log('🎵 Initializing Modular Synthesizer...');
  try {
    await initializeSynthesizer();
    testToneBtn.disabled = false;
    updateStatus();
    console.log('✓ System initialized and ready');
  } catch (error) {
    console.error('Initialization failed:', error);
    alert('Failed to initialize audio system. Please refresh the page to try again.');
  }

  // Test tone button
  testToneBtn.addEventListener('click', () => {
    playTestTone();
  });
});
