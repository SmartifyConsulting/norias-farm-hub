-- Governance (board/committees, meetings, resolutions/voting, action register) and financial
-- management (member contributions, subscriptions, expenses) for cooperatives (AgriSphere brief 3.6/3.7).

CREATE TYPE public.coop_meeting_status AS ENUM ('scheduled','held','cancelled');
CREATE TYPE public.coop_resolution_status AS ENUM ('proposed','passed','rejected');
CREATE TYPE public.coop_vote_choice AS ENUM ('for','against','abstain');
CREATE TYPE public.coop_action_status AS ENUM ('open','done');
CREATE TYPE public.coop_ledger_kind AS ENUM ('contribution','subscription','share_capital','loan','expense','other');

-- Governance management (meetings, resolutions, committees, the action register) sits with the
-- administrator/chairperson/secretary roles, matching the brief's "Secretary: membership, meetings
-- and records" and "Chairperson: governance and oversight".
CREATE OR REPLACE FUNCTION public.coop_can_govern(_coop uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.coop_role_of(_coop) IN ('administrator','chairperson','secretary')
$$;

-- Financial management sits with the Treasurer, alongside administrator/chairperson.
CREATE OR REPLACE FUNCTION public.coop_can_finance(_coop uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.coop_role_of(_coop) IN ('administrator','chairperson','treasurer')
$$;

REVOKE EXECUTE ON FUNCTION public.coop_can_govern(uuid), public.coop_can_finance(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.coop_can_govern(uuid), public.coop_can_finance(uuid) TO authenticated;

CREATE TABLE public.cooperative_committees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id uuid NOT NULL REFERENCES public.cooperatives(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cooperative_committee_members (
  committee_id uuid NOT NULL REFERENCES public.cooperative_committees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  PRIMARY KEY (committee_id, user_id)
);

CREATE TABLE public.cooperative_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id uuid NOT NULL REFERENCES public.cooperatives(id) ON DELETE CASCADE,
  title text NOT NULL,
  meeting_date date NOT NULL,
  agenda text NOT NULL DEFAULT '',
  minutes text NOT NULL DEFAULT '',
  status public.coop_meeting_status NOT NULL DEFAULT 'scheduled',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cooperative_meeting_attendance (
  meeting_id uuid NOT NULL REFERENCES public.cooperative_meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  attended boolean NOT NULL DEFAULT false,
  PRIMARY KEY (meeting_id, user_id)
);

CREATE TABLE public.cooperative_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id uuid NOT NULL REFERENCES public.cooperatives(id) ON DELETE CASCADE,
  meeting_id uuid REFERENCES public.cooperative_meetings(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status public.coop_resolution_status NOT NULL DEFAULT 'proposed',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
-- One member, one vote. Quorum/weighting rules beyond a simple majority are a future extension point.
CREATE TABLE public.cooperative_votes (
  resolution_id uuid NOT NULL REFERENCES public.cooperative_resolutions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  choice public.coop_vote_choice NOT NULL,
  voted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (resolution_id, user_id)
);

CREATE TABLE public.cooperative_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id uuid NOT NULL REFERENCES public.cooperatives(id) ON DELETE CASCADE,
  meeting_id uuid REFERENCES public.cooperative_meetings(id) ON DELETE SET NULL,
  description text NOT NULL,
  assigned_to uuid,
  due_date date,
  status public.coop_action_status NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- A single ledger for the co-op's own finances: member contributions/subscriptions/share capital/
-- loans (user_id set) and organisational expenses (user_id null). Positive amount = income to the
-- co-op, negative = expenditure — keeps the co-op's organisational books distinct from individual
-- member balances, which are read by filtering on user_id.
CREATE TABLE public.cooperative_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id uuid NOT NULL REFERENCES public.cooperatives(id) ON DELETE CASCADE,
  user_id uuid,
  kind public.coop_ledger_kind NOT NULL,
  amount numeric NOT NULL,
  description text NOT NULL DEFAULT '',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.cooperative_committees, public.cooperative_committee_members,
  public.cooperative_meetings, public.cooperative_meeting_attendance,
  public.cooperative_resolutions, public.cooperative_votes, public.cooperative_actions,
  public.cooperative_ledger_entries
TO authenticated;
GRANT ALL ON
  public.cooperative_committees, public.cooperative_committee_members,
  public.cooperative_meetings, public.cooperative_meeting_attendance,
  public.cooperative_resolutions, public.cooperative_votes, public.cooperative_actions,
  public.cooperative_ledger_entries
TO service_role;

ALTER TABLE public.cooperative_committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperative_committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperative_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperative_meeting_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperative_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperative_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperative_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperative_ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read committees" ON public.cooperative_committees FOR SELECT TO authenticated USING (public.coop_role_of(cooperative_id) IS NOT NULL);
CREATE POLICY "governors manage committees" ON public.cooperative_committees FOR ALL TO authenticated USING (public.coop_can_govern(cooperative_id)) WITH CHECK (public.coop_can_govern(cooperative_id));

CREATE POLICY "members read committee members" ON public.cooperative_committee_members FOR SELECT TO authenticated USING (
  public.coop_role_of((SELECT cooperative_id FROM public.cooperative_committees WHERE id = committee_id)) IS NOT NULL
);
CREATE POLICY "governors manage committee members" ON public.cooperative_committee_members FOR ALL TO authenticated USING (
  public.coop_can_govern((SELECT cooperative_id FROM public.cooperative_committees WHERE id = committee_id))
) WITH CHECK (
  public.coop_can_govern((SELECT cooperative_id FROM public.cooperative_committees WHERE id = committee_id))
);

CREATE POLICY "members read meetings" ON public.cooperative_meetings FOR SELECT TO authenticated USING (public.coop_role_of(cooperative_id) IS NOT NULL);
CREATE POLICY "governors manage meetings" ON public.cooperative_meetings FOR ALL TO authenticated USING (public.coop_can_govern(cooperative_id)) WITH CHECK (public.coop_can_govern(cooperative_id));

CREATE POLICY "members read attendance" ON public.cooperative_meeting_attendance FOR SELECT TO authenticated USING (
  public.coop_role_of((SELECT cooperative_id FROM public.cooperative_meetings WHERE id = meeting_id)) IS NOT NULL
);
CREATE POLICY "governors record attendance" ON public.cooperative_meeting_attendance FOR ALL TO authenticated USING (
  public.coop_can_govern((SELECT cooperative_id FROM public.cooperative_meetings WHERE id = meeting_id))
) WITH CHECK (
  public.coop_can_govern((SELECT cooperative_id FROM public.cooperative_meetings WHERE id = meeting_id))
);

CREATE POLICY "members read resolutions" ON public.cooperative_resolutions FOR SELECT TO authenticated USING (public.coop_role_of(cooperative_id) IS NOT NULL);
CREATE POLICY "governors create resolutions" ON public.cooperative_resolutions FOR INSERT TO authenticated WITH CHECK (public.coop_can_govern(cooperative_id) AND created_by = auth.uid());
CREATE POLICY "governors update resolutions" ON public.cooperative_resolutions FOR UPDATE TO authenticated USING (public.coop_can_govern(cooperative_id)) WITH CHECK (public.coop_can_govern(cooperative_id));

CREATE POLICY "members read votes" ON public.cooperative_votes FOR SELECT TO authenticated USING (
  public.coop_role_of((SELECT cooperative_id FROM public.cooperative_resolutions WHERE id = resolution_id)) IS NOT NULL
);
CREATE POLICY "members cast own vote" ON public.cooperative_votes FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND public.coop_role_of((SELECT cooperative_id FROM public.cooperative_resolutions WHERE id = resolution_id)) IS NOT NULL
);
CREATE POLICY "members change own vote" ON public.cooperative_votes FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "members read actions" ON public.cooperative_actions FOR SELECT TO authenticated USING (public.coop_role_of(cooperative_id) IS NOT NULL);
CREATE POLICY "governors manage actions" ON public.cooperative_actions FOR INSERT TO authenticated WITH CHECK (public.coop_can_govern(cooperative_id) AND created_by = auth.uid());
CREATE POLICY "governors or assignee update actions" ON public.cooperative_actions FOR UPDATE TO authenticated USING (public.coop_can_govern(cooperative_id) OR assigned_to = auth.uid()) WITH CHECK (public.coop_can_govern(cooperative_id) OR assigned_to = auth.uid());

CREATE POLICY "member reads own or treasurer reads all ledger" ON public.cooperative_ledger_entries FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR (user_id IS NULL AND public.coop_role_of(cooperative_id) IS NOT NULL) OR public.coop_can_finance(cooperative_id)
);
CREATE POLICY "treasurer manages ledger" ON public.cooperative_ledger_entries FOR INSERT TO authenticated WITH CHECK (public.coop_can_finance(cooperative_id) AND created_by = auth.uid());
CREATE POLICY "treasurer updates ledger" ON public.cooperative_ledger_entries FOR UPDATE TO authenticated USING (public.coop_can_finance(cooperative_id)) WITH CHECK (public.coop_can_finance(cooperative_id));
CREATE POLICY "treasurer deletes ledger" ON public.cooperative_ledger_entries FOR DELETE TO authenticated USING (public.coop_can_finance(cooperative_id));
