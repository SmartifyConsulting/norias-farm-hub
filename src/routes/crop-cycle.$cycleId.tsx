import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Screen } from "@/components/Dock";
import { useRecords, type FarmRecord } from "@/lib/farm";
import { useTeam, permissions } from "@/lib/team";
import { useUser } from "@/lib/auth";
import { syncAnimals } from "@/lib/animal-sync";
import { toast } from "sonner";

export const Route = createFileRoute("/crop-cycle/$cycleId")({
  component: CropCycleDetail,
  head: () => ({ meta: [{ title: "Crop cycle — FarmerPlus" }] }),
});

const activities = [
  { app: "tasks", label: "Task" },
  { app: "treatments", label: "Input / treatment" },
  { app: "harvest", label: "Harvest" },
  { app: "finance", label: "Cost / sale" },
  { app: "maintenance", label: "Maintenance" },
] as const;

function CropCycleDetail() {
  const { cycleId } = Route.useParams();
  const { records: cycles } = useRecords("crops");
  const { records: fields } = useRecords("fields");
  const tasks = useRecords("tasks");
  const treatments = useRecords("treatments");
  const harvest = useRecords("harvest");
  const finance = useRecords("finance");
  const maintenance = useRecords("maintenance");
  const stores = { tasks, treatments, harvest, finance, maintenance };
  const { current, loading } = useTeam();
  const { user } = useUser();
  const [kind, setKind] = useState<(typeof activities)[number]["app"]>("tasks");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);
  const cycle = cycles.find((r) => r.id === cycleId);
  // An explicitly assigned farm must match the active farm. Legacy unassigned
  // records remain available, but are never automatically claimed by a farm.
  const allowed = !!cycle && (cycle.farmId == null || cycle.farmId === current?.id);
  const canWrite = allowed && permissions(current?.role).canWrite;
  const linked = activities.flatMap(({ app, label }) =>
    stores[app].records.filter((r) => r.cropId === cycleId && r.farmId === (cycle?.farmId ?? null))
      .map((r) => ({ app, label, record: r })),
  ).sort((a, b) => b.record.date.localeCompare(a.record.date));
  const field = fields.find((f) => f.id === cycle?.fieldId && f.farmId === (cycle?.farmId ?? null));
  const yieldKg = linked.filter((x) => x.app === "harvest").reduce((sum, x) => {
    const n = Number(x.record.qty);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cycle || !allowed || !canWrite || !title.trim() || saving) return;
    setSaving(true);
    try {
      const record: FarmRecord = {
        id: crypto.randomUUID(), title: title.trim(), detail: detail.trim(),
        qty: qty.trim(), date: new Date().toISOString(),
        sync: user ? "pending" : "local",
        farmId: cycle.farmId ?? null,
        fieldId: cycle.fieldId,
        cropId: cycle.id,
      };
      const store = stores[kind];
      store.save([record, ...store.records]);
      setTitle(""); setDetail(""); setQty("");
      if (user && navigator.onLine) {
        const result = await syncAnimals();
        if (!result.ok) toast.error("Saved locally; cloud sync is pending.");
      }
      toast.success("Added to this crop cycle");
    } finally { setSaving(false); }
  };
  if (loading) return <Screen title="Crop cycle"><p>Loading farm…</p></Screen>;
  if (!cycle || !allowed) return (
    <Screen title="Crop cycle unavailable">
      <p className="text-sm text-muted-foreground">This crop cycle was not found in the selected farm. Switch farms or check the record.</p>
      <Link to="/app/$appId" params={{ appId: "crops" }} className="text-primary underline">Back to crop cycles</Link>
    </Screen>
  );
  return (
    <Screen title={cycle.title}>
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link to="/journey" className="text-primary underline">Journey</Link> /{" "}
        <Link to="/app/$appId" params={{ appId: "crops" }} className="text-primary underline">Crop cycles</Link> / {cycle.title}
      </nav>
      <section className="mb-5 rounded-2xl border bg-card p-4">
        <h2 className="font-display text-xl font-semibold">{cycle.title}</h2>
        <p className="text-sm text-muted-foreground">{cycle.detail || "No description recorded"}</p>
        <p className="mt-2 text-sm">Farm: {cycle.farmId ? current?.name ?? "Linked farm" : "Legacy / unassigned record"}</p>
        {field && <p className="text-sm">Field: {field.title}</p>}
        {cycle.due && <p className="text-sm">Planting: {cycle.due}</p>}
        {cycle.end && <p className="text-sm">Expected harvest: {cycle.end}</p>}
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-muted px-3 py-1">{linked.length} linked activities</span>
          <span className="rounded-full bg-muted px-3 py-1">{linked.filter((x) => x.app === "harvest").length} harvest records</span>
          <span className="rounded-full bg-muted px-3 py-1">{yieldKg.toLocaleString()} kg recorded yield</span>
        </div>
      </section>
      <section className="mb-5 rounded-2xl border bg-card p-4">
        <h2 className="mb-2 font-semibold">Add an activity to this crop cycle</h2>
        <p className="mb-3 text-xs text-muted-foreground">The crop cycle and field will be linked automatically. Legacy unassigned crop cycles remain unassigned until explicitly migrated.</p>
        <form onSubmit={add} className="space-y-3">
          <label className="block text-sm">Activity type
            <select className="mt-1 w-full rounded-xl border bg-background p-2" value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}>
              {activities.map((a) => <option key={a.app} value={a.app}>{a.label}</option>)}
            </select>
          </label>
          <label className="block text-sm">Title
            <input required className="mt-1 w-full rounded-xl border bg-background p-2" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block text-sm">Notes
            <textarea className="mt-1 w-full rounded-xl border bg-background p-2" value={detail} onChange={(e) => setDetail(e.target.value)} />
          </label>
          <label className="block text-sm">{kind === "harvest" ? "Yield (kg)" : kind === "finance" ? "Amount (R; negative for costs)" : "Quantity / value (optional)"}
            <input className="mt-1 w-full rounded-xl border bg-background p-2" value={qty} onChange={(e) => setQty(e.target.value)} />
          </label>
          <button disabled={!canWrite || saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {saving ? "Saving…" : "Add linked activity"}
          </button>
          {!canWrite && <p className="text-xs text-muted-foreground">Your current farm role does not permit changes.</p>}
        </form>
      </section>
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">Production history</h2>
        {linked.length === 0 ? <p className="text-sm text-muted-foreground">No linked activities yet. Older unlinked records remain in their original tools.</p> :
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
