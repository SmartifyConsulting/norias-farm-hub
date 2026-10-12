import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./auth";

export type CoopRole =
  | "administrator"
  | "chairperson"
  | "board_member"
  | "treasurer"
  | "secretary"
  | "operations_manager"
  | "member"
  | "auditor";
export type MemberStatus = "pending" | "active" | "left" | "removed";

export const ROLE_LABEL: Record<CoopRole, string> = {
  administrator: "Administrator",
  chairperson: "Chairperson",
  board_member: "Board member",
  treasurer: "Treasurer",
  secretary: "Secretary",
  operations_manager: "Operations manager",
  member: "Ordinary member",
  auditor: "Auditor",
};
export const ROLE_INFO: Record<CoopRole, string> = {
  administrator: "Overall administration, including the co-op's profile and deleting it",
  chairperson: "Governance and oversight; can manage members and the co-op's profile",
  board_member: "Board activities and decisions",
  treasurer: "Financial management",
  secretary: "Membership, meetings and records; can manage members and the co-op's profile",
  operations_manager: "Purchases, sales, logistics and resources",
  member: "Personal membership, transactions and statements",
  auditor: "Authorised read-only access",
};
/** Roles the create_cooperative/review flows can assign; `administrator` is set automatically for the creator only. */
export const ASSIGNABLE_ROLES: CoopRole[] = [
  "chairperson",
  "board_member",
  "treasurer",
  "secretary",
  "operations_manager",
  "member",
  "auditor",
];

export type Cooperative = {
  id: string;
  name: string;
  registration_number: string;
  coop_type: string;
  sector: string;
  province: string;
  location: string;
  contact_email: string;
  contact_phone: string;
  commodities: string;
  bio: string;
  created_at: string;
};
export type Membership = {
  cooperative_id: string;
  role: CoopRole;
  status: MemberStatus;
  cooperatives: Cooperative | null;
};
export type Member = { user_id: string; email: string; role: CoopRole; status: MemberStatus };
export type Invite = { id: string; cooperative_id: string; email: string; role: CoopRole };

export function useMyCooperatives() {
  const { user } = useUser();
  const [active, setActive] = useState<Membership[]>([]);
  const [pending, setPending] = useState<Membership[]>([]);
  const [myInvites, setMyInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!user) {
      setActive([]);
      setPending([]);
      setMyInvites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: m } = await supabase
      .from("cooperative_members")
      .select("cooperative_id,role,status,cooperatives(*)")
      .eq("user_id", user.id);
    const rows = (m ?? []) as unknown as Membership[];
    setActive(rows.filter((r) => r.status === "active"));
    setPending(rows.filter((r) => r.status === "pending"));
    const { data: inv } = await supabase
      .from("cooperative_invites")
      .select("id,cooperative_id,email,role")
      .ilike("email", user.email ?? "");
    setMyInvites((inv ?? []) as Invite[]);
    setLoading(false);
  }, [user]);
  useEffect(() => {
    load();
  }, [load]);
  return { user, active, pending, myInvites, loading, reload: load };
}

export function useCooperative(id: string | undefined) {
  const { user } = useUser();
  const [coop, setCoop] = useState<Cooperative | null>(null);
  const [role, setRole] = useState<CoopRole | null>(null);
  const [pending, setPending] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!id || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: c } = await supabase.from("cooperatives").select("*").eq("id", id).maybeSingle();
    setCoop((c ?? null) as Cooperative | null);
    const mine = await supabase
      .from("cooperative_members")
      .select("role,status")
      .eq("cooperative_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    const myRole = mine.data?.status === "active" ? (mine.data.role as CoopRole) : null;
    setRole(myRole);
    setPending(mine.data?.status === "pending");
    const isAdmin =
      myRole === "administrator" || myRole === "chairperson" || myRole === "secretary";
    const { data: m } = await supabase
      .from("cooperative_members")
      .select("user_id,email,role,status")
      .eq("cooperative_id", id)
      .eq("status", "active");
    setMembers((m ?? []) as Member[]);
    if (isAdmin) {
      const { data: r } = await supabase
        .from("cooperative_members")
        .select("user_id,email,role,status")
        .eq("cooperative_id", id)
        .eq("status", "pending");
      setRequests((r ?? []) as Member[]);
      const { data: i } = await supabase
        .from("cooperative_invites")
        .select("id,cooperative_id,email,role")
        .eq("cooperative_id", id);
      setInvites((i ?? []) as Invite[]);
    } else {
      setRequests([]);
      setInvites([]);
    }
    setLoading(false);
  }, [id, user]);
  useEffect(() => {
    load();
  }, [load]);
  const isAdmin = role === "administrator" || role === "chairperson" || role === "secretary";
  const canTrade =
    role === "administrator" || role === "chairperson" || role === "operations_manager";
  return {
    user,
    coop,
    role,
    pending,
    isAdmin,
    canTrade,
    members,
    requests,
    invites,
    loading,
    reload: load,
  };
}
