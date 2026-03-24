import { useState } from 'react';
import { CoachDashboard } from '@/components/dashboard/CoachDashboard';
import { AppHeader } from '@/components/layout/AppHeader';
import { useViewMode } from '@/hooks/useViewMode';
import { useLiveHR } from '@/hooks/useLiveHR';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { viewMode, changeView } = useViewMode('coach');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('live');
  const { participants, averageBPM, averageZone, isLoading, refresh } = useLiveHR();

  const handleViewChange = (view: 'participant' | 'coach') => {
    changeView(view);
    if (view === 'participant') {
      navigate('/participant');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
      />
      <CoachDashboard
        participants={participants}
        isLoading={isLoading}
        activeTab={activeTab}
      />
    </div>
  );
}
