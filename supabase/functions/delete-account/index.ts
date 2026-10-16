import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGIN = Deno.env.get("APP_URL") || "*";

function getCorsHeaders(origin: string | null) {
  const isLovablePreview = origin?.endsWith(".lovableproject.com") || origin?.endsWith(".lovable.app");
  const allowOrigin = origin && (origin === DEFAULT_ALLOWED_ORIGIN || isLovablePreview)
    ? origin
    : DEFAULT_ALLOWED_ORIGIN;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate caller from Bearer token — only the own account can be deleted.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uid = user.id;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Resolve profile id(s) for this user.
    const { data: profileRows } = await adminClient
      .from("profiles")
      .select("id")
      .eq("user_id", uid);

    const profileIds = (profileRows || []).map((p: { id: string }) => p.id);

    // Delete in FK order; each step is idempotent and failures are logged but do not abort.
    const steps: Array<() => PromiseLike<{ error: { message: string } | null }>> = [];

    if (profileIds.length > 0) {
      steps.push(
        () => adminClient.from("workout_hr_data").delete().in(
          "workout_id",
          // sub-select via workouts of these profiles
          [] as string[],
        ),
      );
    }

    // workout_hr_data depends on workouts — fetch workout ids first.
    if (profileIds.length > 0) {
      const { data: workouts } = await adminClient
        .from("workouts")
        .select("id")
        .in("profile_id", profileIds);
      const workoutIds = (workouts || []).map((w: { id: string }) => w.id);
      if (workoutIds.length > 0) {
        const { error } = await adminClient.from("workout_hr_data").delete().in("workout_id", workoutIds);
        if (error) console.error("delete workout_hr_data failed:", error.message);
      }
      const { error: wErr } = await adminClient.from("workouts").delete().in("profile_id", profileIds);
      if (wErr) console.error("delete workouts failed:", wErr.message);

      const { error: hrErr } = await adminClient.from("live_hr").delete().in("profile_id", profileIds);
      if (hrErr) console.error("delete live_hr failed:", hrErr.message);

      const { error: lobbyErr } = await adminClient.from("session_lobby").delete().in("profile_id", profileIds);
      if (lobbyErr) console.error("delete session_lobby failed:", lobbyErr.message);
    }

    const { error: sessErr } = await adminClient.from("active_sessions").delete().eq("created_by", uid);
    if (sessErr) console.error("delete active_sessions failed:", sessErr.message);

    const { error: rolesErr } = await adminClient.from("user_roles").delete().eq("user_id", uid);
    if (rolesErr) console.error("delete user_roles failed:", rolesErr.message);

    if (profileIds.length > 0) {
      const { error: profErr } = await adminClient.from("profiles").delete().in("id", profileIds);
      if (profErr) console.error("delete profiles failed:", profErr.message);
    }

    // Finally delete the auth user.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(uid);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
