import { supabase } from '@/integrations/supabase/client';

export async function setDisplayView(view: 'fancy' | 'neutral') {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  await supabase
    .from('active_sessions')
    .update({ display_view: view } as any)
    .eq('created_by', userData.user.id)
    .is('ended_at', null);
}
