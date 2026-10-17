CREATE TABLE public.vc_records (
  collection text NOT NULL,
  id text NOT NULL,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility text GENERATED ALWAYS AS (
    CASE WHEN collection IN ('jobs','vehicles','facilities') THEN 'public'
         WHEN collection = 'applications' THEN 'applicant'
         ELSE 'workspace' END) STORED,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection, id),
  CONSTRAINT vc_records_collection_check CHECK (collection IN ('farmers','visits','inspections','jobs','applications','cover','vehicles','facilities','bookings'))
);
CREATE INDEX vc_records_farm_idx ON public.vc_records(farm_id);
CREATE INDEX vc_records_owner_idx ON public.vc_records(owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vc_records TO authenticated;
GRANT ALL ON public.vc_records TO service_role;
ALTER TABLE public.vc_records ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.vc_job_owner(_job text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT owner_id FROM public.vc_records WHERE collection = 'jobs' AND id = _job
$$;

CREATE POLICY "vc read" ON public.vc_records FOR SELECT TO authenticated USING (
  owner_id = auth.uid()
  OR visibility = 'public'
  OR (visibility = 'workspace' AND farm_id IS NOT NULL AND public.farm_role_of(farm_id) IS NOT NULL)
  OR (visibility = 'applicant' AND public.vc_job_owner(data->>'jobId') = auth.uid())
);
CREATE POLICY "vc insert" ON public.vc_records FOR INSERT TO authenticated WITH CHECK (
  owner_id = auth.uid()
  AND (farm_id IS NULL OR public.farm_role_of(farm_id) IN ('owner','manager','worker'))
);
CREATE POLICY "vc update" ON public.vc_records FOR UPDATE TO authenticated USING (
  owner_id = auth.uid()
  OR (visibility = 'workspace' AND farm_id IS NOT NULL AND public.farm_role_of(farm_id) IN ('owner','manager','worker'))
) WITH CHECK (
  farm_id IS NULL OR public.farm_role_of(farm_id) IN ('owner','manager','worker')
);
CREATE POLICY "vc delete" ON public.vc_records FOR DELETE TO authenticated USING (
  owner_id = auth.uid()
  OR (visibility = 'workspace' AND farm_id IS NOT NULL AND public.farm_role_of(farm_id) IN ('owner','manager'))
);