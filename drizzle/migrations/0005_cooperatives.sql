CREATE TYPE public.coop_role AS ENUM (
  'administrator','chairperson','board_member','treasurer','secretary','operations_manager','member','auditor'
);
CREATE TYPE public.coop_member_status AS ENUM ('pending','active','left','removed');

CREATE TABLE public.cooperatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  registration_number text NOT NULL DEFAULT '',
  coop_type text NOT NULL DEFAULT '',
  sector text NOT NULL DEFAULT '',
  province text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  commodities text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cooperative_members (
  cooperative_id uuid NOT NULL REFERENCES public.cooperatives(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text NOT NULL DEFAULT '',
  role public.coop_role NOT NULL DEFAULT 'member',
  status public.coop_member_status NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cooperative_id, user_id)
);

CREATE TABLE public.cooperative_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id uuid NOT NULL REFERENCES public.cooperatives(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.coop_role NOT NULL DEFAULT 'member',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cooperative_id, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cooperatives, public.cooperative_members, public.cooperative_invites TO authenticated;
GRANT ALL ON public.cooperatives, public.cooperative_members, public.cooperative_invites TO service_role;

-- A member's role in a co-op, or NULL if they have no active membership. SECURITY DEFINER so RLS
-- policies can call it without each policy needing its own read access into cooperative_members.
CREATE OR REPLACE FUNCTION public.coop_role_of(_coop uuid)
RETURNS public.coop_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.cooperative_members WHERE cooperative_id = _coop AND user_id = auth.uid() AND status = 'active'
$$;

-- Roles that can manage membership, governance and the co-op's own profile — mirrors the spec's
-- "Co-operative administrator / Chairperson / Secretary" responsibilities.
CREATE OR REPLACE FUNCTION public.coop_is_admin(_coop uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.coop_role_of(_coop) IN ('administrator','chairperson','secretary')
$$;

CREATE OR REPLACE FUNCTION public.create_cooperative(
  _name text, _registration_number text DEFAULT '', _coop_type text DEFAULT '', _sector text DEFAULT '',
  _province text DEFAULT '', _location text DEFAULT '', _contact_email text DEFAULT '', _contact_phone text DEFAULT '',
  _commodities text DEFAULT '', _bio text DEFAULT ''
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  INSERT INTO public.cooperatives(name, registration_number, coop_type, sector, province, location, contact_email, contact_phone, commodities, bio, owner_id)
    VALUES (_name, _registration_number, _coop_type, _sector, _province, _location, _contact_email, _contact_phone, _commodities, _bio, auth.uid())
    RETURNING id INTO cid;
  INSERT INTO public.cooperative_members(cooperative_id, user_id, email, role, status)
    VALUES (cid, auth.uid(), coalesce(auth.jwt()->>'email',''), 'administrator', 'active');
  RETURN cid;
END $$;

CREATE OR REPLACE FUNCTION public.accept_cooperative_invite(_invite uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.cooperative_invites;
BEGIN
  SELECT * INTO inv FROM public.cooperative_invites WHERE id = _invite AND lower(email) = lower(auth.jwt()->>'email');
  IF inv.id IS NULL THEN RAISE EXCEPTION 'Invite not found'; END IF;
  INSERT INTO public.cooperative_members(cooperative_id, user_id, email, role, status)
    VALUES (inv.cooperative_id, auth.uid(), inv.email, inv.role, 'active')
    ON CONFLICT (cooperative_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active';
  DELETE FROM public.cooperative_invites WHERE id = inv.id;
  RETURN inv.cooperative_id;
END $$;

-- A farmer discovering a co-op can ask to join; membership stays 'pending' until an administrator approves it.
CREATE OR REPLACE FUNCTION public.request_join_cooperative(_coop uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  INSERT INTO public.cooperative_members(cooperative_id, user_id, email, role, status)
    VALUES (_coop, auth.uid(), coalesce(auth.jwt()->>'email',''), 'member', 'pending')
    ON CONFLICT (cooperative_id, user_id) DO UPDATE SET status = 'pending' WHERE cooperative_members.status = 'left';
END $$;

CREATE OR REPLACE FUNCTION public.review_join_request(_coop uuid, _user_id uuid, _approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.coop_is_admin(_coop) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF _approve THEN
    UPDATE public.cooperative_members SET status = 'active' WHERE cooperative_id = _coop AND user_id = _user_id AND status = 'pending';
  ELSE
    DELETE FROM public.cooperative_members WHERE cooperative_id = _coop AND user_id = _user_id AND status = 'pending';
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION
  public.create_cooperative(text,text,text,text,text,text,text,text,text,text),
  public.accept_cooperative_invite(uuid),
  public.request_join_cooperative(uuid),
  public.review_join_request(uuid,uuid,boolean),
  public.coop_role_of(uuid),
  public.coop_is_admin(uuid)
FROM anon, public;
GRANT EXECUTE ON FUNCTION
  public.create_cooperative(text,text,text,text,text,text,text,text,text,text),
  public.accept_cooperative_invite(uuid),
  public.request_join_cooperative(uuid),
  public.review_join_request(uuid,uuid,boolean),
  public.coop_role_of(uuid),
  public.coop_is_admin(uuid)
TO authenticated;

ALTER TABLE public.cooperatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperative_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperative_invites ENABLE ROW LEVEL SECURITY;

-- Co-op profiles are a directory — any signed-in farmer can browse and request to join one.
CREATE POLICY "authenticated read cooperatives" ON public.cooperatives FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins update cooperative" ON public.cooperatives FOR UPDATE TO authenticated USING (public.coop_is_admin(id)) WITH CHECK (public.coop_is_admin(id));
CREATE POLICY "administrator deletes cooperative" ON public.cooperatives FOR DELETE TO authenticated USING (public.coop_role_of(id) = 'administrator');

-- Members see their fellow members; a user can always see their own membership rows (incl. pending/left).
CREATE POLICY "members read members" ON public.cooperative_members FOR SELECT TO authenticated USING (public.coop_role_of(cooperative_id) IS NOT NULL OR user_id = auth.uid());
CREATE POLICY "admins change roles or approve" ON public.cooperative_members FOR UPDATE TO authenticated USING (public.coop_is_admin(cooperative_id) AND role <> 'administrator') WITH CHECK (public.coop_is_admin(cooperative_id) AND role <> 'administrator');
CREATE POLICY "admins remove or self leave" ON public.cooperative_members FOR DELETE TO authenticated USING (role <> 'administrator' AND (user_id = auth.uid() OR public.coop_is_admin(cooperative_id)));

CREATE POLICY "admins or invitee read invites" ON public.cooperative_invites FOR SELECT TO authenticated USING (public.coop_is_admin(cooperative_id) OR lower(email) = lower(auth.jwt()->>'email'));
CREATE POLICY "admins invite" ON public.cooperative_invites FOR INSERT TO authenticated WITH CHECK (public.coop_is_admin(cooperative_id) AND created_by = auth.uid() AND role <> 'administrator');
CREATE POLICY "admins or invitee cancel" ON public.cooperative_invites FOR DELETE TO authenticated USING (public.coop_is_admin(cooperative_id) OR lower(email) = lower(auth.jwt()->>'email'));
