import { useState, useCallback } from 'react';
import { CoachDashboard } from '@/components/dashboard/CoachDashboard';
import { AppHeader } from '@/components/layout/AppHeader';
import { useViewMode } from '@/hooks/useViewMode';
import { useLiveHR } from '@/hooks/useLiveHR';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { viewMode, changeView } = useViewMode('coach');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('live');

  const {
    isActive: sessionActive,
    elapsedSeconds: sessionElapsed,
    startSession,
    stopSession,
    recordHRData,
  } = useWorkoutSession();

  const onNewHRData = useCallback((data: { profile_id: string; bpm: number; zone: number; hr_percentage: number; timestamp: string }) => {
    recordHRData(data);
  }, [recordHRData]);

  const { participants, averageBPM, averageZone, isLoading, refresh } = useLiveHR(onNewHRData);

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
