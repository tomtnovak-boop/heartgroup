import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, Monitor } from 'lucide-react';
import { NameGridDashboard } from '@/components/dashboard/NameGridDashboard';
import { TargetFocusDashboard } from '@/components/dashboard/TargetFocusDashboard';
import { SessionLeaderboard, LeaderboardEntry } from '@/components/dashboard/SessionLeaderboard';
import { AppHeader } from '@/components/layout/AppHeader';
import { useViewMode } from '@/hooks/useViewMode';
import { useLiveHR } from '@/hooks/useLiveHR';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logParticipantRedirect } from '@/lib/roleRouting';

export default function CoachLive() {
  const { viewMode, changeView } = useViewMode('coach');
  const navigate = useNavigate();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [leaderboardDuration, setLeaderboardDuration] = useState(0);
  const [leaderboardDate, setLeaderboardDate] = useState(new Date());
  const prevSessionActive = useRef(false);
  const [allProfiles, setAllProfiles] = useState<{ id: string; name: string; nickname?: string | null; created_at: string }[]>([]);
  const [targetZones, setTargetZonesState] = useState<number[]>([3, 4]);
  const [displayView, setDisplayViewState] = useState<string>('namegrid');
  const [liveCode, setLiveCode] = useState<string | null>(null);
  const [liveStarted, setLiveStarted] = useState(false);
  const liveIdRef = useRef<string | null>(null);

  const {
    isActive: sessionActive, elapsedSeconds: sessionElapsed,
    sessionCode, lobbyCount, lobbyProfileIds, createSessionCode, startSession, stopSession, recordHRData,
  } = useWorkoutSession();

  const onNewHRData = useCallback((data: { profile_id: string; bpm: number; zone: number; hr_percentage: number; timestamp: string }) => {
    recordHRData(data);
  }, [recordHRData]);

  const { participants, averageBPM, lowestBPM, highestBPM, averageZone, isLoading, refresh } = useLiveHR(onNewHRData);
  const effectiveCode = liveCode ?? sessionCode;
  const effectiveActive = liveCode ? liveStarted : sessionActive;
  const noOneConnected = !participants.some(p => p.bpm > 0 && p.connection_status !== 'disconnected');

  useEffect(() => {
    supabase.from('profiles').select('id, name, nickname, created_at').order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setAllProfiles(data); });
  }, []);

  useEffect(() => {
    const parse = (s?: string | null) => (s || '3,4').split(',').map(Number).filter(z => z >= 1 && z <= 5);
    let ch: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    let currentId: string | null = null;
    const apply = (row: any) => {
      if (!row?.started_at) return; // only started sessions take over the screen
      currentId = row?.id ?? null;
      liveIdRef.current = currentId;
      setDisplayViewState(row?.display_view === 'target' ? 'target' : 'namegrid');
      setTargetZonesState(parse(row?.target_zones));
      setLiveCode(row?.session_code ?? null);
      setLiveStarted(true);
    };
    const clear = () => { currentId = null; liveIdRef.current = null; setLiveCode(null); setLiveStarted(false); };
    const load = async (uid: string) => {
      const { data } = await supabase.from('active_sessions').select('id, session_code, started_at, display_view, target_zones')
        .eq('created_by', uid).is('ended_at', null).not('started_at', 'is', null)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (cancelled) return;
      if (data) apply(data);
      else clear();
    };
    let uidRef: string | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid || cancelled) return;
      uidRef = uid;
      await load(uid);
      poll = setInterval(() => { if (uidRef) load(uidRef); }, 2000);
      ch = supabase.channel(`coach-live-view-${uid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'active_sessions', filter: `created_by=eq.${uid}` }, (payload: any) => {
          const row = payload.new;
          if (payload.eventType === 'INSERT' && row && !row.ended_at && row.started_at) { apply(row); return; }
          if (row && !row.ended_at && row.started_at) { if (!currentId || row.id === currentId) apply(row); else load(uid); return; }
          load(uid);
        })
        .subscribe((status) => { if (status === 'SUBSCRIBED') load(uid); });
    })();
    const refresh = () => { if (uidRef) load(uidRef); };
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', refresh);
    return () => { cancelled = true; if (poll) clearInterval(poll); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', refresh); if (ch) supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (prevSessionActive.current && !sessionActive) {
      const fetchAndShowLeaderboard = async () => {
        const thirtySecsAgo = new Date(Date.now() - 35000).toISOString();
        const { data: workouts } = await supabase
          .from('workouts')
          .select('profile_id, avg_bpm, max_bpm, duration_seconds, total_calories, started_at, ended_at')
          .not('ended_at', 'is', null).gte('ended_at', thirtySecsAgo);
        return workouts && workouts.length > 0 ? workouts : null;
      };
      const timer = setTimeout(async () => {
        try {
          let workouts = await fetchAndShowLeaderboard();
          if (!workouts) {
            await new Promise(res => setTimeout(res, 2000));
            workouts = await fetchAndShowLeaderboard();
          }
          if (!workouts || workouts.length === 0) return;
          const profileIds = [...new Set(workouts.map(w => w.profile_id))];
          const { data: profiles } = await supabase.from('profiles').select('id, name, nickname').in('id', profileIds);
          const profileMap = new Map(profiles?.map(p => [p.id, p.nickname || p.name]) || []);
          const entries: LeaderboardEntry[] = workouts.map(w => ({
            profile_id: w.profile_id, name: profileMap.get(w.profile_id) || 'Unknown',
            avg_bpm: w.avg_bpm || 0, max_bpm: w.max_bpm || 0,
            duration_seconds: w.duration_seconds || 0, total_calories: Number(w.total_calories) || 0,
          }));
          setLeaderboardData(entries);
          setLeaderboardDuration(Math.max(...entries.map(e => e.duration_seconds), 0));
          setLeaderboardDate(new Date());
          setShowLeaderboard(true);
        } catch (err) { console.error('Error fetching leaderboard:', err); }
      }, 3000);
      return () => clearTimeout(timer);
    }
    prevSessionActive.current = sessionActive;
  }, [sessionActive]);

  const handleViewChange = (view: 'participant' | 'coach') => {
    changeView(view);
    if (view === 'participant') {
      logParticipantRedirect('CoachLive.handleViewChange', { view });
      navigate('/participant');
    }
  };

  return (
    <div className="h-dvh flex flex-col overflow-hidden" style={{ background: '#0a0a0a' }}>
      <AppHeader
        currentView={viewMode}
        onViewChange={handleViewChange}
        showViewSwitcher={false}
        activeTab="live"
        onRefresh={refresh}
        stats={{ participantCount: participants.length, averageBPM, lowestBPM, highestBPM, averageZone }}
        sessionActive={sessionActive}
        sessionElapsed={sessionElapsed}
        onStartSession={() => startSession(participants)}
        onStopSession={stopSession}
        sessionCode={sessionCode}
        lobbyCount={lobbyCount}
        onCreateSessionCode={createSessionCode}
      >
        <button
          onClick={() => {
            if (liveIdRef.current) sessionStorage.setItem(`skipAutoLive:${liveIdRef.current}`, '1');
            navigate('/coach');
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '13px', padding: '4px 8px' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ff4425')}
          onMouseLeave={e => (e.currentTarget.style.color = '#666')}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} /> Hub
        </button>
        <button
          onClick={() => window.open('/display', '_blank', 'noopener')}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-muted hover:bg-muted/80 transition-colors"
          title="Open TV Display"
        >
          <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </AppHeader>
      <div className="flex-1 min-h-0 overflow-hidden" style={{ position: 'relative' }}>
        {!liveCode ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: '#0a0a0a', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff4425', animation: 'pulse 2s ease-in-out infinite' }} />
            <div style={{ fontSize: 'clamp(20px, 3vw, 34px)', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>Waiting for session</div>
            <div style={{ fontSize: 'clamp(14px, 1.6vw, 18px)', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>Start a session in the Bheart app — this screen will follow automatically.</div>
          </div>
        ) : displayView === 'target' ? (
          <TargetFocusDashboard participants={participants} allProfiles={allProfiles} lobbyProfileIds={lobbyProfileIds} targetZones={targetZones} sessionCode={effectiveCode} isLoading={isLoading} isSessionActive={effectiveActive} />
        ) : (
          <NameGridDashboard participants={participants} allProfiles={allProfiles} lobbyProfileIds={lobbyProfileIds} sessionCode={effectiveCode} isLoading={isLoading} isSessionActive={effectiveActive} />
        )}
        {effectiveActive && effectiveCode && (noOneConnected ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', zIndex: 20, fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(18px, 3vw, 40px)', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>Session Code</div>
            <div style={{ fontSize: 'min(34vw, 40vh)', lineHeight: 0.95, fontWeight: 900, color: '#fff', letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}>{effectiveCode}</div>
            <div style={{ fontSize: 'clamp(16px, 2.2vw, 30px)', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Session running · enter this code in the Bheart app to join</div>
          </div>
        ) : (
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 20, background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8, padding: '6px 16px', display: 'flex', alignItems: 'baseline', gap: 10, fontFamily: 'system-ui, sans-serif', pointerEvents: 'none' }}>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', color: '#8a8a8a', textTransform: 'uppercase' }}>Code</span>
            <span style={{ fontSize: 34, fontWeight: 900, color: '#fff', letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}>{effectiveCode}</span>
          </div>
        ))}
      </div>
      {showLeaderboard && leaderboardData.length > 0 && (
        <SessionLeaderboard entries={leaderboardData} sessionDuration={leaderboardDuration} sessionDate={leaderboardDate} onClose={() => {
          setShowLeaderboard(false);
          createSessionCode();
        }} variant="coach" />
      )}
    </div>
  );
}
