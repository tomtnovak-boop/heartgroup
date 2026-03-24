import { useMemo } from 'react';
import { LiveHRData } from '@/hooks/useLiveHR';
import { Heart } from 'lucide-react';

interface NeutralDashboardProps {
  participants: LiveHRData[];
  allProfiles: { id: string; name: string; nickname?: string | null; created_at: string }[];
  isLoading: boolean;
  isSessionActive?: boolean;
}

const ZONE_COLORS: Record<number, string> = {
  1: 'hsl(220, 15%, 45%)',
  2: 'hsl(200, 100%, 50%)',
  3: 'hsl(145, 80%, 45%)',
  4: 'hsl(45, 100%, 50%)',
  5: 'hsl(0, 100%, 55%)',
};

const ZONE_BG: Record<number, string> = {
  1: 'hsl(220 15% 45% / 0.08)',
  2: 'hsl(200 100% 50% / 0.08)',
  3: 'hsl(145 80% 45% / 0.08)',
  4: 'hsl(45 100% 50% / 0.08)',
  5: 'hsl(0 100% 55% / 0.08)',
};

const ZONE_SEGMENT_COLORS: Record<number, string> = {
  1: 'hsl(220 15% 45% / 0.3)',
  2: 'hsl(200 100% 50% / 0.3)',
  3: 'hsl(145 80% 45% / 0.3)',
  4: 'hsl(45 100% 50% / 0.3)',
  5: 'hsl(0 100% 55% / 0.3)',
};

function getZoneFromPercentage(hrPct: number): number {
  if (hrPct < 60) return 1;
  if (hrPct < 70) return 2;
  if (hrPct < 80) return 3;
  if (hrPct < 90) return 4;
  return 5;
}

export function NeutralDashboard({ participants, allProfiles, isLoading }: NeutralDashboardProps) {
  const rows = useMemo(() => {
    const sorted = [...allProfiles].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const liveMap = new Map(participants.map(p => [p.profile_id, p]));

    return sorted.map((profile, idx) => {
      const live = liveMap.get(profile.id);
      return {
        number: idx + 1,
        profileId: profile.id,
        name: profile.nickname || profile.name,
        bpm: live?.bpm ?? null,
        hrPercentage: live?.hr_percentage ?? null,
        zone: live ? getZoneFromPercentage(live.hr_percentage) : null,
        isLive: !!live,
      };
    });
  }, [allProfiles, participants]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div className="text-center">
          <Heart className="w-16 h-16 mx-auto text-primary animate-pulse mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (allProfiles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <p className="text-muted-foreground text-lg">Waiting for participants...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#0a0a0a' }}>
      <div className="flex flex-col">
        {rows.map((row) => (
          <div
            key={row.profileId}
            className="flex items-center gap-3 px-3 py-2 border-b transition-colors duration-1000"
            style={{
              borderColor: 'rgba(255,255,255,0.05)',
              backgroundColor: row.isLive && row.zone ? ZONE_BG[row.zone] : 'transparent',
              opacity: row.isLive ? 1 : 0.5,
            }}
          >
            {/* Number */}
            <div className="w-8 text-right text-xs font-mono" style={{ color: 'hsl(0 0% 50%)' }}>
              {String(row.number).padStart(2, '0')}
            </div>

            {/* Name */}
            <div className="w-24 truncate text-sm font-medium text-white">
              {row.name}
            </div>

            {/* Zone Bar — 5 equal segments (20% each) */}
            <div className="flex-1 relative h-5 rounded-sm overflow-hidden flex">
              {[1, 2, 3, 4, 5].map((zone) => (
                <div
                  key={zone}
                  style={{
                    width: '20%',
                    backgroundColor: ZONE_SEGMENT_COLORS[zone],
                  }}
                />
              ))}

              {/* Slider — rounded rectangle */}
              {row.isLive && row.hrPercentage !== null && row.zone !== null && (
                <div
                  className="absolute flex items-center justify-center font-bold text-white text-[10px]"
                  style={{
                    width: 32,
                    height: 22,
                    borderRadius: 4,
                    backgroundColor: ZONE_COLORS[row.zone],
                    left: `${Math.min(Math.max(row.hrPercentage, 2), 98)}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    transition: 'left 0.8s ease',
                    zIndex: 10,
                  }}
                >
                  {row.number}
                </div>
              )}
            </div>

            {/* BPM */}
            <div
              className="w-12 text-right font-bold text-lg tabular-nums"
              style={{
                color: row.isLive && row.zone ? ZONE_COLORS[row.zone] : 'hsl(0 0% 30%)',
                transition: 'color 1s ease',
              }}
            >
              {row.isLive && row.bpm !== null ? row.bpm : '--'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
