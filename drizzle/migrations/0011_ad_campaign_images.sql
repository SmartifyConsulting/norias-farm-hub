ALTER TABLE public.ad_campaigns ADD COLUMN image_url text NOT NULL DEFAULT '';

-- Public bucket for ad creative images — public so the ad frames (SponsoredBanner) can render
-- them for every visitor, signed in or not, the same way a campaign's gradient already works.
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-images', 'ad-images', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Ad image upload own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ad-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Ad image update own folder" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'ad-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Ad image delete own folder" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'ad-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Ad image public read" ON storage.objects FOR SELECT USING (bucket_id = 'ad-images');

-- Recreate the view to include the new column — CREATE OR REPLACE VIEW can append a column at
-- the end without dropping and recreating dependents.
CREATE OR REPLACE VIEW public.active_ads WITH (security_invoker = true) AS
  SELECT id, company_name, title, blurb, cta, tag, gradient_from, gradient_to, image_url
  FROM public.ad_campaigns
  WHERE status = 'active' AND current_date BETWEEN starts_on AND ends_on;
