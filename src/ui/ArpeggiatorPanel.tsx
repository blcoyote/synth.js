/**
 * ArpeggiatorPanel - Arpeggiator controls UI
 */

import { useState, useEffect, useCallback } from 'react';
import { useSynthEngine } from '../context/SynthContext';
import type { ArpPattern, NoteDivision } from '../core/ArpeggiatorManager';
import { Slider } from './common/Slider';

const ARP_PATTERNS: { value: ArpPattern; label: string }[] = [
  { value: 'up', label: 'Up' },
  { value: 'down', label: 'Down' },
  { value: 'updown', label: 'Up-Down' },
  { value: 'updown2', label: 'Up-Down 2' },
  { value: 'converge', label: 'Converge' },
  { value: 'diverge', label: 'Diverge' },
  { value: 'random', label: 'Random' },
  { value: 'pinchedUp', label: 'Pinched Up' },
  { value: 'pinchedDown', label: 'Pinched Down' },
];

const NOTE_DIVISIONS: { value: NoteDivision; label: string }[] = [
  { value: '1/4', label: '1/4' },
  { value: '1/8', label: '1/8' },
  { value: '1/16', label: '1/16' },
  { value: '1/8T', label: '1/8T' },
  { value: '1/16T', label: '1/16T' },
  { value: '1/32', label: '1/32' },
];

export function ArpeggiatorPanel() {
  const { engine: synthEngine } = useSynthEngine();
  
  // Safely get manager
  let arpManager;
  try {
    arpManager = synthEngine.getArpeggiatorManager();
  } catch {
    arpManager = null;
  }

  const [isPlaying, setIsPlaying] = useState(false);
  const [pattern, setPattern] = useState<ArpPattern>('up');
  const [octaves, setOctaves] = useState(1);
  const [tempo, setTempo] = useState(120);
  const [division, setDivision] = useState<NoteDivision>('1/16');
  const [gateLength, setGateLength] = useState(80); // 0-100%
  const [noteHold, setNoteHold] = useState(false);

  // Consolidated useEffect for all manager updates
  useEffect(() => {
    if (!arpManager) return;
    
    arpManager.setPattern(pattern);
    arpManager.setOctaves(octaves);
    arpManager.setTempo(tempo);
    arpManager.setDivision(division);
    arpManager.setGateLength(gateLength / 100);
    arpManager.setNoteHold(noteHold);
  }, [arpManager, pattern, octaves, tempo, division, gateLength, noteHold]);

  const handlePlayPause = useCallback(() => {
    if (!arpManager) return;

    if (isPlaying) {
      arpManager.stop();
      setIsPlaying(false);
    } else {
      // Set default chord if no notes
      arpManager.setNotes([60, 64, 67]); // C major chord
      arpManager.start();
      setIsPlaying(true);
    }
  }, [arpManager, isPlaying]);

  const handleStop = useCallback(() => {
    if (!arpManager) return;
    arpManager.stop();
    setIsPlaying(false);
  }, [arpManager]);

  const handlePatternChange = useCallback((p: ArpPattern) => {
    setPattern(p);
  }, []);

  const handleOctavesChange = useCallback((val: number) => {
    setOctaves(val);
  }, []);

  const handleTempoChange = useCallback((val: number) => {
    setTempo(val);
  }, []);

  const handleDivisionChange = useCallback((d: NoteDivision) => {
    setDivision(d);
  }, []);

  const handleGateLengthChange = useCallback((val: number) => {
    setGateLength(val);
  }, []);

  const handleNoteHoldChange = useCallback((checked: boolean) => {
    setNoteHold(checked);
  }, []);

  return (
    <div className="arp-panel">
      {/* Transport Controls */}
      <div className="arp-transport">
        <button
          className={`transport-btn success ${isPlaying ? 'active' : ''}`}
          onClick={handlePlayPause}
          disabled={!arpManager}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          className="transport-btn success"
          onClick={handleStop}
          disabled={!arpManager || !isPlaying}
        >
          ⏹ Stop
        </button>
      </div>

      {/* Pattern Selection */}
      <div className="control-group">
        <label className="control-label">Pattern</label>
        <div className="pattern-grid">
          {ARP_PATTERNS.map((p) => (
            <button
              key={p.value}
              className={`pattern-btn primary ${pattern === p.value ? 'active' : ''}`}
              onClick={() => handlePatternChange(p.value)}
              disabled={!arpManager}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls Grid */}
      <div className="controls-row">
        {/* Octaves */}
        <div className="control-group">
          <Slider
            label="Octaves"
            initialValue={octaves}
            min={1}
            max={4}
            step={1}
            onChange={handleOctavesChange}
          />
        </div>

        {/* Tempo */}
        <div className="control-group">
          <Slider
            label="Tempo"
            initialValue={tempo}
            min={40}
            max={300}
            step={1}
            unit=" BPM"
            onChange={handleTempoChange}
          />
        </div>
      </div>

      <div className="controls-row">
        {/* Note Division */}
        <div className="control-group">
          <label className="control-label">Division</label>
          <div className="division-buttons">
            {NOTE_DIVISIONS.map((d) => (
              <button
                key={d.value}
                className={`division-btn info ${division === d.value ? 'active' : ''}`}
                onClick={() => handleDivisionChange(d.value)}
                disabled={!arpManager}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="controls-row">
        {/* Gate Length */}
        <div className="control-group">
          <Slider
            label="Gate"
            initialValue={gateLength}
            min={10}
            max={100}
            step={1}
            unit="%"
            onChange={handleGateLengthChange}
          />
        </div>

        {/* Note Hold */}
        <div className="control-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={noteHold}
              onChange={(e) => handleNoteHoldChange(e.target.checked)}
              disabled={!arpManager}
            />
            <span>Note Hold</span>
          </label>
          <p className="control-hint">
            Hold notes until next note plays (legato)
          </p>
        </div>
      </div>

      {!arpManager && (
        <div className="warning-message">
          Audio engine not initialized. Click anywhere to start.
        </div>
      )}
    </div>
  );
}


