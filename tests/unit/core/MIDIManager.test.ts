/**
 * MIDIManager unit tests
 *
 * Tests note routing, sustain pedal deferral, channel filtering,
 * and device change callbacks. Uses mocked Web MIDI API.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MIDIManager } from '../../../src/core/MIDIManager';

// ── Mock Web MIDI API ────────────────────────────────────────────────

interface MockMIDIInput {
  id: string;
  name: string;
  manufacturer: string;
  onmidimessage: ((event: MIDIMessageEvent) => void) | null;
  simulateMessage: (data: Uint8Array) => void;
}

function createMockInput(id: string, name: string): MockMIDIInput {
  const input: MockMIDIInput = {
    id,
    name,
    manufacturer: 'TestCo',
    onmidimessage: null,
    simulateMessage(data: Uint8Array) {
      if (this.onmidimessage) {
        this.onmidimessage({ data } as MIDIMessageEvent);
      }
    },
  };
  return input;
}

function buildMockMIDIAccess(inputs: MockMIDIInput[]) {
  const inputMap = new Map(inputs.map((i) => [i.id, i]));
  return {
    inputs: inputMap,
    onstatechange: null as ((event: Event) => void) | null,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Build a MIDI message Uint8Array */
function midiMsg(type: number, note: number, value: number): Uint8Array {
  return new Uint8Array([type, note, value]);
}

const NOTE_ON  = (ch = 0) => 0x90 | ch;
const NOTE_OFF = (ch = 0) => 0x80 | ch;
const CC       = (ch = 0) => 0xb0 | ch;

// ── Tests ────────────────────────────────────────────────────────────

describe('MIDIManager', () => {
  let manager: MIDIManager;
  let mockInput: MockMIDIInput;
  let mockAccess: ReturnType<typeof buildMockMIDIAccess>;

  beforeEach(async () => {
    mockInput = createMockInput('device-1', 'Test Keyboard');
    mockAccess = buildMockMIDIAccess([mockInput]);

    vi.stubGlobal('navigator', {
      requestMIDIAccess: vi.fn().mockResolvedValue(mockAccess),
    });

    manager = new MIDIManager();
    await manager.initialize();
  });

  // ------------------------------------------------------------------

  describe('initialize', () => {
    it('returns true when MIDI access is granted', async () => {
      const m = new MIDIManager();
      const result = await m.initialize();
      expect(result).toBe(true);
    });

    it('returns false when Web MIDI is not supported', async () => {
      vi.stubGlobal('navigator', {});
      const m = new MIDIManager();
      const result = await m.initialize();
      expect(result).toBe(false);
    });

    it('returns false when access is denied', async () => {
      vi.stubGlobal('navigator', {
        requestMIDIAccess: vi.fn().mockRejectedValue(new Error('Permission denied')),
      });
      const m = new MIDIManager();
      const result = await m.initialize();
      expect(result).toBe(false);
    });

    it('reports isSupported and isConnected after successful init', () => {
      expect(manager.isSupported()).toBe(true);
      expect(manager.isConnected()).toBe(true);
    });

    it('lists input devices', () => {
      const devices = manager.getInputDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0].name).toBe('Test Keyboard');
      expect(devices[0].id).toBe('device-1');
    });
  });

  // ------------------------------------------------------------------

  describe('Note-on / Note-off routing', () => {
    it('fires onNoteOn callback with note and normalised velocity', () => {
      const noteOn = vi.fn();
      manager.onNoteOn(noteOn);

      mockInput.simulateMessage(midiMsg(NOTE_ON(), 60, 100));

      expect(noteOn).toHaveBeenCalledOnce();
      expect(noteOn).toHaveBeenCalledWith(60, expect.closeTo(100 / 127, 3));
    });

    it('fires onNoteOff callback on explicit Note Off message', () => {
      const noteOff = vi.fn();
      manager.onNoteOff(noteOff);

      mockInput.simulateMessage(midiMsg(NOTE_OFF(), 60, 0));

      expect(noteOff).toHaveBeenCalledWith(60);
    });

    it('treats Note On with velocity 0 as Note Off', () => {
      const noteOff = vi.fn();
      manager.onNoteOff(noteOff);

      mockInput.simulateMessage(midiMsg(NOTE_ON(), 60, 0));

      expect(noteOff).toHaveBeenCalledWith(60);
    });
  });

  // ------------------------------------------------------------------

  describe('Sustain pedal (CC 64)', () => {
    it('defers note-off while sustain is held', () => {
      const noteOff = vi.fn();
      manager.onNoteOff(noteOff);

      // Press sustain
      mockInput.simulateMessage(midiMsg(CC(), 64, 127));
      // Release note
      mockInput.simulateMessage(midiMsg(NOTE_OFF(), 60, 0));

      // Note-off should NOT have fired yet
      expect(noteOff).not.toHaveBeenCalled();
    });

    it('releases deferred notes when sustain is released', () => {
      const noteOff = vi.fn();
      manager.onNoteOff(noteOff);

      mockInput.simulateMessage(midiMsg(CC(), 64, 127)); // sustain on
      mockInput.simulateMessage(midiMsg(NOTE_OFF(), 60, 0)); // note-off while held
      mockInput.simulateMessage(midiMsg(NOTE_OFF(), 64, 0)); // another note

      expect(noteOff).not.toHaveBeenCalled();

      mockInput.simulateMessage(midiMsg(CC(), 64, 0)); // sustain off

      expect(noteOff).toHaveBeenCalledTimes(2);
      expect(noteOff).toHaveBeenCalledWith(60);
      expect(noteOff).toHaveBeenCalledWith(64);
    });

    it('fires note-off immediately when sustain is not held', () => {
      const noteOff = vi.fn();
      manager.onNoteOff(noteOff);

      mockInput.simulateMessage(midiMsg(NOTE_OFF(), 60, 0));

      expect(noteOff).toHaveBeenCalledWith(60);
    });

    it('removes retriggered note from sustain queue', () => {
      const noteOn = vi.fn();
      const noteOff = vi.fn();
      manager.onNoteOn(noteOn);
      manager.onNoteOff(noteOff);

      mockInput.simulateMessage(midiMsg(CC(), 64, 127)); // sustain on
      mockInput.simulateMessage(midiMsg(NOTE_OFF(), 60, 0)); // parked in queue

      // Retrigger same note — should remove from queue and play again
      mockInput.simulateMessage(midiMsg(NOTE_ON(), 60, 80));
      expect(noteOn).toHaveBeenCalledOnce();

      // Release sustain — note 60 should NOT get a second note-off
      mockInput.simulateMessage(midiMsg(CC(), 64, 0));
      expect(noteOff).not.toHaveBeenCalled();
    });

    it('sustain threshold: value >= 64 held, value < 64 released', () => {
      const noteOff = vi.fn();
      manager.onNoteOff(noteOff);

      mockInput.simulateMessage(midiMsg(CC(), 64, 63)); // NOT held
      mockInput.simulateMessage(midiMsg(NOTE_OFF(), 60, 0));

      expect(noteOff).toHaveBeenCalledWith(60); // fired immediately
    });
  });

  // ------------------------------------------------------------------

  describe('Channel filtering', () => {
    it('accepts messages on all channels when omni (default)', () => {
      const noteOn = vi.fn();
      manager.onNoteOn(noteOn);

      mockInput.simulateMessage(midiMsg(NOTE_ON(0), 60, 100)); // ch 1
      mockInput.simulateMessage(midiMsg(NOTE_ON(2), 62, 100)); // ch 3

      expect(noteOn).toHaveBeenCalledTimes(2);
    });

    it('filters out messages on wrong channel', () => {
      const noteOn = vi.fn();
      manager.onNoteOn(noteOn);
      manager.setChannel(1); // listen only on channel 1

      mockInput.simulateMessage(midiMsg(NOTE_ON(0), 60, 100)); // ch 1 ✓
      mockInput.simulateMessage(midiMsg(NOTE_ON(2), 62, 100)); // ch 3 ✗

      expect(noteOn).toHaveBeenCalledOnce();
      expect(noteOn).toHaveBeenCalledWith(60, expect.any(Number));
    });

    it('accepts all channels again after setChannel(null)', () => {
      const noteOn = vi.fn();
      manager.onNoteOn(noteOn);
      manager.setChannel(1);
      manager.setChannel(null);

      mockInput.simulateMessage(midiMsg(NOTE_ON(5), 60, 100)); // ch 6

      expect(noteOn).toHaveBeenCalledOnce();
    });
  });

  // ------------------------------------------------------------------

  describe('Device selection', () => {
    it('listens to all devices by default', () => {
      const noteOn = vi.fn();
      manager.onNoteOn(noteOn);

      mockInput.simulateMessage(midiMsg(NOTE_ON(), 60, 100));

      expect(noteOn).toHaveBeenCalledOnce();
    });

    it('ignores messages from unselected device', async () => {
      const input2 = createMockInput('device-2', 'Second Keyboard');
      const access2 = buildMockMIDIAccess([mockInput, input2]);
      vi.stubGlobal('navigator', {
        requestMIDIAccess: vi.fn().mockResolvedValue(access2),
      });
      const m2 = new MIDIManager();
      await m2.initialize();

      const noteOn = vi.fn();
      m2.onNoteOn(noteOn);
      m2.connectDevice('device-1');

      // Simulate messages
      (access2.inputs.get('device-1') as unknown as MockMIDIInput).simulateMessage(
        midiMsg(NOTE_ON(), 60, 100)
      );
      (access2.inputs.get('device-2') as unknown as MockMIDIInput).simulateMessage(
        midiMsg(NOTE_ON(), 64, 100)
      );

      expect(noteOn).toHaveBeenCalledOnce();
      expect(noteOn).toHaveBeenCalledWith(60, expect.any(Number));
    });

    it('fires onDevicesChanged when statechange occurs', () => {
      const changed = vi.fn();
      manager.onDevicesChanged(changed);

      // Simulate device hot-plug
      (mockAccess as unknown as { onstatechange: (() => void) | null }).onstatechange?.();

      expect(changed).toHaveBeenCalledOnce();
    });
  });

  // ------------------------------------------------------------------

  describe('Activity callback', () => {
    it('fires onActivity on note-on', () => {
      const activity = vi.fn();
      manager.onActivity(activity);

      mockInput.simulateMessage(midiMsg(NOTE_ON(), 60, 100));

      expect(activity).toHaveBeenCalledOnce();
    });

    it('fires onActivity on note-off', () => {
      const activity = vi.fn();
      manager.onActivity(activity);

      mockInput.simulateMessage(midiMsg(NOTE_OFF(), 60, 0));

      expect(activity).toHaveBeenCalledOnce();
    });
  });

  // ------------------------------------------------------------------

  describe('disable', () => {
    it('stops all note activity after disable()', () => {
      const noteOn = vi.fn();
      manager.onNoteOn(noteOn);
      manager.disable();

      mockInput.simulateMessage(midiMsg(NOTE_ON(), 60, 100));

      // After disable the listener is removed, so the mock won't call onmidimessage
      // (the input's onmidimessage is set to null)
      expect(noteOn).not.toHaveBeenCalled();
    });

    it('clears sustain state on disable', () => {
      const noteOff = vi.fn();
      manager.onNoteOff(noteOff);

      mockInput.simulateMessage(midiMsg(CC(), 64, 127)); // sustain on
      mockInput.simulateMessage(midiMsg(NOTE_OFF(), 60, 0)); // parked

      manager.disable();

      // Verify sustained notes were NOT emitted (they're silently discarded)
      expect(noteOff).not.toHaveBeenCalled();
    });
  });
});
