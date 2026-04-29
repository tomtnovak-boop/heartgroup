-- profiles
DROP POLICY IF EXISTS "Allow public read profiles"   ON public.profiles;
DROP POLICY IF EXISTS "Allow public insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public update profiles" ON public.profiles;

-- session_lobby
DROP POLICY IF EXISTS "Allow public read session_lobby"   ON public.session_lobby;
DROP POLICY IF EXISTS "Allow public insert session_lobby" ON public.session_lobby;

-- live_hr
DROP POLICY IF EXISTS "Allow public read live_hr"   ON public.live_hr;
DROP POLICY IF EXISTS "Allow public insert live_hr" ON public.live_hr;
DROP POLICY IF EXISTS "Allow public update live_hr" ON public.live_hr;
DROP POLICY IF EXISTS "Allow public delete live_hr" ON public.live_hr;

-- workouts
DROP POLICY IF EXISTS "Allow public read workouts"   ON public.workouts;
DROP POLICY IF EXISTS "Allow public insert workouts" ON public.workouts;

-- workout_hr_data
DROP POLICY IF EXISTS "Allow public read workout_hr_data"   ON public.workout_hr_data;
DROP POLICY IF EXISTS "Allow public insert workout_hr_data" ON public.workout_hr_data;

-- active_sessions
DROP POLICY IF EXISTS "Allow public read active_sessions" ON public.active_sessions;