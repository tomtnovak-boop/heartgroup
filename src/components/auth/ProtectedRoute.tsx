import { ReactNode, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from './AuthProvider';
import { ProfileCompletionForm } from './ProfileCompletionForm';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Heart } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireCoach?: boolean;
}

export function ProtectedRoute({ children, requireCoach = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isCoach, user } = useAuthContext();
  const location = useLocation();
  const [profileCheck, setProfileCheck] = useState<'loading' | 'complete' | 'incomplete'>('loading');
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setProfileCheck('loading');
      return;
    }

    const checkProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, birth_date, weight, gender')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!data || !data.birth_date || !data.weight || !data.gender) {
        setProfileData(data);
        setProfileCheck('incomplete');
      } else {
        setProfileCheck('complete');
      }
    };

    checkProfile();
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Heart className="w-12 h-12 text-primary animate-pulse" fill="currentColor" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/" state={{ from: location }} replace />;
  if (requireCoach && !isCoach) return <Navigate to="/training" replace />;

  if (profileCheck === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (profileCheck === 'incomplete') {
    return (
      <ProfileCompletionForm
        profileId={profileData?.id || ''}
        existingData={{
          birth_date: profileData?.birth_date,
          weight: profileData?.weight,
          gender: profileData?.gender,
        }}
        onComplete={() => setProfileCheck('complete')}
      />
    );
  }

  return <>{children}</>;
}
