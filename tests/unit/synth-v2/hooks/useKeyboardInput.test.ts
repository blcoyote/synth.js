/**
 * useKeyboardInput Hook Tests
 * 
 * Tests Danish keyboard layout mapping, key press/release tracking,
 * MIDI note number conversion, and getKeyLabel function
 */

// @ts-nocheck - vitest's vi.fn() type doesn't perfectly match hook's callback signature, but tests work correctly
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardInput, getKeyLabel } from '../../../../src/synth-v2/hooks/useKeyboardInput';

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
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      });
      
      expect(onNotePress).toHaveBeenCalledWith(25); // C#2
      expect(onNotePress).toHaveBeenCalledTimes(1);
    });

    it('should handle lowercase keys', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
      });
      
      expect(onNotePress).toHaveBeenCalledWith(26); // D2
    });

    it('should handle uppercase keys by converting to lowercase', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }));
      });
      
      expect(onNotePress).toHaveBeenCalledWith(25); // C#2
    });

    it('should prevent key repeat when held down', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      // Press key multiple times
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      });
      
      // Should only trigger once
      expect(onNotePress).toHaveBeenCalledTimes(1);
    });

    it('should not trigger for unmapped keys', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' })); // Not mapped
      });
      
      expect(onNotePress).not.toHaveBeenCalled();
    });
  });

  describe('Key release detection', () => {
    it('should trigger onNoteRelease when key is released', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
      });
      
      expect(onNoteRelease).toHaveBeenCalledWith(25); // C#2
      expect(onNoteRelease).toHaveBeenCalledTimes(1);
    });

    it('should only release keys that were pressed', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      // Release without press
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
      });
      
      expect(onNoteRelease).not.toHaveBeenCalled();
    });

    it('should handle multiple simultaneous key presses', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' })); // C#2 (25)
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' })); // D2 (26)
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })); // E2 (28)
      });
      
      expect(onNotePress).toHaveBeenCalledTimes(3);
      expect(onNotePress).toHaveBeenNthCalledWith(1, 25);
      expect(onNotePress).toHaveBeenNthCalledWith(2, 26);
      expect(onNotePress).toHaveBeenNthCalledWith(3, 28);
    });

    it('should release only specific keys', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        // Press three keys
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
        
        // Release middle key
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'z' }));
      });
      
      expect(onNoteRelease).toHaveBeenCalledTimes(1);
      expect(onNoteRelease).toHaveBeenCalledWith(26); // D2
    });
  });

  describe('Window blur handling', () => {
    it('should release all notes on window blur', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        // Press multiple keys
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
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
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
        window.dispatchEvent(new Event('blur'));
        
        // Press same key again
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
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

  describe('Danish keyboard layout mapping - C2 octave', () => {
    it('should map "<" to C2 (MIDI 24)', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '<' }));
      });
      
      expect(onNotePress).toHaveBeenCalledWith(24);
    });

    it('should map "a" to C#2 (MIDI 25)', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      });
      
      expect(onNotePress).toHaveBeenCalledWith(25);
    });

    it('should map all C2 octave keys correctly', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      const c2Keys = [
        { key: '<', midi: 24 }, // C2
        { key: 'a', midi: 25 }, // C#2
        { key: 'z', midi: 26 }, // D2
        { key: 's', midi: 27 }, // D#2
        { key: 'x', midi: 28 }, // E2
        { key: 'c', midi: 29 }, // F2
        { key: 'f', midi: 30 }, // F#2
        { key: 'v', midi: 31 }, // G2
        { key: 'g', midi: 32 }, // G#2
        { key: 'b', midi: 33 }, // A2
        { key: 'h', midi: 34 }, // A#2
        { key: 'n', midi: 35 }, // B2
      ];

      c2Keys.forEach(({ key, midi }) => {
        onNotePress.mockClear();
        act(() => {
          window.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });
        expect(onNotePress).toHaveBeenCalledWith(midi);
      });
    });
  });

  describe('Danish keyboard layout mapping - C3 octave', () => {
    it('should map "m" to C3 (MIDI 36)', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));
      });
      
      expect(onNotePress).toHaveBeenCalledWith(36);
    });

    it('should map partial C3 octave keys correctly', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      const c3Keys = [
        { key: 'm', midi: 36 }, // C3
        { key: 'k', midi: 37 }, // C#3
        { key: ',', midi: 38 }, // D3
        { key: 'l', midi: 39 }, // D#3
        { key: '.', midi: 40 }, // E3
        { key: '-', midi: 41 }, // F3
        // F#3 (MIDI 42) has no key mapping
      ];

      c3Keys.forEach(({ key, midi }) => {
        onNotePress.mockClear();
        act(() => {
          window.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });
        expect(onNotePress).toHaveBeenCalledWith(midi);
      });
    });

    it('should not have mapping for F#3 (MIDI 42)', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      // Try various keys that might be F#3 - none should work
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '7' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
      });
      
      expect(onNotePress).not.toHaveBeenCalled();
    });
  });

  describe('Danish keyboard layout mapping - G3 to C5', () => {
    it('should map "q" to G3 (MIDI 43)', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q' }));
      });
      
      expect(onNotePress).toHaveBeenCalledWith(43);
    });

    it('should map "å" to C5 (MIDI 60)', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'å' }));
      });
      
      expect(onNotePress).toHaveBeenCalledWith(60);
    });

    it('should map all upper row keys correctly', () => {
      renderHook(() => useKeyboardInput(onNotePress, onNoteRelease));
      
      const upperKeys = [
        { key: 'q', midi: 43 }, // G3
        { key: '2', midi: 44 }, // G#3
        { key: 'w', midi: 45 }, // A3
        { key: '3', midi: 46 }, // A#3
        { key: 'e', midi: 47 }, // B3
        { key: 'r', midi: 48 }, // C4
        { key: '5', midi: 49 }, // C#4
        { key: 't', midi: 50 }, // D4
        { key: '6', midi: 51 }, // D#4
        { key: 'y', midi: 52 }, // E4
        { key: 'u', midi: 53 }, // F4
        { key: '8', midi: 54 }, // F#4
        { key: 'i', midi: 55 }, // G4
        { key: '9', midi: 56 }, // G#4
        { key: 'o', midi: 57 }, // A4
        { key: '0', midi: 58 }, // A#4
        { key: 'p', midi: 59 }, // B4
        { key: 'å', midi: 60 }, // C5
      ];

      upperKeys.forEach(({ key, midi }) => {
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
  describe('C2 octave labels', () => {
    it('should return "<" for C2 (MIDI 24)', () => {
      expect(getKeyLabel(24)).toBe('<');
    });

    it('should return "A" for C#2 (MIDI 25)', () => {
      expect(getKeyLabel(25)).toBe('A');
    });

    it('should return correct labels for all C2 octave notes', () => {
      const c2Labels = [
        { midi: 24, label: '<' },  // C2
        { midi: 25, label: 'A' },  // C#2
        { midi: 26, label: 'Z' },  // D2
        { midi: 27, label: 'S' },  // D#2
        { midi: 28, label: 'X' },  // E2
        { midi: 29, label: 'C' },  // F2
        { midi: 30, label: 'F' },  // F#2
        { midi: 31, label: 'V' },  // G2
        { midi: 32, label: 'G' },  // G#2
        { midi: 33, label: 'B' },  // A2
        { midi: 34, label: 'H' },  // A#2
        { midi: 35, label: 'N' },  // B2
      ];

      c2Labels.forEach(({ midi, label }) => {
        expect(getKeyLabel(midi)).toBe(label);
      });
    });
  });

  describe('C3 octave labels', () => {
    it('should return "M" for C3 (MIDI 36)', () => {
      expect(getKeyLabel(36)).toBe('M');
    });

    it('should return correct labels for partial C3 octave', () => {
      const c3Labels = [
        { midi: 36, label: 'M' },  // C3
        { midi: 37, label: 'K' },  // C#3
        { midi: 38, label: ',' },  // D3
        { midi: 39, label: 'L' },  // D#3
        { midi: 40, label: '.' },  // E3
        { midi: 41, label: '-' },  // F3
      ];

      c3Labels.forEach(({ midi, label }) => {
        expect(getKeyLabel(midi)).toBe(label);
      });
    });

    it('should return null for F#3 (MIDI 42) - intentional gap', () => {
      expect(getKeyLabel(42)).toBe(null);
    });
  });

  describe('G3 to C5 labels', () => {
    it('should return "Q" for G3 (MIDI 43)', () => {
      expect(getKeyLabel(43)).toBe('Q');
    });

    it('should return "Å" for C5 (MIDI 60)', () => {
      expect(getKeyLabel(60)).toBe('Å');
    });

    it('should return correct labels for all upper row notes', () => {
      const upperLabels = [
        { midi: 43, label: 'Q' },  // G3
        { midi: 44, label: '2' },  // G#3
        { midi: 45, label: 'W' },  // A3
        { midi: 46, label: '3' },  // A#3
        { midi: 47, label: 'E' },  // B3
        { midi: 48, label: 'R' },  // C4
        { midi: 49, label: '5' },  // C#4
        { midi: 50, label: 'T' },  // D4
        { midi: 51, label: '6' },  // D#4
        { midi: 52, label: 'Y' },  // E4
        { midi: 53, label: 'U' },  // F4
        { midi: 54, label: '8' },  // F#4
        { midi: 55, label: 'I' },  // G4
        { midi: 56, label: '9' },  // G#4
        { midi: 57, label: 'O' },  // A4
        { midi: 58, label: '0' },  // A#4
        { midi: 59, label: 'P' },  // B4
        { midi: 60, label: 'Å' },  // C5
      ];

      upperLabels.forEach(({ midi, label }) => {
        expect(getKeyLabel(midi)).toBe(label);
      });
    });
  });

  describe('Edge cases', () => {
    it('should return null for MIDI notes below C2 (< 24)', () => {
      expect(getKeyLabel(23)).toBe(null);
      expect(getKeyLabel(0)).toBe(null);
    });

    it('should return null for MIDI notes above C5 (> 60)', () => {
      expect(getKeyLabel(61)).toBe(null);
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
