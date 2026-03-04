/**
 * MasterOutputPanel - Master volume control
 */

import { useCallback } from 'react';
import { useSynthEngine } from '../context/SynthContext';
import { Slider } from './common/Slider';

export function MasterOutputPanel() {
  const { engine } = useSynthEngine();

  const handleVolumeChange = useCallback((value: number) => {
    try {
      engine.getVoiceManager().setMasterVolume(value / 100);
    } catch {
      // Engine not initialized yet, ignore
    }
  }, [engine]);

  return (
    <div className="master-output-panel">
      <Slider
        label="Master Volume"
        min={0}
        max={100}
        initialValue={50}
        step={1}
        unit="%"
        onChange={handleVolumeChange}
      />
    </div>
  );
}


