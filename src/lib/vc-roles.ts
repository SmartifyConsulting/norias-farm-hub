import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RoleId } from "./valuechain";

/** Roles that unlock other people's data; an admin must approve them and the server enforces it. */
export const PRIVILEGED: RoleId[] = ["field-officer", "programme-manager", "financial-partner"];
export const isPrivileged = (r: RoleId) => PRIVILEGED.includes(r);

export type RoleRequest = {
  id: string; user_id: string; email: string; role: string; reason: string;
  status: "pending" | "approved" | "rejected" | "revoked"; created_at: string; reviewed_at: string | null;
};

/** The signed-in user's role requests and whether each privileged role is approved. */
export function useRoleGrants(userId?: string) {
  const [rows, setRows] = useState<RoleRequest[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const load = useCallback(async () => {
    if (!userId) { setRows([]); setIsAdmin(false); return; }
    const [r, a] = await Promise.all([
      supabase.from("vc_role_requests").select("*").eq("user_id", userId),
      supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin"),
    ]);
    setRows((r.data ?? []) as RoleRequest[]);
    setIsAdmin(!!a.data?.length);
  }, [userId]);
  useEffect(() => { load(); }, [load]);
  const statusOf = (role: RoleId): RoleRequest["status"] | "none" =>
    isAdmin ? "approved" : (rows.find((x) => x.role === role)?.status ?? "none");
  const canUse = (role: RoleId) => !isPrivileged(role) || statusOf(role) === "approved";
  return { rows, isAdmin, statusOf, canUse, reload: load };
}

export async function requestRole(role: RoleId, reason = "") {
  const { error } = await supabase.rpc("request_vc_role", { _role: role, _reason: reason });
  if (error) throw error;
}
export async function reviewRole(id: string, status: "approved" | "rejected" | "revoked") {
  const { error } = await supabase.rpc("review_vc_role", { _request: id, _status: status });
  if (error) throw error;
}
