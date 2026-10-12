-- Shared resources/equipment and development/training/funding opportunities for cooperatives
-- (AgriSphere brief 3.5/3.8).

CREATE TYPE public.coop_asset_status AS ENUM ('available','maintenance','retired');
CREATE TYPE public.coop_booking_status AS ENUM ('requested','approved','rejected','completed');
CREATE TYPE public.coop_opportunity_type AS ENUM ('funding','grant','training','mentorship','other');
CREATE TYPE public.coop_opportunity_status AS ENUM ('open','applied','awarded','rejected','closed');

-- Shared resources and development opportunities are an Operations manager responsibility per the
-- brief ("Purchases, sales, logistics and resources"), alongside administrator/chairperson.
CREATE OR REPLACE FUNCTION public.coop_can_manage_resources(_coop uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.coop_role_of(_coop) IN ('administrator','chairperson','operations_manager')
$$;

REVOKE EXECUTE ON FUNCTION public.coop_can_manage_resources(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.coop_can_manage_resources(uuid) TO authenticated;

CREATE TABLE public.cooperative_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id uuid NOT NULL REFERENCES public.cooperatives(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  responsible_user_id uuid,
  status public.coop_asset_status NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cooperative_asset_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.cooperative_assets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  start_date date NOT NULL,
  end_date date NOT NULL,
  notes text NOT NULL DEFAULT '',
  status public.coop_booking_status NOT NULL DEFAULT 'requested',
  operating_cost numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cooperative_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id uuid NOT NULL REFERENCES public.cooperatives(id) ON DELETE CASCADE,
  title text NOT NULL,
  opp_type public.coop_opportunity_type NOT NULL DEFAULT 'funding',
  provider text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  deadline date,
  status public.coop_opportunity_status NOT NULL DEFAULT 'open',
  notes text NOT NULL DEFAULT '',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.cooperative_assets, public.cooperative_asset_bookings, public.cooperative_opportunities
TO authenticated;
GRANT ALL ON
  public.cooperative_assets, public.cooperative_asset_bookings, public.cooperative_opportunities
TO service_role;

ALTER TABLE public.cooperative_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperative_asset_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperative_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read assets" ON public.cooperative_assets FOR SELECT TO authenticated USING (public.coop_role_of(cooperative_id) IS NOT NULL);
CREATE POLICY "managers manage assets" ON public.cooperative_assets FOR ALL TO authenticated USING (public.coop_can_manage_resources(cooperative_id)) WITH CHECK (public.coop_can_manage_resources(cooperative_id));

CREATE POLICY "members read bookings" ON public.cooperative_asset_bookings FOR SELECT TO authenticated USING (
  public.coop_role_of((SELECT cooperative_id FROM public.cooperative_assets WHERE id = asset_id)) IS NOT NULL
);
CREATE POLICY "members request bookings" ON public.cooperative_asset_bookings FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND public.coop_role_of((SELECT cooperative_id FROM public.cooperative_assets WHERE id = asset_id)) IS NOT NULL
);
CREATE POLICY "owner or managers update bookings" ON public.cooperative_asset_bookings FOR UPDATE TO authenticated USING (
  user_id = auth.uid() OR public.coop_can_manage_resources((SELECT cooperative_id FROM public.cooperative_assets WHERE id = asset_id))
) WITH CHECK (
  user_id = auth.uid() OR public.coop_can_manage_resources((SELECT cooperative_id FROM public.cooperative_assets WHERE id = asset_id))
);
CREATE POLICY "owner or managers cancel bookings" ON public.cooperative_asset_bookings FOR DELETE TO authenticated USING (
  user_id = auth.uid() OR public.coop_can_manage_resources((SELECT cooperative_id FROM public.cooperative_assets WHERE id = asset_id))
);

CREATE POLICY "members read opportunities" ON public.cooperative_opportunities FOR SELECT TO authenticated USING (public.coop_role_of(cooperative_id) IS NOT NULL);
CREATE POLICY "managers manage opportunities" ON public.cooperative_opportunities FOR ALL TO authenticated USING (public.coop_can_manage_resources(cooperative_id)) WITH CHECK (public.coop_can_manage_resources(cooperative_id));
