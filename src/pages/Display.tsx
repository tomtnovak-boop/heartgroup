import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Heart, Users, Monitor } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useLiveHR } from '@/hooks/useLiveHR';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { NeutralDashboard } from '@/components/dashboard/NeutralDashboard';
import { ZoneColumn, ZONE_HEADER_HEIGHT, FIXED_GAP } from '@/components/dashboard/ZoneColumn';
import { HexTile } from '@/components/dashboard/HexTile';
import { LiveHRData } from '@/hooks/useLiveHR';

const TILE_SIZE = 88;
const TILE_TOTAL_HEIGHT = TILE_SIZE * 1.15 + 24; // hex + name badge

const ZONE_COLORS: Record<number, string> = {
  1: '#4fc3f7', 2: '#66bb6a', 3: '#fdd835', 4: '#ff9800', 5: '#e53935',
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleSubmit = async () => {
    setError('');
    const { data } = await supabase
      .from('active_sessions')
      .select('session_code')
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (data && data.session_code === code) {
      sessionStorage.setItem('display_unlocked', 'true');
      onUnlock();
    } else {
      setError('Incorrect code');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
      <div className="flex flex-col items-center gap-5 p-8 rounded-2xl" style={{ maxWidth: 340, width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
          <Heart className="w-7 h-7 text-primary" fill="currentColor" />
        </div>
        <h1 className="text-xl font-black text-white tracking-tight">HR Training</h1>
        <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Enter the Session Code to unlock the display
        </p>
        <div className={shake ? 'animate-shake w-full' : 'w-full'}>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={code}
            onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && code.length > 0 && handleSubmit()}
            placeholder="0000"
            className="text-center text-3xl font-black tracking-[0.3em] h-16 bg-transparent border-white/20 text-white"
            autoFocus
          />
        </div>
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        <Button onClick={handleSubmit} disabled={code.length === 0} className="w-full h-11 text-sm font-bold">
          Unlock Display
        </Button>
      </div>
      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
        .animate-shake { animation: shake 0.4s ease; }
      `}</style>
    </div>
  );
}

function LiveDisplay() {
  const { participants, averageBPM } = useLiveHR(() => {});
  const { isActive: sessionActive, elapsedSeconds } = useWorkoutSession();

  const gridRef = useRef<HTMLDivElement>(null);
  const [columnOffsets, setColumnOffsets] = useState<{ left: number; width: number }[]>([]);

  const zoneGroups = useMemo(() => {
    const groups: Record<number, LiveHRData[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    participants.forEach(p => {
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
    setColumnOffsets(Array.from(cols).map(el => {
      const r = el.getBoundingClientRect();
      return { left: r.left - gridRect.left, width: r.width };
    }));
  }, []);

  useEffect(() => {
    measureColumns();
    window.addEventListener('resize', measureColumns);
    return () => window.removeEventListener('resize', measureColumns);
  }, [measureColumns]);

  useEffect(() => { measureColumns(); }, [participants, measureColumns]);

  // Wake lock
  useEffect(() => {
    let wl: WakeLockSentinel | null = null;
    navigator.wakeLock?.request('screen').then(w => { wl = w; }).catch(() => {});
    return () => { wl?.release(); };
  }, []);

  const getTilePosition = useCallback((zone: number, rankInZone: number) => {
    const col = columnOffsets[zone - 1];
    if (!col) return { left: 0, top: 0 };
    const tilesPerRow = 2;
    const row = Math.floor(rankInZone / tilesPerRow);
    const colInGroup = rankInZone % tilesPerRow;
    const totalTileWidth = 2 * TILE_SIZE + FIXED_GAP;
    const startX = col.left + (col.width - totalTileWidth) / 2;
    return {
      left: startX + colInGroup * (TILE_SIZE + FIXED_GAP),
      top: ZONE_HEADER_HEIGHT + row * (TILE_TOTAL_HEIGHT + FIXED_GAP),
    };
  }, [columnOffsets]);

  if (!sessionActive) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center gap-6" style={{ background: '#0a0a0a' }}>
        <Heart className="w-20 h-20 text-primary animate-pulse" fill="currentColor" />
        <h2 className="text-2xl font-black text-white">Waiting for session...</h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
          The display will activate when the coach starts a session
        </p>
      </div>
    );
  }

  const ZONE_GLOWS = [
    { left: '10%', color: '#00bcd4' },
    { left: '30%', color: '#4caf50' },
    { left: '50%', color: '#ffc107' },
    { left: '70%', color: '#ff9800' },
    { left: '90%', color: '#f44336' },
  ];

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden" style={{ background: '#0a0a0a' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 flex-shrink-0" style={{ height: 56 }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Heart className="w-4 h-4 text-primary" fill="currentColor" />
          </div>
          <span className="text-xs font-black uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.6)' }}>
            HR Training
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>⌀</span>
          <span className="text-2xl font-black text-white tabular-nums">{averageBPM}</span>
          <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>BPM</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
            <span className="text-sm font-bold text-white">{participants.length}</span>
          </div>
          <span className="text-sm font-mono font-bold text-white tabular-nums">{formatElapsed(elapsedSeconds)}</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Live</span>
          </div>
        </div>
      </div>

      {/* Main zone grid */}
      <div className="relative flex-1 min-h-0 overflow-hidden px-4">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.45) 100%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse at 50% 50%, black 20%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 20%, transparent 75%)',
        }} />
        {ZONE_GLOWS.map((g, i) => (
          <div key={i} className="absolute pointer-events-none" style={{ left: g.left, top: '45%', transform: 'translate(-50%, -50%)', width: '450px', height: '500px', borderRadius: '50%', background: g.color, opacity: 0.18, filter: 'blur(300px)' }} />
        ))}

        {/* Zone headers */}
        <div className="relative grid grid-cols-5 gap-2 z-10 flex-shrink-0 pt-1 pb-2">
          {[1, 2, 3, 4, 5].map(zone => {
            const names: Record<number, string> = { 1: 'REGENERATION', 2: 'FAT BURN', 3: 'AEROBIC', 4: 'CARDIO', 5: 'MAX EFFORT' };
            return (
              <div key={zone} className="text-center">
                <h2 className="font-black text-[11px] tracking-[0.15em] uppercase" style={{ color: '#ffffff', textShadow: `0 0 8px ${ZONE_COLORS[zone]}44` }}>{names[zone]}</h2>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: ZONE_COLORS[zone] }}>Z{zone}</span>
                <div className="w-full h-px mt-1.5" style={{ background: `linear-gradient(90deg, transparent, ${ZONE_COLORS[zone]}55, transparent)` }} />
              </div>
            );
          })}
        </div>

        <div ref={gridRef} className="relative h-full grid grid-cols-5 gap-2 z-10">
          {[1, 2, 3, 4, 5].map(zone => (
            <ZoneColumn key={zone} zone={zone} participants={zoneGroups[zone]} />
          ))}

          {columnOffsets.length === 5 && participants.map(p => {
            const z = Math.min(Math.max(p.zone, 1), 5);
            const rank = zoneGroups[z].findIndex(x => x.profile_id === p.profile_id);
            const pos = getTilePosition(z, Math.max(rank, 0));
            return (
              <div key={p.profile_id} style={{
                position: 'absolute',
                left: pos.left,
                top: pos.top,
                transition: 'left 1.2s cubic-bezier(0.25,0.46,0.45,0.94), top 1.2s cubic-bezier(0.25,0.46,0.45,0.94)',
                zIndex: 20,
              }}>
                <HexTile data={p} tileSize={TILE_SIZE} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 grid grid-cols-5 gap-2 px-4 py-2" style={{ background: 'linear-gradient(to top, #000 60%, transparent)' }}>
        {[1, 2, 3, 4, 5].map(zone => (
          <div key={zone} className="flex justify-center">
            <div className="text-xs font-bold rounded-full px-2.5 py-0.5" style={{
              color: ZONE_COLORS[zone],
              background: `${ZONE_COLORS[zone]}12`,
              border: `1px solid ${ZONE_COLORS[zone]}22`,
            }}>
              {zoneGroups[zone].length}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NeutralLiveDisplay() {
  const { participants, isLoading } = useLiveHR(() => {});
  const { isActive: sessionActive, sessionCode, lobbyProfileIds } = useWorkoutSession();
  const [allProfiles, setAllProfiles] = useState<{ id: string; name: string; nickname?: string | null; created_at: string }[]>([]);

  useEffect(() => {
    supabase.from('profiles').select('id, name, nickname, created_at')
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setAllProfiles(data); });
  }, []);

  // Wake lock
  useEffect(() => {
    let wl: WakeLockSentinel | null = null;
    navigator.wakeLock?.request('screen').then(w => { wl = w; }).catch(() => {});
    return () => { wl?.release(); };
  }, []);

  if (!sessionActive) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center gap-6" style={{ background: '#0a0a0a' }}>
        <Heart className="w-20 h-20 text-primary animate-pulse" fill="currentColor" />
        <h2 className="text-2xl font-black text-white">Waiting for session...</h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
          The display will activate when the coach starts a session
        </p>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden" style={{ background: '#0a0a0a' }}>
      <NeutralDashboard
        participants={participants}
        allProfiles={allProfiles}
        lobbyProfileIds={lobbyProfileIds}
        sessionCode={sessionCode}
        isLoading={isLoading}
        isSessionActive={sessionActive}
      />
    </div>
  );
}

export default function Display() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('display_unlocked') === 'true');
  const [checking, setChecking] = useState(!unlocked);
  const [displayView, setDisplayViewState] = useState<'fancy' | 'neutral'>('fancy');

  useEffect(() => {
    if (unlocked) {
      supabase
        .from('active_sessions')
        .select('display_view')
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if ((data as any)?.display_view === 'neutral') setDisplayViewState('neutral');
          else setDisplayViewState('fancy');
        });
      return;
    }

    const checkAndUnlock = async () => {
      const { data } = await supabase
        .from('active_sessions')
        .select('session_code, display_view')
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        sessionStorage.setItem('display_unlocked', 'true');
        if ((data as any).display_view === 'neutral') setDisplayViewState('neutral');
        setUnlocked(true);
      }
      setChecking(false);
    };

    checkAndUnlock();

    const sub = supabase
      .channel('display-auto-unlock')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'active_sessions',
      }, (payload) => {
        sessionStorage.setItem('display_unlocked', 'true');
        if ((payload.new as any)?.display_view === 'neutral') setDisplayViewState('neutral');
        else setDisplayViewState('fancy');
        setUnlocked(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [unlocked]);

  // Subscribe to display_view changes when unlocked
  useEffect(() => {
    if (!unlocked) return;
    const sub = supabase
      .channel('display-view-sync')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'active_sessions',
      }, (payload) => {
        const row = payload.new as any;
        if (row.ended_at) return;
        if (row.display_view === 'fancy' || row.display_view === 'neutral') {
          setDisplayViewState(row.display_view);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [unlocked]);

  if (checking) {
    return (
      <div className="w-screen h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>Loading...</div>
      </div>
    );
  }

  if (!unlocked) {
    return <PinGate onUnlock={() => setUnlocked(true)} />;
  }

  return displayView === 'neutral' ? <NeutralLiveDisplay /> : <LiveDisplay />;
}
