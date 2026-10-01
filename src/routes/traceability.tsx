import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Screen } from "@/components/Dock";
import { useSettings } from "@/lib/farm";
import { TRACE_STEPS, uid, useBatches, type TraceLevel, type TraceStep } from "@/lib/network";

export const Route = createFileRoute("/traceability")({
  head: () => ({
    meta: [
      { title: "Traceability — FarmerPlus" },
      { name: "description", content: "Batch records from farm and field through harvest, storage, transport and buyer." },
      { property: "og:title", content: "Traceability — FarmerPlus" },
      { property: "og:description", content: "A clear chain of custody for every harvest batch." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TracePage,
});

const LEVELS: { v: TraceLevel; label: string; tone: string }[] = [
  { v: "self-declared", label: "Self-declared", tone: "bg-muted text-muted-foreground" },
  { v: "recorded", label: "Recorded", tone: "bg-secondary text-secondary-foreground" },
  { v: "verified", label: "Verified", tone: "bg-success-soft text-success-foreground" },
  { v: "certified", label: "Certified", tone: "bg-primary text-primary-foreground" },
];
const input = "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function TracePage() {
  const [batches, setBatches] = useBatches();
  const [s] = useSettings();
  const [crop, setCrop] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const create = () => {
    if (!crop.trim()) { toast.error("Enter the crop"); return; }
    const code = `B-${new Date().getFullYear()}-${uid().slice(0, 5).toUpperCase()}`;
    const steps: TraceStep[] = TRACE_STEPS.map((step) => ({ step, value: step === "Farm" ? s.farmName : step === "Crop" ? crop : step === "Batch" ? code : "", level: step === "Batch" ? "recorded" : "self-declared" }));
    const b = { id: uid(), code, crop, createdAt: new Date().toISOString(), steps };
    setBatches([b, ...batches]); setCrop(""); setOpen(b.id);
  };
  const setStep = (bid: string, i: number, patch: Partial<TraceStep>) =>
    setBatches(batches.map((b) => (b.id === bid ? { ...b, steps: b.steps.map((st, k) => (k === i ? { ...st, ...patch, at: new Date().toISOString() } : st)) } : b)));

  return (
    <Screen title="Traceability">
      <p className="-mt-3 mb-4 text-sm text-muted-foreground">Build a record for each batch. You can mark entries as self-declared or recorded; <b>verified</b> and <b>certified</b> need a reviewer or certificate, so they are not selectable here.</p>
      <div className="mb-3 flex flex-wrap gap-2 text-[10px] font-semibold">{LEVELS.map((l) => <span key={l.v} className={`rounded-full px-2 py-0.5 ${l.tone}`}>{l.label}</span>)}</div>
      <form onSubmit={(e) => { e.preventDefault(); create(); }} className="mb-5 flex max-w-xl gap-2">
        <input className={input} placeholder="Crop for new batch (e.g. Yellow maize)" value={crop} onChange={(e) => setCrop(e.target.value)} />
        <button className="shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">New batch</button>
      </form>
      {batches.length === 0 && <p className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">No batches yet.</p>}
      <div className="space-y-3">
        {batches.map((b) => {
          const filled = b.steps.filter((x) => x.value).length;
          return (
            <article key={b.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setOpen(open === b.id ? null : b.id)} className="flex-1 text-left">
                  <p className="font-mono text-sm font-semibold">{b.code}</p>
                  <p className="text-xs text-muted-foreground">{b.crop} · {filled}/{b.steps.length} links recorded</p>
                </button>
                <button aria-label="Delete batch" onClick={() => setBatches(batches.filter((x) => x.id !== b.id))} className="text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
                {b.steps.map((st, k) => <span key={st.step} className="flex items-center gap-1"><span className={`rounded-full px-2 py-0.5 ${st.value ? LEVELS.find((l) => l.v === st.level)!.tone : "border border-dashed text-muted-foreground"}`}>{st.step}</span>{k < b.steps.length - 1 && <span className="text-muted-foreground">→</span>}</span>)}
              </div>
              {open === b.id && (
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {b.steps.map((st, k) => (
                    <div key={st.step} className="flex items-center gap-2">
                      <span className="w-32 shrink-0 text-xs font-semibold">{st.step}</span>
                      <input className={input} value={st.value} placeholder="—" onChange={(e) => setStep(b.id, k, { value: e.target.value })} />
                      <select aria-label={`${st.step} level`} className="rounded-xl border bg-background px-2 py-2 text-xs" value={st.level} onChange={(e) => setStep(b.id, k, { level: e.target.value as TraceLevel })}>
                        <option value="self-declared">Self-declared</option><option value="recorded">Recorded</option>
                        {(st.level === "verified" || st.level === "certified") && <option value={st.level}>{st.level}</option>}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </Screen>
  );
}
