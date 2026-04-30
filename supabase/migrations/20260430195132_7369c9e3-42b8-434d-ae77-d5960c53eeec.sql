-- FIX 1: Tighten session_lobby INSERT policy
DROP POLICY IF EXISTS "Participants can join lobby" ON public.session_lobby;

CREATE POLICY "Users can join lobby with own profile"
ON public.session_lobby
FOR INSERT
TO authenticated
WITH CHECK (
  profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- FIX 2: Remove duplicate UPDATE policy on active_sessions
DROP POLICY IF EXISTS "coaches can update any session" ON public.active_sessions;