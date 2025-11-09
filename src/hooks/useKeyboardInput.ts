import { useEffect, useRef } from 'react';

/**
 * Custom hook for computer keyboard input
 * Maps QWERTY keys to piano notes
 */
export function useKeyboardInput(
  onNotePress: (noteIndex: number) => void,
  onNoteRelease: (noteIndex: number) => void,
  enabled: boolean = true,
  startNote: number = 36 // Default to C2 (MIDI 36) to match keyboard default startOctave=2
) {
  const pressedKeys = useRef<Set<string>>(new Set());
  
  // Stable references to callbacks
  const onNotePressRef = useRef(onNotePress);
  const onNoteReleaseRef = useRef(onNoteRelease);
  
  useEffect(() => {
    onNotePressRef.current = onNotePress;
    onNoteReleaseRef.current = onNoteRelease;
  }, [onNotePress, onNoteRelease]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      // Prevent repeating when key is held
      if (pressedKeys.current.has(key)) return;
      
      const relativeIndex = getKeyMapping(key);
      if (relativeIndex !== null) {
        pressedKeys.current.add(key);
        onNotePressRef.current(startNote + relativeIndex);
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      if (pressedKeys.current.has(key)) {
        pressedKeys.current.delete(key);
        const relativeIndex = getKeyMapping(key);
        if (relativeIndex !== null) {
          onNoteReleaseRef.current(startNote + relativeIndex);
          e.preventDefault();
        }
      }
    };

    // Cleanup on window blur (release all notes)
    const handleBlur = () => {
      pressedKeys.current.forEach((key) => {
        const relativeIndex = getKeyMapping(key);
        if (relativeIndex !== null) {
          onNoteReleaseRef.current(startNote + relativeIndex);
        }
      });
      pressedKeys.current.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [onNotePress, onNoteRelease, enabled, startNote]);
}

/**
 * Map computer keyboard keys to RELATIVE note indices (0-36)
 * Piano-style layout: Z=C (white keys), S=C# (black keys)
 * Two octaves across two keyboard rows
 * Standard US keyboard layout
 * These are RELATIVE indices that get added to the keyboard's startNote
 */
function getKeyMapping(key: string): number | null {
  const keyMap: Record<string, number> = {
    // First octave - Bottom row (ZXCVBNM,./;')
    'z': 0,   // C
    's': 1,   // C#
    'x': 2,   // D
    'd': 3,   // D#
    'c': 4,   // E
    'v': 5,   // F
    'g': 6,   // F#
    'b': 7,   // G
    'h': 8,   // G#
    'n': 9,   // A
    'j': 10,  // A#
    'm': 11,  // B
    ',': 12,  // C (octave up)
    'l': 13,  // C#
    '.': 14,  // D
    ';': 15,  // D#
    '/': 16,  // E
    "'": 17,  // F
    
    // Second octave - Top row (QWERTYUIOP[])
    'q': 12,  // C
    '2': 13,  // C#
    'w': 14,  // D
    '3': 15,  // D#
    'e': 16,  // E
    'r': 17,  // F
    '5': 18,  // F#
    't': 19,  // G
    '6': 20,  // G#
    'y': 21,  // A
    '7': 22,  // A#
    'u': 23,  // B
    'i': 24,  // C (octave up)
    '9': 25,  // C#
    'o': 26,  // D
    '0': 27,  // D#
    'p': 28,  // E
    '[': 29,  // F
    '=': 30,  // F#
    ']': 31,  // G
  };

  return keyMap[key] ?? null;
}

/**
 * Get the keyboard key label for an absolute MIDI note
 * Needs to know the startNote to calculate relative position
 * Danish keyboard layout
 */
export function getKeyLabel(noteIndex: number, startNote: number = 48): string | null {
  // Calculate relative position from keyboard start
  const relativeIndex = noteIndex - startNote;
  
  // Map relative indices to keyboard labels (US layout)
  const labelMap: Record<number, string> = {
    // First octave - Bottom row
    0: 'Z', 1: 'S', 2: 'X', 3: 'D', 4: 'C', 5: 'V',
    6: 'G', 7: 'B', 8: 'H', 9: 'N', 10: 'J', 11: 'M',
    12: ',', 13: 'L', 14: '.', 15: ';', 16: '/', 17: "'",
    
    // Second octave - Top row (overlaps with first octave C)
    // Note: 12-17 overlap with bottom row
    18: '5', 19: 'T', 20: '6', 21: 'Y', 22: '7',
    23: 'U', 24: 'I', 25: '9', 26: 'O', 27: '0', 28: 'P',
    29: '[', 30: '=', 31: ']'
  };
  
  return labelMap[relativeIndex] ?? null;
}
