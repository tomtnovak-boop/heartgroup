import { useEffect, useState } from 'react';
import { getZoneBgClass } from '@/lib/heartRateUtils';
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
  
  // Calculate position for floating effect
  const baseDelay = index * 0.5;

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        rounded-full aspect-square
        transition-all duration-300 ease-out
        ${getZoneBgClass(data.zone)}
        shadow-2xl
      `}
      style={{
        width: `${scale * 140}px`,
        height: `${scale * 140}px`,
        transform: isBeating ? `scale(${scale * 1.05})` : `scale(${scale})`,
        animation: `float 3s ease-in-out ${baseDelay}s infinite`,
        boxShadow: `0 0 30px var(--glow-color), 0 0 60px var(--glow-color)`,
      }}
    >
      {/* Name */}
      <div className="text-xs font-medium text-white/90 uppercase tracking-wider mb-1 text-center px-2 truncate max-w-full">
        {data.profile?.name || 'Unknown'}
      </div>
      
      {/* BPM - Large Center Value */}
      <div className="text-3xl font-bold text-white neon-text">
        {data.bpm}
      </div>
      
      {/* HR Percentage */}
      <div className="text-sm font-medium text-white/80">
        {Math.round(data.hr_percentage)}%
      </div>
      
      {/* Zone Indicator */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/40 text-xs font-semibold text-white">
        Z{data.zone}
      </div>
    </div>
  );
}
