/**
 * SimpleKeyboard - Virtual keyboard with computer keyboard support
 * Allows clicking keys or using QWERTY keyboard to play notes
 */

import { useState } from "react";
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
  
  // Safely get manager (will be null before initialization)
  let voiceManager;
  try {
    voiceManager = engine.getVoiceManager();
  } catch {
    voiceManager = null;
  }
  
  // Track which keys are currently pressed
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());

  const handleNoteOn = (noteIndex: number) => {
    if (!voiceManager) return;
    setActiveKeys((prev) => new Set(prev).add(noteIndex));
    voiceManager.playNote(noteIndex, 0.8);
  };

  const handleNoteOff = (noteIndex: number) => {
    if (!voiceManager) return;
    setActiveKeys((prev) => {
      const next = new Set(prev);
      next.delete(noteIndex);
      return next;
    });
    voiceManager.releaseNote(noteIndex);
  };

  // Enable computer keyboard input
  useKeyboardInput(handleNoteOn, handleNoteOff, true);

  // Generate keys for the specified octaves + extra keys
  const keys = [];
  const startNote = startOctave * 12; // C of start octave
  const totalKeys = (octaves * 12) + extraKeys;

  for (let i = 0; i < totalKeys; i++) {
    const noteIndex = startNote + i;
    const noteName = NOTE_NAMES[i % 12];
    const octaveNum = startOctave + Math.floor(i / 12);
    const isBlackKey = noteName.includes('#');
    const keyLabel = getKeyLabel(noteIndex); // Use absolute noteIndex, not relative i

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
