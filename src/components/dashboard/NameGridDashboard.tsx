import { useMemo } from 'react';
import { LiveHRData } from '@/hooks/useLiveHR';

interface Props {
  participants: LiveHRData[];
  allProfiles: { id: string; name: string; nickname?: string | null; created_at: string }[];
  lobbyProfileIds: string[];
  sessionCode: string | null;
  isLoading: boolean;
  isSessionActive?: boolean;
}

// Flache, spiegelungssichere Zonen-Palette: solide Flächen, hoher Helligkeitskontrast,
// Schriftfarbe pro Zone auf max. Kontrast, immer mit Zonen-WORT (nicht nur Farbe).
const ZONE: Record<number, { bg: string; fg: string; name: string }> = {
  1: { bg: '#94A3B8', fg: '#0a0a0a', name: 'RECOVERY' },
  2: { bg: '#0EA5E9', fg: '#ffffff', name: 'FAT BURN' },
  3: { bg: '#22C55E', fg: '#06210f', name: 'AEROBIC' },
  4: { bg: '#FBBF24', fg: '#0a0a0a', name: 'CARDIO' },
  5: { bg: '#EF4444', fg: '#ffffff', name: 'MAX' },
};
const TOPBAR = 84, GAP = 6;

export function NameGridDashboard({ participants, allProfiles, lobbyProfileIds }: Props) {
  const rows = useMemo(() => {
    const live = new Map(participants.map(p => [p.profile_id, p]));
    const prof = new Map(allProfiles.map(p => [p.id, p]));
    return lobbyProfileIds.map(id => {
      const p = prof.get(id); const l = live.get(id);
      const first = p?.name?.split(' ')[0] || '???';
      const hasLive = !!l && l.bpm > 0 && l.connection_status !== 'disconnected';
      return { id, name: p?.nickname || first,
        bpm: hasLive ? l!.bpm : null,
        zone: hasLive ? Math.max(1, Math.min(5, l!.zone)) : null };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [participants, allProfiles, lobbyProfileIds]);

  const n = Math.max(rows.length, 1);
  // Spaltenzahl wählen, die 16:9 mit möglichst gut gefüllten ~1.5-Kacheln ausfüllt
  const { cols, gr } = useMemo(() => {
    let best = { cols: 1, gr: n, score: -1e9 };
    for (let c = 1; c <= n; c++) {
      const r = Math.ceil(n / c);
      const ar = (16 / c) / (9 / r);
      const empty = c * r - n;
      const score = -Math.abs(ar - 1.5) - empty * 0.45;
      if (score > best.score) best = { cols: c, gr: r, score };
    }
    return best;
  }, [n]);

  const longest = Math.max(4, ...rows.map(r => r.name.length));
  // Auflösungsunabhängige Schriftgrößen (dvh/dvw), breiten- UND höhenbegrenzt
  const nameFS = `min( calc((100dvh - ${TOPBAR}px - ${(gr + 1) * GAP}px) / ${gr} * 0.30), calc((100dvw - ${(cols + 1) * GAP}px) / ${cols} / ${longest} * 1.5), 6vw )`;
  const metaFS = `min( calc((100dvh - ${TOPBAR}px) / ${gr} * 0.13), calc(100dvw / ${cols} / 13), 2vw )`;

  const connected = rows.filter(r => r.bpm != null);
  const avg = connected.length ? Math.round(connected.reduce((s, r) => s + (r.bpm || 0), 0) / connected.length) : null;

  return (
    <div style={{ width: '100%', height: '100dvh', background: '#0a0a0a', color: '#ffffff', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Topbar */}
      <div style={{ height: TOPBAR, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em' }}>
          <span style={{ color: '#ffffff' }}>B</span>
          <span style={{ color: '#ff4425' }}>heart</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ø Puls</div>
          <div style={{ fontSize: 40, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{avg ?? '–'}</div>
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${gr}, 1fr)`,
          gap: GAP,
          padding: GAP,
          boxSizing: 'border-box',
        }}
      >
        {rows.map(r => {
          const c = r.zone ? ZONE[r.zone] : { bg: '#1c1c1c', fg: '#ffffff', name: 'BEREIT' };
          return (
            <div
              key={r.id}
              style={{
                background: c.bg,
                color: c.fg,
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                minWidth: 0,
                minHeight: 0,
              }}
            >
              <div style={{ fontSize: nameFS, fontWeight: 800, lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '92%' }}>
                {r.name}
              </div>
              <div style={{ fontSize: metaFS, fontWeight: 700, letterSpacing: '0.06em', marginTop: '0.15em', fontVariantNumeric: 'tabular-nums' }}>
                {c.name}
                {r.bpm != null && (<>&nbsp;·&nbsp;{r.bpm}</>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
