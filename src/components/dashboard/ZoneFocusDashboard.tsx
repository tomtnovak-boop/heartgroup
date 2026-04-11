import { useMemo } from 'react';
import type { LiveHRData } from '@/hooks/useLiveHR';

interface Props {
  participants: LiveHRData[];
  isLoading: boolean;
  isSessionActive: boolean;
  sessionCode: string | null;
  lobbyProfileIds: string[];
}

const ZONES = [
  { zone: 5, name: 'MAX EFFORT', color: '#EF4444', opacity: 1 },
  { zone: 4, name: 'CARDIO', color: '#F59E0B', opacity: 1 },
  { zone: 3, name: 'AEROBIC', color: '#22C55E', opacity: 1 },
  { zone: 2, name: 'FAT BURN', color: '#00BFFF', opacity: 1 },
  { zone: 1, name: 'RECOVERY', color: '#9CA3AF', opacity: 0.6 },
] as const;

export function ZoneFocusDashboard({ participants, isLoading, isSessionActive, sessionCode, lobbyProfileIds }: Props) {
  const grouped = useMemo(() => {
    const map = new Map<number, LiveHRData[]>();
    for (let z = 1; z <= 5; z++) map.set(z, []);
    participants.forEach(p => {
      const z = Math.max(1, Math.min(5, p.zone));
      map.get(z)!.push(p);
    });
    map.forEach(list => list.sort((a, b) => b.bpm - a.bpm));
    return map;
  }, [participants]);

  const avgBPM = participants.length > 0
    ? Math.round(participants.reduce((s, p) => s + p.bpm, 0) / participants.length)
    : 0;

  const showLobby = !isSessionActive && sessionCode;

  if (isLoading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#666' }}>
        Lade…
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0a', overflow: 'hidden', position: 'relative' }}>
      {/* Lobby overlay */}
      {showLobby && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(10,10,10,0.85)',
        }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#666', marginBottom: 8 }}>Session Code</div>
          <div style={{ fontSize: '72px', fontWeight: 900, color: '#fff', letterSpacing: '0.2em', textShadow: '0 0 40px rgba(255,255,255,0.15)' }}>
            {sessionCode}
          </div>
          {lobbyProfileIds.length > 0 && (
            <div style={{ marginTop: 16, fontSize: '13px', color: '#666' }}>
              {lobbyProfileIds.length} im Wartebereich
            </div>
          )}
        </div>
      )}

      {/* Zone rows */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px 16px 4px' }}>
        {ZONES.map(({ zone, name, color, opacity }) => {
          const list = grouped.get(zone) || [];
          const maxBpm = list.length > 0 ? list[0].bpm : 0;
          return (
            <div key={zone} style={{ opacity, marginBottom: 4 }}>
              {/* Label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color }}>
                  Z{zone} — {name}
                </span>
                {list.length > 0 && (
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>{list.length}</span>
                )}
              </div>
              {/* Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, minHeight: 28 }}>
                {list.map((p, i) => {
                  const chipOpacity = maxBpm > 0 ? 0.6 + 0.4 * (p.bpm / maxBpm) : 1;
                  return (
                    <div key={p.profile_id} style={{
                      background: color,
                      borderRadius: 20,
                      padding: '5px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      opacity: chipOpacity,
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                        {p.profile?.nickname || p.profile?.name || '?'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>
                        {p.bpm}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom bar */}
      <div style={{ padding: '8px 16px', textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
        Ø {avgBPM} bpm · {participants.length} aktiv
      </div>
    </div>
  );
}
