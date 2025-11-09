/**
 * MasterOutputPanel - Master volume control
 */

import { useState, useCallback } from 'react';
import { useSynthEngine } from '../context/SynthContext';

export function MasterOutputPanel() {
  const { engine } = useSynthEngine();
  const [masterVolume, setMasterVolume] = useState(80);

  const handleVolumeChange = useCallback((value: number) => {
    setMasterVolume(value);
    const volume = value / 100;
    
    try {
      const voiceManager = engine.getVoiceManager();
      const masterGain = voiceManager.getMasterGainNode();
      masterGain.gain.value = volume;
    } catch (err) {
      // Engine not initialized yet, ignore
      console.debug('Master volume update skipped (not initialized):', err);
    }
  }, [engine]);

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
