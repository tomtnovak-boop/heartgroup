-- =====================================================
-- FIX 1: live_hr UPDATE — only own row (or coach/admin)
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can update live_hr" ON public.live_hr;

CREATE POLICY "Users can update own live_hr"
ON public.live_hr
FOR UPDATE
TO authenticated
USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
)
WITH CHECK (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Coach and admin can update live_hr"
ON public.live_hr
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'coach'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'coach'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- =====================================================
-- FIX 2: live_hr INSERT — only own profile
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can insert live_hr" ON public.live_hr;

CREATE POLICY "Users can insert own live_hr"
ON public.live_hr
FOR INSERT
TO authenticated
WITH CHECK (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'coach'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- =====================================================
-- FIX 3: live_hr SELECT — Option B (own + coach/admin)
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view live_hr" ON public.live_hr;

CREATE POLICY "Users see own live_hr or coaches see all"
ON public.live_hr
FOR SELECT
TO authenticated
USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'coach'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- =====================================================
-- FIX 4: workouts SELECT — only own (or coach/admin)
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view workouts" ON public.workouts;

CREATE POLICY "Users see own workouts"
ON public.workouts
FOR SELECT
TO authenticated
USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'coach'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- =====================================================
-- FIX 5: workout_hr_data SELECT — only own (via workout join)
-- Note: workout_hr_data has workout_id, not profile_id
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view workout_hr_data" ON public.workout_hr_data;

CREATE POLICY "Users see own workout_hr_data"
ON public.workout_hr_data
FOR SELECT
TO authenticated
USING (
  workout_id IN (
    SELECT w.id
    FROM public.workouts w
    JOIN public.profiles p ON p.id = w.profile_id
    WHERE p.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'coach'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- =====================================================
-- FIX 6: active_sessions SELECT — relevant only
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can read active_sessions" ON public.active_sessions;

CREATE POLICY "Users see relevant active_sessions"
ON public.active_sessions
FOR SELECT
TO authenticated
USING (
  session_code IN (
    SELECT session_code FROM public.session_lobby
    WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
  OR created_by = auth.uid()
  OR has_role(auth.uid(), 'coach'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- =====================================================
-- FIX 7: session_lobby SELECT — relevant only
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can read session_lobby" ON public.session_lobby;

CREATE POLICY "Users see relevant session_lobby"
ON public.session_lobby
FOR SELECT
TO authenticated
USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR session_code IN (
    SELECT sl.session_code FROM public.session_lobby sl
    WHERE sl.profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
  OR has_role(auth.uid(), 'coach'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- =====================================================
-- FIX 8: SECURITY DEFINER function hardening
-- =====================================================
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_stale_lobby() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_disconnected_users() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_old_live_hr() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.refresh_active_status() SET search_path = public, pg_temp;

-- Restrict EXECUTE permissions
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.cleanup_disconnected_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_disconnected_users() TO service_role, postgres;

REVOKE ALL ON FUNCTION public.cleanup_stale_lobby() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_lobby() TO service_role, postgres;

REVOKE ALL ON FUNCTION public.cleanup_old_live_hr() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_live_hr() TO service_role, postgres;