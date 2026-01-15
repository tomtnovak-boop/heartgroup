import { CoachDashboard } from '@/components/dashboard/CoachDashboard';
import { AppHeader } from '@/components/layout/AppHeader';
import { useViewMode } from '@/hooks/useViewMode';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { viewMode, changeView } = useViewMode('coach');
  const navigate = useNavigate();

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
      />
      <CoachDashboard />
    </div>
  );
}
