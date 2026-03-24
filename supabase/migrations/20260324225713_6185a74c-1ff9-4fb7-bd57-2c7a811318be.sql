
-- Active sessions table (stores session code)
CREATE TABLE public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active_sessions"
ON public.active_sessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Coaches and admins can manage active_sessions"
ON public.active_sessions FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'coach'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Session lobby table
CREATE TABLE public.session_lobby (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code TEXT NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (session_code, profile_id)
);

ALTER TABLE public.session_lobby ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read session_lobby"
ON public.session_lobby FOR SELECT TO authenticated USING (true);

CREATE POLICY "Participants can join lobby"
ON public.session_lobby FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Coaches and admins can manage lobby"
ON public.session_lobby FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'coach'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Participants can delete own lobby entry"
ON public.session_lobby FOR DELETE TO authenticated
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Enable realtime for lobby
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_lobby;
