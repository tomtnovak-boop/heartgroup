import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type AppRole = 'admin' | 'coach' | 'participant';

interface UserRoleState {
  roles: AppRole[];
  isLoading: boolean;
  isCoach: boolean;
  isAdmin: boolean;
  isParticipant: boolean;
}

export function useUserRole() {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<UserRoleState>({
    roles: [],
    isLoading: true,
    isCoach: false,
    isAdmin: false,
    isParticipant: false,
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setState({
        roles: [],
        isLoading: false,
        isCoach: false,
        isAdmin: false,
        isParticipant: false,
      });
      return;
    }

    const fetchRoles = async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user roles:', error);
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const roles = (data || []).map(r => r.role as AppRole);
      setState({
        roles,
        isLoading: false,
        isCoach: roles.includes('coach') || roles.includes('admin'),
        isAdmin: roles.includes('admin'),
        isParticipant: roles.includes('participant'),
      });
    };

    fetchRoles();
  }, [user, authLoading]);

  return state;
}
