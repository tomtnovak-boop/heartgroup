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
  const zoneMinPercent = zoneInfo?.minPercent ?? 0;
  const zoneMaxPercent = zoneInfo?.maxPercent ?? 100;

  // Progressive intensity: 0.0 (bottom of zone) to 1.0 (top of zone)
  const zoneRange = zoneMaxPercent - zoneMinPercent;
  const zoneProgress = zoneRange > 0
    ? Math.max(0, Math.min(1, (data.hr_percentage - zoneMinPercent) / zoneRange))
    : 0.5;

  // Fill opacity: 10% at bottom of zone, 100% at top
  const fillOpacity = Math.round((0.10 + zoneProgress * 0.90) * 255);
  const fillOpacityHex = fillOpacity.toString(16).padStart(2, '0');

  // Outer ring opacity scales with zone progress
  const outerOpacity = isHero
    ? 0.3 + zoneProgress * 0.4
    : 0.15 + zoneProgress * 0.45;

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
      {/* Outer glow border hex */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: hexClip,
          background: color,
          opacity: outerOpacity,
        }}
      />

      {/* Inner hex with liquid fill */}
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{
          clipPath: hexClip,
          background: `linear-gradient(to top, ${color}${fillOpacityHex} ${fillPercent}%, rgba(15,15,15,0.95) ${fillPercent}%)`,
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
        <span
          className="font-black leading-none"
          style={{
            fontSize: Math.max(bpmFontSize, 14),
            color: '#fff',
            textShadow: `0 0 6px ${color}88, ${textShadow}`,
          }}
        >
          {data.bpm}
        </span>

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
