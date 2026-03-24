
-- Allow users to delete their own workouts (via profile_id match)
CREATE POLICY "Users can delete own workouts"
ON public.workouts
FOR DELETE
TO authenticated
USING (
  profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Allow users to delete workout_hr_data for their own workouts
CREATE POLICY "Users can delete own workout_hr_data"
ON public.workout_hr_data
FOR DELETE
TO authenticated
USING (
  workout_id IN (
    SELECT w.id FROM public.workouts w
    JOIN public.profiles p ON p.id = w.profile_id
    WHERE p.user_id = auth.uid()
  )
);
