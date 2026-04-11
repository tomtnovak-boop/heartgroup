-- Add updated_at column
ALTER TABLE public.live_hr ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add unique constraint on profile_id (one active HR row per person)
ALTER TABLE public.live_hr DROP CONSTRAINT IF EXISTS live_hr_profile_id_unique;
ALTER TABLE public.live_hr ADD CONSTRAINT live_hr_profile_id_unique UNIQUE (profile_id);

-- Add UPDATE policy for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'live_hr' AND policyname = 'Authenticated users can update live_hr'
  ) THEN
    CREATE POLICY "Authenticated users can update live_hr"
    ON public.live_hr FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);
  END IF;
END $$;