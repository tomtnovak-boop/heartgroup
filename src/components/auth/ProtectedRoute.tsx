import { ReactNode, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from './AuthProvider';
import { ProfileCompletionForm } from './ProfileCompletionForm';
import { supabase } from '@/integrations/supabase/client';
import { getCoachOrAdminStatus, logParticipantRedirect } from '@/lib/roleRouting';
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
  const [coachAccessCheck, setCoachAccessCheck] = useState<'loading' | 'allowed' | 'denied'>(requireCoach ? 'loading' : 'allowed');

  useEffect(() => {
    if (!requireCoach) {
      setCoachAccessCheck('allowed');
      return;
    }

    if (!isAuthenticated || !user) {
      setCoachAccessCheck('loading');
      return;
    }

    let isActive = true;

    const checkCoachAccess = async () => {
      setCoachAccessCheck('loading');

      const { roles, isCoachOrAdmin, error } = await getCoachOrAdminStatus(user.id);

      if (!isActive) return;

      const hasCoachAccess = error ? isCoach : isCoachOrAdmin;

      console.log('[ProtectedRoute] requireCoach decision', {
        pathname: location.pathname,
        roles,
        isCoachOrAdmin,
        fallbackIsCoach: isCoach,
        hasCoachAccess,
        error: error?.message ?? null,
      });

      setCoachAccessCheck(hasCoachAccess ? 'allowed' : 'denied');
    };

    checkCoachAccess();

    return () => {
      isActive = false;
    };
  }, [requireCoach, isAuthenticated, user, location.pathname, isCoach]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setProfileCheck('loading');
      return;
    }

    const checkProfile = async () => {
      // Check if user is coach or admin — they skip profile completion entirely
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const roles = (roleData || []).map(r => r.role);
      console.log('[ProtectedRoute] profile check roles:', roles);
      if (roles.includes('coach') || roles.includes('admin')) {
        console.log('[ProtectedRoute] coach/admin detected — skipping profile completion');
        setProfileCheck('complete');
        return;
      }

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
  if (requireCoach && coachAccessCheck === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (requireCoach && coachAccessCheck === 'denied') {
    logParticipantRedirect('ProtectedRoute.requireCoach', { pathname: location.pathname });
    return <Navigate to="/participant" replace />;
  }

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
