
-- Public read/insert on profiles
CREATE POLICY "Allow public read profiles" ON public.profiles FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert profiles" ON public.profiles FOR INSERT TO anon WITH CHECK (true);

-- Public read/insert on session_lobby
CREATE POLICY "Allow public read session_lobby" ON public.session_lobby FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert session_lobby" ON public.session_lobby FOR INSERT TO anon WITH CHECK (true);

-- Public read/insert/update on live_hr
CREATE POLICY "Allow public read live_hr" ON public.live_hr FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert live_hr" ON public.live_hr FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update live_hr" ON public.live_hr FOR UPDATE TO anon USING (true);
