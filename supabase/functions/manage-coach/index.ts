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

    // Verify caller is admin
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

    const userId = user.id;

    // Check admin role using service role client
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...payload } = await req.json();

    if (action === "create") {
      try {
        const { email, password, name, role: requestedRole } = payload;
        if (!email || !password) {
          return new Response(JSON.stringify({ error: "email and password required" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log('[create] step 1: creating auth user', { email });
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (createError) {
          console.error('[create] step 1 failed:', createError.message);
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const coachRole = requestedRole === "admin" ? "admin" : "coach";

        console.log('[create] step 2: deleting default participant role', { user_id: newUser.user.id });
        await adminClient
          .from("user_roles")
          .delete()
          .eq("user_id", newUser.user.id)
          .eq("role", "participant");

        console.log('[create] step 3: inserting role', { user_id: newUser.user.id, role: coachRole });
        const { error: roleError } = await adminClient
          .from("user_roles")
          .insert({ user_id: newUser.user.id, role: coachRole });

        if (roleError) {
          console.error('[create] step 3 failed:', roleError.message);
          return new Response(JSON.stringify({ error: roleError.message }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (name) {
          console.log('[create] step 4: creating profile', { user_id: newUser.user.id, name });
          await adminClient.from("profiles").upsert({
            user_id: newUser.user.id,
            name,
          }, { onConflict: "user_id" });
        }

        console.log('[create] success', { email, role: coachRole });
        return new Response(JSON.stringify({ success: true, email }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[create] unexpected error:', msg);
        return new Response(JSON.stringify({ error: msg }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "delete") {
      const { user_id: targetUserId } = payload;
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: deleteError } = await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId)
        .eq("role", "coach");

      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "deleteUser") {
      const { user_id: targetUserId } = payload;
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "deleteParticipant") {
      const { profile_id, user_id: targetUserId } = payload;
      if (!profile_id) {
        return new Response(JSON.stringify({ error: "profile_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: workouts } = await adminClient
        .from("workouts")
        .select("id")
        .eq("profile_id", profile_id);

      if (workouts && workouts.length > 0) {
        const workoutIds = workouts.map((w: { id: string }) => w.id);
        await adminClient.from("workout_hr_data").delete().in("workout_id", workoutIds);
      }

      await adminClient.from("workouts").delete().eq("profile_id", profile_id);
      await adminClient.from("live_hr").delete().eq("profile_id", profile_id);
      await adminClient.from("profiles").delete().eq("id", profile_id);

      if (targetUserId) {
        await adminClient.from("user_roles").delete().eq("user_id", targetUserId);
        await adminClient.auth.admin.deleteUser(targetUserId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "listCoaches") {
      const { data: coachRoles, error: rolesError } = await adminClient
        .from("user_roles")
        .select("user_id, created_at")
        .eq("role", "coach");

      if (rolesError) {
        return new Response(JSON.stringify({ error: rolesError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const coaches = [];
      for (const role of coachRoles || []) {
        const { data: userData } = await adminClient.auth.admin.getUserById(role.user_id);
        if (userData?.user) {
          coaches.push({
            user_id: role.user_id,
            email: userData.user.email,
            created_at: role.created_at,
          });
        }
      }

      return new Response(JSON.stringify({ coaches }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
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