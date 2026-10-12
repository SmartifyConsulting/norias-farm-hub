-- Collective intelligence and inter-cooperative matching (AgriSphere brief 3.9/3.10).
--
-- These two functions are the only place a member can see *anything* about another cooperative's
-- open demand/supply — and even then only an aggregate (item/commodity, quantity, how many other
-- co-ops) with no member identity, cooperative identity, or individual record exposed. Every row
-- is a real, currently-open request or listing — no estimates or fabricated data — but since each
-- co-op still negotiates and transacts separately, this is a recommendation surface only: it does
-- not create any shared order and does not merge organisations, per the brief's requirement that
-- co-ops "retain their own identity, membership records, governance, financial records and
-- decision-making authority".
CREATE OR REPLACE FUNCTION public.coop_intelligence_demand(_coop uuid)
RETURNS TABLE(item text, unit text, coop_qty numeric, other_qty numeric, other_coops bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.coop_role_of(_coop) IS NULL THEN RAISE EXCEPTION 'Not a member'; END IF;
  RETURN QUERY
  SELECT
    r.item,
    min(r.unit) AS unit,
    sum(CASE WHEN r.cooperative_id = _coop THEN r.qty ELSE 0 END) AS coop_qty,
    sum(CASE WHEN r.cooperative_id <> _coop THEN r.qty ELSE 0 END) AS other_qty,
    count(DISTINCT CASE WHEN r.cooperative_id <> _coop THEN r.cooperative_id END) AS other_coops
  FROM public.cooperative_purchase_requests r
  WHERE r.status = 'open'
  GROUP BY r.item
  HAVING sum(CASE WHEN r.cooperative_id = _coop THEN r.qty ELSE 0 END) > 0
  ORDER BY other_qty DESC, coop_qty DESC;
END $$;

CREATE OR REPLACE FUNCTION public.coop_intelligence_supply(_coop uuid)
RETURNS TABLE(commodity text, unit text, coop_qty numeric, other_qty numeric, other_coops bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.coop_role_of(_coop) IS NULL THEN RAISE EXCEPTION 'Not a member'; END IF;
  RETURN QUERY
  SELECT
    l.commodity,
    min(l.unit) AS unit,
    sum(CASE WHEN l.cooperative_id = _coop THEN l.qty ELSE 0 END) AS coop_qty,
    sum(CASE WHEN l.cooperative_id <> _coop THEN l.qty ELSE 0 END) AS other_qty,
    count(DISTINCT CASE WHEN l.cooperative_id <> _coop THEN l.cooperative_id END) AS other_coops
  FROM public.cooperative_sale_listings l
  WHERE l.status = 'available'
  GROUP BY l.commodity
  HAVING sum(CASE WHEN l.cooperative_id = _coop THEN l.qty ELSE 0 END) > 0
  ORDER BY other_qty DESC, coop_qty DESC;
END $$;

REVOKE EXECUTE ON FUNCTION public.coop_intelligence_demand(uuid), public.coop_intelligence_supply(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.coop_intelligence_demand(uuid), public.coop_intelligence_supply(uuid) TO authenticated;
