import { useEffect, useRef } from 'react';

/**
 * Custom hook for computer keyboard input
 * Maps QWERTY keys to piano notes
 */
export function useKeyboardInput(
  onNotePress: (noteIndex: number) => void,
  onNoteRelease: (noteIndex: number) => void,
  enabled: boolean = true
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
      
      const noteIndex = getKeyMapping(key);
      if (noteIndex !== null) {
        pressedKeys.current.add(key);
        onNotePressRef.current(noteIndex);
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      if (pressedKeys.current.has(key)) {
        pressedKeys.current.delete(key);
        const noteIndex = getKeyMapping(key);
        if (noteIndex !== null) {
          onNoteReleaseRef.current(noteIndex);
          e.preventDefault();
        }
      }
    };

    // Cleanup on window blur (release all notes)
    const handleBlur = () => {
      pressedKeys.current.forEach((key) => {
        const noteIndex = getKeyMapping(key);
        if (noteIndex !== null) {
          onNoteReleaseRef.current(noteIndex);
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
  }, [onNotePress, onNoteRelease, enabled]);
}

/**
 * Map computer keyboard keys to note indices (MIDI note numbers)
 * Danish keyboard layout matching V1 synth
 * Complete mapping for C2 (MIDI 24) to C5 (MIDI 60) = 37 keys
 */
function getKeyMapping(key: string): number | null {
  const keyMap: Record<string, number> = {
    // C2 octave (MIDI 24-35) - Bottom row
    '<': 24,  // C2
    'a': 25,  // C#2
    'z': 26,  // D2
    's': 27,  // D#2
    'x': 28,  // E2
    'c': 29,  // F2
    'f': 30,  // F#2
    'v': 31,  // G2
    'g': 32,  // G#2
    'b': 33,  // A2
    'h': 34,  // A#2
    'n': 35,  // B2
    
    // C3 octave (MIDI 36-47) - Bottom row continues
    'm': 36,  // C3
    'k': 37,  // C#3
    ',': 38,  // D3
    'l': 39,  // D#3
    '.': 40,  // E3
    '-': 41,  // F3
    // F#3 has no key (null in V1)
    
    // G3 to C5 (MIDI 43-60) - Top letter/number row
    'q': 43,  // G3
    '2': 44,  // G#3
    'w': 45,  // A3
    '3': 46,  // A#3
    'e': 47,  // B3
    'r': 48,  // C4
    '5': 49,  // C#4
    't': 50,  // D4
    '6': 51,  // D#4
    'y': 52,  // E4
    'u': 53,  // F4
    '8': 54,  // F#4
    'i': 55,  // G4
    '9': 56,  // G#4
    'o': 57,  // A4
    '0': 58,  // A#4
    'p': 59,  // B4
    'å': 60,  // C5
  };

  return keyMap[key] ?? null;
}

/**
 * Get the keyboard key label for a MIDI note number (C2=24 to C5=60)
 * Returns the PC keyboard key that triggers this note (Danish layout)
 */
export function getKeyLabel(noteIndex: number): string | null {
  // Map MIDI note numbers to Danish keyboard labels
  const labelMap: Record<number, string> = {
    // C2 octave (24-35)
    24: '<', 25: 'A', 26: 'Z', 27: 'S', 28: 'X', 29: 'C',
    30: 'F', 31: 'V', 32: 'G', 33: 'B', 34: 'H', 35: 'N',
    // C3 octave (36-41, F#3 missing)
    36: 'M', 37: 'K', 38: ',', 39: 'L', 40: '.', 41: '-',
    // G3 to C5 (43-60)
    43: 'Q', 44: '2', 45: 'W', 46: '3', 47: 'E', 48: 'R',
    49: '5', 50: 'T', 51: '6', 52: 'Y', 53: 'U', 54: '8',
    55: 'I', 56: '9', 57: 'O', 58: '0', 59: 'P', 60: 'Å'
  };
  
  return labelMap[noteIndex] ?? null;
}
