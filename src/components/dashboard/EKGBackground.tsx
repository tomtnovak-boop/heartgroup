import { useRef, useEffect, useCallback } from 'react';

interface EKGBackgroundProps {
  averageBPM: number;
}

// Simplified PQRST waveform template (normalized 0-1 range for x, -1 to 1 for y)
function generateBeatTemplate(): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  // P wave (small bump)
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    points.push({ x: t * 0.12, y: Math.sin(t * Math.PI) * 0.08 });
  }
  // PR segment (flat)
  points.push({ x: 0.15, y: 0 });
  // Q dip
  points.push({ x: 0.18, y: -0.06 });
  // R spike (sharp up)
  points.push({ x: 0.22, y: 1.0 });
  // S dip (sharp down below baseline)
  points.push({ x: 0.26, y: -0.18 });
  // ST segment (return to baseline)
  points.push({ x: 0.30, y: 0 });
  points.push({ x: 0.38, y: 0.02 });
  // T wave (broad bump)
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    points.push({ x: 0.38 + t * 0.18, y: Math.sin(t * Math.PI) * 0.12 });
  }
  // Return to baseline
  points.push({ x: 0.60, y: 0 });
  // Flat until next beat
  points.push({ x: 1.0, y: 0 });
  return points;
}

const BEAT_TEMPLATE = generateBeatTemplate();

function interpolateBeat(phase: number): number {
  // phase 0-1 within a single beat cycle
  const clamped = Math.max(0, Math.min(1, phase));
  // Find the two template points surrounding this phase
  for (let i = 0; i < BEAT_TEMPLATE.length - 1; i++) {
    const a = BEAT_TEMPLATE[i];
    const b = BEAT_TEMPLATE[i + 1];
    if (clamped >= a.x && clamped <= b.x) {
      const t = (clamped - a.x) / (b.x - a.x);
      return a.y + (b.y - a.y) * t;
    }
  }
  return 0;
}

export function EKGBackground({ averageBPM }: EKGBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<number[]>(new Array(400).fill(0));
  const phaseRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const bpmRef = useRef(averageBPM);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    bpmRef.current = averageBPM;
  }, [averageBPM]);

  useEffect(() => {
    const animate = (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = rect.width;
      const h = rect.height;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }

      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }

      const dt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      const buffer = bufferRef.current;
      const BUFFER_SIZE = 400;
      const pointsPerSecond = BUFFER_SIZE / 5;
      const pointsThisFrame = Math.max(1, Math.round(pointsPerSecond * dt));
      const bpm = bpmRef.current;
      const beatsPerSecond = bpm > 0 ? bpm / 60 : 0;
      const phasePerPoint = beatsPerSecond / pointsPerSecond;

      for (let i = 0; i < pointsThisFrame; i++) {
        if (bpm > 0) {
          phaseRef.current += phasePerPoint;
          if (phaseRef.current >= 1) phaseRef.current -= 1;
          buffer.push(interpolateBeat(phaseRef.current));
        } else {
          phaseRef.current += 0.002;
          buffer.push(Math.sin(phaseRef.current * Math.PI * 2) * 0.02);
        }
      }

      while (buffer.length > BUFFER_SIZE) buffer.shift();

      ctx.clearRect(0, 0, w, h);

      if (buffer.length >= 2) {
        const baselineY = h * 0.65;
        const amplitude = h * 0.18;

        ctx.save();
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.15;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00e5ff';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        for (let i = 0; i < buffer.length; i++) {
          const x = (i / (BUFFER_SIZE - 1)) * w;
          const y = baselineY - buffer[i] * amplitude;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.restore();
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = null;
      lastTimeRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1, pointerEvents: 'none' }}
    />
  );
}
