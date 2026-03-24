import { LiveHRData } from '@/hooks/useLiveHR';
import { HEART_RATE_ZONES } from '@/lib/heartRateUtils';

// Colorblind-safe zone glow colors
const ZONE_COLORS: Record<number, string> = {
  1: '#88ccee', // Ice Blue
  2: '#f5b800', // Amber Yellow
  3: '#ff2244', // Deep Red (focus)
  4: '#00e5ff', // Bright Cyan
  5: '#4a0e78', // Deep Indigo
};

interface HexTileProps {
  data: LiveHRData;
  isHero?: boolean;
  isSelected?: boolean;
  isFocus?: boolean;
  tileSize?: number;
}

export function HexTile({ data, isHero = false, isSelected = false, isFocus = false, tileSize = 72 }: HexTileProps) {
  const color = ZONE_COLORS[data.zone] || ZONE_COLORS[1];
  const displayName = data.profile?.nickname || data.profile?.name?.split(' ')[0] || 'Unknown';

  const baseSize = isFocus ? tileSize * 3.5 : tileSize;
  const hexClip = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

  const bpmFontSize = isFocus ? baseSize * 0.22 : baseSize * 0.32;
  const nameFontSize = isFocus ? baseSize * 0.07 : baseSize * 0.14;

  // Zone intensity
  const zoneInfo = HEART_RATE_ZONES[data.zone - 1];
  const zoneMinPercent = zoneInfo?.minPercent ?? 0;
  const zoneMaxPercent = zoneInfo?.maxPercent ?? 100;
  const zoneRange = zoneMaxPercent - zoneMinPercent;
  const zoneProgress = zoneRange > 0
    ? Math.max(0, Math.min(1, (data.hr_percentage - zoneMinPercent) / zoneRange))
    : 0.5;

  const fillOpacity = zoneProgress >= 0.9 ? 1.0 : 0.35 + zoneProgress * 0.55;

  // Glow intensity
  const glowSize = isFocus ? 20 : isHero ? 10 : 6;
  const glowSpread = isFocus ? 40 : isHero ? 18 : 10;

  // Selected: pulsing white glow
  const filterVal = isSelected
    ? `drop-shadow(0 0 6px rgba(255,255,255,0.9)) drop-shadow(0 0 14px rgba(255,255,255,0.5))`
    : `drop-shadow(0 0 ${glowSize}px ${color}88) drop-shadow(0 0 ${glowSpread}px ${color}44)`;

  // Breathing animation class
  const breatheClass = isFocus ? 'hex-breathe-strong' : 'hex-breathe';

  // Border thickness
  const borderInset = isFocus ? 4 : isSelected ? 3 : 2;

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ width: baseSize, gap: 2 }}
    >
      {/* Hexagon container with breathing glow */}
      <div
        className={`relative flex items-center justify-center ${breatheClass} ${isSelected ? 'animate-pulse' : ''}`}
        style={{
          width: baseSize,
          height: baseSize * 1.15,
          filter: filterVal,
          animationDuration: isSelected ? '2s' : undefined,
        }}
      >
        {/* Glossy outer border */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: hexClip,
            background: `linear-gradient(135deg, ${color}cc, ${color}44, ${color}cc)`,
            opacity: isSelected ? 0.7 : 0.45,
          }}
        />

        {/* Inner dark fill with zone intensity */}
        <div
          className="absolute"
          style={{
            clipPath: hexClip,
            background: `radial-gradient(ellipse at center, ${color}${Math.round(fillOpacity * 255).toString(16).padStart(2, '0')} 0%, #121212ee 85%)`,
            top: borderInset,
            left: borderInset,
            right: borderInset,
            bottom: borderInset,
          }}
        />

        {/* Glossy highlight (top-left reflection) */}
        <div
          className="absolute"
          style={{
            clipPath: hexClip,
            background: 'linear-gradient(160deg, rgba(255,255,255,0.12) 0%, transparent 40%)',
            top: borderInset,
            left: borderInset,
            right: borderInset,
            bottom: borderInset,
            pointerEvents: 'none',
          }}
        />

        {/* BPM — dominant center element */}
        <span
          className="relative font-black leading-none z-10"
          style={{
            fontSize: Math.max(bpmFontSize, 16),
            color: '#fff',
            textShadow: `0 0 ${isFocus ? 16 : 8}px ${color}88, 0 1px 4px rgba(0,0,0,0.8)`,
            letterSpacing: '-0.02em',
          }}
        >
          {data.bpm}
        </span>
      </div>

      {/* Name bar — outside hexagon */}
      <div
        className="rounded-sm px-1.5 py-0.5 text-center truncate max-w-full"
        style={{
          background: `${color}22`,
          borderBottom: `2px solid ${color}66`,
        }}
      >
        <span
          className="font-bold uppercase tracking-wider block truncate"
          style={{
            fontSize: Math.max(nameFontSize, 8),
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.1,
          }}
        >
          {displayName}
        </span>
      </div>
    </div>
  );
}

export { ZONE_COLORS };
