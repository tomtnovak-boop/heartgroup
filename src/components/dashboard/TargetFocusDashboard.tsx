import { useMemo } from 'react';
import { LiveHRData } from '@/hooks/useLiveHR';

interface Props {
  participants: LiveHRData[];
  allProfiles: { id: string; name: string; nickname?: string | null; created_at: string }[];
  lobbyProfileIds: string[];
  targetZones: number[];
  sessionCode: string | null;
  isLoading: boolean;
  isSessionActive?: boolean;
}
const ZNAMES = ['', 'Recovery', 'Fat Burn', 'Aerobic', 'Cardio', 'Max'];

export function TargetFocusDashboard({ participants, allProfiles, lobbyProfileIds, targetZones, sessionCode, isSessionActive }: Props) {
  const tz = targetZones.length ? targetZones : [3, 4];
  const tmin = Math.min(...tz), tmax = Math.max(...tz);

  const { below, inZone, above } = useMemo(() => {
    const live = new Map(participants.map(p => [p.profile_id, p]));
    const prof = new Map(allProfiles.map(p => [p.id, p]));
    const below: { id: string; name: string; bpm: number }[] = [];
    const inZone: typeof below = [], above: typeof below = [];
    lobbyProfileIds.forEach(id => {
      const p = prof.get(id); const l = live.get(id);
      const hasLive = !!l && l.bpm > 0 && l.connection_status !== 'disconnected';
      if (!hasLive) return;
      const name = p?.nickname || p?.name?.split(' ')[0] || '???';
      const z = Math.max(1, Math.min(5, l!.zone));
      const item = { id, name, bpm: l!.bpm };
      if (z < tmin) below.push(item); else if (z > tmax) above.push(item); else inZone.push(item);
    });
    const byBpm = (a: typeof below[0], b: typeof below[0]) => b.bpm - a.bpm;
    below.sort(byBpm); inZone.sort(byBpm); above.sort(byBpm);
    return { below, inZone, above };
  }, [participants, allProfiles, lobbyProfileIds, tmin, tmax]);

  const total = below.length + inZone.length + above.length;
  const pct = total ? Math.round((inZone.length / total) * 100) : 0;
  const label = tmin === tmax ? ZNAMES[tmin] : `${ZNAMES[tmin]} · ${ZNAMES[tmax]}`;

  const midCols = Math.max(1, Math.ceil(Math.sqrt(Math.max(inZone.length, 1))));
  const chip = (list: typeof below, color: string, bg: string, border: string, big: boolean) => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: big ? `repeat(${midCols}, 1fr)` : 'repeat(2, minmax(0, 1fr))',
      gap: 8,
      alignContent: 'start',
    }}>
      {list.map(m => (
        <div
          key={m.id}
          style={{
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: 8,
            padding: big ? '10px 14px' : '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            minWidth: 0,
          }}
        >
          <div style={{
            color: '#ffffff',
            fontWeight: 700,
            fontSize: big ? 24 : 16,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {m.name}
          </div>
          <div style={{
            color,
            fontWeight: 800,
            fontSize: big ? 26 : 18,
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
          }}>
            {m.bpm}
          </div>
        </div>
      ))}
    </div>
  );

  // Warte-Zustand: Session erstellt, aber noch nicht gestartet → großer Session-Code mittig
  if (!isSessionActive && sessionCode) {
    return (
      <div style={{
        height: '100dvh', width: '100%', background: '#0a0a0a',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: '2vh', fontFamily: 'system-ui, sans-serif',
        textAlign: 'center', padding: '4vh 4vw',
      }}>
        <div style={{
          fontSize: 'clamp(18px, 3vw, 40px)', fontWeight: 800, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)',
        }}>
          Session-Code
        </div>
        <div style={{
          fontSize: 'min(38vw, 46vh)', lineHeight: 0.95, fontWeight: 900, color: '#fff',
          letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums',
        }}>
          {sessionCode}
        </div>
        <div style={{
          fontSize: 'clamp(16px, 2.2vw, 30px)', fontWeight: 600, color: 'rgba(255,255,255,0.6)',
          maxWidth: '80%',
        }}>
          Gib diesen Code in der Bheart-App ein, um beizutreten
        </div>
        <div style={{
          marginTop: '2vh', fontSize: 'clamp(14px, 1.8vw, 24px)', fontWeight: 700,
          color: lobbyProfileIds.length > 0 ? '#22C55E' : 'rgba(255,255,255,0.35)',
        }}>
          {lobbyProfileIds.length > 0
            ? `${lobbyProfileIds.length} bereit`
            : 'Warte auf Teilnehmer …'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100dvh', background: '#0a0a0a', color: '#ffffff', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Topbar */}
      <div style={{ height: 84, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em' }}>
          <span style={{ color: '#ffffff' }}>B</span>
          <span style={{ color: '#ff4425' }}>heart</span>
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          ZIEL-FOKUS
        </div>
      </div>

      {/* Kennzahlen-Kopf: Ziel-Zone, X/Y im Ziel, Fortschritt */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 32, padding: '0 24px 12px' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ziel-Zone</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{label}</div>
        </div>
        <div>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: '#22C55E' }}>
            {inZone.length}/{total}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#8a8a8a' }}>im Ziel</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ height: 14, background: '#1c1c1c', borderRadius: 7, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#22C55E', transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: '#8a8a8a' }}>
            {pct}% der Gruppe im Ziel
          </div>
        </div>
      </div>

      {/* Drei Bereiche */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 12, padding: '0 24px 16px', boxSizing: 'border-box' }}>
        <div style={{ background: '#111111', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            ▼ Zu niedrig
          </div>
          <div style={{ overflowY: 'auto', minHeight: 0 }}>
            {chip(below, '#94A3B8', '#141414', '#242424', false)}
          </div>
        </div>
        <div style={{ background: '#111111', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            ✓ Im Ziel
          </div>
          <div style={{ overflowY: 'auto', minHeight: 0 }}>
            {chip(inZone, '#22C55E', '#132218', 'rgba(34,197,94,0.35)', true)}
          </div>
        </div>
        <div style={{ background: '#111111', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            ▲ Zu hoch
          </div>
          <div style={{ overflowY: 'auto', minHeight: 0 }}>
            {chip(above, '#EF4444', '#141414', 'rgba(239,68,68,0.3)', false)}
          </div>
        </div>
      </div>
    </div>
  );
}
