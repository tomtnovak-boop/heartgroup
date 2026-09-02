CREATE POLICY "Coaches and admins can read all active_sessions"
ON public.active_sessions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'coach'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
