/**
 * SimpleKeyboard Component Tests
 * Tests keyboard rendering, note triggering, and user interaction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimpleKeyboard } from '../../../../src/synth-v2/components/SimpleKeyboard';
import { SynthProvider } from '../../../../src/synth-v2/context/SynthContext';

// Mock the synth engine and managers
const createMockEngine = () => {
  const mockVoiceManager = {
    playNote: vi.fn(),
    releaseNote: vi.fn(),
  };

  return {
    getVoiceManager: vi.fn(() => mockVoiceManager),
    voiceManager: mockVoiceManager,
  };
};

describe('SimpleKeyboard', () => {
  let mockEngine: ReturnType<typeof createMockEngine>;

  beforeEach(() => {
    mockEngine = createMockEngine();
  });

  const renderKeyboard = (props: { startOctave?: number; octaves?: number } = {}) => {
    return render(
      <SynthProvider engine={mockEngine as any}>
        <SimpleKeyboard {...props} />
      </SynthProvider>
    );
  };

  describe('Rendering', () => {
    it('should render keyboard container', () => {
      const { container } = renderKeyboard();
      
      const keyboard = container.querySelector('.keyboard-container');
      expect(keyboard).toBeInTheDocument();
    });

    it('should render default 2 octaves starting from octave 3', () => {
      renderKeyboard();
      
      // 2 octaves = 24 keys
      const keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(24);
    });

    it('should render custom number of octaves', () => {
      renderKeyboard({ octaves: 3 });
      
      // 3 octaves = 36 keys
      const keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(36);
    });

    it('should render starting from custom octave', () => {
      renderKeyboard({ startOctave: 4 });
      
      // Should start with C4
      expect(screen.getByText('C4')).toBeInTheDocument();
    });

    it('should render all keys with correct labels', () => {
      renderKeyboard({ startOctave: 3, octaves: 1 });
      
      // One octave should have all 12 notes
      const expectedNotes = ['C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3'];
      
      expectedNotes.forEach(note => {
        expect(screen.getByText(note)).toBeInTheDocument();
      });
    });

    it('should distinguish white and black keys', () => {
      const { container } = renderKeyboard({ octaves: 1 });
      
      const whiteKeys = container.querySelectorAll('.white-key');
      const blackKeys = container.querySelectorAll('.black-key');
      
      expect(whiteKeys.length).toBe(7); // C, D, E, F, G, A, B
      expect(blackKeys.length).toBe(5); // C#, D#, F#, G#, A#
    });

    it('should render keys across multiple octaves correctly', () => {
      renderKeyboard({ startOctave: 3, octaves: 2 });
      
      // Should have both octave 3 and octave 4
      expect(screen.getByText('C3')).toBeInTheDocument();
      expect(screen.getByText('C4')).toBeInTheDocument();
      expect(screen.getByText('B3')).toBeInTheDocument();
      expect(screen.getByText('B4')).toBeInTheDocument();
    });
  });

  describe('Note Calculation', () => {
    it('should calculate correct note indices for octave 3', () => {
      renderKeyboard({ startOctave: 3, octaves: 1 });
      
      const firstKey = screen.getByText('C3').closest('button')!;
      fireEvent.mouseDown(firstKey);
      
      // C3 is note index 36 (octave 3 * 12 notes)
      expect(mockEngine.voiceManager.playNote).toHaveBeenCalledWith(36, 0.8);
    });

    it('should calculate correct note indices for octave 4', () => {
      renderKeyboard({ startOctave: 4, octaves: 1 });
      
      const firstKey = screen.getByText('C4').closest('button')!;
      fireEvent.mouseDown(firstKey);
      
      // C4 is note index 48 (octave 4 * 12 notes)
      expect(mockEngine.voiceManager.playNote).toHaveBeenCalledWith(48, 0.8);
    });

    it('should calculate correct indices for black keys', () => {
      renderKeyboard({ startOctave: 3, octaves: 1 });
      
      const cSharpKey = screen.getByText('C#3').closest('button')!;
      fireEvent.mouseDown(cSharpKey);
      
      // C#3 is note index 37 (C3 + 1)
      expect(mockEngine.voiceManager.playNote).toHaveBeenCalledWith(37, 0.8);
    });
  });

  describe('Mouse Interaction', () => {
    it('should play note on mouse down', () => {
      renderKeyboard();
      
      const firstKey = screen.getAllByRole('button')[0];
      fireEvent.mouseDown(firstKey);
      
      expect(mockEngine.voiceManager.playNote).toHaveBeenCalledTimes(1);
      expect(mockEngine.voiceManager.playNote).toHaveBeenCalledWith(
        expect.any(Number),
        0.8
      );
    });

    it('should release note on mouse up', () => {
      renderKeyboard();
      
      const firstKey = screen.getAllByRole('button')[0];
      fireEvent.mouseDown(firstKey);
      fireEvent.mouseUp(firstKey);
      
      expect(mockEngine.voiceManager.releaseNote).toHaveBeenCalledTimes(1);
    });

    it('should release note on mouse leave', () => {
      renderKeyboard();
      
      const firstKey = screen.getAllByRole('button')[0];
      fireEvent.mouseDown(firstKey);
      fireEvent.mouseLeave(firstKey);
      
      expect(mockEngine.voiceManager.releaseNote).toHaveBeenCalledTimes(1);
    });

    it('should use velocity of 0.8 for all notes', () => {
      renderKeyboard();
      
      const keys = screen.getAllByRole('button');
      fireEvent.mouseDown(keys[0]);
      fireEvent.mouseDown(keys[5]);
      fireEvent.mouseDown(keys[10]);
      
      expect(mockEngine.voiceManager.playNote).toHaveBeenCalledWith(expect.any(Number), 0.8);
      expect(mockEngine.voiceManager.playNote).toHaveBeenCalledWith(expect.any(Number), 0.8);
      expect(mockEngine.voiceManager.playNote).toHaveBeenCalledWith(expect.any(Number), 0.8);
    });

    it('should pass same note index to playNote and releaseNote', () => {
      renderKeyboard({ startOctave: 3, octaves: 1 });
      
      const cKey = screen.getByText('C3').closest('button')!;
      fireEvent.mouseDown(cKey);
      fireEvent.mouseUp(cKey);
      
      const playCallArgs = mockEngine.voiceManager.playNote.mock.calls[0];
      const releaseCallArgs = mockEngine.voiceManager.releaseNote.mock.calls[0];
      
      expect(playCallArgs[0]).toBe(releaseCallArgs[0]); // Same note index
    });
  });

  describe('Multiple Keys', () => {
    it('should handle multiple simultaneous key presses', () => {
      renderKeyboard();
      
      const keys = screen.getAllByRole('button');
      
      fireEvent.mouseDown(keys[0]); // C
      fireEvent.mouseDown(keys[4]); // E
      fireEvent.mouseDown(keys[7]); // G
      
      expect(mockEngine.voiceManager.playNote).toHaveBeenCalledTimes(3);
    });

    it('should release only the key being released', () => {
      renderKeyboard();
      
      const keys = screen.getAllByRole('button');
      
      fireEvent.mouseDown(keys[0]);
      fireEvent.mouseDown(keys[1]);
      fireEvent.mouseUp(keys[0]);
      
      expect(mockEngine.voiceManager.releaseNote).toHaveBeenCalledTimes(1);
      expect(mockEngine.voiceManager.playNote).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid key presses', () => {
      renderKeyboard();
      
      const key = screen.getAllByRole('button')[0];
      
      fireEvent.mouseDown(key);
      fireEvent.mouseUp(key);
      fireEvent.mouseDown(key);
      fireEvent.mouseUp(key);
      fireEvent.mouseDown(key);
      
      expect(mockEngine.voiceManager.playNote).toHaveBeenCalledTimes(3);
      expect(mockEngine.voiceManager.releaseNote).toHaveBeenCalledTimes(2);
    });
  });

  describe('Key Styling', () => {
    it('should apply white-key class to natural notes', () => {
      const { container } = renderKeyboard({ octaves: 1 });
      
      const whiteKeys = container.querySelectorAll('.white-key');
      
      // C, D, E, F, G, A, B = 7 white keys
      expect(whiteKeys).toHaveLength(7);
    });

    it('should apply black-key class to sharp notes', () => {
      const { container } = renderKeyboard({ octaves: 1 });
      
      const blackKeys = container.querySelectorAll('.black-key');
      
      // C#, D#, F#, G#, A# = 5 black keys
      expect(blackKeys).toHaveLength(5);
    });

    it('should have key-label class on note labels', () => {
      const { container } = renderKeyboard({ octaves: 1 });
      
      const labels = container.querySelectorAll('.key-label');
      
      // Should have 2 labels per key (computer-key and note-name)
      // 1 octave = 12 keys × 2 labels = 24 labels
      expect(labels).toHaveLength(24);
    });
  });

  describe('Edge Cases', () => {
    it('should handle octave boundaries correctly', () => {
      renderKeyboard({ startOctave: 3, octaves: 2 });
      
      // Last note of octave 3
      const b3 = screen.getByText('B3').closest('button')!;
      fireEvent.mouseDown(b3);
      
      // First note of octave 4
      const c4 = screen.getByText('C4').closest('button')!;
      fireEvent.mouseDown(c4);
      
      const playedIndices = mockEngine.voiceManager.playNote.mock.calls.map(call => call[0]);
      
      // B3 and C4 should be consecutive indices
      expect(playedIndices[1] - playedIndices[0]).toBe(1);
    });

    it('should handle single octave', () => {
      renderKeyboard({ octaves: 1 });
      
      const keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(12);
    });

    it('should handle large octave range', () => {
      renderKeyboard({ octaves: 5 });
      
      const keys = screen.getAllByRole('button');
      expect(keys).toHaveLength(60); // 5 octaves * 12 keys
    });

    it('should handle high octave numbers', () => {
      renderKeyboard({ startOctave: 7, octaves: 1 });
      
      expect(screen.getByText('C7')).toBeInTheDocument();
      expect(screen.getByText('B7')).toBeInTheDocument();
    });
  });

  describe('Context Integration', () => {
    it('should throw error when used outside SynthProvider', () => {
      // Suppress console error for this test
      vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<SimpleKeyboard />);
      }).toThrow('useSynthEngine must be used within a SynthProvider');
    });

    it('should access voice manager from synth engine', () => {
      renderKeyboard();
      
      expect(mockEngine.getVoiceManager).toHaveBeenCalled();
    });
  });
});
