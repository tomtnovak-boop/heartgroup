
-- Allow deletion of workout_hr_data (service role bypasses RLS, but adding for completeness)
CREATE POLICY "Admins can delete workout_hr_data"
ON public.workout_hr_data
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow deletion of workouts
CREATE POLICY "Admins can delete workouts"
ON public.workouts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow deletion of profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
