DROP POLICY IF EXISTS "Authenticated users can insert workout_hr_data" ON public.workout_hr_data;

CREATE POLICY "Users insert own workout_hr_data"
ON public.workout_hr_data
FOR INSERT
TO authenticated
WITH CHECK (
  workout_id IN (
    SELECT w.id
    FROM public.workouts w
    JOIN public.profiles p ON p.id = w.profile_id
    WHERE p.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'coach'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Authenticated can read active_sessions" ON public.active_sessions;

CREATE POLICY "Authenticated can read open active_sessions"
ON public.active_sessions
FOR SELECT
TO authenticated
USING (ended_at IS NULL);
