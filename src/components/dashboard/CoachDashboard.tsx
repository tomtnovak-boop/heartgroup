import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { ZoneColumn, FIXED_TILE_SIZE, FIXED_GAP, ZONE_HEADER_HEIGHT, TILE_TOTAL_HEIGHT } from './ZoneColumn';
import { HexTile } from './HexTile';
import { HRHistoryStrip } from './HRHistoryStrip';
import { Heart, Users } from 'lucide-react';
import { LiveHRData } from '@/hooks/useLiveHR';

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

  // Waiting state: no participants in lobby (same as NeutralDashboard)
  if (lobbyProfileIds.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0a0a0a', height: 'calc(100dvh - 56px)' }}>
        <div className="relative" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          {WAITING_ZONE_GLOWS.map((g, i) => (
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
            <div style={{
              background: 'rgba(255,255,255,0.06)',
              border: '2px solid rgba(255,255,255,0.12)',
              borderRadius: '16px',
              padding: '16px 40px',
              textAlign: 'center',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Session Code
              </p>
              <p style={{
                color: 'white',
                fontSize: '48px',
                fontWeight: 900,
                letterSpacing: '0.2em',
                textShadow: '0 0 30px rgba(255,255,255,0.2)',
              }}>
                {sessionCode}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

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
        {[1, 2, 3, 4, 5].map((zone) => (
          <ZoneColumn key={zone} zone={zone} participants={zoneGroups[zone]} selectedProfileId={selectedProfileId} />
        ))}

        {columnOffsets.length === 5 && participants.map((p) => {
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
