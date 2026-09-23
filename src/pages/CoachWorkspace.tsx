import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Monitor, LogOut, Heart } from 'lucide-react';
import { NameGridDashboard } from '@/components/dashboard/NameGridDashboard';
import { TargetFocusDashboard } from '@/components/dashboard/TargetFocusDashboard';
import { SessionLeaderboard, LeaderboardEntry } from '@/components/dashboard/SessionLeaderboard';
import { AppHeader } from '@/components/layout/AppHeader';
import { useViewMode } from '@/hooks/useViewMode';
import { useLiveHR } from '@/hooks/useLiveHR';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { logParticipantRedirect } from '@/lib/roleRouting';
import { setDisplayView, setTargetZones } from '@/lib/displaySync';
import { AdminParticipantsTab } from '@/components/admin/AdminParticipantsTab';
import { AdminCoachesTab } from '@/components/admin/AdminCoachesTab';
import { AdminClassesTab } from '@/components/admin/AdminClassesTab';
// Alte Ansichten (CoachDashboard/Fancy, NeutralDashboard, ZoneFocusDashboard, CoachAlertDashboard)
// sind ausgeblendet – Dateien/Seiten bleiben bestehen und sind notfalls per URL erreichbar.

type WorkspaceTab = 'namegrid' | 'target' | 'participants' | 'coaches' | 'classes';

const ZONES = [
  { n: 1, name: 'Recovery', pct: '50–60%', color: '#94A3B8' },
  { n: 2, name: 'Fat Burn', pct: '60–70%', color: '#0EA5E9' },
  { n: 3, name: 'Aerobic', pct: '70–80%', color: '#22C55E' },
  { n: 4, name: 'Cardio', pct: '80–90%', color: '#FBBF24' },
  { n: 5, name: 'Max', pct: '90–100%', color: '#EF4444' },
];

const PRESETS = [
  { label: 'Warm-up', zones: [1, 2] },
  { label: 'Fat Burn', zones: [2, 3] },
  { label: 'Cardio', zones: [3, 4] },
  { label: 'Peak/HIIT', zones: [4, 5] },
];

const zoneNames = (min: number, max: number) =>
  ZONES.filter(z => z.n >= min && z.n <= max).map(z => z.name).join(' · ');

export default function CoachWorkspace() {
  const { isAdmin, isCoach, user, signOut } = useAuthContext();
  const { viewMode, changeView } = useViewMode('coach');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('namegrid');
  const [selectedZones, setSelectedZones] = useState<number[]>([3, 4]);
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

  // Offene Session lesen: activeen Modus + Target Zonen initial übernehmen
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from('active_sessions')
        .select('display_view, target_zones')
        .eq('created_by', userData.user.id)
        .is('ended_at', null)
        .maybeSingle();
      if (!data) return;
      if (data.display_view === 'target') setActiveTab('target');
      if (data.target_zones) {
        const parsed = data.target_zones.split(',').map(Number).filter(n => n >= 1 && n <= 5);
        if (parsed.length) setSelectedZones([Math.min(...parsed), Math.max(...parsed)]);
      }
    })();
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
    // Standard beim Session-Start: Overview (namegrid)
    setActiveTab('namegrid');
    setDisplayView('namegrid');
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const applyZones = (next: number[]) => {
    setSelectedZones(next);
    setTargetZones(next);
  };

  const toggleZone = (n: number) => {
    const [min, max] = selectedZones;
    let next: number[];
    if (n < min) next = [n, max];
    else if (n > max) next = [min, n];
    else if (n === min && min < max) next = [min + 1, max];
    else if (n === max && max > min) next = [min, max - 1];
    else next = [n, n];
    applyZones(next);
  };

  // „Braucht Aufmerksamkeit": Live-Participants unterhalb/oberhalb des Zielbereichs
  const attention = useMemo(() => {
    const [tmin, tmax] = selectedZones;
    const prof = new Map(allProfiles.map(p => [p.id, p]));
    const lobby = new Set(lobbyProfileIds);
    const low: { id: string; name: string; bpm: number }[] = [];
    const high: typeof low = [];
    participants.forEach(p => {
      if (lobby.has(p.profile_id)) return;
      if (p.connection_status === 'disconnected' || !p.bpm) return;
      const z = Math.max(1, Math.min(5, p.zone));
      const name = prof.get(p.profile_id)?.nickname || prof.get(p.profile_id)?.name?.split(' ')[0] || '???';
      if (z < tmin) low.push({ id: p.profile_id, name, bpm: p.bpm });
      else if (z > tmax) high.push({ id: p.profile_id, name, bpm: p.bpm });
    });
    return { low, high };
  }, [participants, allProfiles, lobbyProfileIds, selectedZones]);

  const isDashboardTab = activeTab === 'namegrid' || activeTab === 'target';

  const tabs: { key: WorkspaceTab; label: string; adminOnly?: boolean }[] = [
    { key: 'namegrid', label: 'Overview' },
    { key: 'target', label: 'Target Focus' },
    // { key: 'fancy', label: 'Dashboard Fancy' },      // ausgeblendet – Seite bleibt per URL erreichbar
    // { key: 'neutral', label: 'Dashboard Neutral' },  // ausgeblendet – Seite bleibt per URL erreichbar
    // { key: 'zone-focus', label: 'Zone Focus' },      // ausgeblendet – Seite bleibt per URL erreichbar
    // { key: 'coach-alert', label: 'Coach Alert' },    // ausgeblendet – Seite bleibt per URL erreichbar
    { key: 'participants', label: 'Participants', adminOnly: true },
    { key: 'coaches', label: 'Coaches', adminOnly: true },
    { key: 'classes', label: 'Classes', adminOnly: true },
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

      {/* Tab Bar – nur noch zwei Anzeige-Modi */}
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
            onClick={() => {
              setActiveTab(t.key);
              if (t.key === 'namegrid' || t.key === 'target') setDisplayView(t.key);
            }}
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
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === 'namegrid' && (
          <div className="flex-1 min-h-0">
            <NameGridDashboard
              participants={participants}
              allProfiles={allProfiles}
              lobbyProfileIds={lobbyProfileIds}
              sessionCode={sessionCode}
              isLoading={isLoading}
              isSessionActive={sessionActive}
            />
          </div>
        )}
        {activeTab === 'target' && (
          <>
            {/* Target Zonen-Auswahl */}
            <div style={{
              flexShrink: 0,
              padding: '12px 16px',
              borderBottom: '1px solid #1f1f1f',
              background: '#0a0a0a',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {ZONES.map(z => {
                  const on = z.n >= selectedZones[0] && z.n <= selectedZones[1];
                  return (
                    <button
                      key={z.n}
                      onClick={() => toggleZone(z.n)}
                      style={{
                        background: on ? z.color : '#1a1a1a',
                        color: on ? '#0a0a0a' : '#666',
                        border: `1px solid ${on ? z.color : '#2a2a2a'}`,
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      title={`${z.name} (${z.pct})`}
                    >
                      {z.name} <span style={{ opacity: 0.7, fontWeight: 500 }}>{z.pct}</span>
                    </button>
                  );
                })}
                <span style={{ width: 1, height: 22, background: '#2a2a2a', margin: '0 4px' }} />
                {PRESETS.map(p => {
                  const active = p.zones[0] === selectedZones[0] && p.zones[1] === selectedZones[1];
                  return (
                    <button
                      key={p.label}
                      onClick={() => applyZones(p.zones)}
                      style={{
                        background: active ? '#2a2a2a' : '#1a1a1a',
                        color: active ? '#fff' : '#888',
                        border: '1px solid #2a2a2a',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
                Active: <span style={{ color: '#fff', fontWeight: 700 }}>{zoneNames(selectedZones[0], selectedZones[1])}</span>
              </div>
            </div>

            {/* Braucht Aufmerksamkeit */}
            {(attention.low.length > 0 || attention.high.length > 0) && (
              <div style={{
                flexShrink: 0,
                display: 'flex',
                gap: 16,
                padding: '10px 16px',
                borderBottom: '1px solid #1f1f1f',
                background: '#111',
                overflowX: 'auto',
              }}>
                {attention.low.length > 0 && (
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Too low
                    </span>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      {attention.low.map(m => (
                        <span key={m.id} style={{
                          background: 'rgba(148,163,184,0.12)', border: '1px solid rgba(148,163,184,0.3)',
                          borderRadius: 6, padding: '2px 8px', fontSize: 12, color: '#cbd5e1', whiteSpace: 'nowrap',
                        }}>
                          {m.name} · {m.bpm}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {attention.high.length > 0 && (
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Too high
                    </span>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      {attention.high.map(m => (
                        <span key={m.id} style={{
                          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
                          borderRadius: 6, padding: '2px 8px', fontSize: 12, color: '#fca5a5', whiteSpace: 'nowrap',
                        }}>
                          {m.name} · {m.bpm}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 min-h-0">
              <TargetFocusDashboard
                participants={participants}
                allProfiles={allProfiles}
                lobbyProfileIds={lobbyProfileIds}
                targetZones={selectedZones}
                sessionCode={sessionCode}
                isLoading={isLoading}
                isSessionActive={sessionActive}
              />
            </div>
          </>
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
        {activeTab === 'classes' && isAdmin && (
          <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
            <AdminClassesTab />
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
