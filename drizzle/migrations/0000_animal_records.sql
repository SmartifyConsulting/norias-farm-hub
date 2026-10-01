CREATE TABLE public.animal_records (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  detail text NOT NULL DEFAULT '',
  qty text NOT NULL DEFAULT '',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.animal_records TO authenticated;
GRANT ALL ON public.animal_records TO service_role;
ALTER TABLE public.animal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.animal_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.animal_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.animal_records FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.animal_records FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX ON public.animal_records(user_id);