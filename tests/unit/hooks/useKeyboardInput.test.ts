/**
 * useKeyboardInput Hook Tests
 * 
 * Tests Danish keyboard layout mapping, key press/release tracking,
 * MIDI note number conversion, and getKeyLabel function
 */

// @ts-nocheck - vitest's vi.fn() type doesn't perfectly match hook's callback signature, but tests work correctly
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardInput, getKeyLabel } from '../../../src/hooks/useKeyboardInput';

describe('useKeyboardInput', () => {
  let onNotePress: ReturnType<typeof vi.fn>;
  let onNoteRelease: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onNotePress = vi.fn();
    onNoteRelease = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Hook initialization', () => {
    it('should initialize without errors', () => {
      const { result } = renderHook(() => 
        useKeyboardInput(onNotePress, onNoteRelease)
      );
      expect(result.current).toBeUndefined();
    });

    it('should not call callbacks on initialization', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      expect(onNotePress).not.toHaveBeenCalled();
      expect(onNoteRelease).not.toHaveBeenCalled();
    });

    it('should respect enabled parameter', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease, false));
      
      // Simulate key press
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      });
      
      expect(onNotePress).not.toHaveBeenCalled();
    });
  });

  describe('Key press detection', () => {
    it('should trigger onNotePress for valid key', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
      });
      expect(onNotePress).toHaveBeenCalledWith(49); // C#3 (startNote 48 + relative 1)
      expect(onNotePress).toHaveBeenCalledTimes(1);
    });

    it('should handle lowercase keys', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
      });
      expect(onNotePress).toHaveBeenCalledWith(48); // C3 (startNote 48 + relative 0)
    });

    it('should handle uppercase keys by converting to lowercase', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'S' }));
      });
      expect(onNotePress).toHaveBeenCalledWith(49); // C#3 (startNote 48 + relative 1)
    });

    it('should prevent key repeat when held down', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      // Press key multiple times
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
      });
      
      // Should only trigger once
      expect(onNotePress).toHaveBeenCalledTimes(1);
    });

    it('should not trigger for unmapped keys', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' })); // Not mapped
      });
      
      expect(onNotePress).not.toHaveBeenCalled();
    });
  });

  describe('Key release detection', () => {
    it('should trigger onNoteRelease when key is released', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 's' }));
      });
      expect(onNoteRelease).toHaveBeenCalledWith(49); // C#3 (startNote 48 + relative 1)
      expect(onNoteRelease).toHaveBeenCalledTimes(1);
    });

    it('should only release keys that were pressed', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      // Release without press
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 's' }));
      });
      
      expect(onNoteRelease).not.toHaveBeenCalled();
    });

    it('should handle multiple simultaneous key presses', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' })); // C#3 (49)
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' })); // C3 (48)
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })); // D3 (50)
      });
      
      expect(onNotePress).toHaveBeenCalledTimes(3);
      expect(onNotePress).toHaveBeenNthCalledWith(1, 49);
      expect(onNotePress).toHaveBeenNthCalledWith(2, 48);
      expect(onNotePress).toHaveBeenNthCalledWith(3, 50);
    });

    it('should release only specific keys', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        // Press three keys
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
        
        // Release middle key
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'z' }));
      });
      expect(onNoteRelease).toHaveBeenCalledTimes(1);
      expect(onNoteRelease).toHaveBeenCalledWith(48); // C3
    });
  });

  describe('Window blur handling', () => {
    it('should release all notes on window blur', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        // Press multiple keys
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
        
        // Blur window
        window.dispatchEvent(new Event('blur'));
      });
      
      // Should release all three notes
      expect(onNoteRelease).toHaveBeenCalledTimes(3);
    });

    it('should clear pressed keys state after blur', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
        window.dispatchEvent(new Event('blur'));
        
        // Press same key again
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
      });
      
      // Should trigger press twice (once before blur, once after)
      expect(onNotePress).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      
      const { unmount } = renderHook(() => 
        useKeyboardInput(onNotePress, onNoteRelease)
      );
      
      const addCallCount = addSpy.mock.calls.length;
      
      unmount();
      
      // Should remove same number of listeners as added
      expect(removeSpy).toHaveBeenCalledTimes(addCallCount);
      
      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });

  describe('US keyboard layout mapping - bottom row (Z-\')', () => {
    it('should map "z" to C4 (MIDI 48)', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease, true, 48));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
      });
      
      expect(onNotePress).toHaveBeenCalledWith(48);
    });

    it('should map "m" to B4 (MIDI 59)', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease, true, 48));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));
      });
      
      expect(onNotePress).toHaveBeenCalledWith(59);
    });

    it('should map all bottom row keys correctly', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease, true, 48));
      
      const bottomRowKeys = [
        { key: 'z', midi: 48 }, // C4
        { key: 's', midi: 49 }, // C#4
        { key: 'x', midi: 50 }, // D4
        { key: 'd', midi: 51 }, // D#4
        { key: 'c', midi: 52 }, // E4
        { key: 'v', midi: 53 }, // F4
        { key: 'g', midi: 54 }, // F#4
        { key: 'b', midi: 55 }, // G4
        { key: 'h', midi: 56 }, // G#4
        { key: 'n', midi: 57 }, // A4
        { key: 'j', midi: 58 }, // A#4
        { key: 'm', midi: 59 }, // B4
        { key: ',', midi: 60 }, // C5
        { key: 'l', midi: 61 }, // C#5
        { key: '.', midi: 62 }, // D5
        { key: ';', midi: 63 }, // D#5
        { key: '/', midi: 64 }, // E5
        { key: "'", midi: 65 }, // F5
      ];

      bottomRowKeys.forEach(({ key, midi }) => {
        onNotePress.mockClear();
        act(() => {
          window.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });
        expect(onNotePress).toHaveBeenCalledWith(midi);
      });
    });
  });

  describe('US keyboard layout mapping - top row (Q-])', () => {
    it('should map "q" to C5 (MIDI 60)', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease, true, 48));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q' }));
      });
      
      expect(onNotePress).toHaveBeenCalledWith(60);
    });

    it('should map "]" to G6 (MIDI 79)', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease, true, 48));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ']' }));
      });
      
      expect(onNotePress).toHaveBeenCalledWith(79);
    });

    it('should map all top row keys correctly', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease, true, 48));
      
      const topRowKeys = [
        { key: 'q', midi: 60 }, // C5
        { key: '2', midi: 61 }, // C#5
        { key: 'w', midi: 62 }, // D5
        { key: '3', midi: 63 }, // D#5
        { key: 'e', midi: 64 }, // E5
        { key: 'r', midi: 65 }, // F5
        { key: '5', midi: 66 }, // F#5
        { key: 't', midi: 67 }, // G5
        { key: '6', midi: 68 }, // G#5
        { key: 'y', midi: 69 }, // A5
        { key: '7', midi: 70 }, // A#5
        { key: 'u', midi: 71 }, // B5
        { key: 'i', midi: 72 }, // C6
        { key: '9', midi: 73 }, // C#6
        { key: 'o', midi: 74 }, // D6
        { key: '0', midi: 75 }, // D#6
        { key: 'p', midi: 76 }, // E6
        { key: '[', midi: 77 }, // F6
        { key: '=', midi: 78 }, // F#6
        { key: ']', midi: 79 }, // G6
      ];

      topRowKeys.forEach(({ key, midi }) => {
        onNotePress.mockClear();
        act(() => {
          window.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });
        expect(onNotePress).toHaveBeenCalledWith(midi);
      });
    });
  });
});

describe('getKeyLabel', () => {
  describe('C4 octave labels (default startNote=48)', () => {
    it('should return "Z" for C4 (MIDI 48)', () => {
      expect(getKeyLabel(48)).toBe('Z');
    });

    it('should return "S" for C#4 (MIDI 49)', () => {
      expect(getKeyLabel(49)).toBe('S');
    });

    it('should return correct labels for all C4 octave notes', () => {
      const c4Labels = [
        { midi: 48, label: 'Z' },  // C4
        { midi: 49, label: 'S' },  // C#4
        { midi: 50, label: 'X' },  // D4
        { midi: 51, label: 'D' },  // D#4
        { midi: 52, label: 'C' },  // E4
        { midi: 53, label: 'V' },  // F4
        { midi: 54, label: 'G' },  // F#4
        { midi: 55, label: 'B' },  // G4
        { midi: 56, label: 'H' },  // G#4
        { midi: 57, label: 'N' },  // A4
        { midi: 58, label: 'J' },  // A#4
        { midi: 59, label: 'M' },  // B4
      ];

      c4Labels.forEach(({ midi, label }) => {
        expect(getKeyLabel(midi)).toBe(label);
      });
    });
  });

  describe('C5 octave labels', () => {
    it('should return "," for C5 (MIDI 60)', () => {
      expect(getKeyLabel(60)).toBe(',');
    });

    it('should return correct labels for partial C5 octave', () => {
      const c5Labels = [
        { midi: 60, label: ',' },  // C5
        { midi: 61, label: 'L' },  // C#5
        { midi: 62, label: '.' },  // D5
        { midi: 63, label: ';' },  // D#5
        { midi: 64, label: '/' },  // E5
        { midi: 65, label: "'" },  // F5
      ];

      c5Labels.forEach(({ midi, label }) => {
        expect(getKeyLabel(midi)).toBe(label);
      });
    });
  });

  describe('Top row Q-] labels (overlaps with bottom row)', () => {
    it('should return "," for C5 (MIDI 60) - same as bottom row', () => {
      // Both Q row and bottom row can play C5
      expect(getKeyLabel(60)).toBe(',');
    });

    it('should return correct labels for top row starting from R (MIDI 65)', () => {
      const topRowLabels = [
        { midi: 66, label: '5' },  // F#5
        { midi: 67, label: 'T' },  // G5
        { midi: 68, label: '6' },  // G#5
        { midi: 69, label: 'Y' },  // A5
        { midi: 70, label: '7' },  // A#5
        { midi: 71, label: 'U' },  // B5
        { midi: 72, label: 'I' },  // C6
        { midi: 73, label: '9' },  // C#6
        { midi: 74, label: 'O' },  // D6
        { midi: 75, label: '0' },  // D#6
        { midi: 76, label: 'P' },  // E6
        { midi: 77, label: '[' },  // F6
        { midi: 78, label: '=' },  // F#6
        { midi: 79, label: ']' },  // G6
      ];

      topRowLabels.forEach(({ midi, label }) => {
        expect(getKeyLabel(midi)).toBe(label);
      });
    });
  });

  describe('Edge cases', () => {
    it('should return null for MIDI notes below C4 (< 48)', () => {
      expect(getKeyLabel(47)).toBe(null);
      expect(getKeyLabel(0)).toBe(null);
    });

    it('should return null for MIDI notes above G6 (> 79)', () => {
      expect(getKeyLabel(80)).toBe(null);
      expect(getKeyLabel(127)).toBe(null);
    });

    it('should return null for unmapped note in range (F#3 = 42)', () => {
      expect(getKeyLabel(42)).toBe(null);
    });

    it('should handle negative MIDI numbers', () => {
      expect(getKeyLabel(-1)).toBe(null);
      expect(getKeyLabel(-100)).toBe(null);
    });
  });
});

