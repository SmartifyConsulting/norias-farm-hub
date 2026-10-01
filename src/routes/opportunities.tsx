import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { addToPipeline } from "@/lib/network";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Screen } from "@/components/Dock";
import { SAMPLE_OPPORTUNITIES, matchOpportunity, useDemand, usePassport, type Opportunity, type OppType } from "@/lib/agri";

export const Route = createFileRoute("/opportunities")({
  head: () => ({
    meta: [
      { title: "Opportunities — FarmerPlus" },
      { name: "description", content: "Buyer demand, contracts, funding, equipment, storage and transport matched to your farm's capabilities." },
      { property: "og:title", content: "Opportunities — FarmerPlus" },
      { property: "og:description", content: "Potential matches between your farm and buyer demand, with clear reasons and gaps." },
    ],
  }),
  component: OpportunitiesPage,
});

const TYPES: (OppType | "All")[] = ["All", "Buyer demand", "Contract farming", "Funding", "Equipment", "Storage", "Transport", "Training"];

function OpportunitiesPage() {
  const [p] = usePassport();
  const [demand, setDemand] = useDemand();
  const [filter, setFilter] = useState<(typeof TYPES)[number]>("All");
  const [tab, setTab] = useState<"matches" | "demand">("matches");
  const all = useMemo(() => [...demand, ...SAMPLE_OPPORTUNITIES], [demand]);
  const ranked = all
    .filter((o) => filter === "All" || o.type === filter)
    .map((o) => ({ o, m: matchOpportunity(p, o) }))
    .sort((a, b) => b.m.score - a.m.score);
  const hasPassport = Object.values(p).some((c) => c.value);

  return (
    <Screen title="Opportunities">
      <div className="mb-4 flex gap-2 rounded-full bg-secondary p-1 md:max-w-sm">
        {(["matches", "demand"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-full py-1.5 text-sm font-semibold ${tab === t ? "bg-primary text-primary-foreground" : "text-secondary-foreground"}`}>
            {t === "matches" ? "Matched for you" : "Buyer demand"}
          </button>
        ))}
      </div>
      {tab === "matches" ? (
        <>
          {!hasPassport && (
            <p className="mb-3 rounded-2xl border bg-card p-3 text-sm">Fill in your <Link to="/passport" className="font-semibold text-primary underline">Capability Passport</Link> to get matches based on your farm.</p>
          )}
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {TYPES.map((t) => (
              <button key={t} onClick={() => setFilter(t)} className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${filter === t ? "bg-primary text-primary-foreground" : "bg-card"}`}>{t}</button>
            ))}
          </div>
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 xl:grid-cols-3">
            {ranked.map(({ o, m }) => <OppCard key={o.id} o={o} m={m} />)}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Matches are indicative only and are not commercial agreements. Confirm requirements directly with the buyer or provider.</p>
        </>
      ) : (
        <DemandBoard demand={demand} setDemand={setDemand} />
      )}
    </Screen>
  );
}

function OppCard({ o, m }: { o: Opportunity; m: ReturnType<typeof matchOpportunity> }) {
  return (
    <article className="rounded-2xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{o.type} · {o.location}</p>
          <h3 className="font-semibold">{o.title}</h3>
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">{o.status}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{o.description}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 text-xs">
        {o.requiredVolume && <><dt className="text-muted-foreground">Volume</dt><dd>{o.requiredVolume.toLocaleString()} t</dd></>}
        {o.deliveryPeriod && <><dt className="text-muted-foreground">Delivery</dt><dd>{o.deliveryPeriod}</dd></>}
        {o.quality && <><dt className="text-muted-foreground">Quality</dt><dd>{o.quality}</dd></>}
        {o.value && <><dt className="text-muted-foreground">Value</dt><dd>{o.value}</dd></>}
        {o.deadline && <><dt className="text-muted-foreground">Deadline</dt><dd>{o.deadline}</dd></>}
        <dt className="text-muted-foreground">From</dt><dd>{o.participant}</dd>
      </dl>
      <div className="mt-3 rounded-xl bg-secondary/60 p-3">
        <p className="text-xs font-semibold">{m.label} · {m.score}% fit</p>
        {m.reasons.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-xs">{m.reasons.map((r) => <li key={r} className="flex gap-1"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />{r}</li>)}</ul>
        )}
        {m.gaps.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-xs">{m.gaps.map((g) => <li key={g} className="flex gap-1"><AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />{g}</li>)}</ul>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => toast.success(`Interest noted for "${o.title}" — the provider must still confirm.`)} className="flex-1 rounded-xl border py-1.5 text-sm font-semibold">Express interest</button>
        <button onClick={() => toast(addToPipeline({ title: o.title, oppId: o.id, participant: o.participant, ...(o.deadline ? { deadline: o.deadline } : {}) }) ? "Added to Opportunity → Outcome" : "Already being tracked")} className="flex-1 rounded-xl bg-primary py-1.5 text-sm font-semibold text-primary-foreground">Track</button>
      </div>
    </article>
  );
}

function DemandBoard({ demand, setDemand }: { demand: Opportunity[]; setDemand: (d: Opportunity[]) => void }) {
  const [f, setF] = useState({ crop: "", volume: "", quality: "", location: "", period: "", frequency: "", certs: "", terms: "" });
  const input = "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  const publish = (e: React.FormEvent) => {
    e.preventDefault();
    const vol = parseFloat(f.volume);
    if (!f.crop.trim() || !vol || !f.location.trim()) { toast.error("Crop, volume and location are required"); return; }
    const o: Opportunity = {
      id: crypto.randomUUID(), type: "Buyer demand", own: true, title: `${f.crop} demand`, description: f.terms || "Published future demand.",
      crop: f.crop.trim().toLowerCase(), location: f.location.trim(), requiredVolume: vol, quality: f.quality || undefined,
      deliveryPeriod: f.period || undefined, frequency: f.frequency || undefined,
      certifications: f.certs ? f.certs.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      participant: "You", status: "Open", matchedVolume: 0,
    };
    setDemand([o, ...demand]);
    setF({ crop: "", volume: "", quality: "", location: "", period: "", frequency: "", certs: "", terms: "" });
    toast.success("Demand published");
  };
  const board = [...demand, ...SAMPLE_OPPORTUNITIES.filter((o) => o.type === "Buyer demand" || o.type === "Contract farming")];
  return (
    <div className="md:grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <form onSubmit={publish} className="mb-4 space-y-2 rounded-2xl border bg-card p-4 md:sticky md:top-24 md:self-start">
        <p className="font-semibold">Publish future demand</p>
        <input className={input} placeholder="Product / crop *" value={f.crop} onChange={(e) => setF({ ...f, crop: e.target.value })} />
        <input className={input} placeholder="Required volume (t) *" inputMode="decimal" value={f.volume} onChange={(e) => setF({ ...f, volume: e.target.value })} />
        <input className={input} placeholder="Location *" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
        <input className={input} placeholder="Quality requirements" value={f.quality} onChange={(e) => setF({ ...f, quality: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className={input} placeholder="Delivery period" value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })} />
          <input className={input} placeholder="Frequency" value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })} />
        </div>
        <input className={input} placeholder="Certifications (comma separated)" value={f.certs} onChange={(e) => setF({ ...f, certs: e.target.value })} />
        <textarea className={input} placeholder="Indicative commercial terms" value={f.terms} onChange={(e) => setF({ ...f, terms: e.target.value })} />
        <button className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">Publish demand</button>
      </form>
      <div className="space-y-3">
        {board.map((o) => {
          const req = o.requiredVolume ?? 0, matched = Math.min(o.matchedVolume ?? 0, req), gap = req - matched;
          return (
            <div key={o.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold capitalize">{o.title}</p>
                {o.own ? <button onClick={() => setDemand(demand.filter((x) => x.id !== o.id))} className="text-xs text-destructive">Remove</button> : <span className="text-xs text-muted-foreground">{o.participant}</span>}
              </div>
              <p className="text-xs text-muted-foreground">{o.location}{o.deliveryPeriod ? ` · ${o.deliveryPeriod}` : ""}{o.quality ? ` · ${o.quality}` : ""}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-secondary p-2"><p className="text-muted-foreground">Demand</p><p className="font-semibold">{req.toLocaleString()} t</p></div>
                <div className="rounded-xl bg-secondary p-2"><p className="text-muted-foreground">Potential supply</p><p className="font-semibold">{matched.toLocaleString()} t</p></div>
                <div className="rounded-xl bg-destructive/10 p-2"><p className="text-muted-foreground">Supply gap</p><p className="font-semibold text-destructive">{gap.toLocaleString()} t</p></div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${req ? (matched / req) * 100 : 0}%` }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
