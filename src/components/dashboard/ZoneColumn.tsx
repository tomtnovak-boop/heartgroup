import { HexTile } from './HexTile';
import { LiveHRData } from '@/hooks/useLiveHR';

const ZONE_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'REGENERATION', color: '#00d4ff' },
  2: { label: 'FAT BURN', color: '#ffaa00' },
  3: { label: 'AEROBIC', color: '#00ff88' },
  4: { label: 'CARDIO', color: '#0088ff' },
  5: { label: 'MAX EFFORT', color: '#ff0044' },
};

interface ZoneColumnProps {
  zone: number;
  participants: LiveHRData[];
  heroProfileId?: string;
}

export function ZoneColumn({ zone, participants, heroProfileId }: ZoneColumnProps) {
  const config = ZONE_CONFIG[zone];
  const sorted = [...participants].sort((a, b) => b.bpm - a.bpm);

  return (
    <div className="flex flex-col items-center gap-2 min-w-0">
      {/* Header */}
      <div className="text-center mb-2">
        <h2
          className="font-black text-xs tracking-[0.2em] uppercase"
          style={{
            color: config.color,
            textShadow: `0 0 12px ${config.color}66`,
          }}
        >
          {config.label}
        </h2>
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          Z{zone}
        </span>
      </div>

      {/* Divider line */}
      <div
        className="w-full h-px mb-1"
        style={{
          background: `linear-gradient(90deg, transparent, ${config.color}55, transparent)`,
        }}
      />

      {/* Tiles */}
      <div className="flex flex-col items-center gap-1 flex-1">
        {sorted.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[10px] text-white/20 uppercase tracking-wider">—</span>
          </div>
        ) : (
          sorted.map((p) => (
            <HexTile
              key={p.profile_id}
              data={p}
              isHero={p.profile_id === heroProfileId}
            />
          ))
        )}
      </div>

      {/* Count badge */}
      <div
        className="text-[10px] font-bold rounded-full px-2 py-0.5"
        style={{
          color: config.color,
          background: `${config.color}15`,
          border: `1px solid ${config.color}33`,
        }}
      >
        {sorted.length}
      </div>
    </div>
  );
}
