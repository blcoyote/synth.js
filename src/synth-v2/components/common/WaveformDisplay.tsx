/**
 * WaveformDisplay - React component for displaying oscilloscope-style waveforms
 * Uses WaveSurferVisualizer in waveform mode
 */

import { useEffect, useRef } from 'react';
import { WaveSurferVisualizer } from '../../../utils/WaveSurferVisualizer';

interface WaveformDisplayProps {
  analyserNode: AnalyserNode | null;
  height?: number;
  className?: string;
}

export function WaveformDisplay({ analyserNode, height = 120, className = '' }: WaveformDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const visualizerRef = useRef<WaveSurferVisualizer | null>(null);

  useEffect(() => {
    if (!containerRef.current || !analyserNode) return;

    // Create visualizer
    const viz = new WaveSurferVisualizer({
      container: containerRef.current,
      analyserNode: analyserNode,
      mode: 'waveform',
      height: height,
    });

    viz.start();
    visualizerRef.current = viz;

    // Cleanup on unmount
    return () => {
      if (visualizerRef.current) {
        visualizerRef.current.destroy();
        visualizerRef.current = null;
      }
    };
  }, [analyserNode, height]);

  return (
    <div 
      ref={containerRef} 
      className={`waveform-display ${className}`}
      style={{
        width: '100%',
        height: `${height}px`,
        background: '#0a0a0a',
        borderRadius: '8px',
        border: '2px solid #1a1a1a',
      }}
    />
  );
}
