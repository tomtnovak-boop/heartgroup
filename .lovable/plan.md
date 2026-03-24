

## Security Fix: Edge Functions Hardening

### Fix 1 — Add Auth to `cleanup-live-hr`
Replace `supabase/functions/cleanup-live-hr/index.ts` with the provided code that:
- Requires a Bearer JWT token
- Verifies the caller via `auth.getUser()`
- Checks the caller has `coach` or `admin` role via `user_roles` table
- Only then performs the cleanup with service role client
- Uses `APP_URL` env var for CORS origin (falls back to `*`)

### Fix 2 — Restrict CORS on `manage-coach`
In `supabase/functions/manage-coach/index.ts` line 4, change `"*"` to `Deno.env.get('APP_URL') || '*'`.

### Fix 3 — Add `APP_URL` secret
Use the `add_secret` tool to prompt the user to set `APP_URL` to their production domain (e.g. `https://heartgroup.lovable.app`).

### Files to modify
1. `supabase/functions/cleanup-live-hr/index.ts` — full replacement with auth-gated version
2. `supabase/functions/manage-coach/index.ts` — line 4 CORS origin change

