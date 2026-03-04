/**
 * MIDIPanel - MIDI input device selector and status indicator
 */

import { useMIDIInput } from '../hooks/useMIDIInput';
import { CollapsiblePanel } from './common/CollapsiblePanel';

export function MIDIPanel() {
  const {
    isSupported,
    isConnected,
    devices,
    selectedDeviceId,
    channel,
    midiActivity,
    selectDevice,
    setChannel,
  } = useMIDIInput();

  const statusLabel = !isSupported
    ? 'Not supported'
    : devices.length === 0
    ? 'No devices found'
    : isConnected
    ? 'Connected'
    : 'Disconnected';

  const statusColor = !isSupported
    ? '#ef4444'
    : devices.length === 0
    ? '#f59e0b'
    : '#22c55e';

  return (
    <CollapsiblePanel title="MIDI Input" defaultOpen={false}>
      <div className="midi-panel">
        {/* Status row */}
        <div className="midi-status-row">
          <span
            className={`midi-activity-dot ${midiActivity ? 'active' : ''}`}
            title="MIDI activity"
          />
          <span className="midi-status-label" style={{ color: statusColor }}>
            {statusLabel}
          </span>
        </div>

        {/* Device selector */}
        <div className="midi-control-row">
          <label className="midi-label">Device</label>
          <select
            className="midi-select"
            value={selectedDeviceId ?? ''}
            onChange={(e) => selectDevice(e.target.value === '' ? null : e.target.value)}
            disabled={!isSupported || devices.length === 0}
          >
            <option value="">All devices</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.manufacturer ? ` (${d.manufacturer})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Channel selector */}
        <div className="midi-control-row">
          <label className="midi-label">Channel</label>
          <select
            className="midi-select"
            value={channel ?? 0}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setChannel(val === 0 ? null : val);
            }}
            disabled={!isSupported}
          >
            <option value={0}>All channels</option>
            {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
              <option key={ch} value={ch}>
                Channel {ch}
              </option>
            ))}
          </select>
        </div>

        {!isSupported && (
          <p className="midi-unsupported-note">
            Web MIDI API is not supported in this browser. Try Chrome or Edge.
          </p>
        )}
      </div>
    </CollapsiblePanel>
  );
}
