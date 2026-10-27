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
  const { current, loading } = useTeam();
  const { user } = useUser();
  const [kind, setKind] = useState<"health" | "tasks">("health");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);
  const animal = animals.find((a) => a.id === animalId);
  const allowed = !!animal && (animal.farmId == null || animal.farmId === current?.id);
  const canWrite = allowed && permissions(current?.role).canWrite;
  const linked = [
    ...health.records.filter((r) => r.animalId === animalId && r.farmId === (animal?.farmId ?? null)).map((r) => ({ app: "health" as const, label: "Health event", record: r })),
    ...tasks.records.filter((r) => r.animalId === animalId && r.farmId === (animal?.farmId ?? null)).map((r) => ({ app: "tasks" as const, label: "Task", record: r })),
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
      const store = kind === "health" ? health : tasks;
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
        </div>
      </section>
      <section className="mb-5 rounded-2xl border bg-card p-4">
        <h2 className="mb-2 font-semibold">Record an animal event</h2>
        <p className="mb-3 text-xs text-muted-foreground">New events are linked to this animal automatically. Legacy animals remain unassigned until explicitly migrated.</p>
        <form onSubmit={add} className="space-y-3">
          <label className="block text-sm">Event type
            <select className="mt-1 w-full rounded-xl border bg-background p-2" value={kind} onChange={(e) => setKind(e.target.value as "health" | "tasks")}>
              <option value="health">Health event</option>
              <option value="tasks">Farm task</option>
            </select>
          </label>
          <label className="block text-sm">Title
            <input required className="mt-1 w-full rounded-xl border bg-background p-2" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block text-sm">Notes
            <textarea className="mt-1 w-full rounded-xl border bg-background p-2" value={detail} onChange={(e) => setDetail(e.target.value)} />
          </label>
          <label className="block text-sm">Quantity / value (optional)
            <input className="mt-1 w-full rounded-xl border bg-background p-2" value={qty} onChange={(e) => setQty(e.target.value)} />
          </label>
          <button disabled={!canWrite || saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {saving ? "Saving…" : "Add linked event"}
          </button>
          {!canWrite && <p className="text-xs text-muted-foreground">Your current farm role does not permit changes.</p>}
        </form>
      </section>
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">Animal history</h2>
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
