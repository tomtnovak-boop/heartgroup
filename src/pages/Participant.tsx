import { useState } from 'react';
import { ProfileSelector } from '@/components/participant/ProfileSelector';
import { HeartRateDisplay } from '@/components/participant/HeartRateDisplay';
import { AppHeader } from '@/components/layout/AppHeader';
import { useViewMode } from '@/hooks/useViewMode';
import { useNavigate } from 'react-router-dom';

interface Profile {
  id: string;
  name: string;
  age: number;
  max_hr: number;
  custom_max_hr?: number | null;
}

export default function Participant() {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const { viewMode, changeView } = useViewMode('participant');
  const navigate = useNavigate();

  // If switched to coach view, redirect to main page with coach dashboard
  const handleViewChange = (view: 'participant' | 'coach') => {
    changeView(view);
    if (view === 'coach') {
      navigate('/');
    }
  };

  if (!selectedProfile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader currentView={viewMode} onViewChange={handleViewChange} />
        <div className="flex-1">
          <ProfileSelector onProfileSelected={setSelectedProfile} />
        </div>
      </div>
    );
  }

  return (
    <HeartRateDisplay
      profile={selectedProfile}
      onBack={() => setSelectedProfile(null)}
    />
  );
}
