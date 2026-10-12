import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import { Screen } from "@/components/Dock";
import { useCooperative } from "@/lib/coop";
import { useCoopIntelligence } from "@/lib/coop-intelligence";
import { useCoopOpportunities, useCoopResources } from "@/lib/coop-resources";

export const Route = createFileRoute("/coop/$coopId/intelligence")({
  head: () => ({ meta: [{ title: "Collective Intelligence — FarmerPlus" }] }),
  component: Intelligence,
});

function Intelligence() {
  const { coopId } = Route.useParams();
  const { user, coop, loading: coopLoading } = useCooperative(coopId);
  const { demand, supply, loading } = useCoopIntelligence(coopId);
  const { assets, bookings, loading: resLoading } = useCoopResources(coopId);
  const { opportunities, loading: oppLoading } = useCoopOpportunities(coopId);

  const underused = useMemo(
    () =>
      assets.filter(
        (a) =>
          a.status === "available" &&
          bookings.filter((b) => b.asset_id === a.id && b.status !== "rejected").length === 0,
      ),
    [assets, bookings],
  );
  const closingSoon = useMemo(() => {
    const in30 = Date.now() + 30 * 24 * 60 * 60 * 1000;
    return opportunities.filter(
      (o) => o.status === "open" && o.deadline && new Date(o.deadline).getTime() <= in30,
    );
  }, [opportunities]);

  if (!user || coopLoading || loading || resLoading || oppLoading)
    return (
      <Screen title="Collective Intelligence">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Screen>
    );
  if (!coop)
    return (
      <Screen title="Collective Intelligence">
        <p className="text-sm text-muted-foreground">Co-operative not found.</p>
      </Screen>
    );

  return (
    <Screen title={`${coop.name} — Collective Intelligence`}>
      <Link
        to="/coop/$coopId"
        params={{ coopId }}
        className="-mt-3 mb-4 inline-flex items-center text-sm text-muted-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {coop.name}
      </Link>
      <p className="-mt-1 mb-4 text-sm text-muted-foreground">
        Recommendations built from real, currently-open records — never estimates. Nothing here
        creates an order; it just points at an opportunity worth acting on.
      </p>

      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="mb-2 font-semibold">Bulk procurement opportunities</h2>
          {demand.length === 0 ? (
            <p className="text-sm text-muted-foreground">No overlapping open demand right now.</p>
          ) : (
            <ul className="divide-y text-sm">
              {demand.map((d) => (
                <li key={d.item} className="py-2">
                  <p className="font-semibold">{d.item}</p>
                  <p className="text-xs text-muted-foreground">
                    Your co-op needs {d.coop_qty} {d.unit}
                    {d.other_coops > 0 &&
                      ` — ${d.other_coops} other co-op${d.other_coops === 1 ? "" : "s"} also need ${d.other_qty} ${d.unit}. Worth a joint procurement enquiry.`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-4">
          <h2 className="mb-2 font-semibold">Aggregated supply matches</h2>
          {supply.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No overlapping available supply right now.
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {supply.map((s) => (
                <li key={s.commodity} className="py-2">
                  <p className="font-semibold">{s.commodity}</p>
                  <p className="text-xs text-muted-foreground">
                    Your co-op has {s.coop_qty} {s.unit} available
                    {s.other_coops > 0 &&
                      ` — ${s.other_coops} other co-op${s.other_coops === 1 ? "" : "s"} also have ${s.other_qty} ${s.unit}. Combined, this may reach a larger buyer's required volume.`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-4">
          <h2 className="mb-2 font-semibold">Underused shared equipment</h2>
          {underused.length === 0 ? (
            <p className="text-sm text-muted-foreground">No registered assets are sitting idle.</p>
          ) : (
            <ul className="divide-y text-sm">
              {underused.map((a) => (
                <li key={a.id} className="py-2">
                  {a.name} — no bookings yet{a.category && ` (${a.category})`}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-4">
          <h2 className="mb-2 font-semibold">Opportunities closing soon</h2>
          {closingSoon.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing closing in the next 30 days.</p>
          ) : (
            <ul className="divide-y text-sm">
              {closingSoon.map((o) => (
                <li key={o.id} className="py-2">
                  {o.title} — closes {o.deadline}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Screen>
  );
}
