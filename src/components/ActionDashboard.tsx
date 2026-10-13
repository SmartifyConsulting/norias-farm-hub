import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useShared } from "@/lib/shared";
import { matchOpportunity, usePassport } from "@/lib/agri";
import { useCapacity, usePipeline, useRisks } from "@/lib/network";

function Panel({
  title,
  to,
  color = "bg-earth-1",
  children,
}: {
  title: string;
  to: string;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border bg-card">
      <Link
        to={to}
        className={`flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white ${color}`}
      >
        {title}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      <div className="space-y-1 p-4 text-sm text-foreground">{children}</div>
    </section>
  );
}
const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs text-foreground/70">{children}</p>
);

/** Top opportunity matches only — used beside the apps on Home. */
export function OpportunitiesPanel() {
  const [passport] = usePassport();
  const { opportunities } = useShared();
  const top = opportunities
    .map((o) => ({ o, m: matchOpportunity(passport, o) }))
    .sort((a, b) => b.m.score - a.m.score)
    .slice(0, 4);
  return (
    <section className="soft-card border p-4">
      <Link
        to="/opportunities"
        className="mb-2 flex items-center justify-between font-display text-base font-semibold"
      >
        Opportunities for you
        <ArrowRight className="h-4 w-4" />
      </Link>
      <div className="space-y-1.5 text-sm">
        {top.map(({ o, m }) => (
          <p key={o.id} className="truncate">
            <b className="text-earth-3">{m.score}%</b> · {o.title}
          </p>
        ))}
        {!passport["crops"] && <Empty>Complete your passport for better matches.</Empty>}
      </div>
    </section>
  );
}

/** Decision-focused summary: every panel leads to an action. */
export function ActionDashboard({ hideOpportunities = false }: { hideOpportunities?: boolean }) {
  const [passport] = usePassport();
  const [pipe] = usePipeline();
  const [risks] = useRisks();
  const [cap] = useCapacity();
  const { opportunities: SAMPLE_OPPORTUNITIES } = useShared();
  const ranked = SAMPLE_OPPORTUNITIES.map((o) => ({ o, m: matchOpportunity(passport, o) })).sort(
    (a, b) => b.m.score - a.m.score,
  );
  const top = ranked.slice(0, 3);
  const tracked = new Set(pipe.map((p) => p.oppId));
  const actions = ranked.filter((r) => tracked.has(r.o.id) && r.m.gaps.length).slice(0, 3);
  const commitments = pipe.filter((p) => p.stage === "Commitment" || p.stage === "Action");
  const openRisks = risks.filter((r) => !["completed", "dismissed"].includes(r.stage));
  const atRisk = commitments.filter(() => openRisks.some((r) => r.severity === "High"));
  const outcomes = pipe.filter((p) => p.actual);
  const offers = cap.filter((c) => c.mode === "offer");
  const spare = passport["availableCapacity"]?.value;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {!hideOpportunities && (
        <Panel title="Opportunities for you" to="/opportunities" color="bg-brand-green">
          {top.map(({ o, m }) => (
            <p key={o.id} className="truncate">
              <b>{m.score}%</b> · {o.title}
            </p>
          ))}
          {!passport["crops"] && <Empty>Complete your passport for better matches.</Empty>}
        </Panel>
      )}
      <Panel title="Actions required" to="/outcomes" color="bg-blue-600">
        {actions.length ? (
          actions.map(({ o, m }) => (
            <p key={o.id} className="truncate">
              <AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-warning-foreground" />
              {o.title}: {m.gaps[0]}
            </p>
          ))
        ) : (
          <Empty>Track an opportunity to see what's blocking it.</Empty>
        )}
      </Panel>
      <Panel title="Your commitments" to="/outcomes" color="bg-brand-orange">
        {commitments.length ? (
          commitments.slice(0, 3).map((c) => (
            <p key={c.id} className="truncate">
              {c.title}
              {c.deadline ? ` · due ${c.deadline}` : ""}
            </p>
          ))
        ) : (
          <Empty>No commitments yet.</Empty>
        )}
      </Panel>
      <Panel title="Your capacity" to="/capacity" color="bg-earth-1">
        {spare ? (
          <p>{spare} t available production</p>
        ) : (
          <Empty>Add available capacity in your passport.</Empty>
        )}
        {offers.length > 0 && (
          <p>
            {offers.length} capacity listing{offers.length > 1 ? "s" : ""} shared
          </p>
        )}
      </Panel>
      <Panel title="Risks" to="/risks" color="bg-brand-red">
        {openRisks.length ? (
          openRisks.slice(0, 3).map((r) => (
            <p key={r.id} className="truncate">
              {r.severity} · {r.title}
            </p>
          ))
        ) : (
          <Empty>No open risks. Check the forecast.</Empty>
        )}
        {atRisk.length > 0 && (
          <p className="text-xs font-semibold text-destructive">
            {atRisk.length} commitment{atRisk.length > 1 ? "s" : ""} may be at risk
          </p>
        )}
      </Panel>
      <Panel title="Outcomes" to="/outcomes" color="bg-brand-green">
        {outcomes.length ? (
          outcomes.slice(0, 3).map((o) => (
            <p key={o.id} className="truncate">
              {o.title}: {o.actual?.volume ?? "?"} / {o.expected?.volume ?? "?"} t
            </p>
          ))
        ) : (
          <Empty>No outcomes recorded yet.</Empty>
        )}
      </Panel>
    </div>
  );
}
