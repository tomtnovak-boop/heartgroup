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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Get all test profiles (user_id IS NULL)
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

  // Run for ~55 seconds, inserting every 2 seconds
  const iterations = 27;
  for (let i = 0; i < iterations; i++) {
    const rows = profiles.map((p) => {
      const bpm = Math.floor(Math.random() * 91) + 90; // 90-180
      const maxHr = p.max_hr || 190;
      const hrPct = Math.round((bpm / maxHr) * 100);
      const zone = getZone(hrPct);
      return {
        profile_id: p.id,
        bpm,
        zone,
        hr_percentage: hrPct,
      };
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
