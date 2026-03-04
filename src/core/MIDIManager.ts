/**
 * MIDIManager - Web MIDI API input handling
 *
 * Responsibilities:
 * - Request and maintain MIDIAccess
 * - Enumerate / hot-plug MIDI input devices
 * - Route note-on / note-off messages to registered callbacks
 * - Handle sustain pedal (CC 64) with deferred note-off queue
 * - Optional MIDI channel filter (null = omni)
 */

export interface MIDIInputDevice {
  id: string;
  name: string;
  manufacturer: string;
}

export class MIDIManager {
  private midiAccess: MIDIAccess | null = null;
  private supported: boolean = false;
  private connected: boolean = false;

  /** null means "listen to all inputs" */
  private selectedDeviceId: string | null = null;
  /** null means listen on all channels (omni) */
  private channel: number | null = null;

  private sustainHeld: boolean = false;
  private sustainedNotes: Set<number> = new Set();

  private noteOnCallback: ((note: number, velocity: number) => void) | null = null;
  private noteOffCallback: ((note: number) => void) | null = null;
  private devicesChangedCallback: ((devices: MIDIInputDevice[]) => void) | null = null;
  private activityCallback: (() => void) | null = null;
  private initializedCallback: ((supported: boolean, devices: MIDIInputDevice[]) => void) | null = null;

  // ------------------------------------------------------------------
  // Initialisation
  // ------------------------------------------------------------------

  /**
   * Request Web MIDI access.
   * @returns true if access was granted, false if not supported or denied
   */
  async initialize(): Promise<boolean> {
    if (!navigator.requestMIDIAccess) {
      console.warn('🎹 Web MIDI API not supported in this browser');
      this.initializedCallback?.(false, []);
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.supported = true;
      this.connected = true;

      // Listen for device connect/disconnect
      this.midiAccess.onstatechange = () => {
        this.rebindInputListeners();
        this.devicesChangedCallback?.(this.getInputDevices());
      };

      // Attach listeners to all current inputs
      this.rebindInputListeners();

      console.log(`🎹 MIDI ready – ${this.getInputDevices().length} input(s) found`);
      this.initializedCallback?.(true, this.getInputDevices());
      return true;
    } catch (err) {
      console.warn('🎹 MIDI access denied:', err);
      this.initializedCallback?.(false, []);
      return false;
    }
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  isSupported(): boolean {
    return this.supported;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getInputDevices(): MIDIInputDevice[] {
    if (!this.midiAccess) return [];
    const devices: MIDIInputDevice[] = [];
    this.midiAccess.inputs.forEach((input) => {
      devices.push({
        id: input.id,
        name: input.name ?? `MIDI Input ${input.id}`,
        manufacturer: input.manufacturer ?? '',
      });
    });
    return devices;
  }

  /**
   * Connect to a specific device by id, or pass null to listen on all inputs.
   */
  connectDevice(deviceId: string | null): void {
    this.selectedDeviceId = deviceId;
    this.rebindInputListeners();
    console.log(`🎹 MIDI device: ${deviceId ?? 'all inputs'}`);
  }

  /**
   * Set MIDI channel filter.  Pass null for omni (all channels).
   */
  setChannel(channel: number | null): void {
    this.channel = channel;
  }

  getChannel(): number | null {
    return this.channel;
  }

  getSelectedDeviceId(): string | null {
    return this.selectedDeviceId;
  }

  /** Disable MIDI (called on SynthEngine.destroy) */
  disable(): void {
    if (!this.midiAccess) return;
    this.midiAccess.inputs.forEach((input) => {
      input.onmidimessage = null;
    });
    this.sustainHeld = false;
    this.sustainedNotes.clear();
    this.connected = false;
  }

  // ------------------------------------------------------------------
  // Callback registration
  // ------------------------------------------------------------------

  onNoteOn(cb: (note: number, velocity: number) => void): void {
    this.noteOnCallback = cb;
  }

  onNoteOff(cb: (note: number) => void): void {
    this.noteOffCallback = cb;
  }

  /** Called once when initialize() completes (success or failure) */
  onInitialized(cb: (supported: boolean, devices: MIDIInputDevice[]) => void): void {
    this.initializedCallback = cb;
  }

  onDevicesChanged(cb: (devices: MIDIInputDevice[]) => void): void {
    this.devicesChangedCallback = cb;
  }

  /** Called on any incoming MIDI note/CC – used for UI activity indicator */
  onActivity(cb: () => void): void {
    this.activityCallback = cb;
  }

  // ------------------------------------------------------------------
  // Internal helpers
  // ------------------------------------------------------------------

  private rebindInputListeners(): void {
    if (!this.midiAccess) return;

    this.midiAccess.inputs.forEach((input) => {
      const shouldListen =
        this.selectedDeviceId === null || input.id === this.selectedDeviceId;

      if (shouldListen) {
        input.onmidimessage = (event) => this.handleMIDIMessage(event);
      } else {
        input.onmidimessage = null;
      }
    });
  }

  private handleMIDIMessage(event: MIDIMessageEvent): void {
    const data = event.data;
    if (!data || data.length < 2) return;

    const statusByte = data[0];
    const messageType = statusByte & 0xf0;
    const messageChannel = (statusByte & 0x0f) + 1; // 1-based channel

    // Apply channel filter
    if (this.channel !== null && messageChannel !== this.channel) return;

    const note = data[1];
    const value = data.length > 2 ? data[2] : 0;

    switch (messageType) {
      case 0x90: // Note On
        this.activityCallback?.();
        if (value > 0) {
          // Some devices send Note On with velocity 0 as Note Off
          this.handleNoteOn(note, value);
        } else {
          this.handleNoteOff(note);
        }
        break;

      case 0x80: // Note Off
        this.activityCallback?.();
        this.handleNoteOff(note);
        break;

      case 0xb0: // Control Change
        if (note === 64) {
          // Sustain pedal
          this.handleSustain(value);
        }
        break;
    }
  }

  private handleNoteOn(note: number, velocity: number): void {
    // If note was in the sustain queue (retriggered), remove from queue
    this.sustainedNotes.delete(note);
    this.noteOnCallback?.(note, velocity / 127);
  }

  private handleNoteOff(note: number): void {
    if (this.sustainHeld) {
      // Park the note — will be released when sustain pedal lifts
      this.sustainedNotes.add(note);
    } else {
      this.noteOffCallback?.(note);
    }
  }

  private handleSustain(value: number): void {
    const held = value >= 64;

    if (held) {
      this.sustainHeld = true;
    } else {
      this.sustainHeld = false;
      // Release all notes that were held by the sustain pedal
      this.sustainedNotes.forEach((note) => {
        this.noteOffCallback?.(note);
      });
      this.sustainedNotes.clear();
    }
  }
}
