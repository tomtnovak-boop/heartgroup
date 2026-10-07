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
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';

type LiveSession = Pick<Tables<'active_sessions'>, 'id' | 'session_code' | 'started_at' | 'ended_at' | 'display_view' | 'target_zones'>;

export default function CoachLive() {
  const { viewMode, changeView } = useViewMode('coach');
  const navigate = useNavigate();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [leaderboardDuration, setLeaderboardDuration] = useState(0);
  const [leaderboardDate, setLeaderboardDate] = useState(new Date());
  const { user, isLoading: authLoading } = useAuth();
  const [recapSession, setRecapSession] = useState<LiveSession | null>(null);
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
  const effectiveCode = liveCode;
  const effectiveActive = !!liveCode && liveStarted;
  const noOneConnected = !participants.some(p => p.bpm > 0 && p.connection_status !== 'disconnected' && Date.now() - new Date(p.timestamp).getTime() < 30000);

  useEffect(() => {
    supabase.from('profiles').select('id, name, nickname, created_at').order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setAllProfiles(data); });
  }, []);

  useEffect(() => {
    if (authLoading || !user?.id) return;
    const uid = user.id;
    const parse = (s?: string | null) => (s || '3,4').split(',').map(Number).filter(z => z >= 1 && z <= 5);
    let cancelled = false;
    let loading = false;
    let current: LiveSession | null = null;
    const completed = new Set<string>();
    const finish = (row: LiveSession) => {
      if (!row.started_at || completed.has(row.id)) return;
      completed.add(row.id);
      setLeaderboardData([]);
      setLeaderboardDuration(Math.max(0, Math.floor((new Date(row.ended_at || Date.now()).getTime() - new Date(row.started_at).getTime()) / 1000)));
      setLeaderboardDate(new Date(row.ended_at || Date.now()));
      setRecapSession(row);
      setShowLeaderboard(true);
    };
    const apply = (row: LiveSession) => {
      current = row;
      liveIdRef.current = row.id;
      setDisplayViewState(row.display_view === 'target' ? 'target' : 'namegrid');
      setTargetZonesState(parse(row.target_zones));
      setLiveCode(row.session_code);
      setLiveStarted(!!row.started_at);
    };
    const clear = () => { current = null; liveIdRef.current = null; setLiveCode(null); setLiveStarted(false); };
    const load = async () => {
      if (loading || cancelled) return;
      loading = true;
      try {
        const { data, error } = await supabase.from('active_sessions')
          .select('id, session_code, started_at, ended_at, display_view, target_zones')
          .eq('created_by', uid).is('ended_at', null)
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (cancelled || error) return;
        if (current?.started_at && current.id !== data?.id) {
          const previous = current;
          const { data: ended, error: endError } = await supabase.from('active_sessions')
            .select('id, session_code, started_at, ended_at, display_view, target_zones')
            .eq('created_by', uid).eq('id', previous.id).maybeSingle();
          if (cancelled || endError) return;
          // A removed session is no longer open; preserve its observed start for the recap.
          if (!ended || ended.ended_at) finish(ended || { ...previous, ended_at: new Date().toISOString() });
        }
        if (data) apply(data);
        else clear();
      } finally { loading = false; }
    };
    void load();
    const poll = setInterval(() => void load(), 2000);
    const channel = supabase.channel(`coach-live-view-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_sessions', filter: `created_by=eq.${uid}` }, payload => {
        const row = payload.new as LiveSession;
        if (row?.ended_at && current?.id === row.id) {
          finish({ ...current, ...row });
          clear();
        }
        void load();
      })
      .subscribe(status => { if (status === 'SUBSCRIBED') void load(); });
    const onVis = () => { if (document.visibilityState === 'visible') void load(); };
    const onFocus = () => void load();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
      void supabase.removeChannel(channel);
    };
  }, [user?.id, authLoading]);

  const closeRecap = useCallback(() => {
    setShowLeaderboard(false);
    setRecapSession(null);
  }, []);

  useEffect(() => {
    if (!showLeaderboard || !recapSession?.started_at) return;
    let cancelled = false;
    const startedAt = recapSession.started_at;
    const end = recapSession.ended_at || new Date().toISOString();
    const fetchResults = async () => {
      // Workouts share the session start time (including late joiners).
      // Bound both ends instead of collecting every recently ended workout.
      const { data, error } = await supabase.from('workouts')
        .select('profile_id, avg_bpm, max_bpm, duration_seconds, total_calories')
        .gte('started_at', startedAt).lte('started_at', end)
        .not('ended_at', 'is', null).lte('ended_at', new Date(new Date(end).getTime() + 30000).toISOString());
      if (cancelled || error) return;
      const entries: LeaderboardEntry[] = (data || []).filter(row => row?.profile_id).map(row => ({
        profile_id: row.profile_id, name: '',
        avg_bpm: row.avg_bpm ?? Number.NaN,
        max_bpm: row.max_bpm ?? Number.NaN,
        duration_seconds: row.duration_seconds ?? 0,
        total_calories: row.total_calories == null ? undefined : Number(row.total_calories),
      }));
      setLeaderboardData(entries);
    };
    // Session end can arrive before workout finalization on the phone.
    void fetchResults();
    const retry = setInterval(() => void fetchResults(), 2000);
    const stopRetry = setTimeout(() => clearInterval(retry), 30000);
    const dismiss = setTimeout(closeRecap, 150000);
    return () => { cancelled = true; clearInterval(retry); clearTimeout(stopRetry); clearTimeout(dismiss); };
  }, [recapSession, showLeaderboard, closeRecap]);

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
        sessionActive={effectiveActive}
        sessionElapsed={sessionElapsed}
        onStartSession={() => startSession(participants)}
        onStopSession={stopSession}
        sessionCode={effectiveCode}
        lobbyCount={lobbyCount}
        onCreateSessionCode={createSessionCode}
      >
        {liveCode && (
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: displayView === 'target' ? '#ff4425' : '#8a8a8a', border: '1px solid #2a2a2a', borderRadius: 999, padding: '4px 10px', whiteSpace: 'nowrap', fontFamily: 'system-ui, sans-serif' }}>
            {displayView === 'target' ? 'Target Focus' : 'Overview'}
          </span>
        )}
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
            <style>{`@keyframes coachLivePulse { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }`}</style>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff4425', animation: 'coachLivePulse 2s ease-in-out infinite' }} />
            <div style={{ fontSize: 'clamp(20px, 3vw, 34px)', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>Waiting for session</div>
            <div style={{ fontSize: 'clamp(14px, 1.6vw, 18px)', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>Start a session in the Bheart app — this screen will follow automatically.</div>
          </div>
        ) : displayView === 'target' ? (
          <TargetFocusDashboard participants={participants} allProfiles={allProfiles} lobbyProfileIds={lobbyProfileIds} targetZones={targetZones} sessionCode={effectiveCode} isLoading={isLoading} isSessionActive={effectiveActive} />
        ) : (
          <NameGridDashboard participants={participants} allProfiles={allProfiles} lobbyProfileIds={lobbyProfileIds} sessionCode={effectiveCode} isLoading={isLoading} isSessionActive={effectiveActive} />
        )}
        {liveCode && ((!liveStarted || noOneConnected) ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', zIndex: 20, fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(18px, 3vw, 40px)', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>Session Code</div>
            <div style={{ fontSize: 'min(34vw, 40vh)', lineHeight: 0.95, fontWeight: 900, color: '#fff', letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}>{effectiveCode}</div>
            <div style={{ fontSize: 'clamp(16px, 2.2vw, 30px)', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{liveStarted ? 'Session running · enter this code in the Bheart app to join' : 'Enter this code in the Bheart app to join'}</div>
          </div>
        ) : (
          null
        ))}
      </div>
      {showLeaderboard && (
        <SessionLeaderboard entries={leaderboardData} sessionDuration={leaderboardDuration} sessionDate={leaderboardDate} onClose={closeRecap} variant="coach" />
      )}
    </div>
  );
}
