ALTER TABLE public.animal_records
  ADD COLUMN repeat_days integer,
  ADD COLUMN completed jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN animal_id text NOT NULL DEFAULT '';

CREATE TABLE public.farmer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  farm_name text NOT NULL DEFAULT '',
  province text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'Farmer',
  crops text NOT NULL DEFAULT '',
  hectares numeric,
  bio text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.shared_listings (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('opportunity','capacity','pool')),
  data jsonb NOT NULL,
  owner_id uuid DEFAULT auth.uid(),
  profile_id uuid REFERENCES public.farmer_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.shared_listings(kind);
GRANT SELECT ON public.farmer_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_listings TO authenticated;
GRANT ALL ON public.farmer_profiles, public.shared_listings TO service_role;
ALTER TABLE public.farmer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed in read profiles" ON public.farmer_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "signed in read listings" ON public.shared_listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner posts" ON public.shared_listings FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner edits" ON public.shared_listings FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner deletes" ON public.shared_listings FOR DELETE TO authenticated USING (owner_id = auth.uid());