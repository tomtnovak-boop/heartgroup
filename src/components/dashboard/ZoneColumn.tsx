import { HexTile } from './HexTile';
import { LiveHRData } from '@/hooks/useLiveHR';

const ZONE_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'REGENERATION', color: '#4fc3f7' },
  2: { label: 'FAT BURN', color: '#66bb6a' },
  3: { label: 'AEROBIC', color: '#fdd835' },
  4: { label: 'CARDIO', color: '#ff9800' },
  5: { label: 'MAX EFFORT', color: '#e53935' },
};

interface ZoneColumnProps {
  zone: number;
  participants: LiveHRData[];
  selectedProfileId?: string;
}

export function ZoneColumn({ zone, participants, selectedProfileId }: ZoneColumnProps) {
  const config = ZONE_CONFIG[zone];
  const sorted = [...participants].sort((a, b) => b.hr_percentage - a.hr_percentage);

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
        className="flex-1 min-h-0 justify-start overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '6px',
          justifyItems: 'center',
          alignContent: 'start',
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
              tileSize={64}
            />
          ))
        )}
      </div>

      {/* Count */}
      <div
        className="text-[10px] font-bold rounded-full px-2 py-0.5 mt-1 flex-shrink-0"
        style={{
          color: config.color,
          background: `${config.color}12`,
          border: `1px solid ${config.color}22`,
        }}
      >
        {sorted.length}
      </div>
    </div>
  );
}
