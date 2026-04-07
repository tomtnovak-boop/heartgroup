ALTER TABLE public.session_lobby ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now();
ALTER TABLE public.live_hr ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now();