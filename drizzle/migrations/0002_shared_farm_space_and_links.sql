CREATE TYPE public.farm_role AS ENUM ('owner','manager','worker','viewer');

CREATE TABLE public.farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.farm_members (
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text NOT NULL DEFAULT '',
  role public.farm_role NOT NULL DEFAULT 'worker',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (farm_id, user_id)
);
CREATE TABLE public.farm_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.farm_role NOT NULL DEFAULT 'worker',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (farm_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farms, public.farm_members, public.farm_invites TO authenticated;
GRANT ALL ON public.farms, public.farm_members, public.farm_invites TO service_role;

CREATE OR REPLACE FUNCTION public.farm_role_of(_farm uuid)
RETURNS public.farm_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.farm_members WHERE farm_id = _farm AND user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.create_farm(_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE fid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  INSERT INTO public.farms(name, owner_id) VALUES (_name, auth.uid()) RETURNING id INTO fid;
  INSERT INTO public.farm_members(farm_id, user_id, email, role) VALUES (fid, auth.uid(), coalesce(auth.jwt()->>'email',''), 'owner');
  RETURN fid;
END $$;

CREATE OR REPLACE FUNCTION public.accept_farm_invite(_invite uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.farm_invites;
BEGIN
  SELECT * INTO inv FROM public.farm_invites WHERE id = _invite AND lower(email) = lower(auth.jwt()->>'email');
  IF inv.id IS NULL THEN RAISE EXCEPTION 'Invite not found'; END IF;
  INSERT INTO public.farm_members(farm_id, user_id, email, role) VALUES (inv.farm_id, auth.uid(), inv.email, inv.role)
    ON CONFLICT (farm_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  DELETE FROM public.farm_invites WHERE id = inv.id;
  RETURN inv.farm_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_farm(text), public.accept_farm_invite(uuid), public.farm_role_of(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_farm(text), public.accept_farm_invite(uuid), public.farm_role_of(uuid) TO authenticated;

ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read farm" ON public.farms FOR SELECT TO authenticated USING (public.farm_role_of(id) IS NOT NULL);
CREATE POLICY "owner updates farm" ON public.farms FOR UPDATE TO authenticated USING (public.farm_role_of(id) = 'owner') WITH CHECK (public.farm_role_of(id) = 'owner');
CREATE POLICY "owner deletes farm" ON public.farms FOR DELETE TO authenticated USING (public.farm_role_of(id) = 'owner');

CREATE POLICY "members read members" ON public.farm_members FOR SELECT TO authenticated USING (public.farm_role_of(farm_id) IS NOT NULL);
CREATE POLICY "owner changes roles" ON public.farm_members FOR UPDATE TO authenticated USING (public.farm_role_of(farm_id) = 'owner' AND role <> 'owner') WITH CHECK (public.farm_role_of(farm_id) = 'owner' AND role <> 'owner');
CREATE POLICY "managers remove or self leave" ON public.farm_members FOR DELETE TO authenticated USING (role <> 'owner' AND (user_id = auth.uid() OR public.farm_role_of(farm_id) IN ('owner','manager')));

CREATE POLICY "managers or invitee read invites" ON public.farm_invites FOR SELECT TO authenticated USING (public.farm_role_of(farm_id) IN ('owner','manager') OR lower(email) = lower(auth.jwt()->>'email'));
CREATE POLICY "managers invite" ON public.farm_invites FOR INSERT TO authenticated WITH CHECK (public.farm_role_of(farm_id) IN ('owner','manager') AND created_by = auth.uid() AND (role <> 'owner'));
CREATE POLICY "managers or invitee cancel" ON public.farm_invites FOR DELETE TO authenticated USING (public.farm_role_of(farm_id) IN ('owner','manager') OR lower(email) = lower(auth.jwt()->>'email'));

ALTER TABLE public.animal_records
  ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL,
  ADD COLUMN field_id text NOT NULL DEFAULT '',
  ADD COLUMN crop_id text NOT NULL DEFAULT '',
  ADD COLUMN due_on date,
  ADD COLUMN ends_on date;
CREATE INDEX ON public.animal_records(farm_id);

DROP POLICY "own select" ON public.animal_records;
DROP POLICY "own insert" ON public.animal_records;
DROP POLICY "own update" ON public.animal_records;
DROP POLICY "own delete" ON public.animal_records;
CREATE POLICY "own or team select" ON public.animal_records FOR SELECT TO authenticated USING (auth.uid() = user_id OR (farm_id IS NOT NULL AND public.farm_role_of(farm_id) IS NOT NULL));
CREATE POLICY "own or team insert" ON public.animal_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND (farm_id IS NULL OR public.farm_role_of(farm_id) IN ('owner','manager','worker')));
CREATE POLICY "own or team update" ON public.animal_records FOR UPDATE TO authenticated USING (auth.uid() = user_id OR (farm_id IS NOT NULL AND public.farm_role_of(farm_id) IN ('owner','manager','worker'))) WITH CHECK (farm_id IS NULL AND auth.uid() = user_id OR public.farm_role_of(farm_id) IN ('owner','manager','worker'));
CREATE POLICY "own or manager delete" ON public.animal_records FOR DELETE TO authenticated USING ((farm_id IS NULL AND auth.uid() = user_id) OR public.farm_role_of(farm_id) IN ('owner','manager'));