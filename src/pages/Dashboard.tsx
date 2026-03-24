import { useState, useCallback, useEffect, useRef } from 'react';
import { CoachDashboard } from '@/components/dashboard/CoachDashboard';
import { SessionLeaderboard } from '@/components/dashboard/SessionLeaderboard';
import { AppHeader } from '@/components/layout/AppHeader';
import { useViewMode } from '@/hooks/useViewMode';
import { useLiveHR } from '@/hooks/useLiveHR';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  profile_id: string;
  name: string;
  avg_bpm: number;
  max_bpm: number;
  duration_seconds: number;
}

export default function Dashboard() {
  const { viewMode, changeView } = useViewMode('coach');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('live');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [leaderboardDuration, setLeaderboardDuration] = useState(0);
  const [leaderboardDate, setLeaderboardDate] = useState(new Date());
  const prevSessionActive = useRef(false);

  const {
    isActive: sessionActive,
    elapsedSeconds: sessionElapsed,
    activeWorkoutProfileIds,
    startSession,
    stopSession,
    recordHRData,
  } = useWorkoutSession();

  const onNewHRData = useCallback((data: { profile_id: string; bpm: number; zone: number; hr_percentage: number; timestamp: string }) => {
    recordHRData(data);
  }, [recordHRData]);

  const { participants, averageBPM, lowestBPM, highestBPM, averageZone, isLoading, refresh } = useLiveHR(onNewHRData);

  // Detect session stop → show leaderboard after 5s
  useEffect(() => {
    if (prevSessionActive.current && !sessionActive) {
      // Session just stopped — fetch leaderboard data after 5s
      const timer = setTimeout(async () => {
        try {
          // Get recently ended workouts (ended in last 30s)
          const thirtySecsAgo = new Date(Date.now() - 30000).toISOString();
          const { data: workouts } = await supabase
            .from('workouts')
            .select('profile_id, avg_bpm, max_bpm, duration_seconds, started_at, ended_at')
            .not('ended_at', 'is', null)
            .gte('ended_at', thirtySecsAgo);

          if (!workouts || workouts.length === 0) return;

          // Get profile names
          const profileIds = [...new Set(workouts.map(w => w.profile_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name, nickname')
            .in('id', profileIds);

          const profileMap = new Map(profiles?.map(p => [p.id, p.nickname || p.name]) || []);

          const entries: LeaderboardEntry[] = workouts.map(w => ({
            profile_id: w.profile_id,
            name: profileMap.get(w.profile_id) || 'Unknown',
            avg_bpm: w.avg_bpm || 0,
            max_bpm: w.max_bpm || 0,
            duration_seconds: w.duration_seconds || 0,
          }));

          const maxDuration = Math.max(...entries.map(e => e.duration_seconds), 0);
          setLeaderboardData(entries);
          setLeaderboardDuration(maxDuration);
          setLeaderboardDate(new Date());
          setShowLeaderboard(true);
        } catch (err) {
          console.error('Error fetching leaderboard:', err);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
    prevSessionActive.current = sessionActive;
  }, [sessionActive]);

  const handleViewChange = (view: 'participant' | 'coach') => {
    changeView(view);
    if (view === 'participant') {
      navigate('/participant');
    }
  };

  const handleStartSession = () => {
    startSession(participants);
  };

  return (
    <div className="h-dvh flex flex-col overflow-hidden" style={{ background: '#0a0a0a' }}>
      <AppHeader
        currentView={viewMode}
        onViewChange={handleViewChange}
        showViewSwitcher={true}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={refresh}
        stats={{
          participantCount: participants.length,
          averageBPM,
          lowestBPM,
          highestBPM,
          averageZone,
        }}
        sessionActive={sessionActive}
        sessionElapsed={sessionElapsed}
        onStartSession={handleStartSession}
        onStopSession={stopSession}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        <CoachDashboard
          participants={participants}
          isLoading={isLoading}
          activeTab={activeTab}
          averageBPM={averageBPM}
          isSessionActive={sessionActive}
        />
      </div>

      {showLeaderboard && leaderboardData.length > 0 && (
        <SessionLeaderboard
          entries={leaderboardData}
          sessionDuration={leaderboardDuration}
          sessionDate={leaderboardDate}
          onClose={() => setShowLeaderboard(false)}
          variant="coach"
        />
      )}
    </div>
  );
}
