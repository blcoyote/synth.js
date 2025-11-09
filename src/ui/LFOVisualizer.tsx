import { useEffect, useRef, memo, useMemo } from 'react';

type LFOWaveform = 'sine' | 'triangle' | 'square' | 'sawtooth' | 'random';

interface LFOVisualizerProps {
  waveform: LFOWaveform;
  rate: number;
  depth: number;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  width?: number;
  height?: number;
}

/**
 * LFOVisualizer - Canvas-based LFO waveform display
 * Shows the LFO waveform shape with optional ADSR envelope
 */
export const LFOVisualizer = memo(function LFOVisualizer({
  waveform,
  rate,
  depth,
  attack = 0,
  decay = 0,
  sustain = 1,
  release = 0,
  width = 250,
  height = 100,
}: LFOVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);

  // Generate waveform points
  const generateWaveform = useMemo(() => {
    return (phase: number): number => {
      switch (waveform) {
        case 'sine':
          return Math.sin(phase * Math.PI * 2);
        
        case 'triangle':
          return 1 - 4 * Math.abs(Math.round(phase) - phase);
        
        case 'square':
          return phase % 1 < 0.5 ? 1 : -1;
        
        case 'sawtooth':
          return 2 * (phase % 1) - 1;
        
        case 'random':
          // Sample and hold - step function
          return Math.sin(Math.floor(phase * 8) * 127); // Pseudo-random
        
        default:
          return 0;
      }
    };
  }, [waveform]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let currentTime = 0;
    const hasEnvelope = attack > 0 || decay > 0 || release > 0 || sustain < 1;

    const draw = () => {
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      const padding = 10;
      const usableWidth = width - padding * 2;
      const usableHeight = height - padding * 2;
      const centerY = height / 2;

      // Draw background grid
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
      ctx.lineWidth = 1;
      
      // Center line
      ctx.beginPath();
      ctx.moveTo(padding, centerY);
      ctx.lineTo(width - padding, centerY);
      ctx.stroke();

      // Upper and lower bounds
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(width - padding, padding);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(padding, height - padding);
      ctx.lineTo(width - padding, height - padding);
      ctx.stroke();

      // Draw waveform
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();

      const cycles = 2; // Show 2 complete cycles
      const points = 200;

      for (let i = 0; i < points; i++) {
        const progress = i / (points - 1);
        const x = padding + progress * usableWidth;
        
        // Calculate phase based on rate and time
        const phase = (currentTime * rate + progress * cycles) % cycles;
        
        // Get base waveform value (-1 to 1)
        let value = generateWaveform(phase / cycles);
        
        // Apply envelope if present
        if (hasEnvelope) {
          const timeInCycle = (progress * cycles) / rate; // Time in seconds
          
          let envelopeValue = 1;
          if (timeInCycle < attack) {
            // Attack phase
            envelopeValue = timeInCycle / attack;
          } else if (timeInCycle < attack + decay) {
            // Decay phase
            const decayProgress = (timeInCycle - attack) / decay;
            envelopeValue = 1 - (1 - sustain) * decayProgress;
          } else if (timeInCycle < attack + decay + 0.5) {
            // Sustain phase
            envelopeValue = sustain;
          } else {
            // Release phase
            const releaseProgress = (timeInCycle - attack - decay - 0.5) / release;
            envelopeValue = sustain * (1 - releaseProgress);
          }
          
          value *= envelopeValue;
        }
        
        // Apply depth (0-100% -> 0-1)
        value *= (depth / 100);
        
        // Convert to screen coordinates
        const y = centerY - (value * usableHeight / 2);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // Draw info text
      ctx.fillStyle = 'rgba(139, 92, 246, 0.8)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${waveform.toUpperCase()} ${rate.toFixed(1)}Hz ${depth}%`, padding + 2, 12);

      // Update time for animation
      currentTime += 0.016; // ~60fps

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    animationFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [waveform, rate, depth, attack, decay, sustain, release, width, height, generateWaveform]);

  return (
    <div className="lfo-visualizer">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: '100%',
          height: 'auto',
          maxWidth: `${width}px`,
        }}
      />
    </div>
  );
});
