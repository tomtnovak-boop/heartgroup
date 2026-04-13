ALTER TABLE public.active_sessions
ADD COLUMN IF NOT EXISTS display_view TEXT NOT NULL DEFAULT 'fancy';