CREATE TABLE public.vc_role_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  email text NOT NULL DEFAULT '',
  role text NOT NULL CHECK (role IN ('field-officer','programme-manager','financial-partner')),
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','revoked')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.vc_role_requests TO authenticated;
GRANT ALL ON public.vc_role_requests TO service_role;
ALTER TABLE public.vc_role_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read" ON public.vc_role_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "request own pending" ON public.vc_role_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending' AND reviewed_by IS NULL);

CREATE OR REPLACE FUNCTION public.has_vc_role(_user uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user, 'admin') OR EXISTS (
    SELECT 1 FROM public.vc_role_requests WHERE user_id = _user AND role = _role AND status = 'approved')
$$;

CREATE OR REPLACE FUNCTION public.request_vc_role(_role text, _reason text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  INSERT INTO public.vc_role_requests(user_id, email, role, reason)
    VALUES (auth.uid(), coalesce(auth.jwt()->>'email',''), _role, _reason)
    ON CONFLICT (user_id, role) DO UPDATE SET status = 'pending', reason = EXCLUDED.reason, reviewed_by = NULL, reviewed_at = NULL, created_at = now()
    WHERE vc_role_requests.status IN ('rejected','revoked');
END $$;

CREATE OR REPLACE FUNCTION public.review_vc_role(_request uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can assign roles'; END IF;
  IF _status NOT IN ('approved','rejected','revoked') THEN RAISE EXCEPTION 'Bad status'; END IF;
  UPDATE public.vc_role_requests SET status = _status, reviewed_by = auth.uid(), reviewed_at = now() WHERE id = _request;
END $$;

-- Approved insurers may see and quote cover requests from any workspace.
CREATE POLICY "insurers read cover" ON public.vc_records FOR SELECT TO authenticated
  USING (collection = 'cover' AND public.has_vc_role(auth.uid(), 'financial-partner'));
CREATE POLICY "insurers update cover" ON public.vc_records FOR UPDATE TO authenticated
  USING (collection = 'cover' AND public.has_vc_role(auth.uid(), 'financial-partner'))
  WITH CHECK (collection = 'cover');
-- Storage/transport providers see and act on bookings made against their resources.
CREATE POLICY "providers read bookings" ON public.vc_records FOR SELECT TO authenticated
  USING (collection = 'bookings' AND (data->>'providerId') = auth.uid()::text);
CREATE POLICY "providers update bookings" ON public.vc_records FOR UPDATE TO authenticated
  USING (collection = 'bookings' AND (data->>'providerId') = auth.uid()::text)
  WITH CHECK (collection = 'bookings');

CREATE OR REPLACE FUNCTION public.vc_records_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); fac record; used numeric; cap numeric;
  active_states text[] := ARRAY['Requested','Accepted','Stored'];
  old_status text; new_status text;
BEGIN
  IF me IS NULL THEN RETURN NEW; END IF; -- service/admin maintenance
  IF NEW.collection IN ('farmers','visits','inspections') AND NOT public.has_vc_role(me, 'field-officer') THEN
    RAISE EXCEPTION 'Only approved field officers can record farmer registrations, visits and inspections';
  END IF;
  IF NEW.collection = 'cover' THEN
    old_status := CASE WHEN TG_OP = 'UPDATE' THEN OLD.data->>'status' ELSE NULL END;
    new_status := NEW.data->>'status';
    IF TG_OP = 'INSERT' AND new_status IS DISTINCT FROM 'Needs quote' AND NOT public.has_vc_role(me, 'financial-partner') THEN
      RAISE EXCEPTION 'New cover requests must start as Needs quote';
    END IF;
    IF TG_OP = 'UPDATE' AND new_status IS DISTINCT FROM old_status THEN
      IF new_status IN ('Quoted') AND NOT public.has_vc_role(me, 'financial-partner') THEN
        RAISE EXCEPTION 'Only approved insurers can issue quotes';
      END IF;
      IF new_status = 'Active' AND NOT (old_status = 'Quoted' AND NEW.owner_id = me) AND NOT public.has_vc_role(me, 'financial-partner') THEN
        RAISE EXCEPTION 'Only the farmer can accept a quoted policy';
      END IF;
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.owner_id <> OLD.owner_id THEN RAISE EXCEPTION 'Owner cannot change'; END IF;
  END IF;
  IF NEW.collection = 'bookings' AND NEW.data->>'kind' = 'Storage' THEN
    SELECT * INTO fac FROM public.vc_records WHERE collection = 'facilities' AND id = NEW.data->>'resourceId' FOR UPDATE;
    IF fac.id IS NULL THEN RAISE EXCEPTION 'Storage facility not found'; END IF;
    NEW.data := jsonb_set(NEW.data, '{providerId}', to_jsonb(fac.owner_id::text));
    IF TG_OP = 'UPDATE' THEN
      old_status := OLD.data->>'status'; new_status := NEW.data->>'status';
      IF new_status IS DISTINCT FROM old_status THEN
        IF new_status IN ('Accepted','Stored','Declined') AND me <> fac.owner_id THEN
          RAISE EXCEPTION 'Only the facility owner can accept, store or decline a booking';
        END IF;
        IF new_status = 'Cancelled' AND me <> OLD.owner_id THEN RAISE EXCEPTION 'Only the person who booked can cancel'; END IF;
      END IF;
      IF (NEW.data->>'qty') IS DISTINCT FROM (OLD.data->>'qty') AND me <> OLD.owner_id THEN RAISE EXCEPTION 'Only the booker can change the quantity'; END IF;
    ELSIF NEW.data->>'status' <> 'Requested' THEN
      RAISE EXCEPTION 'New bookings must start as Requested';
    END IF;
    IF NEW.data->>'status' = ANY(active_states) THEN
      cap := coalesce((fac.data->>'capacity')::numeric, 0);
      SELECT coalesce(sum((data->>'qty')::numeric), 0) INTO used FROM public.vc_records
        WHERE collection = 'bookings' AND id <> NEW.id AND data->>'kind' = 'Storage'
          AND data->>'resourceId' = fac.id AND data->>'status' = ANY(active_states);
      IF used + coalesce((NEW.data->>'qty')::numeric, 0) > cap THEN
        RAISE EXCEPTION 'OVERBOOKED: only % t free at %', greatest(cap - used, 0), coalesce(fac.data->>'name', 'this facility');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER vc_records_guard BEFORE INSERT OR UPDATE ON public.vc_records
  FOR EACH ROW EXECUTE FUNCTION public.vc_records_guard();

-- Live used capacity per facility, without exposing who booked.
CREATE OR REPLACE FUNCTION public.vc_facility_usage()
RETURNS TABLE(facility_id text, used numeric) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT data->>'resourceId', sum((data->>'qty')::numeric) FROM public.vc_records
  WHERE auth.uid() IS NOT NULL AND collection = 'bookings' AND data->>'kind' = 'Storage'
    AND data->>'status' IN ('Requested','Accepted','Stored')
  GROUP BY 1
$$;
GRANT EXECUTE ON FUNCTION public.has_vc_role(uuid, text), public.request_vc_role(text, text), public.review_vc_role(uuid, text), public.vc_facility_usage() TO authenticated;