DROP POLICY IF EXISTS "Users see relevant active_sessions" ON public.active_sessions;

CREATE POLICY "Authenticated can read active_sessions"
ON public.active_sessions
FOR SELECT
TO authenticated
USING (true);