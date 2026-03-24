import { HexTile } from './HexTile';
import { LiveHRData } from '@/hooks/useLiveHR';

const ZONE_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'REGENERATION', color: '#4fc3f7' },
  2: { label: 'FAT BURN', color: '#66bb6a' },
  3: { label: 'AEROBIC', color: '#fdd835' },
  4: { label: 'CARDIO', color: '#ff9800' },
  5: { label: 'MAX EFFORT', color: '#e53935' },
};

type HexSize = 'lg' | 'md' | 'sm' | 'xs' | 'xxs';

function getZoneLayout(count: number): { hexSize: HexSize } {
  if (count <= 4) return { hexSize: 'lg' };
  if (count <= 8) return { hexSize: 'md' };
  if (count <= 14) return { hexSize: 'sm' };
  if (count <= 21) return { hexSize: 'xs' };
  return { hexSize: 'xxs' };
}

const HEX_SIZES: Record<HexSize, number> = {
  lg: 64,
  md: 52,
  sm: 44,
  xs: 38,
  xxs: 32,
};

const GAP_SIZES: Record<HexSize, number> = {
  lg: 6,
  md: 5,
  sm: 4,
  xs: 3,
  xxs: 2,
};

interface ZoneColumnProps {
  zone: number;
  participants: LiveHRData[];
  selectedProfileId?: string;
}

export function ZoneColumn({ zone, participants, selectedProfileId }: ZoneColumnProps) {
  const config = ZONE_CONFIG[zone];
  const sorted = [...participants].sort((a, b) => b.hr_percentage - a.hr_percentage);
  const { hexSize } = getZoneLayout(sorted.length);
  const tileSize = HEX_SIZES[hexSize];
  const gap = GAP_SIZES[hexSize];
  const needsScroll = sorted.length > 21;

  return (
    <div className="flex flex-col items-center min-w-0 h-full">
      {/* Header */}
      <div className="text-center mb-1.5 flex-shrink-0">
        <h2
          className="font-black text-[11px] tracking-[0.15em] uppercase"
          style={{ color: '#ffffff', textShadow: `0 0 8px ${config.color}44` }}
        >
          {config.label}
        </h2>
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: config.color }}
        >
          Z{zone}
        </span>
      </div>

      {/* Divider */}
      <div
        className="w-full h-px mb-1.5 flex-shrink-0"
        style={{
          background: `linear-gradient(90deg, transparent, ${config.color}55, transparent)`,
        }}
      />

      {/* Tiles grid */}
      <div
        className="flex-1 min-h-0"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${gap}px`,
          justifyItems: 'center',
          alignContent: 'start',
          overflowY: needsScroll ? 'auto' : 'hidden',
          overflowX: 'hidden',
        }}
      >
        {sorted.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-6">
            <div
              className="hex-breathe"
              style={{
                width: 48,
                height: 55,
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                background: `linear-gradient(135deg, ${config.color}18, ${config.color}08)`,
                boxShadow: `0 0 6px ${config.color}22`,
              }}
            />
          </div>
        ) : (
          sorted.map((p) => (
            <HexTile
              key={p.profile_id}
              data={p}
              isSelected={p.profile_id === selectedProfileId}
              tileSize={tileSize}
            />
          ))
        )}
      </div>
    </div>
  );
}
