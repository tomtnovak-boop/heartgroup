import { useEffect, useState } from 'react';
import { getZoneBgClass } from '@/lib/heartRateUtils';
import { ZoneArc } from './ZoneArc';
import { LiveHRData } from '@/hooks/useLiveHR';

interface ParticipantBubbleProps {
  data: LiveHRData;
  index: number;
  totalCount: number;
}

function getBaseSize(count: number): number {
  if (count <= 4) return 140;
  if (count <= 8) return 115;
  if (count <= 12) return 95;
  if (count <= 16) return 80;
  if (count <= 20) return 72;
  return 62;
}

export function ParticipantBubble({ data, index, totalCount }: ParticipantBubbleProps) {
  const [isBeating, setIsBeating] = useState(false);
  
  useEffect(() => {
    if (data.bpm <= 0) return;
    const interval = Math.max(60000 / data.bpm, 400);
    const timer = setInterval(() => {
      setIsBeating(true);
      setTimeout(() => setIsBeating(false), 200);
    }, interval);
    return () => clearInterval(timer);
  }, [data.bpm]);

  const baseSize = getBaseSize(totalCount);
  const scaleMultiplier = totalCount > 12 ? 1.12 : 1.2;
  const scale = data.zone >= 4 ? scaleMultiplier : 1;
  const size = baseSize * scale;
  
  const baseDelay = index * 0.5;
  const displayName = data.profile?.nickname || data.profile?.name || 'Unknown';

  // Dynamic font sizes
  const isSmall = baseSize <= 80;
  const bpmClass = isSmall ? 'text-xl' : 'text-3xl';
  const nameClass = isSmall ? 'text-[10px]' : 'text-xs';
  const pctClass = isSmall ? 'text-[10px]' : 'text-sm';
  const zoneClass = isSmall ? 'text-[9px] px-2 py-0.5' : 'text-xs px-3 py-1';

  return (
    <div
      className="relative flex flex-col items-center"
      style={{
        width: `${size}px`,
        animation: `float 3s ease-in-out ${baseDelay}s infinite`,
      }}
    >
      <div 
        className={`
          relative rounded-full aspect-square
          transition-all duration-300 ease-out
          ${getZoneBgClass(data.zone)}
          shadow-2xl
        `}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          transform: isBeating ? 'scale(1.05)' : 'scale(1)',
          boxShadow: `0 0 30px var(--glow-color), 0 0 60px var(--glow-color)`,
        }}
      >
        <div className="absolute -top-2 left-1/2 -translate-x-1/2" style={{ width: size * 0.9 }}>
          <ZoneArc 
            currentZone={data.zone} 
            hrPercentage={data.hr_percentage}
            size={size * 0.9}
          />
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          <div className={`${nameClass} font-medium text-white/90 uppercase tracking-wider mb-1 text-center px-2 truncate max-w-full`}>
            {displayName}
          </div>
          <div className={`${bpmClass} font-bold text-white neon-text`}>
            {data.bpm}
          </div>
          <div className={`${pctClass} font-medium text-white/80`}>
            {Math.round(data.hr_percentage)}%
          </div>
        </div>

        <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 ${zoneClass} rounded-full bg-black/50 backdrop-blur-sm font-bold text-white`}>
          Zone {data.zone}
        </div>
      </div>
    </div>
  );
}
