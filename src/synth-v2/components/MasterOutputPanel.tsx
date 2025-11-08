/**
 * MasterOutputPanel - Master volume control
 */

import { useState, useEffect } from 'react';
import { audioState } from '../../state';

export function MasterOutputPanel() {
  const [masterVolume, setMasterVolume] = useState(80);

  // Initialize master volume when bus becomes available
  useEffect(() => {
    const initVolume = () => {
      try {
        const bus = audioState.masterBus;
        if (bus) {
          const volume = masterVolume / 100;
          bus.setInputGain(volume);
        }
      } catch (err) {
        // Bus not initialized yet, ignore
      }
    };

    // Try to initialize immediately
    initVolume();

    // Also retry periodically until initialized
    const interval = setInterval(() => {
      try {
        const bus = audioState.masterBus;
        if (bus) {
          clearInterval(interval);
        }
      } catch {
        // Still not ready
      }
    }, 100);

    return () => clearInterval(interval);
  }, [masterVolume]);

  const handleVolumeChange = (value: number) => {
    setMasterVolume(value);
    const volume = value / 100;
    
    try {
      const bus = audioState.masterBus;
      if (bus) {
        bus.setInputGain(volume);
      }
    } catch (err) {
      // Bus not initialized yet, ignore
    }
  };

  return (
    <div className="master-output-panel">
      <div className="control-group">
        <div className="control-label">
          <span>Master Volume</span>
          <span className="control-value">{masterVolume}%</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={masterVolume}
          step="1"
          onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
          className="control-slider"
        />
      </div>
    </div>
  );
}
