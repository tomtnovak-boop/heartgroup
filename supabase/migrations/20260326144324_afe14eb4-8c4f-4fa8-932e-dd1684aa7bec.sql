-- Drop the broken ALL policy and replace with proper per-command policies
DROP POLICY "Coaches and admins can manage active_sessions" ON public.active_sessions;

-- SELECT (already exists for authenticated, keep it)
-- INSERT with WITH CHECK
CREATE POLICY "Coaches and admins can insert active_sessions"
  ON public.active_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- UPDATE with both USING and WITH CHECK
CREATE POLICY "Coaches and admins can update active_sessions"
  ON public.active_sessions
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- DELETE
CREATE POLICY "Coaches and admins can delete active_sessions"
  ON public.active_sessions
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'admin'::app_role));