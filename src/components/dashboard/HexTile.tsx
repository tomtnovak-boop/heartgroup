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
}

export function HexTile({ data, isHero = false }: HexTileProps) {
  const color = ZONE_COLORS[data.zone] || ZONE_COLORS[1];
  const displayName = data.profile?.nickname || data.profile?.name || 'Unknown';

  const baseSize = isHero ? 180 : 72;
  const hexClip = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ width: baseSize, height: baseSize * 1.15 }}
      animate={{
        filter: [
          `drop-shadow(0 0 ${isHero ? 20 : 8}px ${color})`,
          `drop-shadow(0 0 ${isHero ? 40 : 16}px ${color})`,
          `drop-shadow(0 0 ${isHero ? 20 : 8}px ${color})`,
        ],
      }}
      transition={{
        duration: isHero ? 1.2 : 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {/* Outer glow border hex */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: hexClip,
          background: color,
          opacity: 0.35,
        }}
      />

      {/* Inner hex */}
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{
          clipPath: hexClip,
          background: `linear-gradient(180deg, rgba(20,20,20,0.95) 0%, rgba(10,10,10,0.98) 100%)`,
          top: isHero ? 3 : 2,
          left: isHero ? 3 : 2,
          right: isHero ? 3 : 2,
          bottom: isHero ? 3 : 2,
          boxShadow: `inset 0 0 ${isHero ? 30 : 12}px ${color}33`,
        }}
      >
        {/* Name */}
        <span
          className="font-bold uppercase tracking-wider text-center px-1 truncate max-w-[90%]"
          style={{
            fontSize: isHero ? 14 : 8,
            color: 'rgba(255,255,255,0.8)',
            lineHeight: 1.2,
          }}
        >
          {displayName}
        </span>

        {/* BPM */}
        <motion.span
          className="font-black leading-none"
          style={{
            fontSize: isHero ? 48 : 20,
            color: '#fff',
            textShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
          }}
          animate={{ scale: [1, 1.05, 1] }}
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
            fontSize: isHero ? 14 : 8,
            color: 'rgba(255,255,255,0.65)',
          }}
        >
          {Math.round(data.hr_percentage)}%
        </span>
      </div>
    </motion.div>
  );
}
