import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { ZoneColumn, FIXED_TILE_SIZE, FIXED_GAP, ZONE_HEADER_HEIGHT, TILE_TOTAL_HEIGHT } from './ZoneColumn';
import { HexTile } from './HexTile';
import { HRHistoryStrip } from './HRHistoryStrip';
import { Heart, Users } from 'lucide-react';
import { LiveHRData } from '@/hooks/useLiveHR';
import { supabase } from '@/integrations/supabase/client';

import { calculateZone, getEffectiveMaxHR } from '@/lib/heartRateUtils';

const LOBBY_ZONE_COLORS: Record<number, string> = {
  1: '#4fc3f7', 2: '#66bb6a', 3: '#fdd835', 4: '#ff9800', 5: '#e53935',
};

const LOBBY_SEGMENT_OPACITY: Record<number, number> = {
  1: 0.18, 2: 0.22, 3: 0.28, 4: 0.35, 5: 0.42,
};

const LOBBY_SEGMENTS = [
  { zone: 1, width: '20%' },
  { zone: 2, width: '20%' },
  { zone: 3, width: '20%' },
  { zone: 4, width: '20%' },
  { zone: 5, width: '20%' },
];

function hrPercentToBarPosition(hrPercent: number): number {
  if (hrPercent <= 60) return (hrPercent / 60) * 20;
  if (hrPercent <= 70) return 20 + ((hrPercent - 60) / 10) * 20;
  if (hrPercent <= 80) return 40 + ((hrPercent - 70) / 10) * 20;
  if (hrPercent <= 90) return 60 + ((hrPercent - 80) / 10) * 20;
  return 80 + ((hrPercent - 90) / 10) * 20;
}

function LobbyRows({ profileIds, participants }: { profileIds: string[]; participants: LiveHRData[] }) {
  const [profiles, setProfiles] = useState<Record<string, { name: string; nickname?: string | null }>>({});

  useEffect(() => {
    if (profileIds.length === 0) return;
    supabase.from('profiles').select('id, name, nickname').in('id', profileIds)
      .then(({ data }) => {
        const map: Record<string, { name: string; nickname?: string | null }> = {};
        data?.forEach(p => { map[p.id] = { name: p.name, nickname: p.nickname }; });
        setProfiles(map);
      });
  }, [profileIds]);

  const liveMap = useMemo(() => new Map(participants.map(p => [p.profile_id, p])), [participants]);

  const rows = useMemo(() => {
    return profileIds.map((id, idx) => {
      const profile = profiles[id];
      const live = liveMap.get(id);
      const displayName = profile?.nickname || profile?.name?.split(' ')[0] || '...';
      const effectiveMaxHR = live?.profile
        ? getEffectiveMaxHR(live.profile.age, live.profile.custom_max_hr)
        : 170;
      const realZone = live && live.bpm > 0 ? calculateZone(live.bpm, effectiveMaxHR) : null;
      const realHRPercent = live && live.bpm > 0
        ? Math.min(100, Math.round((live.bpm / effectiveMaxHR) * 100))
        : null;
      return {
        number: idx + 1,
        profileId: id,
        name: displayName,
        bpm: live?.bpm ?? null,
        hrPercentage: realHRPercent,
        zone: realZone,
        isLive: !!live && live.bpm > 0,
      };
    });
  }, [profileIds, profiles, liveMap]);

  if (rows.length === 0) return null;

  const rowHeight = `calc((100% - 8px) / ${Math.max(rows.length, 1)})`;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 15, display: 'flex', flexDirection: 'column', padding: '4px 16px' }}>
      {rows.map((row) => {
        const zoneColor = row.zone ? LOBBY_ZONE_COLORS[row.zone] : 'rgba(255,255,255,0.2)';
        return (
          <div
            key={row.profileId}
            style={{
              height: rowHeight,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              paddingLeft: row.isLive && row.zone ? '9px' : '12px',
              paddingRight: '8px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              borderLeft: row.isLive && row.zone
                ? `3px solid ${zoneColor}`
                : '3px solid rgba(255,255,255,0.08)',
              opacity: row.isLive ? 1 : 0.5,
              transition: 'border-left 1s ease, opacity 0.5s ease',
              overflow: 'hidden',
            }}
          >
            {/* Number */}
            <div style={{
              width: 28,
              textAlign: 'right',
              fontSize: 'clamp(10px, 1.2vh, 14px)',
              fontWeight: 700,
              color: 'white',
            }}>
              {String(row.number).padStart(2, '0')}
            </div>

            {/* Name */}
            <div style={{
              width: 100,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 'clamp(11px, 1.5vh, 16px)',
              fontWeight: 700,
              color: row.isLive && row.zone && row.zone >= 4 ? 'white' : 'rgba(255,255,255,0.85)',
            }}>
              {row.name}
            </div>

            {/* Zone Bar */}
            <div style={{
              position: 'relative',
              display: 'flex',
              flex: 1,
              height: 'clamp(14px, 2vh, 28px)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              {LOBBY_SEGMENTS.map(seg => (
                <div
                  key={seg.zone}
                  style={{
                    width: seg.width,
                    height: '100%',
                    background: LOBBY_ZONE_COLORS[seg.zone],
                    opacity: LOBBY_SEGMENT_OPACITY[seg.zone],
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
                    width: 'clamp(24px, 2.5vw, 34px)',
                    height: 'clamp(14px, 2vh, 26px)',
                    borderRadius: '4px',
                    background: LOBBY_ZONE_COLORS[row.zone],
                    boxShadow: `0 0 8px ${LOBBY_ZONE_COLORS[row.zone]}66`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'left 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    zIndex: 10,
                  }}
                >
                  <span style={{ color: 'white', fontWeight: 900, fontSize: 'clamp(9px, 1.2vh, 13px)', textShadow: '0 1px 3px rgba(0,0,0,0.8)', lineHeight: 1 }}>{row.number}</span>
                </div>
              )}
            </div>

            {/* BPM or READY */}
            <div style={{
              width: 56,
              textAlign: 'right',
              fontWeight: row.isLive ? 800 : 600,
              fontSize: row.isLive ? 'clamp(14px, 2.5vh, 28px)' : 'clamp(9px, 1.2vh, 12px)',
              fontVariantNumeric: 'tabular-nums',
              color: row.isLive
                ? (row.zone ? LOBBY_ZONE_COLORS[row.zone] : 'rgba(255,255,255,0.2)')
                : 'rgba(255,255,255,0.35)',
              textTransform: row.isLive ? 'none' : 'uppercase',
              letterSpacing: row.isLive ? undefined : '0.08em',
              transition: 'color 1s ease',
            }}>
              {row.isLive ? (row.bpm ?? '--') : 'Ready'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface CoachDashboardProps {
  participants: LiveHRData[];
  isLoading: boolean;
  activeTab: string;
  selectedProfileId?: string;
  averageBPM?: number;
  isSessionActive?: boolean;
  sessionCode?: string | null;
  lobbyProfileIds?: string[];
}

const WAITING_ZONE_GLOWS = [
  { left: '10%', color: '#00bcd4' },
  { left: '30%', color: '#4caf50' },
  { left: '50%', color: '#ffc107' },
  { left: '70%', color: '#ff9800' },
  { left: '90%', color: '#f44336' },
];

export function CoachDashboard({ participants, isLoading, activeTab, selectedProfileId, averageBPM = 0, isSessionActive = false, sessionCode, lobbyProfileIds = [] }: CoachDashboardProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [columnOffsets, setColumnOffsets] = useState<{ left: number; width: number }[]>([]);

  const zoneGroups = useMemo(() => {
    const groups: Record<number, LiveHRData[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    participants.forEach((p) => {
      const z = Math.min(Math.max(p.zone, 1), 5);
      groups[z].push(p);
    });
    Object.values(groups).forEach(g => g.sort((a, b) => b.hr_percentage - a.hr_percentage));
    return groups;
  }, [participants]);

  const measureColumns = useCallback(() => {
    if (!gridRef.current) return;
    const gridRect = gridRef.current.getBoundingClientRect();
    const cols = gridRef.current.querySelectorAll('[data-zone-col]');
    const offsets = Array.from(cols).map(el => {
      const r = el.getBoundingClientRect();
      return { left: r.left - gridRect.left, width: r.width };
    });
    setColumnOffsets(offsets);
  }, []);

  useEffect(() => {
    measureColumns();
    window.addEventListener('resize', measureColumns);
    return () => window.removeEventListener('resize', measureColumns);
  }, [measureColumns]);

  useEffect(() => {
    measureColumns();
  }, [participants, measureColumns]);

  const getTilePosition = useCallback((zone: number, rankInZone: number) => {
    const col = columnOffsets[zone - 1];
    if (!col) return { left: 0, top: 0 };
    const tilesPerRow = 2;
    const row = Math.floor(rankInZone / tilesPerRow);
    const colInGroup = rankInZone % tilesPerRow;
    const totalTileWidth = 2 * FIXED_TILE_SIZE + FIXED_GAP;
    const startX = col.left + (col.width - totalTileWidth) / 2;
    const left = startX + colInGroup * (FIXED_TILE_SIZE + FIXED_GAP);
    const top = ZONE_HEADER_HEIGHT + row * (TILE_TOTAL_HEIGHT + FIXED_GAP);
    return { left, top };
  }, [columnOffsets]);

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

  const showLobbyOverlay = !isSessionActive && sessionCode;

  const ZONE_COLORS: Record<number, string> = {
    1: '#4fc3f7', 2: '#66bb6a', 3: '#fdd835', 4: '#ff9800', 5: '#e53935',
  };

  const ZONE_GLOWS = [
    { left: '10%', color: '#00bcd4' },
    { left: '30%', color: '#4caf50' },
    { left: '50%', color: '#ffc107' },
    { left: '70%', color: '#ff9800' },
    { left: '90%', color: '#f44336' },
  ];

  return (
    <div className="relative h-full flex flex-col px-4 pt-1 pb-0 min-h-0 overflow-hidden" style={{ background: '#0a0a0a' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.45) 100%)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)', backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse at 50% 50%, black 20%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 20%, transparent 75%)' }} />

      {ZONE_GLOWS.map((g, i) => (
        <div key={i} className="absolute pointer-events-none" style={{ left: g.left, top: '45%', transform: 'translate(-50%, -50%)', width: '450px', height: '500px', borderRadius: '50%', background: g.color, opacity: 0.18, filter: 'blur(300px)' }} />
      ))}

      <div ref={gridRef} className="relative flex-1 grid grid-cols-5 gap-2 min-h-0 overflow-hidden z-10">
        {!showLobbyOverlay && [1, 2, 3, 4, 5].map((zone) => (
          <ZoneColumn key={zone} zone={zone} participants={zoneGroups[zone]} selectedProfileId={selectedProfileId} />
        ))}

        {!showLobbyOverlay && columnOffsets.length === 5 && participants.map((p) => {
          const z = Math.min(Math.max(p.zone, 1), 5);
          const rankInZone = zoneGroups[z].findIndex(x => x.profile_id === p.profile_id);
          const pos = getTilePosition(z, Math.max(rankInZone, 0));
          return (
            <div
              key={p.profile_id}
              style={{
                position: 'absolute',
                left: pos.left,
                top: pos.top,
                transition: 'left 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                zIndex: 20,
              }}
            >
              <HexTile
                data={p}
                isSelected={p.profile_id === selectedProfileId}
                tileSize={FIXED_TILE_SIZE}
              />
            </div>
          );
        })}

        {showLobbyOverlay && lobbyProfileIds.length > 0 && (
          <LobbyRows profileIds={lobbyProfileIds} participants={participants} />
        )}
      </div>

      {/* Session code lobby overlay */}
      {showLobbyOverlay && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 30 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
            <p style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
            }}>
              SESSION CODE
            </p>
            <p style={{
              color: 'white',
              fontSize: 'clamp(48px, 10vw, 96px)',
              fontWeight: 900,
              letterSpacing: '0.2em',
              lineHeight: 1,
              textShadow: '0 0 40px rgba(255,68,37,0.4), 0 0 80px rgba(255,68,37,0.2)',
            }}>
              {sessionCode}
            </p>
            <p style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '13px',
              fontWeight: 400,
            }}>
              {lobbyProfileIds.length > 0
                ? `${lobbyProfileIds.length} participant${lobbyProfileIds.length !== 1 ? 's' : ''} ready`
                : 'Share this code with participants'}
            </p>
          </div>
        </div>
      )}

      <HRHistoryStrip averageBPM={averageBPM} isSessionActive={isSessionActive} />

      <div className="relative grid grid-cols-5 gap-2 py-1 z-10" style={{ background: 'linear-gradient(to top, #000000 60%, transparent)' }}>
        {[1, 2, 3, 4, 5].map((zone) => (
          <div key={zone} className="flex justify-center">
            <div className="text-[10px] font-bold rounded-full px-2 py-0.5" style={{ color: ZONE_COLORS[zone], background: `${ZONE_COLORS[zone]}12`, border: `1px solid ${ZONE_COLORS[zone]}22` }}>
              {zoneGroups[zone].length}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
