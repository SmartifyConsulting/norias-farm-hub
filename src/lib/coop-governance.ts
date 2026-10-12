import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./auth";

export type MeetingStatus = "scheduled" | "held" | "cancelled";
export type ResolutionStatus = "proposed" | "passed" | "rejected";
export type VoteChoice = "for" | "against" | "abstain";
export type ActionStatus = "open" | "done";
export type LedgerKind =
  "contribution" | "subscription" | "share_capital" | "loan" | "expense" | "other";

export type Meeting = {
  id: string;
  title: string;
  meeting_date: string;
  agenda: string;
  minutes: string;
  status: MeetingStatus;
};
export type Resolution = {
  id: string;
  meeting_id: string | null;
  title: string;
  description: string;
  status: ResolutionStatus;
  created_at: string;
};
export type Vote = { resolution_id: string; user_id: string; choice: VoteChoice };
export type ActionItem = {
  id: string;
  meeting_id: string | null;
  description: string;
  assigned_to: string | null;
  due_date: string | null;
  status: ActionStatus;
};
export type LedgerEntry = {
  id: string;
  user_id: string | null;
  kind: LedgerKind;
  amount: number;
  description: string;
  created_at: string;
};

export function useCoopGovernance(coopId: string | undefined, canGovern: boolean) {
  const { user } = useUser();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!coopId || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: m } = await supabase
      .from("cooperative_meetings")
      .select("id,title,meeting_date,agenda,minutes,status")
      .eq("cooperative_id", coopId)
      .order("meeting_date", { ascending: false });
    setMeetings((m ?? []) as Meeting[]);
    const { data: r } = await supabase
      .from("cooperative_resolutions")
      .select("id,meeting_id,title,description,status,created_at")
      .eq("cooperative_id", coopId)
      .order("created_at", { ascending: false });
    setResolutions((r ?? []) as Resolution[]);
    const resIds = (r ?? []).map((x) => x.id);
    if (resIds.length) {
      const { data: v } = await supabase
        .from("cooperative_votes")
        .select("resolution_id,user_id,choice")
        .in("resolution_id", resIds);
      setVotes((v ?? []) as Vote[]);
    } else setVotes([]);
    const { data: a } = await supabase
      .from("cooperative_actions")
      .select("id,meeting_id,description,assigned_to,due_date,status")
      .eq("cooperative_id", coopId)
      .order("due_date", { ascending: true });
    setActions((a ?? []) as ActionItem[]);
    setLoading(false);
  }, [coopId, user]);
  useEffect(() => {
    load();
  }, [load]);
  return { user, meetings, resolutions, votes, actions, loading, reload: load };
}

export function useCoopLedger(coopId: string | undefined, canFinance: boolean) {
  const { user } = useUser();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!coopId || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = supabase
      .from("cooperative_ledger_entries")
      .select("id,user_id,kind,amount,description,created_at")
      .eq("cooperative_id", coopId)
      .order("created_at", { ascending: false });
    const { data } = canFinance ? await q : await q.or(`user_id.eq.${user.id},user_id.is.null`);
    setEntries((data ?? []) as LedgerEntry[]);
    setLoading(false);
  }, [coopId, user, canFinance]);
  useEffect(() => {
    load();
  }, [load]);
  return { user, entries, loading, reload: load };
}
