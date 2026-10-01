import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./auth";

export type FarmRole = "owner" | "manager" | "worker" | "viewer";
export const ROLE_INFO: Record<FarmRole, string> = {
  owner: "Everything, including roles and deleting the farm",
  manager: "Add, edit and delete records; invite and remove people",
  worker: "Add and edit records",
  viewer: "Read only",
};
const ACTIVE = "farmerplus:activeFarm";
export const activeFarmId = () => (typeof window === "undefined" ? null : localStorage.getItem(ACTIVE) || null);
export function setActiveFarm(id: string | null) {
  if (id) localStorage.setItem(ACTIVE, id); else localStorage.removeItem(ACTIVE);
  window.dispatchEvent(new Event("farmerplus:change"));
}

export type Farm = { id: string; name: string; role: FarmRole };
export type Member = { user_id: string; email: string; role: FarmRole };
export type Invite = { id: string; farm_id: string; email: string; role: FarmRole; farm_name?: string };

export function useTeam() {
  const { user } = useUser();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [myInvites, setMyInvites] = useState<Invite[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setActive(activeFarmId());
    if (!user) { setFarms([]); setMyInvites([]); setLoading(false); return; }
    const { data: m } = await supabase.from("farm_members").select("role, farms(id,name)").eq("user_id", user.id);
    setFarms((m ?? []).flatMap((r) => (r.farms ? [{ id: r.farms.id, name: r.farms.name, role: r.role as FarmRole }] : [])));
    const { data: inv } = await supabase.from("farm_invites").select("id,farm_id,email,role").ilike("email", user.email ?? "");
    setMyInvites((inv ?? []) as Invite[]);
    setLoading(false);
  }, [user]);
  useEffect(() => {
    load();
    const u = () => setActive(activeFarmId());
    window.addEventListener("farmerplus:change", u);
    return () => window.removeEventListener("farmerplus:change", u);
  }, [load]);
  const current = farms.find((f) => f.id === active) ?? null;
  return { user, farms, myInvites, active, current, loading, reload: load };
}

/** What the signed-in person may do with records in the active farm. */
export function permissions(role: FarmRole | null | undefined) {
  if (!role) return { canWrite: true, canDelete: true };
  return { canWrite: role !== "viewer", canDelete: role === "owner" || role === "manager" };
}
