DELETE FROM public.session_lobby a USING public.session_lobby b
WHERE a.session_code = b.session_code AND a.profile_id = b.profile_id
AND (a.joined_at < b.joined_at OR (a.joined_at = b.joined_at AND a.id < b.id));
ALTER TABLE public.session_lobby ADD CONSTRAINT session_lobby_session_profile_unique UNIQUE (session_code, profile_id);