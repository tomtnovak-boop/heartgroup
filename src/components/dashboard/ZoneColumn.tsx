import { HexTile } from './HexTile';
import { LiveHRData } from '@/hooks/useLiveHR';

const ZONE_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'REGENERATION', color: '#88ccee' },
  2: { label: 'FAT BURN', color: '#44aa99' },
  3: { label: 'AEROBIC', color: '#ddcc77' },
  4: { label: 'CARDIO', color: '#cc6677' },
  5: { label: 'MAX EFFORT', color: '#7b2d8e' },
};


interface ZoneColumnProps {
  zone: number;
  participants: LiveHRData[];
  heroProfileId?: string;
  selectedProfileId?: string;
}

export function ZoneColumn({ zone, participants, heroProfileId, selectedProfileId }: ZoneColumnProps) {
  const config = ZONE_CONFIG[zone];
  const sorted = [...participants].sort((a, b) => b.hr_percentage - a.hr_percentage);

  return (
    <div className="flex flex-col items-center min-w-0 h-full">
      {/* Header */}
      <div className="text-center mb-1 flex-shrink-0">
        <h2
          className="font-black text-xs tracking-[0.2em] uppercase"
          style={{ color: config.color }}
        >
          {config.label}
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
          Z{zone}
        </span>
      </div>

      {/* Divider */}
      <div
        className="w-full h-px mb-0.5 flex-shrink-0"
        style={{
          background: `linear-gradient(90deg, transparent, ${config.color}44, transparent)`,
        }}
      />

      {/* Tiles — multi-column grid */}
      <div
        className="flex-1 min-h-0 justify-start overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '2px',
          justifyItems: 'center',
          alignContent: 'start',
        }}
      >
        {sorted.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-4">
            <span className="text-[10px] text-white/20 uppercase tracking-wider">—</span>
          </div>
        ) : (
          sorted.map((p) => (
            <HexTile
              key={p.profile_id}
              data={p}
              isHero={p.profile_id === heroProfileId}
              tileSize={64}
            />
          ))
        )}
      </div>

      {/* Count badge */}
      <div
        className="text-[10px] font-bold rounded-full px-2 py-0.5 mt-0.5 flex-shrink-0"
        style={{
          color: config.color,
          background: `${config.color}12`,
          border: `1px solid ${config.color}28`,
        }}
      >
        {sorted.length}
      </div>
    </div>
  );
}