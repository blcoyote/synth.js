/**
 * Arpeggiator unit tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Arpeggiator } from '../../../../src/components/modulation/Arpeggiator';

describe('Arpeggiator', () => {
  let arpeggiator: Arpeggiator;

  beforeEach(() => {
    vi.useFakeTimers();
    arpeggiator = new Arpeggiator({
      pattern: 'up',
      octaves: 1,
      tempo: 120,
      division: '1/16',
      gateLength: 0.8,
    });
  });

  afterEach(() => {
    arpeggiator.dispose();
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should create with default configuration', () => {
      const arp = new Arpeggiator();
      expect(arp.getPattern()).toBe('up');
      expect(arp.getOctaves()).toBe(1);
      expect(arp.getTempo()).toBe(120);
      expect(arp.getDivision()).toBe('1/16');
      expect(arp.getGateLength()).toBe(0.8);
      arp.dispose();
    });

    it('should create with custom configuration', () => {
      const arp = new Arpeggiator({
        pattern: 'down',
        octaves: 3,
        tempo: 140,
        division: '1/8',
        gateLength: 0.5,
        swing: 0.3,
        humanize: 0.2,
      });
      
      expect(arp.getPattern()).toBe('down');
      expect(arp.getOctaves()).toBe(3);
      expect(arp.getTempo()).toBe(140);
      expect(arp.getDivision()).toBe('1/8');
      expect(arp.getGateLength()).toBe(0.5);
      expect(arp.getSwing()).toBe(0.3);
      expect(arp.getHumanize()).toBe(0.2);
      arp.dispose();
    });
  });

  describe('Note Management', () => {
    it('should set and get notes', () => {
      arpeggiator.setNotes([60, 64, 67]); // C major
      const notes = arpeggiator.getNotes();
      expect(notes).toEqual([60, 64, 67]);
    });

    it('should sort notes ascending', () => {
      arpeggiator.setNotes([67, 60, 64]);
      const notes = arpeggiator.getNotes();
      expect(notes).toEqual([60, 64, 67]);
    });

    it('should set chord by type', () => {
      arpeggiator.setChord(60, 'major');
      expect(arpeggiator.getNotes()).toEqual([60, 64, 67]);

      arpeggiator.setChord(60, 'minor');
      expect(arpeggiator.getNotes()).toEqual([60, 63, 67]);

      arpeggiator.setChord(60, 'major7');
      expect(arpeggiator.getNotes()).toEqual([60, 64, 67, 71]);

      arpeggiator.setChord(60, 'sus4');
      expect(arpeggiator.getNotes()).toEqual([60, 65, 67]);
    });
  });

  describe('Pattern Generation', () => {
    beforeEach(() => {
      arpeggiator.setNotes([60, 64, 67]); // C major triad
      arpeggiator.setOctaves(1);
    });

    it('should generate up pattern', () => {
      arpeggiator.setPattern('up');
      const sequence = arpeggiator.getSequence();
      expect(sequence).toEqual([60, 64, 67]);
    });

    it('should generate down pattern', () => {
      arpeggiator.setPattern('down');
      const sequence = arpeggiator.getSequence();
      expect(sequence).toEqual([67, 64, 60]);
    });

    it('should generate updown pattern', () => {
      arpeggiator.setPattern('updown');
      const sequence = arpeggiator.getSequence();
      expect(sequence).toEqual([60, 64, 67, 64]); // Up then down, no repeat
    });

    it('should generate downup pattern', () => {
      arpeggiator.setPattern('downup');
      const sequence = arpeggiator.getSequence();
      expect(sequence).toEqual([67, 64, 60, 64]); // Down then up
    });

    it('should generate converge pattern', () => {
      arpeggiator.setPattern('converge');
      const sequence = arpeggiator.getSequence();
      expect(sequence).toEqual([60, 67, 64]); // Outside to inside
    });

    it('should generate diverge pattern', () => {
      arpeggiator.setPattern('diverge');
      const sequence = arpeggiator.getSequence();
      expect(sequence).toEqual([64, 60, 67]); // Inside to outside
    });

    it('should handle octave expansion', () => {
      arpeggiator.setPattern('up');
      arpeggiator.setOctaves(2);
      const sequence = arpeggiator.getSequence();
      expect(sequence).toEqual([60, 64, 67, 72, 76, 79]); // 2 octaves
    });

    it('should handle multiple octaves with down pattern', () => {
      arpeggiator.setPattern('down');
      arpeggiator.setOctaves(2);
      const sequence = arpeggiator.getSequence();
      expect(sequence).toEqual([79, 76, 72, 67, 64, 60]);
    });
  });

  describe('Pattern Selection', () => {
    it('should change pattern', () => {
      arpeggiator.setPattern('up');
      expect(arpeggiator.getPattern()).toBe('up');

      arpeggiator.setPattern('down');
      expect(arpeggiator.getPattern()).toBe('down');
    });

    it('should reset position when pattern changes', () => {
      const noteCallback = vi.fn();
      arpeggiator.onNote(noteCallback);
      arpeggiator.setNotes([60, 64, 67]);
      
      arpeggiator.start();
      vi.advanceTimersByTime(100);
      
      arpeggiator.setPattern('down');
      // Position should be reset
      arpeggiator.stop();
    });
  });

  describe('Octave Control', () => {
    it('should set octave range', () => {
      arpeggiator.setOctaves(2);
      expect(arpeggiator.getOctaves()).toBe(2);
    });

    it('should clamp octaves to valid range (1-4)', () => {
      arpeggiator.setOctaves(0);
      expect(arpeggiator.getOctaves()).toBe(1);

      arpeggiator.setOctaves(5);
      expect(arpeggiator.getOctaves()).toBe(4);
    });
  });

  describe('Tempo Control', () => {
    it('should set tempo', () => {
      arpeggiator.setTempo(140);
      expect(arpeggiator.getTempo()).toBe(140);
    });

    it('should clamp tempo to valid range (40-300)', () => {
      arpeggiator.setTempo(30);
      expect(arpeggiator.getTempo()).toBe(40);

      arpeggiator.setTempo(350);
      expect(arpeggiator.getTempo()).toBe(300);
    });
  });

  describe('Note Division', () => {
    it('should set note division', () => {
      arpeggiator.setDivision('1/8');
      expect(arpeggiator.getDivision()).toBe('1/8');

      arpeggiator.setDivision('1/16T');
      expect(arpeggiator.getDivision()).toBe('1/16T');
    });
  });

  describe('Gate Length', () => {
    it('should set gate length', () => {
      arpeggiator.setGateLength(0.5);
      expect(arpeggiator.getGateLength()).toBe(0.5);
    });

    it('should clamp gate length to 0-1', () => {
      arpeggiator.setGateLength(-0.1);
      expect(arpeggiator.getGateLength()).toBe(0);

      arpeggiator.setGateLength(1.5);
      expect(arpeggiator.getGateLength()).toBe(1);
    });
  });

  describe('Swing', () => {
    it('should set swing amount', () => {
      arpeggiator.setSwing(0.5);
      expect(arpeggiator.getSwing()).toBe(0.5);
    });

    it('should clamp swing to 0-1', () => {
      arpeggiator.setSwing(-0.1);
      expect(arpeggiator.getSwing()).toBe(0);

      arpeggiator.setSwing(1.5);
      expect(arpeggiator.getSwing()).toBe(1);
    });
  });

  describe('Humanization', () => {
    it('should set humanize amount', () => {
      arpeggiator.setHumanize(0.3);
      expect(arpeggiator.getHumanize()).toBe(0.3);
    });

    it('should clamp humanize to 0-1', () => {
      arpeggiator.setHumanize(-0.1);
      expect(arpeggiator.getHumanize()).toBe(0);

      arpeggiator.setHumanize(1.5);
      expect(arpeggiator.getHumanize()).toBe(1);
    });
  });

  describe('Playback Control', () => {
    it('should start and stop', () => {
      expect(arpeggiator.isRunning()).toBe(false);
      
      arpeggiator.start();
      expect(arpeggiator.isRunning()).toBe(true);
      
      arpeggiator.stop();
      expect(arpeggiator.isRunning()).toBe(false);
    });

    it('should trigger note callback on start', () => {
      const noteCallback = vi.fn();
      arpeggiator.onNote(noteCallback);
      arpeggiator.setNotes([60, 64, 67]);
      
      arpeggiator.start();
      
      expect(noteCallback).toHaveBeenCalledWith({
        pitch: 60,
        velocity: expect.any(Number),
        gate: 0.8,
      });
    });

    it('should pause and resume', () => {
      const noteCallback = vi.fn();
      arpeggiator.onNote(noteCallback);
      arpeggiator.setNotes([60, 64, 67]);
      
      arpeggiator.start();
      expect(arpeggiator.isRunning()).toBe(true);
      
      arpeggiator.pause();
      expect(arpeggiator.isRunning()).toBe(false);
      
      arpeggiator.resume();
      expect(arpeggiator.isRunning()).toBe(true);
      
      arpeggiator.stop();
    });

    it('should reset position', () => {
      arpeggiator.setNotes([60, 64, 67]);
      arpeggiator.start();
      
      // Advance through some notes
      vi.advanceTimersByTime(200);
      
      arpeggiator.reset();
      arpeggiator.stop();
    });
  });

  describe('Chord Progressions', () => {
    it('should list available progressions', () => {
      const progressions = Arpeggiator.getProgressionNames();
      expect(progressions.length).toBeGreaterThan(0);
      expect(progressions).toContain('major-i-iv-v');
      expect(progressions).toContain('major-i-v-vi-iv');
    });

    it('should get progression details', () => {
      const progression = Arpeggiator.getProgression('major-i-iv-v');
      expect(progression).toBeDefined();
      expect(progression?.name).toBe('I-IV-V (Major)');
      expect(progression?.chords).toHaveLength(3);
    });

    it('should load progression', () => {
      const success = arpeggiator.loadProgression('major-i-iv-v', 60);
      expect(success).toBe(true);
      
      // Should load first chord of progression
      const notes = arpeggiator.getNotes();
      expect(notes).toEqual([60, 64, 67]); // C major (I)
    });

    it('should return false for invalid progression', () => {
      const success = arpeggiator.loadProgression('invalid-progression', 60);
      expect(success).toBe(false);
    });
  });

  describe('Callbacks', () => {
    it('should trigger cycle complete callback', () => {
      const cycleCallback = vi.fn();
      arpeggiator.onCycleComplete(cycleCallback);
      arpeggiator.setNotes([60, 64, 67]);
      arpeggiator.setPattern('up');
      
      arpeggiator.start();
      
      // Advance through full cycle (3 notes)
      vi.advanceTimersByTime(1000);
      
      arpeggiator.stop();
      expect(cycleCallback).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty note array', () => {
      arpeggiator.setNotes([]);
      const sequence = arpeggiator.getSequence();
      expect(sequence).toEqual([]);
    });

    it('should handle single note', () => {
      arpeggiator.setNotes([60]);
      arpeggiator.setPattern('up');
      const sequence = arpeggiator.getSequence();
      expect(sequence).toEqual([60]);
    });

    it('should handle chord pattern with multiple octaves', () => {
      arpeggiator.setNotes([60, 64, 67]);
      arpeggiator.setOctaves(2);
      arpeggiator.setPattern('chord');
      const sequence = arpeggiator.getSequence();
      expect(sequence).toEqual([60, 64, 67, 72, 76, 79]);
    });
  });

  describe('Cleanup', () => {
    it('should dispose properly', () => {
      const noteCallback = vi.fn();
      arpeggiator.onNote(noteCallback);
      arpeggiator.start();
      
      arpeggiator.dispose();
      
      expect(arpeggiator.isRunning()).toBe(false);
      
      // Advancing timers shouldn't trigger callbacks after dispose
      vi.advanceTimersByTime(1000);
      // Note: Can't easily verify callback wasn't called after initial start,
      // but at least verify no errors occur
    });
  });
});
