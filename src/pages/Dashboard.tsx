import { useState, useCallback, useEffect, useRef } from 'react';
import { CoachDashboard } from '@/components/dashboard/CoachDashboard';
import { AppHeader } from '@/components/layout/AppHeader';
import { useViewMode } from '@/hooks/useViewMode';
import { useLiveHR } from '@/hooks/useLiveHR';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { viewMode, changeView } = useViewMode('coach');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('live');

  const {
    isActive: sessionActive,
    elapsedSeconds: sessionElapsed,
    activeWorkoutProfileIds,
    startSession,
    stopSession,
    recordHRData,
    addLateJoiner,
  } = useWorkoutSession();

  const onNewHRData = useCallback((data: { profile_id: string; bpm: number; zone: number; hr_percentage: number; timestamp: string }) => {
    recordHRData(data);
  }, [recordHRData]);

  const { participants, averageBPM, averageZone, isLoading, refresh } = useLiveHR(onNewHRData);

  // Track late-joining participants
  const addedRef = useRef(new Set<string>());

  useEffect(() => {
    if (!sessionActive || participants.length === 0) return;

    participants.forEach(async (p) => {
      if (activeWorkoutProfileIds.includes(p.profile_id)) return;
      if (addedRef.current.has(p.profile_id)) return;

      addedRef.current.add(p.profile_id);
      const added = await addLateJoiner(p.profile_id, p.profile?.name || 'Unknown');
      if (added) {
        toast({
          title: 'New participant added to session',
          description: p.profile?.name || p.profile_id,
        });
      } else {
        addedRef.current.delete(p.profile_id);
      }
    });
  }, [sessionActive, participants, activeWorkoutProfileIds, addLateJoiner, toast]);

  // Reset tracking set when session stops
  useEffect(() => {
    if (!sessionActive) {
      addedRef.current.clear();
    }
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
    </div>
  );
}
