import { useRef, useEffect, useState, useMemo } from 'react';
import { LiveHRData } from '@/hooks/useLiveHR';
import { Users } from 'lucide-react';

interface CoachAlertDashboardProps {
  participants: LiveHRData[];
  isLoading: boolean;
  isSessionActive: boolean;
  sessionCode: string | null;
  lobbyProfileIds: string[];
}

const ZONE_CONFIG: Record<number, { label: string; color: string }> = {
  5: { label: 'MAX EFFORT', color: '#EF4444' },
  4: { label: 'CARDIO', color: '#F59E0B' },
  3: { label: 'AEROBIC', color: '#22C55E' },
  2: { label: 'FAT BURN', color: '#00BFFF' },
  1: { label: 'RECOVERY', color: '#9CA3AF' },
};

const ALERT_THRESHOLD_S = 120;

interface ZoneTimer {
  zone: number;
  startTime: number;
}

interface AlertInfo {
  profileId: string;
  name: string;
  bpm: number;
  zone: number;
  durationS: number;
  type: 'high' | 'low';
}

export function CoachAlertDashboard({
  participants,
  isLoading,
  isSessionActive,
  sessionCode,
  lobbyProfileIds,
}: CoachAlertDashboardProps) {
  const zoneTimers = useRef<Map<string, ZoneTimer>>(new Map());
  const [alerts, setAlerts] = useState<AlertInfo[]>([]);

  // Update zone timers and compute alerts every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const currentAlerts: AlertInfo[] = [];

      participants.forEach((p) => {
        const existing = zoneTimers.current.get(p.profile_id);
        if (!existing || existing.zone !== p.zone) {
          zoneTimers.current.set(p.profile_id, { zone: p.zone, startTime: now });
        } else {
          const elapsed = (now - existing.startTime) / 1000;
          if (elapsed >= ALERT_THRESHOLD_S && (p.zone === 5 || p.zone === 1)) {
            currentAlerts.push({
              profileId: p.profile_id,
              name: p.profile?.nickname || p.profile?.name || 'Unknown',
              bpm: p.bpm,
              zone: p.zone,
              durationS: Math.floor(elapsed),
              type: p.zone === 5 ? 'high' : 'low',
            });
          }
        }
      });

      // Clean up timers for participants no longer present
      const activeIds = new Set(participants.map((p) => p.profile_id));
      zoneTimers.current.forEach((_, key) => {
        if (!activeIds.has(key)) zoneTimers.current.delete(key);
      });

      setAlerts(currentAlerts);
    }, 1000);

    return () => clearInterval(interval);
  }, [participants]);

  const alertMap = useMemo(() => {
    const m = new Map<string, AlertInfo>();
    alerts.forEach((a) => m.set(a.profileId, a));
    return m;
  }, [alerts]);

  const zones = [5, 4, 3, 2, 1];
  const byZone = useMemo(() => {
    const m = new Map<number, LiveHRData[]>();
    zones.forEach((z) => m.set(z, []));
    participants.forEach((p) => {
      m.get(p.zone)?.push(p);
    });
    return m;
  }, [participants]);

  const avgBPM = participants.length > 0
    ? Math.round(participants.reduce((s, p) => s + p.bpm, 0) / participants.length)
    : 0;

  const showLobby = !isSessionActive && lobbyProfileIds.length > 0 && sessionCode;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: '#fff', overflow: 'hidden' }}>
      {/* Lobby overlay */}
      {showLobby && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: 'rgba(10,10,10,0.92)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <Users style={{ width: 32, height: 32, color: '#666' }} />
          <div style={{ fontSize: 14, color: '#666' }}>
            {lobbyProfileIds.length} Teilnehmer in der Lobby
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '0.2em', color: '#fff' }}>
            {sessionCode}
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {/* ATTENTION NEEDED section */}
        {alerts.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: '#EF4444', marginBottom: 8,
            }}>
              ATTENTION NEEDED
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {alerts.map((a) => {
                const alertColor = a.type === 'high' ? '#F59E0B' : '#9CA3AF';
                const zoneColor = ZONE_CONFIG[a.zone].color;
                return (
                  <div
                    key={a.profileId}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 10,
                      border: `1px solid ${alertColor}44`,
                      background: `${alertColor}0A`,
                    }}
                  >
                    {/* Name + BPM chip */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: zoneColor, borderRadius: 20,
                      padding: '4px 10px',
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{a.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>{a.bpm}</span>
                    </div>
                    {/* Duration */}
                    <span style={{ fontSize: 11, color: '#888', flexShrink: 0 }}>
                      Z{a.zone} seit {Math.floor(a.durationS / 60)} min
                    </span>
                    {/* Alert badge */}
                    <span style={{
                      marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                      color: alertColor, flexShrink: 0,
                    }}>
                      {a.type === 'high' ? '⚠ Zu intensiv' : '💤 Zu wenig'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ALL ZONES section */}
        <div>
          {zones.map((z) => {
            const cfg = ZONE_CONFIG[z];
            const zoneParticipants = byZone.get(z) || [];
            return (
              <div key={z} style={{ marginBottom: 12 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: cfg.color,
                  }} />
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: '#888',
                  }}>
                    Z{z} {cfg.label}
                  </span>
                  <span style={{ fontSize: 10, color: '#555', marginLeft: 4 }}>
                    {zoneParticipants.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 28 }}>
                  {zoneParticipants.length === 0 && (
                    <span style={{ fontSize: 11, color: '#333' }}>—</span>
                  )}
                  {zoneParticipants.map((p) => {
                    const alert = alertMap.get(p.profile_id);
                    const name = p.profile?.nickname || p.profile?.name || '?';
                    return (
                      <div key={p.profile_id} style={{ position: 'relative' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          background: `${cfg.color}22`, border: `1px solid ${cfg.color}44`,
                          borderRadius: 16, padding: '3px 10px',
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{name}</span>
                          <span style={{ fontSize: 11, fontWeight: 800, color: cfg.color }}>{p.bpm}</span>
                        </div>
                        {alert && (
                          <div style={{
                            position: 'absolute', top: -2, right: -2,
                            width: 7, height: 7, borderRadius: '50%',
                            background: alert.type === 'high' ? '#F59E0B' : '#9CA3AF',
                            border: '1.5px solid #0a0a0a',
                          }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 16px', borderTop: '1px solid #1a1a1a', flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, color: '#666' }}>
          Ø BPM: <span style={{ color: '#fff', fontWeight: 700 }}>{avgBPM}</span>
        </span>
        <span style={{ fontSize: 12, color: '#666' }}>
          Aktiv: <span style={{ color: '#fff', fontWeight: 700 }}>{participants.length}</span>
        </span>
      </div>
    </div>
  );
}
