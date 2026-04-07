import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { ZoneColumn, FIXED_TILE_SIZE, FIXED_GAP, ZONE_HEADER_HEIGHT, TILE_TOTAL_HEIGHT } from './ZoneColumn';
import { HexTile } from './HexTile';
import { HRHistoryStrip } from './HRHistoryStrip';
import { Heart } from 'lucide-react';
import { LiveHRData } from '@/hooks/useLiveHR';
import { supabase } from '@/integrations/supabase/client';

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

const ZONE_COLORS: Record<number, string> = {
  1: '#4fc3f7', 2: '#66bb6a', 3: '#fdd835', 4: '#ff9800', 5: '#e53935',
};

const ZONE_NAMES: Record<number, string> = {
  1: 'REGENERATION', 2: 'FAT BURN', 3: 'AEROBIC', 4: 'CARDIO', 5: 'MAX EFFORT',
};

const ZONE_GLOWS = [
  { left: '10%', color: '#00bcd4' },
  { left: '30%', color: '#4caf50' },
  { left: '50%', color: '#ffc107' },
  { left: '70%', color: '#ff9800' },
  { left: '90%', color: '#f44336' },
];

export function CoachDashboard({ participants, isLoading, activeTab, selectedProfileId, averageBPM = 0, isSessionActive = false, sessionCode, lobbyProfileIds = [] }: CoachDashboardProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [columnOffsets, setColumnOffsets] = useState<{ left: number; width: number }[]>([]);
  const [lobbyProfiles, setLobbyProfiles] = useState<Record<string, { name: string; nickname?: string | null }>>({});

  // Fetch lobby profile names
  useEffect(() => {
    if (lobbyProfileIds.length === 0) return;
    supabase.from('profiles').select('id, name, nickname').in('id', lobbyProfileIds)
      .then(({ data }) => {
        const map: Record<string, { name: string; nickname?: string | null }> = {};
        data?.forEach(p => { map[p.id] = { name: p.name, nickname: p.nickname }; });
        setLobbyProfiles(map);
      });
  }, [lobbyProfileIds]);

  // Merge lobby-only participants as "ready" tiles in zone 1
  const allTiles = useMemo(() => {
    const liveMap = new Map(participants.map(p => [p.profile_id, p]));
    const merged: LiveHRData[] = [...participants];

    // Add lobby participants who don't have live HR data yet
    lobbyProfileIds.forEach(id => {
      if (!liveMap.has(id)) {
        const profile = lobbyProfiles[id];
        merged.push({
          profile_id: id,
          bpm: 0,
          zone: 1,
          hr_percentage: 0,
          timestamp: new Date().toISOString(),
          profile: {
            name: profile?.name || '...',
            nickname: profile?.nickname || null,
            age: 30,
            custom_max_hr: null,
          },
        });
      }
    });

    return merged;
  }, [participants, lobbyProfileIds, lobbyProfiles]);

  const zoneGroups = useMemo(() => {
    const groups: Record<number, LiveHRData[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    allTiles.forEach((p) => {
      const z = Math.min(Math.max(p.zone, 1), 5);
      groups[z].push(p);
    });
    Object.values(groups).forEach(g => g.sort((a, b) => b.hr_percentage - a.hr_percentage));
    return groups;
  }, [allTiles]);

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
  }, [allTiles, measureColumns]);

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

  return (
    <div className="relative h-full flex flex-col px-4 pt-1 pb-0 min-h-0 overflow-hidden" style={{ background: '#0a0a0a' }}>
      {/* Radial vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.45) 100%)' }} />
      {/* Grid pattern */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)', backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse at 50% 50%, black 20%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 20%, transparent 75%)' }} />

      {/* Zone glow blobs */}
      {ZONE_GLOWS.map((g, i) => (
        <div key={i} className="absolute pointer-events-none" style={{ left: g.left, top: '45%', transform: 'translate(-50%, -50%)', width: '450px', height: '500px', borderRadius: '50%', background: g.color, opacity: 0.18, filter: 'blur(300px)' }} />
      ))}

      {/* Zone header row — always visible */}
      <div className="relative grid grid-cols-5 gap-2 z-10 flex-shrink-0 pt-1 pb-2">
        {[1, 2, 3, 4, 5].map((zone) => (
          <div key={zone} className="text-center">
            <h2
              className="font-black text-[11px] tracking-[0.15em] uppercase"
              style={{ color: '#ffffff', textShadow: `0 0 8px ${ZONE_COLORS[zone]}44` }}
            >
              {ZONE_NAMES[zone]}
            </h2>
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: ZONE_COLORS[zone] }}
            >
              Z{zone}
            </span>
            <div
              className="w-full h-px mt-1.5"
              style={{ background: `linear-gradient(90deg, transparent, ${ZONE_COLORS[zone]}55, transparent)` }}
            />
          </div>
        ))}
      </div>

      {/* Main content area — always shows zone columns + hex tiles */}
      <div ref={gridRef} className="relative flex-1 min-h-0 overflow-hidden z-10">
        {/* Zone columns (invisible placeholders for measurement + empty state hexagons) */}
        <div className="absolute inset-0 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((zone) => (
            <ZoneColumn key={zone} zone={zone} participants={zoneGroups[zone]} selectedProfileId={selectedProfileId} />
          ))}
        </div>

        {/* Hex tiles — absolutely positioned overlay */}
        {columnOffsets.length === 5 && allTiles.map((p) => {
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

      {/* Bottom zone count badges */}
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
