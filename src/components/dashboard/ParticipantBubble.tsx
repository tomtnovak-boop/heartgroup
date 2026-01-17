import { useEffect, useState } from 'react';
import { getZoneBgClass } from '@/lib/heartRateUtils';
import { ZoneArc } from './ZoneArc';
import { LiveHRData } from '@/hooks/useLiveHR';

interface ParticipantBubbleProps {
  data: LiveHRData;
  index: number;
}

export function ParticipantBubble({ data, index }: ParticipantBubbleProps) {
  const [isBeating, setIsBeating] = useState(false);
  
  // Simulate heartbeat animation based on BPM
  useEffect(() => {
    if (data.bpm <= 0) return;
    
    // Calculate interval based on BPM (60000ms / bpm = interval)
    const interval = Math.max(60000 / data.bpm, 400);
    
    const timer = setInterval(() => {
      setIsBeating(true);
      setTimeout(() => setIsBeating(false), 200);
    }, interval);

    return () => clearInterval(timer);
  }, [data.bpm]);

  // Scale based on zone - Zone 4-5 gets 20% larger
  const scale = data.zone >= 4 ? 1.2 : 1;
  const baseSize = 140;
  const size = baseSize * scale;
  
  // Calculate position for floating effect
  const baseDelay = index * 0.5;

  const displayName = data.profile?.nickname || data.profile?.name || 'Unknown';

  return (
    <div
      className="relative flex flex-col items-center"
      style={{
        width: `${size}px`,
        animation: `float 3s ease-in-out ${baseDelay}s infinite`,
      }}
    >
      {/* Zone Arc Background */}
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
        {/* Zone Arc Indicator */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2" style={{ width: size * 0.9 }}>
          <ZoneArc 
            currentZone={data.zone} 
            hrPercentage={data.hr_percentage}
            size={size * 0.9}
          />
        </div>

        {/* Content inside bubble */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          {/* Name or Nickname */}
          <div className="text-xs font-medium text-white/90 uppercase tracking-wider mb-1 text-center px-2 truncate max-w-full">
            {displayName}
          </div>
          
          {/* BPM - Large Center Value */}
          <div className="text-3xl font-bold text-white neon-text">
            {data.bpm}
          </div>
          
          {/* HR Percentage */}
          <div className="text-sm font-medium text-white/80">
            {Math.round(data.hr_percentage)}%
          </div>
        </div>

        {/* Zone Label at bottom */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs font-bold text-white">
          Zone {data.zone}
        </div>
      </div>
    </div>
  );
}
