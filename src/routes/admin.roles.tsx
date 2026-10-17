import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Screen } from "@/components/Dock";
import { Card, Pill, btn, btnGhost } from "@/components/vc-ui";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { reviewRole, useRoleGrants, type RoleRequest } from "@/lib/vc-roles";
import { ROLES } from "@/lib/valuechain";

export const Route = createFileRoute("/admin/roles")({
  head: () => ({
    meta: [
      { title: "Admin: Role approvals — FarmerPlus" },
      { name: "description", content: "Approve or revoke field officer, insurer and programme manager access." },
      { property: "og:title", content: "Admin: Role approvals — FarmerPlus" },
      { property: "og:description", content: "Admin-approved access for privileged value-chain roles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RolesAdmin,
});

const roleName = (id: string) => ROLES.find((r) => r.id === id)?.name ?? id;

function RolesAdmin() {
  const { user } = useUser();
  const { isAdmin } = useRoleGrants(user?.id);
  const [rows, setRows] = useState<RoleRequest[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("vc_role_requests").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as RoleRequest[]);
  }, []);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);
  const act = async (r: RoleRequest, s: "approved" | "rejected" | "revoked") => {
    try { await reviewRole(r.id, s); toast.success(`${roleName(r.role)} ${s} for ${r.email}`); load(); }
    catch (e) { toast.error((e as Error).message); }
  };
  if (!isAdmin) return <Screen title="Role approvals"><Card><p className="text-sm text-muted-foreground">Only admins can approve roles.</p></Card></Screen>;
  const pending = rows.filter((r) => r.status === "pending");
  const rest = rows.filter((r) => r.status !== "pending");
  const Row = ({ r }: { r: RoleRequest }) => (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm">
      <span><b>{r.email || r.user_id.slice(0, 8)}</b> • {roleName(r.role)} {r.reason && <span className="text-muted-foreground">— “{r.reason}”</span>} <Pill tone={r.status === "approved" ? "ok" : r.status === "pending" ? "warn" : "bad"}>{r.status}</Pill></span>
      <span className="flex gap-2">
        {r.status !== "approved" && <button className={btn} onClick={() => act(r, "approved")}>Approve</button>}
        {r.status === "pending" && <button className={btnGhost} onClick={() => act(r, "rejected")}>Reject</button>}
        {r.status === "approved" && <button className={btnGhost} onClick={() => act(r, "revoked")}>Revoke</button>}
      </span>
    </li>
  );
  return (
    <Screen title="Role approvals">
      <div className="space-y-4">
        <Card title={`Waiting for approval (${pending.length})`}>
          {pending.length ? <ul className="space-y-2">{pending.map((r) => <Row key={r.id} r={r} />)}</ul> : <p className="text-sm text-muted-foreground">No requests waiting.</p>}
        </Card>
        <Card title="Decided">
          {rest.length ? <ul className="space-y-2">{rest.map((r) => <Row key={r.id} r={r} />)}</ul> : <p className="text-sm text-muted-foreground">Nothing yet.</p>}
        </Card>
      </div>
    </Screen>
  );
}
