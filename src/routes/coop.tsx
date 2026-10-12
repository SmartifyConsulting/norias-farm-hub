import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Users2 } from "lucide-react";
import { Screen } from "@/components/Dock";
import { supabase } from "@/integrations/supabase/client";
import { useMyCooperatives } from "@/lib/coop";

export const Route = createFileRoute("/coop")({
  head: () => ({
    meta: [
      { title: "Co-operatives — FarmerPlus" },
      {
        name: "description",
        content: "Join or register an agricultural co-operative and manage it alongside your farm.",
      },
      { property: "og:title", content: "Co-operatives — FarmerPlus" },
      {
        property: "og:description",
        content: "Co-operative registration, membership and governance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoopDirectory,
});

const input =
  "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const btn =
  "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";

function CoopDirectory() {
  const { user, active, pending, myInvites, loading, reload } = useMyCooperatives();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [coopType, setCoopType] = useState("");
  const [sector, setSector] = useState("");
  const [province, setProvince] = useState("");

  if (!user)
    return (
      <Screen title="Co-operatives">
        <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
          <Link to="/auth" className="font-semibold text-primary">
            Sign in
          </Link>{" "}
          to register or join a co-operative.
        </p>
      </Screen>
    );

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const { data, error } = await supabase.rpc("create_cooperative", {
      _name: name.trim(),
      _registration_number: registrationNumber.trim(),
      _coop_type: coopType.trim(),
      _sector: sector.trim(),
      _province: province.trim(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setName("");
    setRegistrationNumber("");
    setCoopType("");
    setSector("");
    setProvince("");
    setCreating(false);
    await reload();
    toast.success("Co-operative registered — you're its administrator");
    void data;
  };

  const acceptInvite = async (id: string) => {
    const { error } = await supabase.rpc("accept_cooperative_invite", { _invite: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    await reload();
    toast.success("You joined the co-operative");
  };

  return (
    <Screen title="Co-operatives">
      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
        <div className="space-y-4">
          {myInvites.length > 0 && (
            <section className="rounded-2xl border bg-card p-4">
              <h2 className="mb-2 font-semibold">Invitations for you</h2>
              {myInvites.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 py-1 text-sm">
                  <span>
                    Join as <b>{i.role.replace("_", " ")}</b>
                  </span>
                  <button onClick={() => acceptInvite(i.id)} className={btn}>
                    <Check className="mr-1 inline h-4 w-4" />
                    Accept
                  </button>
                </div>
              ))}
            </section>
          )}

          <section className="rounded-2xl border bg-card p-4">
            <h2 className="mb-2 flex items-center gap-2 font-semibold">
              <Users2 className="h-4 w-4" />
              My co-operatives
            </h2>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : active.length === 0 && pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You're not part of a co-operative yet.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {active.map(
                  (m) =>
                    m.cooperatives && (
                      <li key={m.cooperative_id} className="py-2">
                        <Link
                          to="/coop/$coopId"
                          params={{ coopId: m.cooperative_id }}
                          className="flex items-center justify-between hover:text-earth-3"
                        >
                          <span>{m.cooperatives.name}</span>
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
                            {m.role.replace("_", " ")}
                          </span>
                        </Link>
                      </li>
                    ),
                )}
                {pending.map(
                  (m) =>
                    m.cooperatives && (
                      <li
                        key={m.cooperative_id}
                        className="flex items-center justify-between py-2 text-muted-foreground"
                      >
                        <span>{m.cooperatives.name}</span>
                        <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs text-warning-foreground">
                          Pending approval
                        </span>
                      </li>
                    ),
                )}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border bg-card p-4">
            <button onClick={() => setCreating((v) => !v)} className="font-semibold text-earth-1">
              {creating ? "Cancel" : "+ Register a new co-operative"}
            </button>
            {creating && (
              <form onSubmit={create} className="mt-3 space-y-2">
                <input
                  className={input}
                  placeholder="Co-operative name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  className={input}
                  placeholder="Registration number"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                />
                <div className="flex gap-2">
                  <input
                    className={input}
                    placeholder="Type (e.g. primary)"
                    value={coopType}
                    onChange={(e) => setCoopType(e.target.value)}
                  />
                  <input
                    className={input}
                    placeholder="Sector (e.g. grain)"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                  />
                </div>
                <input
                  className={input}
                  placeholder="Province / region"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                />
                <button className={btn}>Register co-operative</button>
              </form>
            )}
          </section>
        </div>

        <section className="rounded-2xl border bg-card p-4 text-sm">
          <h2 className="mb-2 font-semibold">About co-operatives</h2>
          <p className="text-muted-foreground">
            A co-operative is its own organisation — it has its own members, roles and records,
            separate from your personal farm. You can belong to more than one. Open a co-operative's
            page to invite members, review join requests and manage its profile.
          </p>
        </section>
      </div>
    </Screen>
  );
}
