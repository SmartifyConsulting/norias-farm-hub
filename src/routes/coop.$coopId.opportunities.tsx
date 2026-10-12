import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { Screen } from "@/components/Dock";
import { supabase } from "@/integrations/supabase/client";
import { useCooperative } from "@/lib/coop";
import { useCoopOpportunities, type OppStatus, type OppType } from "@/lib/coop-resources";

export const Route = createFileRoute("/coop/$coopId/opportunities")({
  head: () => ({ meta: [{ title: "Development & Funding — FarmerPlus" }] }),
  component: Opportunities,
});

const input =
  "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const btn =
  "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";
const TYPES: OppType[] = ["funding", "grant", "training", "mentorship", "other"];
const STATUSES: OppStatus[] = ["open", "applied", "awarded", "rejected", "closed"];

function Opportunities() {
  const { coopId } = Route.useParams();
  const { user, coop, canManageResources, loading: coopLoading } = useCooperative(coopId);
  const { opportunities, loading, reload } = useCoopOpportunities(coopId);
  const [title, setTitle] = useState("");
  const [oppType, setOppType] = useState<OppType>("funding");
  const [provider, setProvider] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");

  if (!user || coopLoading || loading)
    return (
      <Screen title="Development & Funding">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Screen>
    );
  if (!coop)
    return (
      <Screen title="Development & Funding">
        <p className="text-sm text-muted-foreground">Co-operative not found.</p>
      </Screen>
    );

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const { error } = await supabase.from("cooperative_opportunities").insert({
      cooperative_id: coopId,
      title: title.trim(),
      opp_type: oppType,
      provider: provider.trim(),
      deadline: deadline || null,
      description: description.trim(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setTitle("");
    setProvider("");
    setDeadline("");
    setDescription("");
    await reload();
    toast.success("Opportunity added");
  };

  const setStatus = async (id: string, status: OppStatus) => {
    await supabase.from("cooperative_opportunities").update({ status }).eq("id", id);
    await reload();
  };

  return (
    <Screen title={`${coop.name} — Development & Funding`}>
      <Link
        to="/coop/$coopId"
        params={{ coopId }}
        className="-mt-3 mb-4 inline-flex items-center text-sm text-muted-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {coop.name}
      </Link>

      {canManageResources && (
        <section className="mb-4 rounded-2xl border bg-card p-4">
          <h2 className="mb-2 font-semibold">Add an opportunity</h2>
          <form onSubmit={add} className="space-y-2">
            <input
              className={input}
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="flex gap-2">
              <select
                aria-label="Type"
                className={input}
                value={oppType}
                onChange={(e) => setOppType(e.target.value as OppType)}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                className={input}
                placeholder="Provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              />
            </div>
            <input
              className={input}
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            <input
              className={input}
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button className={btn}>Add opportunity</button>
          </form>
        </section>
      )}

      {opportunities.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No development or funding opportunities tracked yet.
        </p>
      ) : (
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          {opportunities.map((o) => (
            <article key={o.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{o.title}</p>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
                  {o.opp_type}
                </span>
              </div>
              {o.provider && (
                <p className="text-xs text-muted-foreground">
                  {o.provider}
                  {o.deadline && ` — closes ${o.deadline}`}
                </p>
              )}
              {o.description && <p className="mt-1 text-sm">{o.description}</p>}
              {canManageResources ? (
                <select
                  aria-label="Status"
                  className="mt-2 rounded-lg border bg-background px-2 py-1 text-xs"
                  value={o.status}
                  onChange={(e) => setStatus(o.id, e.target.value as OppStatus)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="mt-2 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
                  {o.status}
                </span>
              )}
            </article>
          ))}
        </div>
      )}
    </Screen>
  );
}
