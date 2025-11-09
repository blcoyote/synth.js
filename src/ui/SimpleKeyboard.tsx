/**
 * SimpleKeyboard - Virtual keyboard with computer keyboard support
 * Allows clicking keys or using QWERTY keyboard to play notes
 */

import { useState, useCallback } from "react";
import { useSynthEngine } from "../context/SynthContext";
import { useKeyboardInput, getKeyLabel } from "../hooks/useKeyboardInput";

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface KeyboardProps {
  startOctave?: number;
  octaves?: number;
  extraKeys?: number; // Add extra keys beyond full octaves (e.g., 1 for C2-C5)
}

export function SimpleKeyboard({ startOctave = 3, octaves = 2, extraKeys = 0 }: KeyboardProps) {
  const { engine } = useSynthEngine();
  
  // Track which keys are currently pressed
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());

  const handleNoteOn = useCallback((noteIndex: number) => {
    if (!engine.isReady()) return;
    setActiveKeys((prev) => new Set(prev).add(noteIndex));
    // Routes through arpeggiator if enabled, or directly to voiceManager if not
    engine.playNote(noteIndex, 0.8);
  }, [engine]);

  const handleNoteOff = useCallback((noteIndex: number) => {
    if (!engine.isReady()) return;
    setActiveKeys((prev) => {
      const next = new Set(prev);
      next.delete(noteIndex);
      return next;
    });
    // Routes through arpeggiator if enabled, or directly to voiceManager if not
    engine.releaseNote(noteIndex);
  }, [engine]);

  // Generate keys for the specified octaves + extra keys
  const keys = [];
  // MIDI note numbering: C4 (middle C) = 60, so C0 = 12, C1 = 24, C2 = 36, C3 = 48, etc.
  const startNote = (startOctave + 1) * 12; // MIDI note for C of start octave
  
  // Enable computer keyboard input with correct startNote offset
  useKeyboardInput(handleNoteOn, handleNoteOff, true, startNote);
  const totalKeys = (octaves * 12) + extraKeys;

  for (let i = 0; i < totalKeys; i++) {
    const noteIndex = startNote + i;
    const noteName = NOTE_NAMES[i % 12];
    const octaveNum = startOctave + Math.floor(i / 12);
    const isBlackKey = noteName.includes('#');
    const keyLabel = getKeyLabel(noteIndex, startNote); // Pass startNote for relative calculation

    keys.push({
      noteIndex,
      noteName: `${noteName}${octaveNum}`,
      isBlackKey,
      keyLabel,
    });
  }

  return (
    <div className="keyboard-container">
      <div className="keyboard">
        {keys.map((key) => (
          <button
            key={key.noteIndex}
            className={`key ${key.isBlackKey ? 'black-key' : 'white-key'} ${activeKeys.has(key.noteIndex) ? 'active' : ''}`}
            onMouseDown={() => handleNoteOn(key.noteIndex)}
            onMouseUp={() => handleNoteOff(key.noteIndex)}
            onMouseLeave={() => handleNoteOff(key.noteIndex)}
          >
            <span className="key-label computer-key">{key.keyLabel || '\u00A0'}</span>
            <span className="key-label note-name">{key.noteName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}


