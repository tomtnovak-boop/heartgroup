import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { HeartRateDisplay } from '@/components/participant/HeartRateDisplay';
import { useViewMode } from '@/hooks/useViewMode';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Heart } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  age: number;
  max_hr: number;
  custom_max_hr?: number | null;
}

export default function Participant() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTrainingActive, setIsTrainingActive] = useState(false);
  const { viewMode, changeView } = useViewMode('participant');
  const navigate = useNavigate();
  const { user, isCoach } = useAuthContext();

  // Fetch user's profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setIsLoading(false);
        return;
      }

      setProfile(data);
      setIsLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleViewChange = (view: 'participant' | 'coach') => {
    changeView(view);
    if (view === 'coach') {
      navigate('/dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Heart className="w-12 h-12 text-primary animate-pulse" fill="currentColor" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Lade Profil...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader 
          currentView={viewMode} 
          onViewChange={handleViewChange}
          showViewSwitcher={isCoach}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Kein Profil gefunden</h2>
            <p className="text-muted-foreground">
              Bitte kontaktiere deinen Coach um dein Profil zu erstellen.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isTrainingActive) {
    return (
      <HeartRateDisplay
        profile={profile}
        onBack={() => setIsTrainingActive(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader 
        currentView={viewMode} 
        onViewChange={handleViewChange}
        showViewSwitcher={isCoach}
      />
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          {/* Profile Info */}
          <div className="space-y-2">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <Heart className="w-10 h-10 text-primary" fill="currentColor" />
            </div>
            <h1 className="text-2xl font-bold">Hallo, {profile.name}!</h1>
            <p className="text-muted-foreground">
              Deine maximale Herzfrequenz: {profile.custom_max_hr || profile.max_hr} bpm
            </p>
          </div>

          {/* Start Training Button */}
          <button
            onClick={() => setIsTrainingActive(true)}
            className="w-full py-6 px-8 rounded-2xl bg-primary text-primary-foreground font-semibold text-xl shadow-lg hover:bg-primary/90 transition-all active:scale-95"
          >
            <div className="flex items-center justify-center gap-3">
              <Heart className="w-6 h-6" fill="currentColor" />
              Training starten
            </div>
          </button>

          <p className="text-sm text-muted-foreground">
            Stelle sicher, dass dein Herzfrequenz-Brustgurt angelegt und Bluetooth aktiviert ist.
          </p>
        </div>
      </div>
    </div>
  );
}
