import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CloudLightning, RefreshCw } from "lucide-react";
import { Screen } from "@/components/Dock";
import { useSettings } from "@/lib/farm";
import { risksFromForecast, uid, useRisks, type Risk, type RiskStage } from "@/lib/network";

export const Route = createFileRoute("/risks")({
  head: () => ({
    meta: [
      { title: "Risk & Response — FarmerPlus" },
      { name: "description", content: "Weather, disease, pest and supply risks linked to practical responses you approve." },
      { property: "og:title", content: "Risk & Response — FarmerPlus" },
      { property: "og:description", content: "See farm risks early and decide what to do about them." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RisksPage,
});

const STAGE_LABEL: Record<RiskStage, string> = { detected: "Detected", predicted: "Predicted", recommended: "Response recommended", approved: "Approved by you", completed: "Completed", dismissed: "Dismissed" };
const STAGE_TONE: Record<RiskStage, string> = { detected: "bg-destructive/10 text-destructive", predicted: "bg-warning-soft text-warning-foreground", recommended: "bg-secondary text-secondary-foreground", approved: "bg-primary text-primary-foreground", completed: "bg-success-soft text-success-foreground", dismissed: "bg-muted text-muted-foreground" };
const input = "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function RisksPage() {
  const [s] = useSettings();
  const [risks, setRisks] = useRisks();
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({ kind: "Disease" as Risk["kind"], title: "", affects: "", action: "" });

  const now = () => new Date().toISOString();
  const scan = async () => {
    setLoading(true);
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lon}&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,wind_speed_10m_max&timezone=auto&forecast_days=7`);
      if (!r.ok) throw new Error("Forecast unavailable");
      const found = risksFromForecast((await r.json()).daily);
      const fresh = found.filter((x) => !risks.some((y) => y.title === x.title && y.stage !== "completed" && y.stage !== "dismissed"));
      setRisks([...fresh.map((x) => ({ ...x, id: uid(), stage: "predicted" as RiskStage, createdAt: now(), history: [{ stage: "predicted" as RiskStage, at: now() }] })), ...risks]);
      toast(fresh.length ? `${fresh.length} new weather risk${fresh.length > 1 ? "s" : ""} found` : "No new weather risks in the 7-day forecast");
    } catch (e) {
      toast.error(`Could not check the forecast: ${(e as Error).message}`);
    } finally { setLoading(false); }
  };
  const move = (id: string, stage: RiskStage) => setRisks(risks.map((r) => (r.id === id ? { ...r, stage, history: [...r.history, { stage, at: now() }] } : r)));
  const report = () => {
    if (!f.title.trim()) { toast.error("Describe what you observed"); return; }
    setRisks([{ id: uid(), kind: f.kind, title: f.title, detail: "Observed on the farm.", severity: "Medium", source: "detected", affects: f.affects || "Not specified", actions: f.action ? [f.action] : ["Ask an agronomist to inspect"], stage: "detected", createdAt: now(), history: [{ stage: "detected", at: now() }] }, ...risks]);
    setF({ ...f, title: "", affects: "", action: "" });
  };
  const active = risks.filter((r) => r.stage !== "completed" && r.stage !== "dismissed");
  const done = risks.filter((r) => !active.includes(r));

  return (
    <Screen title="Risk & Response">
      <p className="-mt-3 mb-4 text-sm text-muted-foreground">Forecast risks are <b>predictions</b>; things you observe are <b>detected</b>. Nothing happens until you approve a response.</p>
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_20rem] md:gap-6">
        <div className="space-y-3">
          <button onClick={scan} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{loading ? "Checking forecast…" : "Check 7-day forecast for risks"}</button>
          {active.length === 0 && <p className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">No open risks. Check the forecast or report something you've seen.</p>}
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {active.map((r) => (
              <article key={r.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-center gap-2">
                  <CloudLightning className="h-4 w-4 text-primary" />
                  <p className="flex-1 font-semibold">{r.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STAGE_TONE[r.stage]}`}>{STAGE_LABEL[r.stage]}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.kind} · {r.severity} severity · Affects: {r.affects}</p>
                <p className="mt-2 text-xs font-semibold">Possible responses</p>
                <ul className="text-xs text-muted-foreground">{r.actions.map((a) => <li key={a}>• {a}</li>)}</ul>
                {r.capacityKind && <Link to="/capacity" className="mt-1 block text-xs font-semibold text-primary underline">Find shared {r.capacityKind.toLowerCase()}</Link>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {(r.stage === "detected" || r.stage === "predicted") && <button onClick={() => move(r.id, "recommended")} className="rounded-xl border px-3 py-1.5 text-xs font-semibold">Review response</button>}
                  {r.stage === "recommended" && <button onClick={() => move(r.id, "approved")} className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">I approve this response</button>}
                  {r.stage === "approved" && <button onClick={() => move(r.id, "completed")} className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Mark done</button>}
                  <button onClick={() => move(r.id, "dismissed")} className="rounded-xl px-3 py-1.5 text-xs font-semibold text-muted-foreground">Dismiss</button>
                </div>
              </article>
            ))}
          </div>
          {done.length > 0 && (
            <details className="rounded-2xl border bg-card p-4 text-sm"><summary className="cursor-pointer font-semibold">History ({done.length})</summary>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">{done.map((r) => <li key={r.id}>{r.title} — {r.history.map((h) => STAGE_LABEL[h.stage]).join(" → ")}</li>)}</ul>
            </details>
          )}
        </div>
        <aside className="mt-6 h-fit space-y-3 rounded-2xl border bg-card p-4 md:sticky md:top-24 md:mt-0">
          <p className="text-sm font-semibold">Report something you've seen</p>
          <select aria-label="Risk type" className={input} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Risk["kind"] })}>{(["Disease", "Pest", "Weather", "Supply", "Market"] as const).map((k) => <option key={k}>{k}</option>)}</select>
          <input className={input} placeholder="e.g. Fall armyworm in field 3" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <input className={input} placeholder="What it affects" value={f.affects} onChange={(e) => setF({ ...f, affects: e.target.value })} />
          <input className={input} placeholder="Planned response (optional)" value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} />
          <button onClick={report} className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">Add risk</button>
        </aside>
      </div>
    </Screen>
  );
}
