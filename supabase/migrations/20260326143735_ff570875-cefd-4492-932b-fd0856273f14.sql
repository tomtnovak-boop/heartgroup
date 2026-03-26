CREATE POLICY "Allow public read active_sessions"
  ON public.active_sessions
  FOR SELECT
  TO anon
  USING (true);