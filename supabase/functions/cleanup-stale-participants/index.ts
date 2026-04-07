import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const cutoff = new Date(Date.now() - 30 * 1000).toISOString();

    const [lobbyResult, liveHrResult] = await Promise.all([
      adminClient.from('session_lobby').delete().lt('last_seen', cutoff).select('id'),
      adminClient.from('live_hr').delete().lt('last_seen', cutoff).select('id'),
    ]);

    const lobbyDeleted = lobbyResult.data?.length || 0;
    const liveHrDeleted = liveHrResult.data?.length || 0;

    if (lobbyDeleted > 0 || liveHrDeleted > 0) {
      console.log(`Cleanup: removed ${lobbyDeleted} lobby + ${liveHrDeleted} live_hr stale entries`);
    }

    return new Response(
      JSON.stringify({ lobbyDeleted, liveHrDeleted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Cleanup error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
