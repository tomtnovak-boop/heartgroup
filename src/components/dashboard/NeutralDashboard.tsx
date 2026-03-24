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
  1: 'hsl(220 15% 45%)',
  2: 'hsl(200 100% 50%)',
  3: 'hsl(145 80% 45%)',
  4: 'hsl(45 100% 50%)',
  5: 'hsl(0 100% 55%)',
};

const ZONE_BG: Record<number, string> = {
  1: 'hsl(220 15% 45% / 0.08)',
  2: 'hsl(200 100% 50% / 0.08)',
  3: 'hsl(145 80% 45% / 0.08)',
  4: 'hsl(45 100% 50% / 0.08)',
  5: 'hsl(0 100% 55% / 0.08)',
};

// Derive zone from position on the equally-divided bar (5 x 20%)
function getBarZone(hrPercent: number): number {
  if (hrPercent < 20) return 1;
  if (hrPercent < 40) return 2;
  if (hrPercent < 60) return 3;
  if (hrPercent < 80) return 4;
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
      const firstName = profile.name.split(' ')[0];
      return {
        number: idx + 1,
        profileId: profile.id,
        name: profile.nickname || firstName,
        bpm: live?.bpm ?? null,
        hrPercentage: live?.hr_percentage ?? null,
        zone: live ? getBarZone(live.hr_percentage) : null,
        isLive: !!live,
      };
    });
  }, [allProfiles, participants]);

  const connectedRows = rows.filter(r => r.isLive && r.bpm);
  const avgBpm = connectedRows.length > 0
    ? Math.round(connectedRows.reduce((sum, r) => sum + (r.bpm ?? 0), 0) / connectedRows.length)
    : null;

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

  const rowCount = Math.max(rows.length, 1);
  const rowHeight = `calc((100dvh - 56px - 32px) / ${rowCount})`;

  return (
    <div style={{ height: 'calc(100dvh - 56px)', overflow: 'hidden', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      {/* Average BPM bar */}
      <div style={{
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Ø Group
        </span>
        <span style={{ color: 'white', fontSize: '16px', fontWeight: 800 }}>
          {avgBpm ?? '--'} <span style={{ fontSize: '11px', fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>bpm</span>
        </span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
          {connectedRows.length} connected
        </span>
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {rows.map((row) => (
          <div
            key={row.profileId}
            style={{
              height: rowHeight,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              paddingLeft: '12px',
              paddingRight: '12px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              backgroundColor: row.isLive && row.zone ? ZONE_BG[row.zone] : 'transparent',
              opacity: row.isLive ? 1 : 0.5,
              overflow: 'hidden',
              transition: 'background-color 1s ease',
            }}
          >
            {/* Number */}
            <div style={{ width: 32, textAlign: 'right', fontSize: 'clamp(9px, 1.2vh, 14px)', fontFamily: 'monospace', color: 'hsl(0 0% 50%)' }}>
              {String(row.number).padStart(2, '0')}
            </div>

            {/* Name */}
            <div style={{ width: 96, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'clamp(10px, 1.3vh, 15px)', fontWeight: 500, color: 'white' }}>
              {row.name}
            </div>

            {/* Zone Bar */}
            <div style={{ position: 'relative', display: 'flex', flex: 1, height: 'clamp(14px, 2vh, 28px)', borderRadius: '4px', overflow: 'hidden' }}>
              {[1, 2, 3, 4, 5].map((z) => (
                <div
                  key={z}
                  style={{
                    width: '20%',
                    height: '100%',
                    background: ZONE_COLORS[z],
                    opacity: 0.25,
                  }}
                />
              ))}

              {row.isLive && row.hrPercentage !== null && row.zone !== null && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${Math.min(Math.max(row.hrPercentage, 2), 98)}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'clamp(24px, 3vw, 36px)',
                    height: 'clamp(14px, 2vh, 26px)',
                    borderRadius: '4px',
                    background: ZONE_COLORS[row.zone],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'left 0.8s ease',
                    zIndex: 10,
                  }}
                >
                  <span style={{ color: 'white', fontWeight: 'bold', fontSize: 'clamp(8px, 1vh, 12px)' }}>{row.number}</span>
                </div>
              )}
            </div>

            {/* BPM */}
            <div
              style={{
                width: 48,
                textAlign: 'right',
                fontWeight: 700,
                fontSize: 'clamp(12px, 1.8vh, 22px)',
                fontVariantNumeric: 'tabular-nums',
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
