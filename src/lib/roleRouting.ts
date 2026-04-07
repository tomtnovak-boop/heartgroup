import { supabase } from '@/integrations/supabase/client';

type RoleRecord = {
  role: 'admin' | 'coach' | 'participant';
};

export function logParticipantRedirect(source: string, details?: Record<string, unknown>) {
  console.log(`[Redirect:/participant] ${source}`, details ?? {});
}

export async function getCoachOrAdminStatus(userId: string) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  const roles = (data ?? []) as RoleRecord[];
  const isCoachOrAdmin = roles.some(({ role }) => role === 'admin' || role === 'coach');

  console.log('[RoleCheck] coach/admin access', {
    userId,
    roles,
    isCoachOrAdmin,
    error: error?.message ?? null,
  });

  return { roles, isCoachOrAdmin, error };
}