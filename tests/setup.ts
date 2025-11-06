/**
 * Test Setup
 * Initializes global test environment for Web Audio API testing
 */

import { vi } from 'vitest';

// Mock Web Audio API for testing environment
class MockAudioContext {
  currentTime = 0;
  sampleRate = 48000;
  state: AudioContextState = 'running';
  destination = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  createOscillator() {
    return {
      type: 'sine',
      frequency: { 
        value: 440, 
        setValueAtTime: vi.fn(), 
        setTargetAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      },
      detune: { value: 0 },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }

  createGain() {
    return {
      gain: { 
        value: 1, 
        setValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createStereoPanner() {
    return {
      pan: { value: 0, setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createBiquadFilter() {
    const frequencyParam = { 
      value: 350, 
      setValueAtTime: vi.fn((value) => { frequencyParam.value = value; }),
      setTargetAtTime: vi.fn((value) => { frequencyParam.value = value; }),
      linearRampToValueAtTime: vi.fn((value) => { frequencyParam.value = value; }),
      exponentialRampToValueAtTime: vi.fn((value) => { frequencyParam.value = value; }),
      cancelScheduledValues: vi.fn(),
    };
    const qParam = { 
      value: 1, 
      setValueAtTime: vi.fn((value) => { qParam.value = value; }),
      setTargetAtTime: vi.fn((value) => { qParam.value = value; }),
      linearRampToValueAtTime: vi.fn((value) => { qParam.value = value; }),
      exponentialRampToValueAtTime: vi.fn((value) => { qParam.value = value; }),
      cancelScheduledValues: vi.fn(),
    };
    const gainParam = { 
      value: 0,
      setTargetAtTime: vi.fn((value) => { gainParam.value = value; }),
      cancelScheduledValues: vi.fn(),
    };
    return {
      type: 'lowpass',
      frequency: frequencyParam,
      Q: qParam,
      gain: gainParam,
      connect: vi.fn(),
      disconnect: vi.fn(),
      getFrequencyResponse: vi.fn((frequencyArray, magResponseOutput, phaseResponseOutput) => {
        // Mock frequency response (simple lowpass approximation)
        for (let i = 0; i < frequencyArray.length; i++) {
          magResponseOutput[i] = 1.0;
          phaseResponseOutput[i] = 0.0;
        }
      }),
    };
  }

  createWaveShaper() {
    return {
      curve: null,
      oversample: 'none',
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createDelay(maxDelayTime = 1) {
    return {
      delayTime: { 
        value: 0, 
        setValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createConvolver() {
    return {
      buffer: null,
      normalize: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createDynamicsCompressor() {
    return {
      threshold: { value: -24 },
      knee: { value: 30 },
      ratio: { value: 12 },
      attack: { value: 0.003 },
      release: { value: 0.25 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createChannelSplitter(numberOfOutputs = 2) {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      numberOfInputs: 1,
      numberOfOutputs,
    };
  }

  createChannelMerger(numberOfInputs = 2) {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      numberOfInputs,
      numberOfOutputs: 1,
    };
  }

  resume() {
    return Promise.resolve();
  }

  suspend() {
    return Promise.resolve();
  }

  close() {
    return Promise.resolve();
  }
}

// @ts-expect-error - Mocking global AudioContext
global.AudioContext = MockAudioContext;
// @ts-expect-error - Mocking global AudioContext
global.webkitAudioContext = MockAudioContext;

// Mock StereoPannerNode if needed
if (typeof StereoPannerNode === 'undefined') {
  // @ts-expect-error - Mocking global
  global.StereoPannerNode = class MockStereoPannerNode {};
}

console.log('🧪 Test environment initialized with Web Audio API mocks');
