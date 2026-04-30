-- These functions are only used as triggers or by pg_cron — never called from the API.
-- Revoke from PUBLIC and authenticated; only postgres/service_role need EXECUTE.

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO postgres, service_role;

REVOKE ALL ON FUNCTION public.refresh_active_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_active_status() TO postgres, service_role;

REVOKE ALL ON FUNCTION public.cleanup_old_live_hr() FROM anon, authenticated;
-- (already granted to service_role/postgres in prior migration)

REVOKE ALL ON FUNCTION public.cleanup_disconnected_users() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_stale_lobby() FROM anon, authenticated;

-- has_role MUST stay callable by authenticated (used inside RLS policies as auth.uid() context)
-- No change needed there.