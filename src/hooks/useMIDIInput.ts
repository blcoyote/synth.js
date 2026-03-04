/**
 * useMIDIInput - React hook for MIDI input state
 *
 * Exposes MIDI connection status, device list, and controls
 * for device selection and channel filtering.
 *
 * MIDIManager is created eagerly in SynthEngine's constructor, but
 * initialize() (which calls requestMIDIAccess) runs later when the
 * user interacts with the page. The hook listens to onInitialized so
 * it updates as soon as MIDI access is granted or denied.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSynthEngine } from '../context/SynthContext';
import type { MIDIInputDevice } from '../core/MIDIManager';

export interface MIDIInputState {
  isSupported: boolean;
  isConnected: boolean;
  devices: MIDIInputDevice[];
  selectedDeviceId: string | null; // null = all devices
  channel: number | null;          // null = all channels (omni)
  midiActivity: boolean;           // briefly true on any incoming note
}

export function useMIDIInput() {
  const { engine } = useSynthEngine();
  // getMIDIManager() is always non-null after SynthEngine construction
  const midi = engine.getMIDIManager();

  const [state, setState] = useState<MIDIInputState>({
    isSupported: midi.isSupported(),
    isConnected: midi.isConnected(),
    devices: midi.getInputDevices(),
    selectedDeviceId: midi.getSelectedDeviceId(),
    channel: midi.getChannel(),
    midiActivity: false,
  });

  // Flash the activity indicator briefly on note events
  const flashActivity = useCallback(() => {
    setState((prev) => ({ ...prev, midiActivity: true }));
    setTimeout(() => {
      setState((prev) => ({ ...prev, midiActivity: false }));
    }, 120);
  }, []);

  useEffect(() => {
    // Update state when MIDI initializes (requestMIDIAccess resolves)
    midi.onInitialized((supported, devices) => {
      setState((prev) => ({
        ...prev,
        isSupported: supported,
        isConnected: supported,
        devices,
      }));
    });

    // Keep device list in sync with hot-plug events
    midi.onDevicesChanged((devices) => {
      setState((prev) => ({
        ...prev,
        devices,
        isConnected: midi.isConnected(),
      }));
    });

    // Flash activity indicator on any MIDI note message
    midi.onActivity(flashActivity);
  }, [midi, flashActivity]);

  const selectDevice = useCallback(
    (deviceId: string | null) => {
      midi.connectDevice(deviceId);
      setState((prev) => ({ ...prev, selectedDeviceId: deviceId }));
    },
    [midi]
  );

  const setChannel = useCallback(
    (channel: number | null) => {
      midi.setChannel(channel);
      setState((prev) => ({ ...prev, channel }));
    },
    [midi]
  );

  return { ...state, selectDevice, setChannel };
}
