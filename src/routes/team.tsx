import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { Users, Check, Trash2 } from "lucide-react";
import { Screen } from "@/components/Dock";
import { supabase } from "@/integrations/supabase/client";
import {
  ROLE_INFO,
  setActiveFarm,
  useTeam,
  type FarmRole,
  type Invite,
  type Member,
} from "@/lib/team";
import { syncAll } from "@/lib/animal-sync";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Farm Team — FarmerPlus" },
      {
        name: "description",
        content: "Share your farm with your team and give each person their own permissions.",
      },
      { property: "og:title", content: "Farm Team — FarmerPlus" },
      {
        property: "og:description",
        content: "A shared farm space with owner, manager, worker and viewer roles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Team,
});

const ROLES: FarmRole[] = ["manager", "worker", "viewer"];
const input =
  "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const btn =
  "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";

function Team() {
  const { user, farms, myInvites, active, current, loading, reload } = useTeam();
  const [name, setName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<FarmRole>("worker");

  const loadFarm = async () => {
    if (!current) return;
    const { data: m } = await supabase
      .from("farm_members")
      .select("user_id,email,role")
      .eq("farm_id", current.id);
    setMembers((m ?? []) as Member[]);
    if (current.role === "owner" || current.role === "manager") {
      const { data: i } = await supabase
        .from("farm_invites")
        .select("id,farm_id,email,role")
        .eq("farm_id", current.id);
      setInvites((i ?? []) as Invite[]);
    } else setInvites([]);
  };
  useEffect(() => {
    loadFarm(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [current?.id]);

  if (!user)
    return (
      <Screen title="Farm Team">
        <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
          <Link to="/auth" className="font-semibold text-primary">
            Sign in
          </Link>{" "}
          to create a shared farm and invite your team.
        </p>
      </Screen>
    );

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const { data, error } = await supabase.rpc("create_farm", { _name: name.trim() });
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    setActiveFarm(data as string);
    setName("");
    await reload();
    toast.success("Farm created — your new records now belong to it");
  };
  const accept = async (id: string) => {
    const { data, error } = await supabase.rpc("accept_farm_invite", { _invite: id });
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    setActiveFarm(data as string);
    await reload();
    await syncAll();
    toast.success("You joined the farm");
  };
  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !email.includes("@")) return;
    const { error } = await supabase
      .from("farm_invites")
      .insert({ farm_id: current.id, email: email.trim().toLowerCase(), role });
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    setEmail("");
    loadFarm();
    toast.success("Invite saved — they'll see it here after signing in with that email");
  };
  const manage = current && (current.role === "owner" || current.role === "manager");

  return (
    <Screen title="Farm Team">
      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
        <div className="space-y-4">
          {myInvites.length > 0 && (
            <section className="rounded-2xl border bg-card p-4">
              <h2 className="mb-2 font-semibold">Invitations for you</h2>
              {myInvites.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 py-1 text-sm">
                  <span>
                    Join as <b>{i.role}</b>
                  </span>
                  <button onClick={() => accept(i.id)} className={btn}>
                    <Check className="mr-1 inline h-4 w-4" />
                    Accept
                  </button>
                </div>
              ))}
            </section>
          )}
          <section className="rounded-2xl border bg-card p-4">
            <h2 className="mb-2 font-semibold">Working in</h2>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={!active} onChange={() => setActiveFarm(null)} /> Just
                  me (private records)
                </label>
                {farms.map((f) => (
                  <label key={f.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={active === f.id}
                      onChange={() => setActiveFarm(f.id)}
                    />{" "}
                    {f.name}{" "}
                    <span className="rounded-full bg-secondary px-2 text-xs text-secondary-foreground">
                      {f.role}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <form onSubmit={create} className="mt-4 flex gap-2">
              <input
                className={input}
                placeholder="New shared farm name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button className={btn}>Create</button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              New records you add go to the farm you're working in. Records added before stay
              private.
            </p>
          </section>
          <section className="rounded-2xl border bg-card p-4 text-sm">
            <h2 className="mb-2 font-semibold">Roles</h2>
            {(Object.keys(ROLE_INFO) as FarmRole[]).map((r) => (
              <p key={r}>
                <b className="capitalize">{r}:</b> {ROLE_INFO[r]}
              </p>
            ))}
          </section>
        </div>
        {current && (
          <section className="space-y-3 rounded-2xl border bg-card p-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Users className="h-4 w-4" />
              {current.name}
            </h2>
            <ul className="divide-y text-sm">
              {members.map((m) => (
                <li key={m.user_id} className="flex items-center justify-between gap-2 py-2">
                  <span className="truncate">
                    {m.email || "Member"}
                    {m.user_id === user.id && " (you)"}
                  </span>
                  {current.role === "owner" && m.role !== "owner" ? (
                    <span className="flex items-center gap-2">
                      <select
                        aria-label="Role"
                        className="rounded-lg border bg-background px-2 py-1"
                        value={m.role}
                        onChange={async (e) => {
                          const { error } = await supabase
                            .from("farm_members")
                            .update({ role: e.target.value as FarmRole })
                            .eq("farm_id", current.id)
                            .eq("user_id", m.user_id);
                          if (error) toast.error(friendlyError(error));
                          loadFarm();
                        }}
                      >
                        {ROLES.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                      <button
                        aria-label="Remove"
                        onClick={async () => {
                          await supabase
                            .from("farm_members")
                            .delete()
                            .eq("farm_id", current.id)
                            .eq("user_id", m.user_id);
                          loadFarm();
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </span>
                  ) : (
                    <span className="rounded-full bg-secondary px-2 text-xs text-secondary-foreground">
                      {m.role}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {manage && (
              <>
                <form onSubmit={invite} className="space-y-2">
                  <input
                    type="email"
                    className={input}
                    placeholder="Team member's email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <select
                      aria-label="Invite role"
                      className={input}
                      value={role}
                      onChange={(e) => setRole(e.target.value as FarmRole)}
                    >
                      {ROLES.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                    <button className={btn}>Invite</button>
                  </div>
                </form>
                {invites.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Waiting: {invites.map((i) => `${i.email} (${i.role})`).join(", ")}
                  </p>
                )}
              </>
            )}
            {current.role !== "owner" && (
              <button
                onClick={async () => {
                  await supabase
                    .from("farm_members")
                    .delete()
                    .eq("farm_id", current.id)
                    .eq("user_id", user.id);
                  setActiveFarm(null);
                  reload();
                }}
                className="text-sm text-destructive"
              >
                Leave this farm
              </button>
            )}
          </section>
        )}
      </div>
    </Screen>
  );
}
