import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { ChevronLeft, Trash2, UserCheck, UserX } from "lucide-react";
import { Screen } from "@/components/Dock";
import { supabase } from "@/integrations/supabase/client";
import { ASSIGNABLE_ROLES, ROLE_INFO, ROLE_LABEL, useCooperative, type CoopRole } from "@/lib/coop";

export const Route = createFileRoute("/coop/$coopId")({
  head: () => ({ meta: [{ title: "Co-operative — FarmerPlus" }] }),
  component: CoopDetail,
});

const input =
  "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const btn =
  "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";

function CoopDetail() {
  const { coopId } = Route.useParams();
  const {
    user,
    coop,
    role,
    pending,
    isAdmin,
    canFinance,
    members,
    requests,
    invites,
    loading,
    reload,
  } = useCooperative(coopId);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CoopRole>("member");
  const [requesting, setRequesting] = useState(false);

  if (!user)
    return (
      <Screen title="Co-operative">
        <p className="text-sm text-muted-foreground">
          <Link to="/auth" className="font-semibold text-primary">
            Sign in
          </Link>{" "}
          to view this co-operative.
        </p>
      </Screen>
    );
  if (loading)
    return (
      <Screen title="Co-operative">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Screen>
    );
  if (!coop)
    return (
      <Screen title="Co-operative">
        <p className="text-sm text-muted-foreground">Co-operative not found.</p>
      </Screen>
    );

  const requestJoin = async () => {
    setRequesting(true);
    const { error } = await supabase.rpc("request_join_cooperative", { _coop: coopId });
    setRequesting(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    await reload();
    toast.success("Request sent — an administrator will review it");
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    const { error } = await supabase
      .from("cooperative_invites")
      .insert({ cooperative_id: coopId, email: email.trim().toLowerCase(), role: inviteRole });
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    setEmail("");
    await reload();
    toast.success("Invite saved — they'll see it here after signing in with that email");
  };

  const review = async (userId: string, approve: boolean) => {
    const { error } = await supabase.rpc("review_join_request", {
      _coop: coopId,
      _user_id: userId,
      _approve: approve,
    });
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    await reload();
  };

  const changeRole = async (userId: string, newRole: CoopRole) => {
    const { error } = await supabase
      .from("cooperative_members")
      .update({ role: newRole })
      .eq("cooperative_id", coopId)
      .eq("user_id", userId);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    await reload();
  };

  const removeMember = async (userId: string) => {
    await supabase
      .from("cooperative_members")
      .delete()
      .eq("cooperative_id", coopId)
      .eq("user_id", userId);
    await reload();
  };

  const leave = async () => {
    await supabase
      .from("cooperative_members")
      .delete()
      .eq("cooperative_id", coopId)
      .eq("user_id", user.id);
    await reload();
    toast.success("You left the co-operative");
  };

  const cancelInvite = async (id: string) => {
    await supabase.from("cooperative_invites").delete().eq("id", id);
    await reload();
  };

  const isMember = role !== null;

  return (
    <Screen title={coop.name}>
      <Link
        to="/coop"
        className="-mt-3 mb-4 inline-flex items-center text-sm text-muted-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Co-operatives
      </Link>

      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
        <div className="space-y-4">
          <section className="space-y-1 rounded-2xl border bg-card p-4 text-sm">
            {coop.registration_number && (
              <p>
                <b>Registration:</b> {coop.registration_number}
              </p>
            )}
            {coop.coop_type && (
              <p>
                <b>Type:</b> {coop.coop_type}
              </p>
            )}
            {coop.sector && (
              <p>
                <b>Sector:</b> {coop.sector}
              </p>
            )}
            {coop.province && (
              <p>
                <b>Province:</b> {coop.province}
              </p>
            )}
            {coop.location && (
              <p>
                <b>Location:</b> {coop.location}
              </p>
            )}
            {coop.commodities && (
              <p>
                <b>Commodities:</b> {coop.commodities}
              </p>
            )}
            {coop.bio && <p className="text-muted-foreground">{coop.bio}</p>}
            {!isMember && pending && (
              <p className="mt-2 text-sm text-muted-foreground">
                Your request to join is waiting for approval.
              </p>
            )}
            {!isMember && !pending && (
              <button onClick={requestJoin} disabled={requesting} className={`${btn} mt-2`}>
                {requesting ? "Requesting…" : "Request to join"}
              </button>
            )}
          </section>

          {isMember && (
            <section className="rounded-2xl border bg-card p-4">
              <h2 className="mb-2 font-semibold">Co-operative tools</h2>
              <div className="flex flex-wrap gap-2 text-sm">
                <Link to="/coop/$coopId/purchasing" params={{ coopId }} className={btn}>
                  Collective purchasing
                </Link>
                <Link
                  to="/coop/$coopId/sales"
                  params={{ coopId }}
                  className="rounded-xl border px-4 py-2 font-semibold"
                >
                  Collective sales
                </Link>
                <Link
                  to="/coop/$coopId/governance"
                  params={{ coopId }}
                  className="rounded-xl border px-4 py-2 font-semibold"
                >
                  Governance
                </Link>
                <Link
                  to="/coop/$coopId/resources"
                  params={{ coopId }}
                  className="rounded-xl border px-4 py-2 font-semibold"
                >
                  Shared resources
                </Link>
                <Link
                  to="/coop/$coopId/opportunities"
                  params={{ coopId }}
                  className="rounded-xl border px-4 py-2 font-semibold"
                >
                  Development &amp; funding
                </Link>
                {canFinance && (
                  <Link
                    to="/coop/$coopId/finance"
                    params={{ coopId }}
                    className="rounded-xl border px-4 py-2 font-semibold"
                  >
                    Finance
                  </Link>
                )}
                <Link
                  to="/coop/$coopId/intelligence"
                  params={{ coopId }}
                  className="rounded-xl border px-4 py-2 font-semibold"
                >
                  Collective intelligence
                </Link>
              </div>
            </section>
          )}

          {isAdmin && requests.length > 0 && (
            <section className="rounded-2xl border bg-card p-4">
              <h2 className="mb-2 font-semibold">Join requests</h2>
              <ul className="divide-y text-sm">
                {requests.map((r) => (
                  <li key={r.user_id} className="flex items-center justify-between gap-2 py-2">
                    <span className="truncate">{r.email || "Member"}</span>
                    <span className="flex gap-1">
                      <button
                        aria-label="Approve"
                        onClick={() => review(r.user_id, true)}
                        className="rounded-lg bg-success-soft p-1.5 text-success-foreground"
                      >
                        <UserCheck className="h-4 w-4" />
                      </button>
                      <button
                        aria-label="Reject"
                        onClick={() => review(r.user_id, false)}
                        className="rounded-lg bg-destructive/10 p-1.5 text-destructive"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {isAdmin && (
            <section className="rounded-2xl border bg-card p-4">
              <h2 className="mb-2 font-semibold">Invite a member</h2>
              <form onSubmit={invite} className="space-y-2">
                <input
                  type="email"
                  className={input}
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="flex gap-2">
                  <select
                    aria-label="Invite role"
                    className={input}
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as CoopRole)}
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  <button className={btn}>Invite</button>
                </div>
              </form>
              {invites.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Waiting: {invites.map((i) => `${i.email} (${ROLE_LABEL[i.role]})`).join(", ")}
                </p>
              )}
            </section>
          )}

          <section className="rounded-2xl border bg-card p-4 text-sm">
            <h2 className="mb-2 font-semibold">Roles</h2>
            {(Object.keys(ROLE_LABEL) as CoopRole[]).map((r) => (
              <p key={r}>
                <b>{ROLE_LABEL[r]}:</b> {ROLE_INFO[r]}
              </p>
            ))}
          </section>
        </div>

        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">Members ({members.length})</h2>
          <ul className="divide-y text-sm">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between gap-2 py-2">
                <span className="truncate">
                  {m.email || "Member"}
                  {m.user_id === user.id && " (you)"}
                </span>
                {isAdmin && m.role !== "administrator" ? (
                  <span className="flex items-center gap-2">
                    <select
                      aria-label="Role"
                      className="rounded-lg border bg-background px-2 py-1"
                      value={m.role}
                      onChange={(e) => changeRole(m.user_id, e.target.value as CoopRole)}
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                    <button aria-label="Remove" onClick={() => removeMember(m.user_id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </span>
                ) : (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {ROLE_LABEL[m.role]}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {isMember && role !== "administrator" && (
            <button onClick={leave} className="text-sm text-destructive">
              Leave this co-operative
            </button>
          )}
          {isAdmin && invites.length > 0 && (
            <div className="border-t pt-3">
              <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                Pending invites
              </h3>
              <ul className="space-y-1 text-sm">
                {invites.map((i) => (
                  <li key={i.id} className="flex items-center justify-between">
                    <span>
                      {i.email} — {ROLE_LABEL[i.role]}
                    </span>
                    <button aria-label="Cancel invite" onClick={() => cancelInvite(i.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </Screen>
  );
}
