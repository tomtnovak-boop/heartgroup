import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getZone(hrPct: number): number {
  if (hrPct < 60) return 1;
  if (hrPct < 70) return 2;
  if (hrPct < 80) return 3;
  if (hrPct < 90) return 4;
  return 5;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Get test profiles only (user_id = null) — real users use their own devices
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, max_hr")
    .is("user_id", null);

  if (profilesError || !profiles?.length) {
    return new Response(
      JSON.stringify({ error: profilesError?.message || "No test profiles" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Initialize each profile with a random starting BPM
  const currentBpm = new Map<string, number>();
  for (const p of profiles) {
    currentBpm.set(p.id, Math.floor(Math.random() * 91) + 90); // 90-180
  }

  const iterations = 27;
  for (let i = 0; i < iterations; i++) {
    const rows = profiles.map((p) => {
      const prevBpm = currentBpm.get(p.id)!;
      // Vary by ±10% of current BPM
      const maxDelta = Math.max(1, Math.round(prevBpm * 0.01));
      const delta = Math.floor(Math.random() * (maxDelta * 2 + 1)) - maxDelta;
      const bpm = clamp(prevBpm + delta, 60, 200);
      currentBpm.set(p.id, bpm);

      const maxHr = p.max_hr || 190;
      const hrPct = Math.round((bpm / maxHr) * 100);
      const zone = getZone(hrPct);
      return { profile_id: p.id, bpm, zone, hr_percentage: hrPct };
    });

    await supabase.from("live_hr").insert(rows);

    if (i < iterations - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return new Response(
    JSON.stringify({ success: true, profiles: profiles.length, iterations }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
