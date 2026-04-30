-- Task 1: Add connection_status column + indexes
ALTER TABLE public.live_hr
ADD COLUMN IF NOT EXISTS connection_status TEXT
  NOT NULL DEFAULT 'active'
  CHECK (connection_status IN ('active', 'disconnected'));

CREATE INDEX IF NOT EXISTS idx_live_hr_connection_status
  ON public.live_hr (connection_status, last_seen);

CREATE INDEX IF NOT EXISTS idx_live_hr_last_seen
  ON public.live_hr (last_seen);

-- Task 2: Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Task 3: Cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_disconnected_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.live_hr
  SET connection_status = 'disconnected'
  WHERE connection_status = 'active'
    AND last_seen < NOW() - INTERVAL '60 seconds';
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_disconnected_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_disconnected_users() TO service_role;

-- Task 4: Schedule cron job (every 30 seconds — safe sub-minute syntax)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-disconnected-users') THEN
    PERFORM cron.unschedule('cleanup-disconnected-users');
  END IF;
END $$;

SELECT cron.schedule(
  'cleanup-disconnected-users',
  '30 seconds',
  $$SELECT public.cleanup_disconnected_users();$$
);

-- Task 10: Auto-reactivation trigger
CREATE OR REPLACE FUNCTION public.refresh_active_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.last_seen > NOW() - INTERVAL '10 seconds' THEN
    NEW.connection_status = 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_active_status ON public.live_hr;
CREATE TRIGGER trg_refresh_active_status
  BEFORE UPDATE ON public.live_hr
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_active_status();