import { HexTile } from './HexTile';
import { LiveHRData } from '@/hooks/useLiveHR';

const ZONE_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'REGENERATION', color: '#88ccee' },
  2: { label: 'FAT BURN', color: '#f5b800' },
  3: { label: 'AEROBIC', color: '#ff2244' },
  4: { label: 'CARDIO', color: '#00e5ff' },
  5: { label: 'MAX EFFORT', color: '#4a0e78' },
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

  // Zone 3 gets the focus tile for the top participant
  const focusParticipant = zone === 3 && sorted.length > 0 ? sorted[0] : null;
  const remainingParticipants = zone === 3 && focusParticipant ? sorted.slice(1) : sorted;

  return (
    <div className="flex flex-col items-center min-w-0 h-full">
      {/* Header */}
      <div className="text-center mb-2 flex-shrink-0">
        <h2
          className="font-black text-xs tracking-[0.2em] uppercase"
          style={{ color: '#ffffff', textShadow: `0 0 10px ${config.color}66` }}
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
        className="w-full h-px mb-2 flex-shrink-0"
        style={{
          background: `linear-gradient(90deg, transparent, ${config.color}66, transparent)`,
        }}
      />

      {/* Focus tile for Zone 3 */}
      {focusParticipant && (
        <div className="flex-shrink-0 mb-3 flex justify-center">
          <HexTile
            data={focusParticipant}
            isHero={focusParticipant.profile_id === heroProfileId}
            isSelected={focusParticipant.profile_id === selectedProfileId}
            isFocus
            tileSize={64}
          />
        </div>
      )}

      {/* Tiles — multi-column grid */}
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
        {remainingParticipants.length === 0 && !focusParticipant ? (
          <div className="col-span-full flex items-center justify-center py-6">
            {/* Empty hex slot placeholder */}
            <div
              className="hex-breathe"
              style={{
                width: 48,
                height: 55,
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                background: `linear-gradient(135deg, ${config.color}22, ${config.color}08)`,
                border: 'none',
                boxShadow: `0 0 8px ${config.color}22`,
              }}
            />
          </div>
        ) : (
          remainingParticipants.map((p) => (
            <HexTile
              key={p.profile_id}
              data={p}
              isHero={p.profile_id === heroProfileId}
              isSelected={p.profile_id === selectedProfileId}
              tileSize={64}
            />
          ))
        )}
      </div>

      {/* Count badge */}
      <div
        className="text-[10px] font-bold rounded-full px-2 py-0.5 mt-1 flex-shrink-0"
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
