CREATE TABLE IF NOT EXISTS public.class_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_types TO authenticated;
GRANT ALL ON public.class_types TO service_role;

ALTER TABLE public.class_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_types readable by authenticated"
  ON public.class_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "class_types manage by staff"
  ON public.class_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'coach') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'coach') OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.class_types(id),
  ADD COLUMN IF NOT EXISTS class_name text;