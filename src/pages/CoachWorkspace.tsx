import { useState, useCallback, useEffect, useRef } from 'react';
import { Monitor, LogOut, Heart } from 'lucide-react';
import { CoachDashboard } from '@/components/dashboard/CoachDashboard';
import { NeutralDashboard } from '@/components/dashboard/NeutralDashboard';
import { SessionLeaderboard, LeaderboardEntry } from '@/components/dashboard/SessionLeaderboard';
import { AppHeader } from '@/components/layout/AppHeader';
import { useViewMode } from '@/hooks/useViewMode';
import { useLiveHR } from '@/hooks/useLiveHR';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { logParticipantRedirect } from '@/lib/roleRouting';
import { AdminParticipantsTab } from '@/components/admin/AdminParticipantsTab';
import { AdminCoachesTab } from '@/components/admin/AdminCoachesTab';
import { CoachAlertDashboard } from '@/components/dashboard/CoachAlertDashboard';
import { ZoneFocusDashboard } from '@/components/dashboard/ZoneFocusDashboard';

type WorkspaceTab = 'fancy' | 'neutral' | 'zone-focus' | 'coach-alert' | 'participants' | 'coaches';

export default function CoachWorkspace() {
  const { isAdmin, isCoach, user, signOut } = useAuthContext();
  const { viewMode, changeView } = useViewMode('coach');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('fancy');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [leaderboardDuration, setLeaderboardDuration] = useState(0);
  const [leaderboardDate, setLeaderboardDate] = useState(new Date());
  const prevSessionActive = useRef(false);
  const [allProfiles, setAllProfiles] = useState<{ id: string; name: string; nickname?: string | null; created_at: string }[]>([]);

  const {
    isActive: sessionActive,
    elapsedSeconds: sessionElapsed,
    activeWorkoutProfileIds,
    sessionCode,
    lobbyCount,
    lobbyProfileIds,
    createSessionCode,
    startSession,
    stopSession,
    recordHRData,
  } = useWorkoutSession();

  const onNewHRData = useCallback((data: { profile_id: string; bpm: number; zone: number; hr_percentage: number; timestamp: string }) => {
    recordHRData(data);
  }, [recordHRData]);

  const { participants, averageBPM, lowestBPM, highestBPM, averageZone, isLoading, refresh } = useLiveHR(onNewHRData);

  useEffect(() => {
    async function fetchProfiles() {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, nickname, created_at')
        .order('created_at', { ascending: true });
      if (data) setAllProfiles(data);
    }
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (prevSessionActive.current && !sessionActive) {
      const timer = setTimeout(async () => {
        try {
          const thirtySecsAgo = new Date(Date.now() - 30000).toISOString();
          const { data: workouts } = await supabase
            .from('workouts')
            .select('profile_id, avg_bpm, max_bpm, duration_seconds, total_calories, started_at, ended_at')
            .not('ended_at', 'is', null)
            .gte('ended_at', thirtySecsAgo);

          if (!workouts || workouts.length === 0) return;

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
            total_calories: Number(w.total_calories) || 0,
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
      logParticipantRedirect('CoachWorkspace.handleViewChange', { view });
      navigate('/participant');
    }
  };

  const handleStartSession = () => {
    startSession(participants);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const isDashboardTab = activeTab === 'fancy' || activeTab === 'neutral' || activeTab === 'zone-focus' || activeTab === 'coach-alert';

  const tabs: { key: WorkspaceTab; label: string; adminOnly?: boolean }[] = [
    { key: 'fancy', label: 'Dashboard Fancy' },
    { key: 'neutral', label: 'Dashboard Neutral' },
    { key: 'zone-focus', label: 'Zone Focus' },
    { key: 'coach-alert', label: 'Coach Alert' },
    { key: 'participants', label: 'Teilnehmer', adminOnly: true },
    { key: 'coaches', label: 'Coaches', adminOnly: true },
  ];

  const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin);

  const initials = user?.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="h-dvh flex flex-col overflow-hidden" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderBottom: '1px solid #1f1f1f',
        background: '#0a0a0a',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,68,37,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart style={{ width: 14, height: 14, color: '#ff4425', fill: '#ff4425' }} />
          </div>
          <span style={{ fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '14px' }}>
            <span style={{ color: '#fff', fontWeight: 'bold' }}>B</span>
            <span style={{ color: '#ff4425', fontWeight: 'bold' }}>heart</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: '#ff4425',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700, color: '#fff',
          }}>
            {initials}
          </div>
          <button
            onClick={handleSignOut}
            style={{
              background: 'none', border: 'none', color: '#666', cursor: 'pointer',
              display: 'flex', alignItems: 'center', padding: '4px',
            }}
            title="Logout"
          >
            <LogOut style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </header>

      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '8px 16px',
        background: '#0a0a0a',
        flexShrink: 0,
        overflowX: 'auto',
      }}>
        {visibleTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              background: activeTab === t.key ? '#ff4425' : '#1a1a1a',
              color: activeTab === t.key ? '#fff' : '#666',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 20px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Dashboard controls header - only for dashboard tabs */}
      {isDashboardTab && (
        <AppHeader
          currentView={viewMode}
          onViewChange={handleViewChange}
          showViewSwitcher={false}
          activeTab="live"
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
          sessionCode={sessionCode}
          lobbyCount={lobbyCount}
          onCreateSessionCode={createSessionCode}
        >
          <button
            onClick={() => window.open('/display', '_blank', 'noopener')}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-muted hover:bg-muted/80 transition-colors"
            title="Open TV Display"
          >
            <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </AppHeader>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'fancy' && (
          <CoachDashboard
            participants={participants}
            isLoading={isLoading}
            activeTab="live"
            averageBPM={averageBPM}
            isSessionActive={sessionActive}
            sessionCode={sessionCode}
            lobbyProfileIds={lobbyProfileIds}
          />
        )}
        {activeTab === 'neutral' && (
          <NeutralDashboard
            participants={participants}
            allProfiles={allProfiles}
            lobbyProfileIds={lobbyProfileIds}
            sessionCode={sessionCode}
            isLoading={isLoading}
            isSessionActive={sessionActive}
          />
        )}
        {activeTab === 'zone-focus' && (
          <ZoneFocusDashboard
            participants={participants}
            isLoading={isLoading}
            isSessionActive={sessionActive}
            sessionCode={sessionCode}
            lobbyProfileIds={lobbyProfileIds}
          />
        )}
        {activeTab === 'coach-alert' && (
          <CoachAlertDashboard
            participants={participants}
            isLoading={isLoading}
            isSessionActive={sessionActive}
            sessionCode={sessionCode}
            lobbyProfileIds={lobbyProfileIds}
          />
        )}
        {activeTab === 'participants' && isAdmin && (
          <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
            <AdminParticipantsTab />
          </div>
        )}
        {activeTab === 'coaches' && isAdmin && (
          <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
            <AdminCoachesTab />
          </div>
        )}
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
