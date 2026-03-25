
-- Profiles: allow public update (SELECT and INSERT already exist)
CREATE POLICY "Allow public update profiles" ON public.profiles FOR UPDATE TO anon USING (true);

-- live_hr: allow public delete (SELECT, INSERT, UPDATE already exist)
CREATE POLICY "Allow public delete live_hr" ON public.live_hr FOR DELETE TO anon USING (true);

-- workouts: allow public read and insert
CREATE POLICY "Allow public read workouts" ON public.workouts FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert workouts" ON public.workouts FOR INSERT TO anon WITH CHECK (true);

-- workout_hr_data: allow public read and insert
CREATE POLICY "Allow public read workout_hr_data" ON public.workout_hr_data FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert workout_hr_data" ON public.workout_hr_data FOR INSERT TO anon WITH CHECK (true);
