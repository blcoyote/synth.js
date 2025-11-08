/**
 * FilterVisualizer - Spectrum analyzer with filter curve overlay
 * Uses WaveSurferVisualizer in spectrum mode
 */

import { useEffect, useRef } from 'react';
import { WaveSurferVisualizer } from '../../../utils/WaveSurferVisualizer';
import { AudioEngine } from '../../../core/AudioEngine';

interface FilterVisualizerProps {
  analyserNode: AnalyserNode | null;
  filterNode: BiquadFilterNode | null;
  filterEnabled: boolean;
  cutoffFrequency: number;
  height?: number;
  className?: string;
}

export function FilterVisualizer({ 
  analyserNode, 
  filterNode, 
  filterEnabled,
  cutoffFrequency,
  height = 240, 
  className = '' 
}: FilterVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const visualizerRef = useRef<WaveSurferVisualizer | null>(null);

  useEffect(() => {
    if (!containerRef.current || !analyserNode) return;

    // Create visualizer in spectrum mode
    const viz = new WaveSurferVisualizer({
      container: containerRef.current,
      analyserNode: analyserNode,
      filterNode: filterNode,
      filterEnabled: filterEnabled,
      cutoffFrequency: cutoffFrequency,
      sampleRate: AudioEngine.getInstance().getSampleRate(),
      mode: 'spectrum',
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
  }, [analyserNode, filterNode, height]);

  // Update config when filter parameters change
  useEffect(() => {
    if (visualizerRef.current) {
      visualizerRef.current.updateConfig({
        filterNode: filterNode,
        filterEnabled: filterEnabled,
        cutoffFrequency: cutoffFrequency,
      });
    }
  }, [filterNode, filterEnabled, cutoffFrequency]);

  return (
    <div 
      ref={containerRef} 
      className={`filter-visualizer ${className}`}
      style={{
        width: '100%',
        height: `${height}px`,
        background: '#0a0a0a',
        borderRadius: '8px',
        border: '2px solid #1a1a1a',
        marginBottom: '16px',
      }}
    />
  );
}
