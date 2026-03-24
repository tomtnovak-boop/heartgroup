-- FIX: live_hr policies
DROP POLICY IF EXISTS "Anyone can view live_hr" ON public.live_hr;
DROP POLICY IF EXISTS "Anyone can insert live_hr" ON public.live_hr;
DROP POLICY IF EXISTS "Anyone can delete live_hr" ON public.live_hr;

CREATE POLICY "Authenticated users can view live_hr"
ON public.live_hr FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert live_hr"
ON public.live_hr FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants and coaches can delete live_hr"
ON public.live_hr FOR DELETE
TO authenticated
USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'coach'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- FIX: workouts policies
DROP POLICY IF EXISTS "Anyone can view workouts" ON public.workouts;
DROP POLICY IF EXISTS "Anyone can create workouts" ON public.workouts;
DROP POLICY IF EXISTS "Anyone can update workouts" ON public.workouts;

CREATE POLICY "Authenticated users can view workouts"
ON public.workouts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Participants and coaches can create workouts"
ON public.workouts FOR INSERT
TO authenticated
WITH CHECK (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'coach'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Participants and coaches can update workouts"
ON public.workouts FOR UPDATE
TO authenticated
USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'coach'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- FIX: workout_hr_data policies
DROP POLICY IF EXISTS "Anyone can insert workout_hr_data" ON public.workout_hr_data;
DROP POLICY IF EXISTS "Anyone can view workout_hr_data" ON public.workout_hr_data;

CREATE POLICY "Authenticated users can view workout_hr_data"
ON public.workout_hr_data FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert workout_hr_data"
ON public.workout_hr_data FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_workouts_profile_id ON public.workouts(profile_id);
CREATE INDEX IF NOT EXISTS idx_workouts_started_at ON public.workouts(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_ended_at ON public.workouts(ended_at DESC) WHERE ended_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workout_hr_data_workout_id ON public.workout_hr_data(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_hr_data_recorded_at ON public.workout_hr_data(recorded_at DESC);