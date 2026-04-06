import { useMemo } from 'react';
import { LiveHRData } from '@/hooks/useLiveHR';
import { calculateZone, getEffectiveMaxHR } from '@/lib/heartRateUtils';
import { Users } from 'lucide-react';

interface NeutralDashboardProps {
  participants: LiveHRData[];
  allProfiles: { id: string; name: string; nickname?: string | null; created_at: string }[];
  lobbyProfileIds: string[];
  sessionCode: string | null;
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

const SEGMENT_OPACITY: Record<number, number> = {
  1: 0.18, 2: 0.22, 3: 0.28, 4: 0.35, 5: 0.42,
};

const LEFT_BORDER_COLORS: Record<number, string> = {
  1: 'hsl(220 15% 45% / 0.35)',
  2: 'hsl(200 100% 50% / 0.45)',
  3: 'hsl(145 80% 45% / 0.55)',
  4: 'hsl(45 100% 50% / 0.75)',
  5: 'hsl(0 100% 55% / 1)',
};

const ZONE_SEGMENTS = [
  { zone: 1, width: '20%', label: 'Z1 Recovery' },
  { zone: 2, width: '20%', label: 'Z2 Fat Burn' },
  { zone: 3, width: '20%', label: 'Z3 Aerobic' },
  { zone: 4, width: '20%', label: 'Z4 Anaerobic' },
  { zone: 5, width: '20%', label: 'Z5 Max' },
];

function hrPercentToBarPosition(hrPercent: number): number {
  if (hrPercent <= 60) return (hrPercent / 60) * 20;
  if (hrPercent <= 70) return 20 + ((hrPercent - 60) / 10) * 20;
  if (hrPercent <= 80) return 40 + ((hrPercent - 70) / 10) * 20;
  if (hrPercent <= 90) return 60 + ((hrPercent - 80) / 10) * 20;
  return 80 + ((hrPercent - 90) / 10) * 20;
}

const ZONE_GLOWS = [
  { left: '10%', color: '#00bcd4' },
  { left: '30%', color: '#4caf50' },
  { left: '50%', color: '#ffc107' },
  { left: '70%', color: '#ff9800' },
  { left: '90%', color: '#f44336' },
];

export function NeutralDashboard({ participants, allProfiles, lobbyProfileIds, sessionCode, isLoading, isSessionActive }: NeutralDashboardProps) {
  // Build rows from lobby participants only (not all profiles)
  const rows = useMemo(() => {
    if (lobbyProfileIds.length === 0) return [];

    const liveMap = new Map(participants.map(p => [p.profile_id, p]));
    const profileMap = new Map(allProfiles.map(p => [p.id, p]));

    return lobbyProfileIds.map((profileId, idx) => {
      const profile = profileMap.get(profileId);
      const live = liveMap.get(profileId);
      const firstName = profile?.name?.split(' ')[0] || '???';
      const effectiveMaxHR = live?.profile
        ? getEffectiveMaxHR(live.profile.age, live.profile.custom_max_hr)
        : 170;
      const realZone = live && live.bpm > 0
        ? calculateZone(live.bpm, effectiveMaxHR)
        : null;
      const realHRPercent = live && live.bpm > 0
        ? Math.min(100, Math.round((live.bpm / effectiveMaxHR) * 100))
        : null;
      return {
        number: idx + 1,
        profileId,
        name: profile?.nickname || firstName,
        bpm: live?.bpm ?? null,
        hrPercentage: realHRPercent,
        zone: realZone,
        isLive: !!live && live.bpm > 0,
      };
    });
  }, [lobbyProfileIds, allProfiles, participants]);

  const connectedRows = rows.filter(r => r.isLive && r.bpm);
  const avgBpm = connectedRows.length > 0
    ? Math.round(connectedRows.reduce((sum, r) => sum + (r.bpm ?? 0), 0) / connectedRows.length)
    : null;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '16px' }}>Loading dashboard...</p>
      </div>
    );
  }

  // Empty state: no participants in lobby and no session
  if (lobbyProfileIds.length === 0 && !isSessionActive) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0a0a0a', height: 'calc(100dvh - 56px)' }}>
        <div className="relative" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          {ZONE_GLOWS.map((g, i) => (
            <div key={i} className="absolute pointer-events-none" style={{
              left: `${20 + i * 15}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: g.color,
              opacity: 0.12,
              filter: 'blur(80px)',
            }} />
          ))}

          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '2px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Users style={{ width: '36px', height: '36px', color: 'rgba(255,255,255,0.3)' }} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
              Waiting for participants...
            </p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>
              Share the session code so participants can join
            </p>
          </div>

          {sessionCode && (
            <div style={{ textAlign: 'center' }}>
              <p style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}>
                SESSION CODE
              </p>
              <p style={{
                color: 'white',
                fontSize: 'clamp(48px, 10vw, 96px)',
                fontWeight: 900,
                letterSpacing: '0.2em',
                lineHeight: 1,
                textShadow: '0 0 30px rgba(255,255,255,0.25)',
              }}>
                {sessionCode}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const showLobbyOverlay = !isSessionActive && !!sessionCode;

  const rowCount = Math.max(rows.length, 1);
  const rowHeight = `calc((100dvh - 56px - 40px - 28px) / ${rowCount})`;

  return (
    <div className="relative" style={{ height: 'calc(100dvh - 56px)', overflow: 'hidden', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>

      {/* Radial vignette overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.45) 100%)' }} />

      {/* Grid pattern with fade mask */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse at 50% 50%, black 20%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 20%, transparent 75%)',
      }} />

      {/* Zone glow blobs */}
      {ZONE_GLOWS.map((g, i) => (
        <div key={i} className="absolute pointer-events-none" style={{
          left: g.left,
          top: '45%',
          transform: 'translate(-50%, -50%)',
          width: '450px',
          height: '500px',
          borderRadius: '50%',
          background: g.color,
          opacity: 0.18,
          filter: 'blur(300px)',
        }} />
      ))}

      {/* Average BPM bar */}
      <div style={{
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
      }}>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Group Avg
        </span>
        <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '11px' }}>·</span>
        <span style={{ color: 'white', fontSize: '28px', fontWeight: 900, textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
          {avgBpm ?? '--'}
          <span style={{ fontSize: '12px', fontWeight: 400, color: 'rgba(255,255,255,0.35)', marginLeft: '4px' }}>bpm</span>
        </span>
        <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '11px' }}>·</span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
          {connectedRows.length} connected
        </span>
      </div>

      {/* Zone header row */}
      <div style={{
        height: '28px',
        display: 'flex',
        alignItems: 'flex-end',
        gap: '12px',
        paddingLeft: '12px',
        paddingRight: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ width: 28 }} />
        <div style={{ width: 110 }} />
        <div style={{ flex: 1, display: 'flex' }}>
          {ZONE_SEGMENTS.map(seg => (
            <div key={seg.zone} style={{
              width: seg.width,
              textAlign: 'center',
              fontSize: 'clamp(8px, 1vh, 11px)',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              color: ZONE_COLORS[seg.zone],
              opacity: 0.7,
              paddingBottom: '4px',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}>
              {seg.label}
            </div>
          ))}
        </div>
        <div style={{ width: 56 }} />
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {rows.map((row) => {
          const isHighZone = row.zone && row.zone >= 4;
          const isReady = !row.isLive; // In lobby but no live HR yet
          return (
            <div
              key={row.profileId}
              style={{
                height: rowHeight,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                paddingLeft: row.isLive && row.zone ? '9px' : '12px',
                paddingRight: '12px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: 'transparent',
                borderLeft: row.isLive && row.zone ? `3px solid ${LEFT_BORDER_COLORS[row.zone]}` : '3px solid transparent',
                opacity: row.isLive ? 1 : 0.5,
                overflow: 'hidden',
                transition: 'background-color 1s ease, border-left 1s ease, opacity 0.5s ease',
              }}
            >
              {/* Number */}
              <div style={{
                width: 28,
                textAlign: 'right',
                fontSize: 'clamp(10px, 1.2vh, 14px)',
                fontWeight: 700,
                color: 'white',
                opacity: 1,
              }}>
                {String(row.number).padStart(2, '0')}
              </div>

              {/* Name */}
              <div style={{
                width: 110,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 'clamp(11px, 1.5vh, 18px)',
                fontWeight: 700,
                color: isHighZone ? 'white' : 'rgba(255,255,255,0.85)',
              }}>
                {row.name}
              </div>

              {/* Zone Bar */}
              <div style={{
                position: 'relative',
                display: 'flex',
                flex: 1,
                height: 'clamp(16px, 2.2vh, 32px)',
                borderRadius: '6px',
                overflow: 'hidden',
              }}>
                {ZONE_SEGMENTS.map(seg => (
                  <div
                    key={seg.zone}
                    style={{
                      width: seg.width,
                      height: '100%',
                      background: ZONE_COLORS[seg.zone],
                      opacity: SEGMENT_OPACITY[seg.zone],
                      flexShrink: 0,
                    }}
                  />
                ))}

                {row.isLive && row.hrPercentage !== null && row.zone !== null && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${Math.min(Math.max(hrPercentToBarPosition(row.hrPercentage), 2), 98)}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 'clamp(26px, 3vw, 38px)',
                      height: 'clamp(16px, 2.2vh, 30px)',
                      borderRadius: '4px',
                      background: ZONE_COLORS[row.zone],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'left 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                      zIndex: 10,
                    }}
                  >
                    <span style={{ color: 'white', fontWeight: 900, fontSize: 'clamp(10px, 1.3vh, 15px)', textShadow: '0 1px 3px rgba(0,0,0,0.8)', lineHeight: 1, userSelect: 'none' }}>{row.number}</span>
                  </div>
                )}
              </div>

              {/* BPM or Ready badge */}
              <div
                style={{
                  width: 56,
                  textAlign: 'right',
                  fontWeight: isReady ? 600 : 800,
                  fontSize: isReady ? 'clamp(10px, 1.4vh, 13px)' : 'clamp(16px, 2.8vh, 36px)',
                  fontVariantNumeric: 'tabular-nums',
                  color: isReady
                    ? 'rgba(255,255,255,0.35)'
                    : (row.zone ? ZONE_COLORS[row.zone] : 'rgba(255,255,255,0.2)'),
                  transition: 'color 1s ease',
                  textTransform: isReady ? 'uppercase' : 'none',
                  letterSpacing: isReady ? '0.05em' : undefined,
                }}
              >
                {isReady ? 'Ready' : (row.bpm !== null ? row.bpm : '--')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
