-- Schritt 1: pg_cron Extension aktivieren
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schritt 2: Lobby-Cleanup-Funktion
CREATE OR REPLACE FUNCTION public.cleanup_stale_lobby()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Lobby-Einträge zu beendeten Sessions (>5 min nach ended_at)
  DELETE FROM public.session_lobby sl
  USING public.active_sessions s
  WHERE sl.session_code = s.session_code
    AND s.ended_at IS NOT NULL
    AND s.ended_at < now() - interval '5 minutes';

  -- Verwaiste Lobby-Einträge ohne Session, älter als 6h
  DELETE FROM public.session_lobby sl
  WHERE sl.joined_at < now() - interval '6 hours'
    AND NOT EXISTS (
      SELECT 1 FROM public.active_sessions s
      WHERE s.session_code = sl.session_code
    );
END;
$$;

-- Schritt 3: Cron-Jobs einplanen
SELECT cron.schedule(
  'cleanup-old-live-hr',
  '* * * * *',
  $$SELECT public.cleanup_old_live_hr();$$
);

SELECT cron.schedule(
  'cleanup-stale-lobby',
  '*/5 * * * *',
  $$SELECT public.cleanup_stale_lobby();$$
);