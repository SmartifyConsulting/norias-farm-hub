import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, AlertTriangle } from "lucide-react";
import { Screen } from "@/components/Dock";
import { DEFAULT_SCENARIO, effectiveSource, rand, simulate, usePassport } from "@/lib/agri";
import { readStore, usePipeline } from "@/lib/network";

export const Route = createFileRoute("/funding")({
  head: () => ({
    meta: [
      { title: "Funding Readiness — FarmerPlus" },
      { name: "description", content: "See what information and evidence a lender or grant programme may ask for, based on your farm data." },
      { property: "og:title", content: "Funding Readiness — FarmerPlus" },
      { property: "og:description", content: "Prepare for conversations with banks and funders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FundingPage,
});

function FundingPage() {
  const [p] = usePassport();
  const [pipe] = usePipeline();
  const [harvest, setHarvest] = useState<{ title: string; qty: string; date: string }[]>([]);
  useEffect(() => setHarvest(readStore("farmerplus:harvest", [])), []);
  const sim = simulate(DEFAULT_SCENARIO);
  const commitments = pipe.filter((i) => i.stage === "Commitment" || i.stage === "Action");
  const outcomes = pipe.filter((i) => i.actual);
  const has = (k: string) => !!p[k]?.value && effectiveSource(p[k]) !== "expired";
  const evidenced = (k: string) => has(k) && !!p[k]?.evidence;

  const checklist = [
    { label: "Farm location and land", ok: has("location") && has("landAvailable"), to: "/passport" },
    { label: "Production history (harvest records)", ok: harvest.length > 0, to: "/app/harvest" },
    { label: "Expected production", ok: has("productionCapacity") || has("expectedYield"), to: "/passport" },
    { label: "Costs and revenue estimate", ok: true, to: "/simulator", note: "Using simulator default scenario" },
    { label: "Existing commitments", ok: commitments.length > 0 || has("commitments"), to: "/outcomes" },
    { label: "Delivered outcomes with evidence", ok: outcomes.some((o) => o.actual?.evidence), to: "/outcomes" },
    { label: "Certifications with evidence", ok: evidenced("certifications"), to: "/passport" },
    { label: "Compliance information", ok: has("compliance"), to: "/passport" },
  ];
  const score = checklist.filter((c) => c.ok).length;
  const months = ["Land prep", "Planting", "Inputs", "Growing", "Harvest", "Payment"];
  const flow = [-0.15, -0.3, -0.25, -0.1, -0.2, 1].map((f) => (f < 0 ? f * sim.totalCost : sim.revenue));

  return (
    <Screen title="Funding Readiness">
      <p className="-mt-3 mb-4 rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning-foreground">This is a preparation tool, not a lending decision. It does not mean finance will be offered.</p>
      <div className="md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3">
        <section className="mb-4 rounded-2xl border bg-card p-4 md:mb-0">
          <p className="text-sm font-semibold">Readiness checklist · {score}/{checklist.length}</p>
          <div className="my-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${(score / checklist.length) * 100}%` }} /></div>
          <ul className="space-y-1.5 text-sm">
            {checklist.map((c) => (
              <li key={c.label} className="flex items-start gap-2">
                {c.ok ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-foreground" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />}
                <span className="flex-1">{c.label}{c.note && <span className="block text-[11px] text-muted-foreground">{c.note}</span>}</span>
                {!c.ok && <Link to={c.to} className="text-xs font-semibold text-primary underline">Add</Link>}
              </li>
            ))}
          </ul>
        </section>
        <section className="mb-4 rounded-2xl border bg-card p-4 md:mb-0">
          <p className="text-sm font-semibold">Estimates (from simulator)</p>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Expected revenue</dt><dd className="text-right font-semibold">{rand(sim.revenue)}</dd>
            <dt className="text-muted-foreground">Estimated costs</dt><dd className="text-right font-semibold">{rand(sim.totalCost)}</dd>
            <dt className="text-muted-foreground">Working capital</dt><dd className="text-right font-semibold">{rand(sim.capitalRequired)}</dd>
            <dt className="text-muted-foreground">Funding gap</dt><dd className="text-right font-semibold">{rand(sim.financing)}</dd>
          </dl>
          <p className="mt-2 text-[11px] text-muted-foreground">Estimate · assumes {DEFAULT_SCENARIO.hectares} ha {DEFAULT_SCENARIO.crop}, {DEFAULT_SCENARIO.yieldPerHa} t/ha at {rand(DEFAULT_SCENARIO.pricePerT)}/t. <Link to="/simulator" className="underline">Change assumptions</Link></p>
        </section>
        <section className="mb-4 rounded-2xl border bg-card p-4 md:mb-0">
          <p className="text-sm font-semibold">Cash-flow timing (estimate)</p>
          <ul className="mt-2 space-y-1 text-xs">
            {months.map((m, k) => <li key={m} className="flex justify-between"><span className="text-muted-foreground">{m}</span><span className={flow[k]! < 0 ? "text-destructive" : "text-success-foreground"}>{flow[k]! < 0 ? "−" : "+"}{rand(Math.abs(flow[k]!))}</span></li>)}
          </ul>
        </section>
        <section className="rounded-2xl border bg-card p-4 md:col-span-2 lg:col-span-3">
          <p className="text-sm font-semibold">Supporting record</p>
          <div className="mt-2 grid gap-3 text-xs md:grid-cols-3">
            <div><p className="font-semibold">Production history</p>{harvest.length ? harvest.slice(0, 5).map((h, k) => <p key={k} className="text-muted-foreground">{h.date?.slice(0, 10)} · {h.title} {h.qty}</p>) : <p className="text-muted-foreground">No harvest records yet</p>}</div>
            <div><p className="font-semibold">Commitments</p>{commitments.length ? commitments.map((c) => <p key={c.id} className="text-muted-foreground">{c.title} · {c.expected?.volume ?? "?"} t</p>) : <p className="text-muted-foreground">None recorded</p>}</div>
            <div><p className="font-semibold">Evidence on file</p>{Object.entries(p).filter(([, c]) => c.evidence).map(([k, c]) => <p key={k} className="text-muted-foreground">{k}: {c.evidence}</p>)}{!Object.values(p).some((c) => c.evidence) && <p className="text-muted-foreground">No evidence attached in your passport</p>}</div>
          </div>
        </section>
      </div>
    </Screen>
  );
}
