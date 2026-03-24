import { motion } from 'framer-motion';
import { LiveHRData } from '@/hooks/useLiveHR';

const ZONE_COLORS: Record<number, string> = {
  1: '#00d4ff',
  2: '#ffaa00',
  3: '#00ff88',
  4: '#0088ff',
  5: '#ff0044',
};

interface HexTileProps {
  data: LiveHRData;
  isHero?: boolean;
  tileSize?: number;
}

export function HexTile({ data, isHero = false, tileSize = 72 }: HexTileProps) {
  const color = ZONE_COLORS[data.zone] || ZONE_COLORS[1];
  const displayName = data.profile?.nickname || data.profile?.name || 'Unknown';

  const baseSize = tileSize;
  const hexClip = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

  const bpmFontSize = baseSize * 0.28;
  const nameFontSize = baseSize * 0.11;
  const pctFontSize = baseSize * 0.11;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: baseSize,
        height: baseSize * 1.15,
        filter: `drop-shadow(0 0 ${isHero ? 10 : 5}px ${color}88)`,
      }}
    >
      {/* Outer glow border hex */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: hexClip,
          background: color,
          opacity: 0.3,
        }}
      />

      {/* Inner hex */}
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{
          clipPath: hexClip,
          background: `linear-gradient(180deg, rgba(20,20,20,0.95) 0%, rgba(10,10,10,0.98) 100%)`,
          top: 2,
          left: 2,
          right: 2,
          bottom: 2,
          boxShadow: `inset 0 0 ${isHero ? 15 : 8}px ${color}22`,
        }}
      >
        {/* Name */}
        <span
          className="font-bold uppercase tracking-wider text-center px-1 truncate max-w-[90%]"
          style={{
            fontSize: Math.max(nameFontSize, 7),
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.2,
          }}
        >
          {displayName}
        </span>

        {/* BPM */}
        <motion.span
          className="font-black leading-none"
          style={{
            fontSize: Math.max(bpmFontSize, 14),
            color: '#fff',
            textShadow: `0 0 6px ${color}88`,
          }}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{
            duration: data.bpm > 0 ? 60 / data.bpm : 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {data.bpm}
        </motion.span>

        {/* HR Percentage */}
        <span
          className="font-semibold"
          style={{
            fontSize: Math.max(pctFontSize, 7),
            color: 'rgba(255,255,255,0.55)',
          }}
        >
          {Math.round(data.hr_percentage)}%
        </span>
      </div>
    </div>
  );
}
