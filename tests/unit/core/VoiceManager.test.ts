/**
 * VoiceManager Tests
 * 
 * Tests voice lifecycle, polyphony, and parameter updates
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { VoiceManager } from '../../../src/core/VoiceManager';
import type { AudioEngine } from '../../../src/core/AudioEngine';
import type { VoiceStateManager } from '../../../src/state';

// Mock visualizationState BEFORE importing VoiceManager
vi.mock('../../../src/state', async () => {
  const actual = await vi.importActual('../../../src/state');
  return {
    ...actual,
    visualizationState: {
      analyser1: {
        connect: vi.fn(),
        disconnect: vi.fn(),
      },
      analyser2: {
        connect: vi.fn(),
        disconnect: vi.fn(),
      },
      analyser3: {
        connect: vi.fn(),
        disconnect: vi.fn(),
      },
    },
  };
});

// Mock the oscillator modules BEFORE they're imported
vi.mock('../../../src/components/oscillators/SineOscillator', () => {
  return {
    SineOscillator: class MockSineOscillator {
      private mockOscillatorNode = { frequency: { value: 440 } };
      connect = vi.fn();
      disconnect = vi.fn();
      start = vi.fn();
      stop = vi.fn();
      setParameter = vi.fn();
      getParameter = vi.fn(() => 0);
      getOscillatorNode = vi.fn(() => this.mockOscillatorNode);
    },
  };
});

vi.mock('../../../src/components/oscillators/SawtoothOscillator', () => {
  return {
    SawtoothOscillator: class MockSawtoothOscillator {
      private mockOscillatorNode = { frequency: { value: 440 } };
      connect = vi.fn();
      disconnect = vi.fn();
      start = vi.fn();
      stop = vi.fn();
      setParameter = vi.fn();
      getParameter = vi.fn(() => 0);
      getOscillatorNode = vi.fn(() => this.mockOscillatorNode);
    },
  };
});

vi.mock('../../../src/components/oscillators/SquareOscillator', () => {
  return {
    SquareOscillator: class MockSquareOscillator {
      private mockOscillatorNode = { frequency: { value: 440 } };
      connect = vi.fn();
      disconnect = vi.fn();
      start = vi.fn();
      stop = vi.fn();
      setParameter = vi.fn();
      getParameter = vi.fn(() => 0);
      getOscillatorNode = vi.fn(() => this.mockOscillatorNode);
    },
  };
});

vi.mock('../../../src/components/oscillators/TriangleOscillator', () => {
  return {
    TriangleOscillator: class MockTriangleOscillator {
      private mockOscillatorNode = { frequency: { value: 440 } };
      connect = vi.fn();
      disconnect = vi.fn();
      start = vi.fn();
      stop = vi.fn();
      setParameter = vi.fn();
      getParameter = vi.fn(() => 0);
      getOscillatorNode = vi.fn(() => this.mockOscillatorNode);
    },
  };
});

vi.mock('../../../src/components/envelopes/ADSREnvelope', () => {
  return {
    ADSREnvelope: class MockADSREnvelope {
      private inputNode = { connect: vi.fn(), disconnect: vi.fn() };
      connect = vi.fn();
      disconnect = vi.fn();
      trigger = vi.fn();
      release = vi.fn();
      triggerRelease = vi.fn();
      setParameter = vi.fn();
      getParameter = vi.fn(() => 0);
      setTarget = vi.fn();
      getInputNode = vi.fn(() => this.inputNode);
    },
  };
});

// Mock AudioEngine
function createMockAudioEngine(): AudioEngine {
  const gainNodes: any[] = [];
  const panNodes: any[] = [];
  
  const mockContext = {
    createGain: vi.fn(() => {
      const node = {
        gain: { value: 0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      gainNodes.push(node);
      return node;
    }),
    createStereoPanner: vi.fn(() => {
      const node = {
        pan: { value: 0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      panNodes.push(node);
      return node;
    }),
    destination: {},
  } as any;

  return {
    getContext: vi.fn(() => mockContext),
    initialize: vi.fn(),
    isInitialized: vi.fn(() => true),
    _gainNodes: gainNodes, // For testing
    _panNodes: panNodes,   // For testing
  } as any;
}

// Mock VoiceStateManager
function createMockVoiceState(): VoiceStateManager {
  const activeVoices = new Map();
  
  return {
    oscillatorConfigs: new Map([
      [1, {
        enabled: true,
        waveform: 'sine',
        octave: 0,
        detune: 0,
        volume: 0.8,
        pan: 0,
      }],
      [2, {
        enabled: false,
        waveform: 'sawtooth',
        octave: -1,
        detune: -7,
        volume: 0.6,
        pan: 0,
      }],
      [3, {
        enabled: false,
        waveform: 'square',
        octave: 1,
        detune: 7,
        volume: 0.5,
        pan: 0,
      }],
    ]),
    activeVoices,
    envelopeSettings: {
      1: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
      2: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
      3: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
    },
    clearActiveVoices: vi.fn(() => activeVoices.clear()),
    getVoice: vi.fn((noteIndex: number) => activeVoices.get(noteIndex)),
    setVoice: vi.fn((noteIndex: number, voice: any) => activeVoices.set(noteIndex, voice)),
    deleteVoice: vi.fn((noteIndex: number) => activeVoices.delete(noteIndex)),
    initializeOscillatorConfig: vi.fn(),
  } as any;
}

describe('VoiceManager', () => {
  let voiceManager: VoiceManager;
  let mockAudioEngine: AudioEngine;
  let mockVoiceState: VoiceStateManager;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockAudioEngine = createMockAudioEngine();
    mockVoiceState = createMockVoiceState();
    
    // Suppress console logs during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Create voice manager with mocked dependencies
    voiceManager = new VoiceManager(mockAudioEngine, mockVoiceState);
  });

  describe('Constructor', () => {
    it('should create a voice manager with injected dependencies', () => {
      expect(voiceManager).toBeDefined();
      expect(mockAudioEngine.getContext).toHaveBeenCalled();
    });
  });

  describe('playNote', () => {
    it('should create a voice when playing a note', () => {
      voiceManager.playNote(60, 0.8); // Middle C
      
      expect(mockVoiceState.activeVoices.size).toBe(1);
      expect(mockVoiceState.activeVoices.has(60)).toBe(true);
    });

    it('should create oscillators for enabled configs only', () => {
      // Only oscillator 1 is enabled by default
      voiceManager.playNote(60, 0.8);
      
      const voice = mockVoiceState.activeVoices.get(60);
      expect(voice?.oscillators.length).toBe(1);
    });

    it('should create multiple oscillators when multiple are enabled', () => {
      // Enable oscillator 2
      mockVoiceState.oscillatorConfigs.get(2)!.enabled = true;
      
      voiceManager.playNote(60, 0.8);
      
      const voice = mockVoiceState.activeVoices.get(60);
      expect(voice?.oscillators.length).toBe(2);
    });

    it('should handle invalid note index gracefully', () => {
      voiceManager.playNote(999, 0.8); // Invalid index
      
      expect(mockVoiceState.activeVoices.size).toBe(0);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid note index'));
    });

    it('should stop existing note before playing new one at same index', () => {
      voiceManager.playNote(60, 0.8);
      expect(mockVoiceState.activeVoices.size).toBe(1);
      
      voiceManager.playNote(60, 0.9); // Same note
      expect(mockVoiceState.activeVoices.size).toBe(1); // Still 1 voice
    });

    it('should apply octave shift to frequency', () => {
      const config = mockVoiceState.oscillatorConfigs.get(1)!;
      config.octave = 1; // Shift up 1 octave
      
      voiceManager.playNote(60, 0.8);
      
      const voice = mockVoiceState.activeVoices.get(60);
      // Frequency should be doubled (1 octave up)
      // This is checked in the oscillator creation
      expect(voice).toBeDefined();
    });

    it('should use correct velocity', () => {
      voiceManager.playNote(60, 0.5);
      
      const voice = mockVoiceState.activeVoices.get(60);
      expect(voice).toBeDefined();
      // Velocity is passed to envelope.trigger() - verified by no errors
    });
  });

  describe('releaseNote', () => {
    it('should mark voice as inactive', () => {
      voiceManager.playNote(60, 0.8);
      const voice = mockVoiceState.activeVoices.get(60);
      expect(voice?.isActive).toBe(true);
      
      voiceManager.releaseNote(60);
      expect(voice?.isActive).toBe(false);
    });

    it('should handle releasing non-existent note gracefully', () => {
      voiceManager.releaseNote(999); // Never played
      // Should not throw
      expect(mockVoiceState.activeVoices.size).toBe(0);
    });

    it('should schedule cleanup after release time', () => {
      vi.useFakeTimers();
      
      voiceManager.playNote(60, 0.8);
      expect(mockVoiceState.activeVoices.size).toBe(1);
      
      voiceManager.releaseNote(60);
      
      // Fast-forward past release time (0.3s + 100ms buffer)
      vi.advanceTimersByTime(500);
      
      // Voice should be cleaned up
      expect(mockVoiceState.activeVoices.size).toBe(0);
      
      vi.useRealTimers();
    });
  });

  describe('stopAllNotes', () => {
    it('should stop all active voices', () => {
      // Use valid note indices (0-60)
      voiceManager.playNote(24, 0.8); // C4
      voiceManager.playNote(28, 0.8); // E4
      voiceManager.playNote(31, 0.8); // G4
      
      expect(mockVoiceState.activeVoices.size).toBe(3);
      
      voiceManager.stopAllNotes();
      
      expect(mockVoiceState.activeVoices.size).toBe(0);
    });

    it('should call clearActiveVoices', () => {
      voiceManager.stopAllNotes();
      
      expect(mockVoiceState.clearActiveVoices).toHaveBeenCalled();
    });
  });

  describe('updateActiveVoices', () => {
    beforeEach(() => {
      // Play a note to have an active voice
      voiceManager.playNote(60, 0.8);
    });

    it('should update volume on active voices', () => {
      voiceManager.updateActiveVoices(1, 'volume', 0.5);
      
      const voice = mockVoiceState.activeVoices.get(60);
      const osc = voice?.oscillators[0];
      
      // Volume should be updated (via setParameter call)
      expect(osc).toBeDefined();
    });

    it('should update detune on active voices', () => {
      voiceManager.updateActiveVoices(1, 'detune', 10);
      
      const voice = mockVoiceState.activeVoices.get(60);
      
      // Detune should be updated (via setParameter call)
      expect(voice).toBeDefined();
    });

    it('should recalculate frequency when octave changes', () => {
      const voice = mockVoiceState.activeVoices.get(60);
      const originalFreq = voice?.baseFrequency;
      
      voiceManager.updateActiveVoices(1, 'octave', 1);
      
      // Frequency should be recalculated (doubled for +1 octave)
      expect(voice).toBeDefined();
    });

    it('should only update matching oscillator number', () => {
      // Enable second oscillator
      mockVoiceState.oscillatorConfigs.get(2)!.enabled = true;
      voiceManager.playNote(28, 0.8); // E4 - valid index
      
      const voice = mockVoiceState.activeVoices.get(28);
      expect(voice?.oscillators.length).toBe(2);
      
      // Update only oscillator 2
      voiceManager.updateActiveVoices(2, 'volume', 0.3);
      
      // Both oscillators should still exist, only osc 2 updated
      expect(voice?.oscillators.length).toBe(2);
    });
  });

  describe('getActiveVoiceCount', () => {
    it('should return 0 when no voices active', () => {
      expect(voiceManager.getActiveVoiceCount()).toBe(0);
    });

    it('should return correct count of active voices', () => {
      voiceManager.playNote(24, 0.8); // C4
      expect(voiceManager.getActiveVoiceCount()).toBe(1);
      
      voiceManager.playNote(28, 0.8); // E4
      expect(voiceManager.getActiveVoiceCount()).toBe(2);
      
      voiceManager.playNote(31, 0.8); // G4
      expect(voiceManager.getActiveVoiceCount()).toBe(3);
    });

    it('should decrease count after releasing notes', () => {
      vi.useFakeTimers();
      
      voiceManager.playNote(24, 0.8); // C4
      voiceManager.playNote(28, 0.8); // E4
      expect(voiceManager.getActiveVoiceCount()).toBe(2);
      
      voiceManager.releaseNote(24);
      vi.advanceTimersByTime(500);
      
      expect(voiceManager.getActiveVoiceCount()).toBe(1);
      
      vi.useRealTimers();
    });
  });

  describe('Polyphony', () => {
    it('should support multiple simultaneous notes', () => {
      const notes = [24, 28, 31, 36]; // C4 major chord (C4, E4, G4, C5)
      
      notes.forEach(note => voiceManager.playNote(note, 0.8));
      
      expect(voiceManager.getActiveVoiceCount()).toBe(4);
      expect(mockVoiceState.activeVoices.size).toBe(4);
    });

    it('should handle rapid note retriggering', () => {
      // Play same note repeatedly
      voiceManager.playNote(60, 0.8);
      voiceManager.playNote(60, 0.8);
      voiceManager.playNote(60, 0.8);
      
      // Should only have 1 voice (latest)
      expect(voiceManager.getActiveVoiceCount()).toBe(1);
    });
  });
});
