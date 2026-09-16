import { supabase } from '@/integrations/supabase/client';

export type DisplayView = 'fancy' | 'neutral' | 'namegrid' | 'target' | string;

export async function setDisplayView(view: DisplayView) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  await supabase
    .from('active_sessions')
    .update({ display_view: view } as any)
    .eq('created_by', userData.user.id)
    .is('ended_at', null);
}

export async function setTargetZones(zones: number[]) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from('active_sessions')
    .update({ target_zones: zones.join(',') } as any)
    .eq('created_by', data.user.id).is('ended_at', null);
}
