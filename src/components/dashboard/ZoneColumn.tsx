import { LiveHRData } from '@/hooks/useLiveHR';

const ZONE_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'REGENERATION', color: '#4fc3f7' },
  2: { label: 'FAT BURN', color: '#66bb6a' },
  3: { label: 'AEROBIC', color: '#fdd835' },
  4: { label: 'CARDIO', color: '#ff9800' },
  5: { label: 'MAX EFFORT', color: '#e53935' },
};

export const FIXED_TILE_SIZE = 64;
export const FIXED_GAP = 6;
export const ZONE_HEADER_HEIGHT = 0;
export const TILE_TOTAL_HEIGHT = FIXED_TILE_SIZE * 1.15 + 20; // hex height + name badge

interface ZoneColumnProps {
  zone: number;
  participants: LiveHRData[];
  selectedProfileId?: string;
}

export function ZoneColumn({ zone, participants }: ZoneColumnProps) {
  const config = ZONE_CONFIG[zone];

  return (
    <div data-zone-col={zone} className="flex flex-col items-center min-w-0 h-full">
      {/* Empty placeholder when no participants */}
      {participants.length === 0 && (
        <div className="flex-1 flex items-start justify-center py-6">
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
      )}
    </div>
  );
}
