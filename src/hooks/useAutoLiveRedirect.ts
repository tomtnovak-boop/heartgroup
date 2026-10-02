import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const skipAutoLiveKey = (sessionId: string) => `skipAutoLive:${sessionId}`;

/**
 * Polls every 2s for a running session of the signed-in coach and opens /coach/live.
 * Each session auto-opens at most once per tab; a manual return sets skipAutoLive:<id>.
 */
export function useAutoLiveRedirect(userId: string | null | undefined) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!userId) return; // wait for auth — otherwise the query runs as anon
    let cancelled = false;
    let busy = false;
    const check = async () => {
      if (busy) return;
      busy = true;
      try {
        const { data } = await supabase.from('active_sessions')
          .select('id, started_at, ended_at')
          .eq('created_by', userId)
          .is('ended_at', null)
          .not('started_at', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1).maybeSingle();
        if (cancelled || !data) return;
        if (sessionStorage.getItem(skipAutoLiveKey(data.id)) === '1') return;
        sessionStorage.setItem(skipAutoLiveKey(data.id), '1');
        navigate('/coach/live');
      } finally { busy = false; }
    };
    check();
    const t = setInterval(check, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, [userId, navigate]);
}
