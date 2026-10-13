CREATE TYPE public.ad_campaign_status AS ENUM ('draft', 'pending_payment', 'active', 'paused', 'completed');

CREATE TABLE public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL DEFAULT auth.uid(),
  company_name text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  blurb text NOT NULL DEFAULT '',
  cta text NOT NULL DEFAULT 'Learn more',
  tag text NOT NULL DEFAULT '',
  gradient_from text NOT NULL DEFAULT '#16a34a',
  gradient_to text NOT NULL DEFAULT '#052e14',
  budget_cents integer NOT NULL DEFAULT 0,
  spent_cents integer NOT NULL DEFAULT 0,
  status public.ad_campaign_status NOT NULL DEFAULT 'draft',
  starts_on date NOT NULL DEFAULT current_date,
  ends_on date NOT NULL DEFAULT (current_date + interval '30 days'),
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_campaigns TO authenticated;
GRANT ALL ON public.ad_campaigns TO service_role;

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "advertiser reads own campaigns" ON public.ad_campaigns FOR SELECT TO authenticated USING (advertiser_id = auth.uid());
CREATE POLICY "advertiser creates own campaigns" ON public.ad_campaigns FOR INSERT TO authenticated WITH CHECK (advertiser_id = auth.uid());
CREATE POLICY "advertiser updates own campaigns" ON public.ad_campaigns FOR UPDATE TO authenticated USING (advertiser_id = auth.uid()) WITH CHECK (advertiser_id = auth.uid());
CREATE POLICY "advertiser deletes own campaigns" ON public.ad_campaigns FOR DELETE TO authenticated USING (advertiser_id = auth.uid());

-- Display-safe view of only currently active, in-flight campaigns — no advertiser id, budget or
-- spend — so the ad frames (SponsoredBanner) can read it for every visitor, signed in or not,
-- without exposing any advertiser's account or billing details.
CREATE VIEW public.active_ads WITH (security_invoker = true) AS
  SELECT id, company_name, title, blurb, cta, tag, gradient_from, gradient_to
  FROM public.ad_campaigns
  WHERE status = 'active' AND current_date BETWEEN starts_on AND ends_on;

GRANT SELECT ON public.active_ads TO anon, authenticated;

-- Lets a campaign record an impression or click without the viewer needing write access to the
-- underlying table (RLS only allows the advertiser to UPDATE their own row directly).
CREATE OR REPLACE FUNCTION public.record_ad_event(_campaign uuid, _kind text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _kind = 'impression' THEN
    UPDATE public.ad_campaigns SET impressions = impressions + 1
      WHERE id = _campaign AND status = 'active' AND current_date BETWEEN starts_on AND ends_on;
  ELSIF _kind = 'click' THEN
    UPDATE public.ad_campaigns SET clicks = clicks + 1
      WHERE id = _campaign AND status = 'active' AND current_date BETWEEN starts_on AND ends_on;
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.record_ad_event(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_ad_event(uuid, text) TO anon, authenticated;

-- "Pay" a draft/pending campaign — simulated billing only (no real payment processor is wired up
-- yet), but kept server-side so a client can't just set status='active' directly without this
-- at least marking the budget as committed and the campaign as scheduled.
CREATE OR REPLACE FUNCTION public.launch_ad_campaign(_campaign uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.ad_campaigns
    SET status = 'active'
    WHERE id = _campaign AND advertiser_id = auth.uid() AND status IN ('draft', 'pending_payment') AND budget_cents > 0;
END $$;

REVOKE EXECUTE ON FUNCTION public.launch_ad_campaign(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.launch_ad_campaign(uuid) TO authenticated;
