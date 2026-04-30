-- Helper: returns session_codes the user is in. SECURITY DEFINER bypasses RLS to avoid recursion.
CREATE OR REPLACE FUNCTION public.get_user_session_codes(_user_id uuid)
RETURNS TABLE (session_code text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT DISTINCT sl.session_code
  FROM public.session_lobby sl
  JOIN public.profiles p ON p.id = sl.profile_id
  WHERE p.user_id = _user_id;
$$;

REVOKE ALL ON FUNCTION public.get_user_session_codes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_session_codes(uuid) TO authenticated;

-- Fix session_lobby SELECT policy (remove self-reference recursion)
DROP POLICY IF EXISTS "Users see relevant session_lobby" ON public.session_lobby;

CREATE POLICY "Users see relevant session_lobby"
ON public.session_lobby
FOR SELECT
TO authenticated
USING (
  profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
  OR session_code IN (
    SELECT sc FROM public.get_user_session_codes(auth.uid()) AS t(sc)
  )
  OR has_role(auth.uid(), 'coach'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix active_sessions SELECT policy (uses session_lobby subquery, replace with helper)
DROP POLICY IF EXISTS "Users see relevant active_sessions" ON public.active_sessions;

CREATE POLICY "Users see relevant active_sessions"
ON public.active_sessions
FOR SELECT
TO authenticated
USING (
  session_code IN (
    SELECT sc FROM public.get_user_session_codes(auth.uid()) AS t(sc)
  )
  OR created_by = auth.uid()
  OR has_role(auth.uid(), 'coach'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);