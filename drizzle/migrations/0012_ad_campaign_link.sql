ALTER TABLE public.ad_campaigns ADD COLUMN link_url text NOT NULL DEFAULT '';
ALTER TABLE public.ad_campaigns ADD COLUMN image_shape text NOT NULL DEFAULT 'banner' CHECK (image_shape IN ('banner', 'portrait'));

CREATE OR REPLACE VIEW public.active_ads WITH (security_invoker = true) AS
  SELECT id, company_name, title, blurb, cta, tag, gradient_from, gradient_to, image_url, image_shape, link_url
  FROM public.ad_campaigns
  WHERE status = 'active' AND current_date BETWEEN starts_on AND ends_on;
