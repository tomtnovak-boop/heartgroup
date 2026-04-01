import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, Monitor } from 'lucide-react';
import { NeutralDashboard } from '@/components/dashboard/NeutralDashboard';
import { SessionLeaderboard, LeaderboardEntry } from '@/components/dashboard/SessionLeaderboard';
import { AppHeader } from '@/components/layout/AppHeader';
import { useViewMode } from '@/hooks/useViewMode';
import { useLiveHR } from '@/hooks/useLiveHR';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function CoachNeutral() {
  const { viewMode, changeView } = useViewMode('coach');
  const navigate = useNavigate();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [leaderboardDuration, setLeaderboardDuration] = useState(0);
  const [leaderboardDate, setLeaderboardDate] = useState(new Date());
  const prevSessionActive = useRef(false);
  const [allProfiles, setAllProfiles] = useState<{ id: string; name: string; nickname?: string | null; created_at: string }[]>([]);

  const {
    isActive: sessionActive, elapsedSeconds: sessionElapsed,
    sessionCode, lobbyCount, lobbyProfileIds, createSessionCode, startSession, stopSession, recordHRData,
  } = useWorkoutSession();

  const onNewHRData = useCallback((data: { profile_id: string; bpm: number; zone: number; hr_percentage: number; timestamp: string }) => {
    recordHRData(data);
  }, [recordHRData]);

  const { participants, averageBPM, lowestBPM, highestBPM, averageZone, isLoading, refresh } = useLiveHR(onNewHRData);

  useEffect(() => {
    supabase.from('profiles').select('id, name, nickname, created_at').order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setAllProfiles(data); });
  }, []);

  useEffect(() => {
    if (prevSessionActive.current && !sessionActive) {
      const timer = setTimeout(async () => {
        try {
          const thirtySecsAgo = new Date(Date.now() - 30000).toISOString();
          const { data: workouts } = await supabase
            .from('workouts')
            .select('profile_id, avg_bpm, max_bpm, duration_seconds, total_calories, started_at, ended_at')
            .not('ended_at', 'is', null).gte('ended_at', thirtySecsAgo);
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
      }, 5000);
      return () => clearTimeout(timer);
    }
    prevSessionActive.current = sessionActive;
  }, [sessionActive]);

  const handleViewChange = (view: 'participant' | 'coach') => {
    changeView(view);
    if (view === 'participant') navigate('/participant');
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
          onClick={() => navigate('/coach')}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '13px', padding: '4px 8px' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ff4425')}
          onMouseLeave={e => (e.currentTarget.style.color = '#666')}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} /> Hub
        </button>
      </AppHeader>
      <div className="flex-1 min-h-0 overflow-hidden">
        <NeutralDashboard participants={participants} allProfiles={allProfiles} lobbyProfileIds={lobbyProfileIds} sessionCode={sessionCode} isLoading={isLoading} isSessionActive={sessionActive} />
      </div>
      {showLeaderboard && leaderboardData.length > 0 && (
        <SessionLeaderboard entries={leaderboardData} sessionDuration={leaderboardDuration} sessionDate={leaderboardDate} onClose={() => setShowLeaderboard(false)} variant="coach" />
      )}
    </div>
  );
}
