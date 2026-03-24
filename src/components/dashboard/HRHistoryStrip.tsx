import { useRef, useEffect, useCallback } from 'react';

interface HRHistoryStripProps {
  averageBPM: number;
  isSessionActive: boolean;
}

interface DataPoint {
  time: number;
  bpm: number;
}

function bpmToZoneColor(bpm: number, maxHR: number): string {
  const pct = (bpm / maxHR) * 100;
  if (pct >= 90) return '#f44336';
  if (pct >= 80) return '#ff9800';
  if (pct >= 70) return '#ffc107';
  if (pct >= 60) return '#4caf50';
  return '#00bcd4';
}

export function HRHistoryStrip({ averageBPM, isSessionActive }: HRHistoryStripProps) {
  const bufferRef = useRef<DataPoint[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const polylineRef = useRef<SVGPolylineElement>(null);
  const polygonRef = useRef<SVGPolygonElement>(null);
  const labelRef = useRef<SVGTextElement>(null);
  const emptyRef = useRef<SVGGElement>(null);
  const rafRef = useRef<number | null>(null);
  const frozenRef = useRef(false);
  const prevActiveRef = useRef(isSessionActive);
  const bpmRef = useRef(averageBPM);
  const MAX_POINTS = 600;
  const HEIGHT = 72;

  useEffect(() => { bpmRef.current = averageBPM; }, [averageBPM]);

  useEffect(() => {
    if (isSessionActive && !prevActiveRef.current) {
      bufferRef.current = [];
      frozenRef.current = false;
    } else if (!isSessionActive && prevActiveRef.current) {
      frozenRef.current = true;
    }
    prevActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (frozenRef.current) return;
      const bpm = bpmRef.current;
      if (bpm <= 0) return;
      const buf = bufferRef.current;
      buf.push({ time: Date.now(), bpm });
      if (buf.length > MAX_POINTS) buf.shift();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const render = useCallback(() => {
    const svg = svgRef.current;
    const polyline = polylineRef.current;
    const polygon = polygonRef.current;
    const label = labelRef.current;
    const empty = emptyRef.current;
    if (!svg || !polyline || !polygon || !label || !empty) {
      rafRef.current = requestAnimationFrame(render);
      return;
    }

    const buf = bufferRef.current;
    const w = svg.clientWidth || 800;
    const h = HEIGHT;
    const pad = 2;

    if (buf.length < 2) {
      polyline.setAttribute('points', '');
      polygon.setAttribute('points', '');
      label.textContent = '';
      empty.style.display = '';
      rafRef.current = requestAnimationFrame(render);
      return;
    }

    empty.style.display = 'none';

    let minBPM = Infinity, maxBPM = -Infinity;
    for (const p of buf) {
      if (p.bpm < minBPM) minBPM = p.bpm;
      if (p.bpm > maxBPM) maxBPM = p.bpm;
    }
    minBPM = Math.max(0, minBPM - 10);
    maxBPM = maxBPM + 10;
    const range = maxBPM - minBPM || 1;
    const timeStart = buf[0].time;
    const timeEnd = buf[buf.length - 1].time;
    const timeRange = timeEnd - timeStart || 1;

    let linePoints = '', polyPoints = '', lastX = 0;
    for (let i = 0; i < buf.length; i++) {
      const x = ((buf[i].time - timeStart) / timeRange) * (w - 40) + 4;
      const y = h - pad - ((buf[i].bpm - minBPM) / range) * (h - pad * 2);
      linePoints += `${x},${y} `;
      polyPoints += `${x},${y} `;
      lastX = x;
    }
    polyPoints += `${lastX},${h} 4,${h} `;

    polyline.setAttribute('points', linePoints.trim());
    polygon.setAttribute('points', polyPoints.trim());

    const lastBPM = Math.round(buf[buf.length - 1].bpm);
    label.textContent = `⌀ ${lastBPM}`;
    label.setAttribute('x', String(Math.min(lastX + 6, w - 30)));
    const lastY = h - pad - ((buf[buf.length - 1].bpm - minBPM) / range) * (h - pad * 2);
    label.setAttribute('y', String(Math.max(12, lastY - 4)));

    const gradStops = svg.querySelectorAll('#hr-line-grad stop');
    if (gradStops.length === 5) {
      const samplePositions = [0, 0.25, 0.5, 0.75, 1];
      for (let s = 0; s < 5; s++) {
        const idx = Math.min(Math.floor(samplePositions[s] * (buf.length - 1)), buf.length - 1);
        gradStops[s].setAttribute('stop-color', bpmToZoneColor(buf[idx].bpm, 200));
      }
    }
    const fillStops = svg.querySelectorAll('#hr-fill-grad stop');
    if (fillStops.length === 5) {
      const samplePositions = [0, 0.25, 0.5, 0.75, 1];
      for (let s = 0; s < 5; s++) {
        const idx = Math.min(Math.floor(samplePositions[s] * (buf.length - 1)), buf.length - 1);
        fillStops[s].setAttribute('stop-color', bpmToZoneColor(buf[idx].bpm, 200));
      }
    }

    rafRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(render);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [render]);

  return (
    <div className="relative w-full z-10 pointer-events-none" style={{ height: `${HEIGHT}px` }}>
      <svg ref={svgRef} className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="hr-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00bcd4" />
            <stop offset="25%" stopColor="#4caf50" />
            <stop offset="50%" stopColor="#ffc107" />
            <stop offset="75%" stopColor="#ff9800" />
            <stop offset="100%" stopColor="#f44336" />
          </linearGradient>
          <linearGradient id="hr-fill-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00bcd4" stopOpacity="0.15" />
            <stop offset="25%" stopColor="#4caf50" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#ffc107" stopOpacity="0.15" />
            <stop offset="75%" stopColor="#ff9800" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#f44336" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <polygon ref={polygonRef} fill="url(#hr-fill-grad)" />
        <polyline ref={polylineRef} fill="none" stroke="url(#hr-line-grad)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <text ref={labelRef} fill="white" fontSize="11" fontWeight="bold" dominantBaseline="auto" />
        <g ref={emptyRef}>
          <line x1="4" y1="36" x2="100%" y2="36" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="6 4" />
          <text x="50%" y="52" fill="#ffffff" fillOpacity="0.3" fontSize="10" textAnchor="middle">
            Start a session to record history
          </text>
        </g>
      </svg>
    </div>
  );
}
