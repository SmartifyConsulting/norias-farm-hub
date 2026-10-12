-- Collective purchasing and collective sales for cooperatives (AgriSphere brief 3.3/3.4).
-- Members submit demand/supply; an operations manager (or administrator/chairperson) aggregates it
-- into a collective order and allocates quantities and cost/proceeds back to the members who are in it.

CREATE TYPE public.coop_request_status AS ENUM ('open','ordered','cancelled');
CREATE TYPE public.coop_listing_status AS ENUM ('available','sold','cancelled');
CREATE TYPE public.coop_order_status AS ENUM ('draft','confirmed','delivered','cancelled');

CREATE TABLE public.cooperative_purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id uuid NOT NULL REFERENCES public.cooperatives(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  item text NOT NULL,
  category text NOT NULL DEFAULT '',
  qty numeric NOT NULL,
  unit text NOT NULL DEFAULT '',
  needed_by date,
  notes text NOT NULL DEFAULT '',
  status public.coop_request_status NOT NULL DEFAULT 'open',
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cooperative_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id uuid NOT NULL REFERENCES public.cooperatives(id) ON DELETE CASCADE,
  item text NOT NULL,
  unit text NOT NULL DEFAULT '',
  supplier_name text NOT NULL DEFAULT '',
  unit_price numeric NOT NULL DEFAULT 0,
  status public.coop_order_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cooperative_purchase_requests
  ADD CONSTRAINT cooperative_purchase_requests_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.cooperative_purchase_orders(id) ON DELETE SET NULL;

CREATE TABLE public.cooperative_purchase_allocations (
  order_id uuid NOT NULL REFERENCES public.cooperative_purchase_orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  qty numeric NOT NULL,
  cost numeric NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  delivered boolean NOT NULL DEFAULT false,
  PRIMARY KEY (order_id, user_id)
);

CREATE TABLE public.cooperative_sale_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id uuid NOT NULL REFERENCES public.cooperatives(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  commodity text NOT NULL,
  qty numeric NOT NULL,
  unit text NOT NULL DEFAULT '',
  grade text NOT NULL DEFAULT '',
  available_from date,
  notes text NOT NULL DEFAULT '',
  status public.coop_listing_status NOT NULL DEFAULT 'available',
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cooperative_sale_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id uuid NOT NULL REFERENCES public.cooperatives(id) ON DELETE CASCADE,
  commodity text NOT NULL,
  unit text NOT NULL DEFAULT '',
  buyer_name text NOT NULL DEFAULT '',
  unit_price numeric NOT NULL DEFAULT 0,
  status public.coop_order_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cooperative_sale_listings
  ADD CONSTRAINT cooperative_sale_listings_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.cooperative_sale_orders(id) ON DELETE SET NULL;

CREATE TABLE public.cooperative_sale_allocations (
  order_id uuid NOT NULL REFERENCES public.cooperative_sale_orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  qty numeric NOT NULL,
  proceeds numeric NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  delivered boolean NOT NULL DEFAULT false,
  PRIMARY KEY (order_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.cooperative_purchase_requests, public.cooperative_purchase_orders, public.cooperative_purchase_allocations,
  public.cooperative_sale_listings, public.cooperative_sale_orders, public.cooperative_sale_allocations
TO authenticated;
GRANT ALL ON
  public.cooperative_purchase_requests, public.cooperative_purchase_orders, public.cooperative_purchase_allocations,
  public.cooperative_sale_listings, public.cooperative_sale_orders, public.cooperative_sale_allocations
TO service_role;

-- Purchasing/sales management is an Operations manager responsibility per the brief, alongside the
-- administrator/chairperson roles that can already manage everything else in the co-op.
CREATE OR REPLACE FUNCTION public.coop_can_trade(_coop uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.coop_role_of(_coop) IN ('administrator','chairperson','operations_manager')
$$;

-- Aggregates the selected open requests into one order and allocates qty/cost back to each
-- requester proportionally, so every member's contribution and amount payable stays traceable.
CREATE OR REPLACE FUNCTION public.create_purchase_order(_coop uuid, _request_ids uuid[], _supplier_name text, _unit_price numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE oid uuid; r record; first_item text; first_unit text;
BEGIN
  IF NOT public.coop_can_trade(_coop) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT item, unit INTO first_item, first_unit FROM public.cooperative_purchase_requests WHERE id = _request_ids[1] AND cooperative_id = _coop;
  IF first_item IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  INSERT INTO public.cooperative_purchase_orders(cooperative_id, item, unit, supplier_name, unit_price, status, created_by)
    VALUES (_coop, first_item, first_unit, _supplier_name, _unit_price, 'confirmed', auth.uid()) RETURNING id INTO oid;
  FOR r IN SELECT * FROM public.cooperative_purchase_requests WHERE id = ANY(_request_ids) AND cooperative_id = _coop AND status = 'open' LOOP
    INSERT INTO public.cooperative_purchase_allocations(order_id, user_id, qty, cost) VALUES (oid, r.user_id, r.qty, r.qty * _unit_price)
      ON CONFLICT (order_id, user_id) DO UPDATE SET qty = cooperative_purchase_allocations.qty + EXCLUDED.qty, cost = cooperative_purchase_allocations.cost + EXCLUDED.cost;
    UPDATE public.cooperative_purchase_requests SET status = 'ordered', order_id = oid WHERE id = r.id;
  END LOOP;
  RETURN oid;
END $$;

CREATE OR REPLACE FUNCTION public.create_sale_order(_coop uuid, _listing_ids uuid[], _buyer_name text, _unit_price numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE oid uuid; r record; first_commodity text; first_unit text;
BEGIN
  IF NOT public.coop_can_trade(_coop) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT commodity, unit INTO first_commodity, first_unit FROM public.cooperative_sale_listings WHERE id = _listing_ids[1] AND cooperative_id = _coop;
  IF first_commodity IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF;
  INSERT INTO public.cooperative_sale_orders(cooperative_id, commodity, unit, buyer_name, unit_price, status, created_by)
    VALUES (_coop, first_commodity, first_unit, _buyer_name, _unit_price, 'confirmed', auth.uid()) RETURNING id INTO oid;
  FOR r IN SELECT * FROM public.cooperative_sale_listings WHERE id = ANY(_listing_ids) AND cooperative_id = _coop AND status = 'available' LOOP
    INSERT INTO public.cooperative_sale_allocations(order_id, user_id, qty, proceeds) VALUES (oid, r.user_id, r.qty, r.qty * _unit_price)
      ON CONFLICT (order_id, user_id) DO UPDATE SET qty = cooperative_sale_allocations.qty + EXCLUDED.qty, proceeds = cooperative_sale_allocations.proceeds + EXCLUDED.proceeds;
    UPDATE public.cooperative_sale_listings SET status = 'sold', order_id = oid WHERE id = r.id;
  END LOOP;
  RETURN oid;
END $$;

REVOKE EXECUTE ON FUNCTION public.coop_can_trade(uuid), public.create_purchase_order(uuid,uuid[],text,numeric), public.create_sale_order(uuid,uuid[],text,numeric) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.coop_can_trade(uuid), public.create_purchase_order(uuid,uuid[],text,numeric), public.create_sale_order(uuid,uuid[],text,numeric) TO authenticated;

ALTER TABLE public.cooperative_purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperative_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperative_purchase_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperative_sale_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperative_sale_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperative_sale_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read requests" ON public.cooperative_purchase_requests FOR SELECT TO authenticated USING (public.coop_role_of(cooperative_id) IS NOT NULL);
CREATE POLICY "members submit requests" ON public.cooperative_purchase_requests FOR INSERT TO authenticated WITH CHECK (public.coop_role_of(cooperative_id) IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "owner or managers update requests" ON public.cooperative_purchase_requests FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.coop_can_trade(cooperative_id)) WITH CHECK (user_id = auth.uid() OR public.coop_can_trade(cooperative_id));
CREATE POLICY "owner or managers cancel requests" ON public.cooperative_purchase_requests FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.coop_can_trade(cooperative_id));

CREATE POLICY "members read purchase orders" ON public.cooperative_purchase_orders FOR SELECT TO authenticated USING (public.coop_role_of(cooperative_id) IS NOT NULL);
CREATE POLICY "managers update purchase orders" ON public.cooperative_purchase_orders FOR UPDATE TO authenticated USING (public.coop_can_trade(cooperative_id)) WITH CHECK (public.coop_can_trade(cooperative_id));

CREATE POLICY "members read own or managers read all allocations" ON public.cooperative_purchase_allocations FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR public.coop_can_trade((SELECT cooperative_id FROM public.cooperative_purchase_orders WHERE id = order_id))
);
CREATE POLICY "managers update allocations" ON public.cooperative_purchase_allocations FOR UPDATE TO authenticated USING (
  public.coop_can_trade((SELECT cooperative_id FROM public.cooperative_purchase_orders WHERE id = order_id))
) WITH CHECK (
  public.coop_can_trade((SELECT cooperative_id FROM public.cooperative_purchase_orders WHERE id = order_id))
);

CREATE POLICY "members read listings" ON public.cooperative_sale_listings FOR SELECT TO authenticated USING (public.coop_role_of(cooperative_id) IS NOT NULL);
CREATE POLICY "members submit listings" ON public.cooperative_sale_listings FOR INSERT TO authenticated WITH CHECK (public.coop_role_of(cooperative_id) IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "owner or managers update listings" ON public.cooperative_sale_listings FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.coop_can_trade(cooperative_id)) WITH CHECK (user_id = auth.uid() OR public.coop_can_trade(cooperative_id));
CREATE POLICY "owner or managers cancel listings" ON public.cooperative_sale_listings FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.coop_can_trade(cooperative_id));

CREATE POLICY "members read sale orders" ON public.cooperative_sale_orders FOR SELECT TO authenticated USING (public.coop_role_of(cooperative_id) IS NOT NULL);
CREATE POLICY "managers update sale orders" ON public.cooperative_sale_orders FOR UPDATE TO authenticated USING (public.coop_can_trade(cooperative_id)) WITH CHECK (public.coop_can_trade(cooperative_id));

CREATE POLICY "members read own or managers read all sale allocations" ON public.cooperative_sale_allocations FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR public.coop_can_trade((SELECT cooperative_id FROM public.cooperative_sale_orders WHERE id = order_id))
);
CREATE POLICY "managers update sale allocations" ON public.cooperative_sale_allocations FOR UPDATE TO authenticated USING (
  public.coop_can_trade((SELECT cooperative_id FROM public.cooperative_sale_orders WHERE id = order_id))
) WITH CHECK (
  public.coop_can_trade((SELECT cooperative_id FROM public.cooperative_sale_orders WHERE id = order_id))
);
