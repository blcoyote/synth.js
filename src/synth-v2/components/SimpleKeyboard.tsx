/**
 * SimpleKeyboard - Basic virtual keyboard for testing
 * Allows clicking keys to play notes
 */

import { useSynthEngine } from "../context/SynthContext";



const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface KeyboardProps {
  startOctave?: number;
  octaves?: number;
}

export function SimpleKeyboard({ startOctave = 3, octaves = 2 }: KeyboardProps) {
  const { engine } = useSynthEngine();
  const voiceManager = engine.getVoiceManager();

  const handleNoteOn = (noteIndex: number) => {
    voiceManager.playNote(noteIndex, 0.8);
  };

  const handleNoteOff = (noteIndex: number) => {
    voiceManager.releaseNote(noteIndex);
  };

  // Generate keys for the specified octaves
  const keys = [];
  const startNote = startOctave * 12; // C of start octave
  const totalKeys = octaves * 12;

  for (let i = 0; i < totalKeys; i++) {
    const noteIndex = startNote + i;
    const noteName = NOTE_NAMES[i % 12];
    const octaveNum = startOctave + Math.floor(i / 12);
    const isBlackKey = noteName.includes('#');

    keys.push({
      noteIndex,
      noteName: `${noteName}${octaveNum}`,
      isBlackKey,
    });
  }

  return (
    <div className="keyboard-container">
      <div className="keyboard">
        {keys.map((key) => (
          <button
            key={key.noteIndex}
            className={`key ${key.isBlackKey ? 'black-key' : 'white-key'}`}
            onMouseDown={() => handleNoteOn(key.noteIndex)}
            onMouseUp={() => handleNoteOff(key.noteIndex)}
            onMouseLeave={() => handleNoteOff(key.noteIndex)}
          >
            <span className="key-label">{key.noteName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
