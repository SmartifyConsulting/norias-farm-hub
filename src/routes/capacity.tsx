import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Trash2 } from "lucide-react";
import { Screen } from "@/components/Dock";
import { usePassport, effectiveSource } from "@/lib/agri";
import { SAMPLE_CAPACITY, useCapacity, uid, type CapacityKind, type CapacityListing } from "@/lib/network";

export const Route = createFileRoute("/capacity")({
  head: () => ({
    meta: [
      { title: "Shared Capacity — FarmerPlus" },
      { name: "description", content: "Find or offer equipment, transport, storage, cold storage, packhouse and labour capacity near your farm." },
      { property: "og:title", content: "Shared Capacity — FarmerPlus" },
      { property: "og:description", content: "Share equipment, trucks, storage and labour with nearby farms." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CapacityPage,
});

const KINDS: CapacityKind[] = ["Equipment", "Transport", "Storage", "Cold storage", "Packhouse", "Labour", "Processing"];
const input = "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function CapacityPage() {
  const [own, setOwn] = useCapacity();
  const [passport] = usePassport();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<CapacityKind | "All">("All");
  const [mode, setMode] = useState<"offer" | "request">("offer");
  const [f, setF] = useState({ kind: "Equipment" as CapacityKind, title: "", location: "", rate: "", quantity: "", from: "", to: "" });
  const loc = (passport["location"] && effectiveSource(passport["location"]) !== "expired" ? passport["location"].value : "").toLowerCase();

  /** What the farm lacks, from the passport — used to rank capacity that fills real gaps. */
  const needs = useMemo(() => {
    const no = (k: string) => !passport[k]?.value || /^(no|none|0)$/i.test(passport[k]!.value.trim());
    const n: CapacityKind[] = [];
    if (no("storage")) n.push("Storage"); if (no("coldStorage")) n.push("Cold storage"); if (no("packhouse")) n.push("Packhouse");
    if (no("transport")) n.push("Transport"); if (no("machinery") && no("equipment")) n.push("Equipment");
    return n;
  }, [passport]);

  const list = [...own, ...SAMPLE_CAPACITY]
    .filter((c) => kind === "All" || c.kind === kind)
    .filter((c) => !q || `${c.title} ${c.location} ${c.provider}`.toLowerCase().includes(q.toLowerCase()))
    .map((c) => {
      const why: string[] = [];
      if (needs.includes(c.kind) && c.mode === "offer") why.push(`Your passport shows no ${c.kind.toLowerCase()}`);
      if (loc && loc.includes(c.location.toLowerCase())) why.push("Near your farm");
      return { c, why };
    })
    .sort((a, b) => b.why.length - a.why.length);

  const publish = () => {
    if (!f.title.trim() || !f.location.trim()) { toast.error("Title and location are required"); return; }
    const item: CapacityListing = { id: uid(), mode, ...f, provider: "You", own: true };
    setOwn([item, ...own]);
    setF({ ...f, title: "", rate: "", quantity: "", from: "", to: "" });
    toast.success(mode === "offer" ? "Capacity listed" : "Request posted");
  };

  return (
    <Screen title="Shared Capacity">
      <p className="-mt-3 mb-4 text-sm text-muted-foreground">Equipment, transport, storage and labour matched to what your farm actually needs. Bookings are only agreed when both sides confirm.</p>
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_20rem] md:gap-6">
        <div>
          <div className="mb-3 flex items-center gap-2 rounded-xl border bg-card px-3 py-2"><Search className="h-4 w-4 text-muted-foreground" /><input aria-label="Search capacity" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search harvester, truck, silo…" className="flex-1 bg-transparent text-sm outline-none" /></div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {(["All", ...KINDS] as const).map((k) => (
              <button key={k} onClick={() => setKind(k)} className={`rounded-full px-3 py-1 text-xs font-semibold ${kind === k ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{k}</button>
            ))}
          </div>
          {needs.length > 0 && <p className="mb-3 rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning-foreground">Gaps from your passport: {needs.join(", ")}. Matching listings are shown first.</p>}
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {list.length === 0 && <p className="text-sm text-muted-foreground">Nothing matches that search.</p>}
            {list.map(({ c, why }) => (
              <article key={c.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{c.mode === "offer" ? "Available" : "Wanted"} · {c.kind}</p>
                    <p className="font-semibold">{c.title}</p>
                  </div>
                  {c.own && <button aria-label="Remove listing" onClick={() => setOwn(own.filter((x) => x.id !== c.id))} className="text-muted-foreground"><Trash2 className="h-4 w-4" /></button>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{c.location} · {c.provider}{c.rate ? ` · ${c.rate}` : ""}{c.quantity ? ` · ${c.quantity}` : ""}</p>
                {(c.from || c.to) && <p className="text-xs text-muted-foreground">{c.from ?? "now"} → {c.to ?? "open"}</p>}
                {why.length > 0 && <ul className="mt-2 space-y-0.5 text-xs text-success-foreground">{why.map((w) => <li key={w}>✓ {w}</li>)}</ul>}
                {!c.own && (
                  <button onClick={() => toast.success(`${c.mode === "offer" ? "Booking request" : "Offer"} sent to ${c.provider} — nothing is agreed until they confirm.`)} className="mt-3 w-full rounded-xl border py-1.5 text-sm font-semibold">
                    {c.mode === "offer" ? "Request to book" : "Offer to help"}
                  </button>
                )}
              </article>
            ))}
          </div>
        </div>
        <aside className="mt-6 h-fit space-y-3 rounded-2xl border bg-card p-4 md:sticky md:top-24 md:mt-0">
          <div className="flex rounded-full bg-secondary p-1 text-xs font-semibold">
            {(["offer", "request"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-full py-1.5 ${mode === m ? "bg-primary text-primary-foreground" : ""}`}>{m === "offer" ? "Offer capacity" : "Request capacity"}</button>)}
          </div>
          <select aria-label="Type" className={input} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as CapacityKind })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
          <input className={input} placeholder="What (e.g. 120hp tractor)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <input className={input} placeholder="Location" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className={input} placeholder="Rate" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} />
            <input className={input} placeholder="Quantity" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} />
            <input aria-label="From" type="date" className={input} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
            <input aria-label="To" type="date" className={input} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
          </div>
          <button onClick={publish} className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">{mode === "offer" ? "List capacity" : "Post request"}</button>
        </aside>
      </div>
    </Screen>
  );
}
