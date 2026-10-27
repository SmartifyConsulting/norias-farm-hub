import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Screen } from "@/components/Dock";
import { useRecords, type FarmRecord } from "@/lib/farm";
import { useTeam, permissions } from "@/lib/team";
import { useUser } from "@/lib/auth";
import { syncAnimals } from "@/lib/animal-sync";
import { toast } from "sonner";

export const Route = createFileRoute("/animal/$animalId")({
  component: AnimalDetail,
  head: () => ({ meta: [{ title: "Animal history — FarmerPlus" }] }),
});

function AnimalDetail() {
  const { animalId } = Route.useParams();
  const { records: animals } = useRecords("animals");
  const health = useRecords("health");
  const tasks = useRecords("tasks");
  const stock = useRecords("stock");
  const finance = useRecords("finance");
  const { current, loading } = useTeam();
  const { user } = useUser();
  const [kind, setKind] = useState<"health" | "tasks" | "stock" | "finance">("health");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);
  const [saleItem, setSaleItem] = useState("");
  const [saleQuantity, setSaleQuantity] = useState("");
  const [saleAmount, setSaleAmount] = useState("");
  const animal = animals.find((a) => a.id === animalId);
  const allowed = !!animal && (animal.farmId == null || animal.farmId === current?.id);
  const canWrite = allowed && permissions(current?.role).canWrite;
  const linked = [
    ...health.records.filter((r) => r.animalId === animalId && r.farmId === (animal?.farmId ?? null)).map((r) => ({ app: "health" as const, label: "Health event", record: r })),
    ...tasks.records.filter((r) => r.animalId === animalId && r.farmId === (animal?.farmId ?? null)).map((r) => ({ app: "tasks" as const, label: "Task", record: r })),
    ...stock.records.filter((r) => r.animalId === animalId && r.farmId === (animal?.farmId ?? null)).map((r) => ({ app: "stock" as const, label: "Output / inventory", record: r })),
    ...finance.records.filter((r) => r.animalId === animalId && r.farmId === (animal?.farmId ?? null)).map((r) => ({ app: "finance" as const, label: "Cost / sale", record: r })),
  ].sort((a, b) => b.record.date.localeCompare(a.record.date));
  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!animal || !allowed || !canWrite || !title.trim() || saving) return;
    setSaving(true);
    try {
      const record: FarmRecord = {
        id: crypto.randomUUID(),
        title: title.trim(),
        detail: detail.trim(),
        qty: qty.trim(),
        date: new Date().toISOString(),
        sync: user ? "pending" : "local",
        farmId: animal.farmId ?? null,
        animalId: animal.id,
      };
      const store = { health, tasks, stock, finance }[kind];
      store.save([record, ...store.records]);
      setTitle("");
      setDetail("");
      setQty("");
      if (user && navigator.onLine) {
        const result = await syncAnimals();
        if (!result.ok) toast.error("Saved locally; cloud sync is pending.");
      }
      toast.success("Added to this animal's history");
    } finally {
      setSaving(false);
    }
  };
  const stockBalanceFor = (item: string) => stock.records.filter(r => r.animalId === animalId && r.farmId === (animal?.farmId ?? null) && (r.title.trim().toLowerCase() === item.trim().toLowerCase() || r.title.trim().toLowerCase() === "sale dispatch: " + item.trim().toLowerCase()))
    .reduce((sum, r) => { const n = Number(r.qty); return sum + (Number.isFinite(n) ? n : 0); }, 0);
  const recordSale = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!animal || !allowed || !canWrite || saving) return;
    const quantity = Number(saleQuantity);
    const amount = Number(saleAmount);
    if (!saleItem.trim() || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(amount) || amount < 0) {
      toast.error("Enter an item, a positive quantity and a valid sale amount."); return;
    }
    if (quantity > stockBalanceFor(saleItem)) { toast.error("Not enough recorded stock for this animal. Add output first."); return; }
    if (!window.confirm("Record sale of " + quantity + " units of " + saleItem + " for R" + amount.toFixed(2) + "? This will reduce recorded stock.")) return;
    setSaving(true);
    try {
      const transactionId = crypto.randomUUID();
      const base = { date: new Date().toISOString(), sync: user ? "pending" as const : "local" as const, farmId: animal.farmId ?? null, animalId: animal.id };
      const movement: FarmRecord = { ...base, id: crypto.randomUUID(), title: "Sale dispatch: " + saleItem.trim(), detail: "Sale reference: " + transactionId, qty: String(-quantity) };
      const payment: FarmRecord = { ...base, id: crypto.randomUUID(), title: "Sale: " + saleItem.trim(), detail: "Sale reference: " + transactionId + "; quantity: " + quantity, qty: String(amount) };
      stock.save([movement, ...stock.records]);
      finance.save([payment, ...finance.records]);
      setSaleItem(""); setSaleQuantity(""); setSaleAmount("");
      if (user && navigator.onLine) { const result = await syncAnimals(); if (!result.ok) toast.error("Saved locally; cloud sync is pending."); }
      toast.success("Sale and stock movement recorded");
    } finally { setSaving(false); }
  };
  if (loading) return <Screen title="Animal history"><p>Loading farm…</p></Screen>;
  if (!animal || !allowed) return (
    <Screen title="Animal unavailable">
      <p className="text-sm text-muted-foreground">This animal was not found in the selected farm. Switch farms or check the record.</p>
      <Link to="/app/$appId" params={{ appId: "animals" }} className="text-primary underline">Back to animals</Link>
    </Screen>
  );
  return (
    <Screen title={animal.title}>
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link to="/journey" className="text-primary underline">Journey</Link> /{" "}
        <Link to="/app/$appId" params={{ appId: "animals" }} className="text-primary underline">Animals</Link> / {animal.title}
      </nav>
      <section className="mb-5 rounded-2xl border bg-card p-4">
        <h2 className="font-display text-xl font-semibold">{animal.title}</h2>
        <p className="text-sm text-muted-foreground">{animal.detail || "No description recorded"}</p>
        <p className="mt-2 text-sm">Farm: {animal.farmId ? current?.name ?? "Linked farm" : "Legacy / unassigned record"}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-muted px-3 py-1">{linked.length} linked events</span>
          <span className="rounded-full bg-muted px-3 py-1">{linked.filter((x) => x.app === "health").length} health records</span>
          <span className="rounded-full bg-muted px-3 py-1">{linked.filter((x) => x.app === "tasks").length} tasks</span>
          <span className="rounded-full bg-muted px-3 py-1">{linked.filter((x) => x.app === "stock").length} output / stock entries</span>
          <span className="rounded-full bg-muted px-3 py-1">{linked.filter((x) => x.app === "finance").length} cost / sale entries</span>
        </div>
      </section>
      <section className="mb-5 rounded-2xl border bg-card p-4">
        <h2 className="mb-2 font-semibold">Record an animal event</h2>
        <p className="mb-3 text-xs text-muted-foreground">New events are linked to this animal automatically. Legacy animals remain unassigned until explicitly migrated.</p>
        <form onSubmit={add} className="space-y-3">
          <label className="block text-sm">Event type
            <select className="mt-1 w-full rounded-xl border bg-background p-2" value={kind} onChange={(e) => setKind(e.target.value as "health" | "tasks" | "stock" | "finance")}>
              <option value="health">Health event</option>
              <option value="tasks">Farm task</option>
              <option value="stock">Livestock output / stock (e.g. milk, eggs)</option>
              <option value="finance">Livestock cost / sale</option>
            </select>
          </label>
          <label className="block text-sm">Title
            <input required className="mt-1 w-full rounded-xl border bg-background p-2" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block text-sm">Notes
            <textarea className="mt-1 w-full rounded-xl border bg-background p-2" value={detail} onChange={(e) => setDetail(e.target.value)} />
          </label>
          <label className="block text-sm">{kind === "finance" ? "Amount (R; negative for costs)" : kind === "stock" ? "Quantity (include units in notes)" : "Quantity / value (optional)"}
            <input className="mt-1 w-full rounded-xl border bg-background p-2" value={qty} onChange={(e) => setQty(e.target.value)} />
          </label>
          <button disabled={!canWrite || saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {saving ? "Saving…" : "Add linked event"}
          </button>
          {!canWrite && <p className="text-xs text-muted-foreground">Your current farm role does not permit changes.</p>}
        </form>
      </section>
      <section className="mb-5 rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Sell recorded livestock output</h2>
        <p className="mt-1 text-sm text-muted-foreground">Available {saleItem.trim() || "selected output"}: {stockBalanceFor(saleItem)} units. Output names and units must match exactly between production and sale records.</p>
        <form onSubmit={recordSale} className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">Output / item<input required className="mt-1 w-full rounded-xl border bg-background p-2" value={saleItem} onChange={e => setSaleItem(e.target.value)} placeholder="e.g. milk (litres)" /></label>
          <label className="text-sm">Quantity<input required type="number" min="0.001" step="any" className="mt-1 w-full rounded-xl border bg-background p-2" value={saleQuantity} onChange={e => setSaleQuantity(e.target.value)} /></label>
          <label className="text-sm">Sale amount (R)<input required type="number" min="0" step="0.01" className="mt-1 w-full rounded-xl border bg-background p-2" value={saleAmount} onChange={e => setSaleAmount(e.target.value)} /></label>
          <button disabled={!canWrite || saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:col-span-3">Record sale and stock deduction</button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">Creates a linked stock deduction and finance entry with a shared reference. This is a simple local workflow, not a transactional inventory ledger or proof of payment.</p>
      </section>
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">Animal production & transaction history</h2>
        <p className="mb-3 text-xs text-muted-foreground">Output and sale entries are separate records; recording output does not automatically create a sale or adjust inventory balances.</p>
        {linked.length === 0 ? <p className="text-sm text-muted-foreground">No linked events yet. Older unlinked records remain in their original tools.</p> :
          <ol className="space-y-2">{linked.map(({ app, label, record }) => (
            <li key={app + record.id} className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">{label} · {new Date(record.date).toLocaleDateString()}</p>
              <p className="font-semibold">{record.title}</p>
              {record.detail && <p className="text-sm text-muted-foreground">{record.detail}</p>}
              {record.qty && <p className="text-sm">Recorded: {record.qty}</p>}
              <Link to="/app/$appId" params={{ appId: app }} className="text-xs text-primary underline">Open {label.toLowerCase()} records</Link>
            </li>
          ))}</ol>}
      </section>
    </Screen>
  );
}
