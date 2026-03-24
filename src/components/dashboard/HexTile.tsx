import { motion } from 'framer-motion';
import { LiveHRData } from '@/hooks/useLiveHR';
import { HEART_RATE_ZONES } from '@/lib/heartRateUtils';

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
  const displayName = data.profile?.nickname || data.profile?.name?.split(' ')[0] || 'Unknown';

  const baseSize = tileSize;
  const hexClip = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

  const bpmFontSize = baseSize * 0.28;
  const nameFontSize = baseSize * 0.11;
  const pctFontSize = baseSize * 0.11;

  // Fill percentage clamped 0-100
  const fillPercent = Math.max(0, Math.min(100, data.hr_percentage));

  // Zone threshold - upper boundary of current zone
  const zoneInfo = HEART_RATE_ZONES[data.zone - 1];
  const zoneMaxPercent = zoneInfo?.maxPercent ?? 100;

  // Near zone edge detection (top 3% of current zone, not in zone 5)
  const isNearZoneEdge = data.zone < 5 && data.hr_percentage >= (zoneMaxPercent - 3);

  // Threshold line position (mapped to hex inner area)
  // The hex visual area runs from ~25% to ~75% vertically, so we map zone max to that range
  const thresholdBottom = zoneMaxPercent;
  const showThreshold = data.zone < 5;

  const textShadow = '0 1px 3px rgba(0,0,0,0.8)';

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: baseSize,
        height: baseSize * 1.15,
        filter: `drop-shadow(0 0 ${isHero ? 8 : 5}px ${color}88)`,
      }}
    >
      {/* Outer glow border hex - pulses when near zone edge */}
      <motion.div
        className="absolute inset-0"
        style={{
          clipPath: hexClip,
          background: color,
        }}
        animate={isNearZoneEdge ? { opacity: [0.3, 0.7, 0.3] } : { opacity: isHero ? 0.6 : 0.3 }}
        transition={isNearZoneEdge ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' } : {}}
      />

      {/* Inner hex with liquid fill */}
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{
          clipPath: hexClip,
          background: `linear-gradient(to top, ${color}40 ${fillPercent}%, rgba(15,15,15,0.95) ${fillPercent}%)`,
          top: 2,
          left: 2,
          right: 2,
          bottom: 2,
        }}
      >
        {/* Zone threshold line */}
        {showThreshold && (
          <div
            className="absolute left-0 right-0"
            style={{
              bottom: `${thresholdBottom}%`,
              height: 1,
              background: `${color}44`,
            }}
          />
        )}

        {/* Name */}
        <span
          className="font-bold uppercase tracking-wider text-center px-1 truncate max-w-[90%]"
          style={{
            fontSize: Math.max(nameFontSize, 7),
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.2,
            textShadow,
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
            textShadow: `0 0 6px ${color}88, ${textShadow}`,
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
            textShadow,
          }}
        >
          {Math.round(data.hr_percentage)}%
        </span>
      </div>
    </div>
  );
}
