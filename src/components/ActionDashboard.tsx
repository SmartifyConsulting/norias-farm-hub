import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { SAMPLE_OPPORTUNITIES, matchOpportunity, usePassport } from "@/lib/agri";
import { useCapacity, usePipeline, useRisks } from "@/lib/network";

function Panel({ title, to, children }: { title: string; to: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-3xl p-4">
      <Link to={to} className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-foreground/80">{title}<ArrowRight className="h-3.5 w-3.5" /></Link>
      <div className="space-y-1 text-sm text-foreground">{children}</div>
    </section>
  );
}
const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-xs text-foreground/70">{children}</p>;

/** Decision-focused summary: every panel leads to an action. */
export function ActionDashboard() {
  const [passport] = usePassport();
  const [pipe] = usePipeline();
  const [risks] = useRisks();
  const [cap] = useCapacity();
  const ranked = SAMPLE_OPPORTUNITIES.map((o) => ({ o, m: matchOpportunity(passport, o) })).sort((a, b) => b.m.score - a.m.score);
  const top = ranked.slice(0, 3);
  const tracked = new Set(pipe.map((p) => p.oppId));
  const actions = ranked.filter((r) => tracked.has(r.o.id) && r.m.gaps.length).slice(0, 3);
  const commitments = pipe.filter((p) => p.stage === "Commitment" || p.stage === "Action");
  const openRisks = risks.filter((r) => !["completed", "dismissed"].includes(r.stage));
  const atRisk = commitments.filter(() => openRisks.some((r) => r.severity === "High"));
  const outcomes = pipe.filter((p) => p.actual);
  const offers = cap.filter((c) => c.mode === "offer");
  const spare = passport.availableCapacity?.value;

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      <Panel title="Opportunities for you" to="/opportunities">
        {top.map(({ o, m }) => <p key={o.id} className="truncate"><b>{m.score}%</b> · {o.title}</p>)}
        {!passport.crops && <Empty>Complete your passport for better matches.</Empty>}
      </Panel>
      <Panel title="Actions required" to="/outcomes">
        {actions.length ? actions.map(({ o, m }) => <p key={o.id} className="truncate"><AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-warning-foreground" />{o.title}: {m.gaps[0]}</p>) : <Empty>Track an opportunity to see what's blocking it.</Empty>}
      </Panel>
      <Panel title="Your commitments" to="/outcomes">
        {commitments.length ? commitments.slice(0, 3).map((c) => <p key={c.id} className="truncate">{c.title}{c.deadline ? ` · due ${c.deadline}` : ""}</p>) : <Empty>No commitments yet.</Empty>}
      </Panel>
      <Panel title="Your capacity" to="/capacity">
        {spare ? <p>{spare} t available production</p> : <Empty>Add available capacity in your passport.</Empty>}
        {offers.length > 0 && <p>{offers.length} capacity listing{offers.length > 1 ? "s" : ""} shared</p>}
      </Panel>
      <Panel title="Risks" to="/risks">
        {openRisks.length ? openRisks.slice(0, 3).map((r) => <p key={r.id} className="truncate">{r.severity} · {r.title}</p>) : <Empty>No open risks. Check the forecast.</Empty>}
        {atRisk.length > 0 && <p className="text-xs font-semibold text-destructive">{atRisk.length} commitment{atRisk.length > 1 ? "s" : ""} may be at risk</p>}
      </Panel>
      <Panel title="Outcomes" to="/outcomes">
        {outcomes.length ? outcomes.slice(0, 3).map((o) => <p key={o.id} className="truncate">{o.title}: {o.actual?.volume ?? "?"} / {o.expected?.volume ?? "?"} t</p>) : <Empty>No outcomes recorded yet.</Empty>}
      </Panel>
    </div>
  );
}
