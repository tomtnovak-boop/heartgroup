import { LiveHRData } from '@/hooks/useLiveHR';
import { HEART_RATE_ZONES } from '@/lib/heartRateUtils';

// Classic zone colors
const ZONE_COLORS: Record<number, string> = {
  1: '#4fc3f7', // Light Blue
  2: '#66bb6a', // Bright Green
  3: '#fdd835', // Yellow/Gold
  4: '#ff9800', // Orange
  5: '#e53935', // Deep Red
};

interface HexTileProps {
  data: LiveHRData;
  isSelected?: boolean;
  tileSize?: number;
}

export function HexTile({ data, isSelected = false, tileSize = 72 }: HexTileProps) {
  const color = ZONE_COLORS[data.zone] || ZONE_COLORS[1];
  const displayName = data.profile?.nickname || data.profile?.name?.split(' ')[0] || '???';

  const hexClip = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

  const bpmFontSize = tileSize * 0.3;
  const nameFontSize = tileSize * 0.15;

  // Zone intensity for liquid fill
  const zoneInfo = HEART_RATE_ZONES[data.zone - 1];
  const zoneMinPercent = zoneInfo?.minPercent ?? 0;
  const zoneMaxPercent = zoneInfo?.maxPercent ?? 100;
  const zoneRange = zoneMaxPercent - zoneMinPercent;
  const zoneProgress = zoneRange > 0
    ? Math.max(0, Math.min(1, (data.hr_percentage - zoneMinPercent) / zoneRange))
    : 0.5;

  // Liquid fill: rises from bottom. 0% progress = 0% filled, 100% = fully filled
  const fillPercent = Math.round(zoneProgress * 100);
  // Opacity: 50% when mid-zone, 100% when >90%
  const fillOpacity = zoneProgress >= 0.9 ? 1.0 : 0.3 + zoneProgress * 0.5;

  // Glow
  const glowSize = 6;
  const glowSpread = 12;

  const filterVal = isSelected
    ? `drop-shadow(0 0 8px rgba(255,255,255,0.9)) drop-shadow(0 0 16px rgba(255,255,255,0.5))`
    : `drop-shadow(0 0 ${glowSize}px ${color}99) drop-shadow(0 0 ${glowSpread}px ${color}55)`;

  const borderInset = isSelected ? 3 : 2;

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ width: tileSize, gap: 2 }}
    >
      {/* Hexagon */}
      <div
        className={`relative flex items-center justify-center hex-breathe ${isSelected ? 'animate-pulse' : ''}`}
        style={{
          width: tileSize,
          height: tileSize * 1.15,
          filter: filterVal,
          animationDuration: isSelected ? '2s' : undefined,
        }}
      >
        {/* Neon border */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: hexClip,
            background: `linear-gradient(180deg, ${color}cc, ${color}66, ${color}cc)`,
          }}
        />

        {/* Dark inner fill */}
        <div
          className="absolute"
          style={{
            clipPath: hexClip,
            background: '#0a0a0a',
            top: borderInset,
            left: borderInset,
            right: borderInset,
            bottom: borderInset,
          }}
        />

        {/* Liquid fill - rises from bottom */}
        <div
          className="absolute overflow-hidden"
          style={{
            clipPath: hexClip,
            top: borderInset,
            left: borderInset,
            right: borderInset,
            bottom: borderInset,
          }}
        >
          <div
            className="absolute left-0 right-0 bottom-0 transition-all duration-700 ease-out"
            style={{
              height: `${fillPercent}%`,
              background: `linear-gradient(0deg, ${color}${Math.round(fillOpacity * 255).toString(16).padStart(2, '0')}, ${color}${Math.round(fillOpacity * 0.4 * 255).toString(16).padStart(2, '0')})`,
            }}
          />
        </div>

        {/* BPM — dominant center */}
        <span
          className="relative font-black leading-none z-10"
          style={{
            fontSize: Math.max(bpmFontSize, 16),
            color: '#fff',
            textShadow: `0 0 8px ${color}88, 0 1px 4px rgba(0,0,0,0.9)`,
            letterSpacing: '-0.02em',
          }}
        >
          {data.bpm}
        </span>
      </div>

      {/* Name badge below hex */}
      <div
        className="rounded-sm px-1.5 py-0.5 text-center truncate max-w-full"
        style={{
          background: `${color}18`,
          borderBottom: `2px solid ${color}55`,
        }}
      >
        <span
          className="font-black uppercase tracking-wider block truncate"
          style={{
            fontSize: Math.max(nameFontSize, 9),
            color: 'rgba(255,255,255,0.9)',
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
