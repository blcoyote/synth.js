import { useEffect, useRef, memo, useMemo } from 'react';

interface EnvelopeVisualizerProps {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  width?: number;
  height?: number;
}

/**
 * EnvelopeVisualizer - Canvas-based ADSR envelope curve display
 * Shows the envelope shape in real-time as parameters change
 * Memoized to prevent unnecessary canvas re-renders
 */
export const EnvelopeVisualizer = memo(function EnvelopeVisualizer({
  attack,
  decay,
  sustain,
  release,
  width = 250,
  height = 100,
}: EnvelopeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Memoize expensive envelope calculations
  const envelopeGeometry = useMemo(() => {
    const totalTime = attack + decay + 0.5 + release; // 0.5s for sustain display
    const padding = 10;
    const usableWidth = width - padding * 2;
    const usableHeight = height - padding * 2;

    return {
      totalTime,
      padding,
      usableWidth,
      usableHeight,
      attackWidth: (attack / totalTime) * usableWidth,
      decayWidth: (decay / totalTime) * usableWidth,
      sustainWidth: (0.5 / totalTime) * usableWidth,
      releaseWidth: (release / totalTime) * usableWidth,
    };
  }, [attack, decay, sustain, release, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const { padding, usableWidth, usableHeight, attackWidth, decayWidth, sustainWidth, releaseWidth } = envelopeGeometry;

    // Draw background grid
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
    ctx.lineWidth = 1;
    
    // Horizontal lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i * usableHeight) / 4;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw ADSR curve
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();

    // Start point (bottom left)
    let x = padding;
    let y = height - padding;
    ctx.moveTo(x, y);

    // Attack phase (ramp up to peak)
    x += attackWidth;
    y = padding;
    ctx.lineTo(x, y);

    // Decay phase (ramp down to sustain level)
    x += decayWidth;
    y = padding + (1 - sustain) * usableHeight;
    ctx.lineTo(x, y);

    // Sustain phase (hold at sustain level)
    x += sustainWidth;
    ctx.lineTo(x, y);

    // Release phase (ramp down to 0)
    x += releaseWidth;
    y = height - padding;
    ctx.lineTo(x, y);

    ctx.stroke();

    // Draw labels
    ctx.fillStyle = 'rgba(139, 92, 246, 0.8)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    // Label positions
    let labelX = padding + attackWidth / 2;
    ctx.fillText('A', labelX, height - 2);

    labelX = padding + attackWidth + decayWidth / 2;
    ctx.fillText('D', labelX, height - 2);

    labelX = padding + attackWidth + decayWidth + sustainWidth / 2;
    ctx.fillText('S', labelX, height - 2);

    labelX = padding + attackWidth + decayWidth + sustainWidth + releaseWidth / 2;
    ctx.fillText('R', labelX, height - 2);

    // Draw time markers
    ctx.fillStyle = 'rgba(139, 92, 246, 0.5)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    
    const formatTime = (time: number) => {
      if (time < 1) return `${Math.round(time * 1000)}ms`;
      return `${time.toFixed(2)}s`;
    };

    ctx.fillText(formatTime(attack), padding + 2, 12);
    ctx.fillText(formatTime(decay), padding + attackWidth + 2, 12);
    ctx.fillText(`${Math.round(sustain * 100)}%`, padding + attackWidth + decayWidth + 2, 12);
    ctx.fillText(formatTime(release), padding + attackWidth + decayWidth + sustainWidth + 2, 12);

  }, [attack, decay, sustain, release, width, height, envelopeGeometry]);

  return (
    <div className="envelope-visualizer">
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
