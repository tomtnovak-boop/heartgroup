import { LiveHRData } from '@/hooks/useLiveHR';
import { HEART_RATE_ZONES } from '@/lib/heartRateUtils';

// Colorblind-friendly zone colors: Ice Blue → Green → Yellow → Orange → Deep Violet
const ZONE_COLORS: Record<number, string> = {
  1: '#88ccee', // Ice Blue (Z1 - Recovery)
  2: '#44aa99', // Teal Green (Z2 - Fat Burn)
  3: '#ddcc77', // Sand Yellow (Z3 - Aerobic)
  4: '#cc6677', // Rose (Z4 - Cardio)
  5: '#7b2d8e', // Deep Violet (Z5 - Max Effort)
};

interface HexTileProps {
  data: LiveHRData;
  isHero?: boolean;
  isSelected?: boolean;
  tileSize?: number;
}

export function HexTile({ data, isHero = false, isSelected = false, tileSize = 72 }: HexTileProps) {
  const color = ZONE_COLORS[data.zone] || ZONE_COLORS[1];
  const displayName = data.profile?.nickname || data.profile?.name?.split(' ')[0] || 'Unknown';

  const baseSize = tileSize;
  const hexClip = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

  const bpmFontSize = baseSize * 0.32;
  const nameFontSize = baseSize * 0.14;

  // Zone threshold - upper boundary of current zone
  const zoneInfo = HEART_RATE_ZONES[data.zone - 1];
  const zoneMinPercent = zoneInfo?.minPercent ?? 0;
  const zoneMaxPercent = zoneInfo?.maxPercent ?? 100;

  // Progressive intensity: 0.0 (bottom of zone) to 1.0 (top of zone)
  const zoneRange = zoneMaxPercent - zoneMinPercent;
  const zoneProgress = zoneRange > 0
    ? Math.max(0, Math.min(1, (data.hr_percentage - zoneMinPercent) / zoneRange))
    : 0.5;

  // Opacity: 50% at mid-zone, 100% at top (>90% of zone range)
  const fillOpacity = zoneProgress >= 0.9
    ? 1.0
    : 0.35 + zoneProgress * 0.55;

  // Selected (self) marker: thick pulsing white glow
  const selectedGlow = isSelected
    ? `drop-shadow(0 0 6px rgba(255,255,255,0.9)) drop-shadow(0 0 12px rgba(255,255,255,0.6)) drop-shadow(0 0 20px rgba(255,255,255,0.3))`
    : `drop-shadow(0 0 ${isHero ? 8 : 4}px ${color}66)`;

  return (
    <div
      className="relative flex flex-col items-center"
      style={{
        width: baseSize,
        gap: 1,
      }}
    >
      {/* Hexagon container */}
      <div
        className={`relative flex items-center justify-center ${isSelected ? 'animate-pulse' : ''}`}
        style={{
          width: baseSize,
          height: baseSize * 1.15,
          filter: selectedGlow,
          animationDuration: isSelected ? '2s' : undefined,
        }}
      >
        {/* Outer border hex */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: hexClip,
            background: isSelected ? '#ffffff' : color,
            opacity: isSelected ? 0.5 : 0.25,
          }}
        />

        {/* Inner hex with solid zone fill */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            clipPath: hexClip,
            background: color,
            opacity: fillOpacity,
            top: isSelected ? 3 : 2,
            left: isSelected ? 3 : 2,
            right: isSelected ? 3 : 2,
            bottom: isSelected ? 3 : 2,
          }}
        />

        {/* BPM number — dominant center element */}
        <span
          className="relative font-black leading-none z-10"
          style={{
            fontSize: Math.max(bpmFontSize, 16),
            color: '#fff',
            textShadow: '0 1px 4px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.5)',
            letterSpacing: '-0.02em',
          }}
        >
          {data.bpm}
        </span>
      </div>

      {/* Name bar — outside hexagon, high contrast */}
      <div
        className="rounded-sm px-1.5 py-0.5 text-center truncate max-w-full"
        style={{
          background: `${color}44`,
          borderLeft: `2px solid ${color}`,
        }}
      >
        <span
          className="font-bold uppercase tracking-wider block truncate"
          style={{
            fontSize: Math.max(nameFontSize, 8),
            color: '#fff',
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
