/**
 * Main entry point for the Modular Synthesizer
 * 
 * This demonstrates basic usage of the audio engine and bus system.
 */

import { AudioEngine, type AudioContextConfig } from './core';
import { BusManager } from './bus';

/**
 * Initialize the synthesizer system
 */
async function initializeSynthesizer(): Promise<void> {
  console.log('🎵 Initializing Modular Synthesizer...');

  try {
    // Get engine and bus manager instances
    const engine = AudioEngine.getInstance();
    const busManager = BusManager.getInstance();

    // Initialize audio engine with configuration
    const config: AudioContextConfig = {
      latencyHint: 'interactive', // Low latency for real-time performance
    };
    
    await engine.initialize(config);

    // Initialize bus manager (creates master bus)
    busManager.initialize();

    console.log('✅ Synthesizer initialized successfully');
    console.log('Sample Rate:', engine.getSampleRate());
    console.log('Audio Context State:', engine.isRunning() ? 'Running' : 'Suspended');

    // Create an auxiliary bus for effects
    busManager.createBus({
      name: 'FX Bus',
      type: 'aux',
      gain: 0.7,
    });

    console.log('📊 Bus Manager Info:', busManager.getDebugInfo());

  } catch (error) {
    console.error('❌ Failed to initialize synthesizer:', error);
    throw error;
  }
}

/**
 * Test function to play a simple tone
 * This demonstrates basic audio generation
 */
function playTestTone(): void {
  const engine = AudioEngine.getInstance();
  const busManager = BusManager.getInstance();
  const masterBus = busManager.getMasterBus();

  // Create a simple oscillator
  const osc = engine.createOscillator('sine', 440); // A4 note
  const gain = engine.createGain(0.3); // Quiet volume

  // Connect: Oscillator -> Gain -> Master Bus -> Speakers
  osc.connect(gain);
  gain.connect(masterBus.getInputNode());

  // Play for 1 second
  const now = engine.getCurrentTime();
  osc.start(now);
  osc.stop(now + 1.0);

  console.log('🔊 Playing test tone (440 Hz for 1 second)');
}

// Export for use in other modules
export { initializeSynthesizer, playTestTone };

// Auto-initialize when this module is imported
// In a real application, you'd want to trigger this from a user interaction
console.log('Modular Synthesizer loaded. Call initializeSynthesizer() to start.');
