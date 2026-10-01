import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, ChevronLeft, Pencil, AlertTriangle, CalendarDays, List, Link2 } from "lucide-react";
import { FarmCalendar, eventsFor } from "@/components/FarmCalendar";
import { permissions, useTeam } from "@/lib/team";
import type { FarmRecord, MiniApp } from "@/lib/farm";
import { Screen, SyncBadge } from "@/components/Dock";
import { MINI_APPS, read, useOnline, useRecords, useSettings } from "@/lib/farm";
import { markDeleted, syncAnimals } from "@/lib/animal-sync";
import { useUser } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/app/$appId")({
  loader: ({ params }) => {
    const app = MINI_APPS.find((a) => a.id === params.appId);
    if (!app) throw notFound();
    return { appId: app.id, name: app.name, blurb: app.blurb };
  },
  head: ({ loaderData }) => {
    const n = loaderData?.name ?? "Not found";
    const d = loaderData ? `${loaderData.blurb} — FarmerPlus mini-app.` : "Mini-app not found.";
    return { meta: [{ title: `${n} — FarmerPlus` }, { name: "description", content: d }, { property: "og:title", content: `${n} — FarmerPlus` }, { property: "og:description", content: d }] };
  },
  component: MiniAppPage,
});

function MiniAppPage() {
  const { appId } = Route.useLoaderData();
  const app = MINI_APPS.find((a) => a.id === appId)!;
  const { records, save } = useRecords(app.id);
  const online = useOnline();
  const [settings] = useSettings();
  const { user } = useUser();
  const cloud = true;
  const kick = async () => {
    if (!(cloud && user && online && settings.autoSync)) return;
    const r = await syncAnimals();
    if (!r.ok) toast.error(`Couldn't sync yet — kept on this device (${r.error})`);
  };
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [qty, setQty] = useState("");
  const [extra, setExtra] = useState<Extra>(EMPTY);
  const [view, setView] = useState<"list" | "calendar">("list");
  const { current } = useTeam();
  const { canWrite, canDelete } = permissions(current?.role);
  const fields = useRecords("fields").records;
  const crops = useRecords("crops").records;

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    save([
      { id: crypto.randomUUID(), title: title.trim(), detail: detail.trim(), qty: qty.trim(), ...clean(extra), date: new Date().toISOString(), sync: cloud ? (user ? "pending" : "local") : online && settings.autoSync ? "synced" : online ? "pending" : "local" },
      ...records,
    ]);
    setTimeout(kick, 0);
    setTitle(""); setDetail(""); setQty(""); setExtra(EMPTY);
  };

  const input = "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  return (
    <Screen title={app.name}>
      <Link to="/apps" className="-mt-3 mb-4 inline-flex items-center text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" />App Store</Link>
      <div className="md:grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:items-start md:gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <form onSubmit={add} className="space-y-2 rounded-2xl border bg-card p-4 md:sticky md:top-24">
        <input className={input} placeholder={app.titleLabel} value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={input} placeholder={app.detailLabel} value={detail} onChange={(e) => setDetail(e.target.value)} />
        {app.qtyLabel && <input className={input} placeholder={app.qtyLabel} value={qty} onChange={(e) => setQty(e.target.value)} />}
        <ExtraInputs app={app} v={extra} set={setExtra} fields={fields} crops={crops} />
        {!canWrite && <p className="text-center text-xs text-muted-foreground">You have view-only access to {current?.name}.</p>}
        <button disabled={!canWrite} className="w-full disabled:opacity-50 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">Add record</button>
        {cloud && !user && (
          <p className="text-center text-xs text-muted-foreground">
            Saved on this device. <Link to="/auth" className="font-semibold text-primary">Sign in</Link> to back up and sync across devices.
          </p>
        )}
        {!online && <p className="text-center text-xs text-muted-foreground">You're offline — records save on this device.</p>}
      </form>
      <div className="mt-4 md:mt-0">
      {current && <p className="mb-2 text-xs text-muted-foreground">Working in shared farm <b>{current.name}</b> ({current.role}) · <Link to="/team" className="text-primary">Team</Link></p>}
      {app.dates && (
        <div className="mb-3 inline-flex rounded-full border bg-card p-1 text-sm">
          <button onClick={() => setView("list")} className={`rounded-full px-3 py-1 ${view === "list" ? "bg-primary text-primary-foreground" : ""}`}><List className="mr-1 inline h-4 w-4" />List</button>
          <button onClick={() => setView("calendar")} className={`rounded-full px-3 py-1 ${view === "calendar" ? "bg-primary text-primary-foreground" : ""}`}><CalendarDays className="mr-1 inline h-4 w-4" />Calendar</button>
        </div>
      )}
      {view === "calendar" ? <FarmCalendar events={eventsFor(app, records)} /> : (
      <ul className="space-y-2 md:mt-0 xl:grid xl:grid-cols-2 xl:gap-3 xl:space-y-0">
        {records.length === 0 && <li className="py-8 text-center xl:col-span-2 text-sm text-muted-foreground">No records yet.</li>}
        {records.map((r) => (
          <RecordItem
            key={r.id}
            r={r}
            app={app}
            cloud={cloud}
            fields={fields}
            crops={crops}
            canWrite={canWrite}
            canDelete={canDelete}
            onSave={(u) => {
              save(records.map((x) => (x.id === r.id ? { ...x, ...u, sync: cloud ? (user ? "pending" : "local") : x.sync === "synced" && online ? "synced" : "pending", syncError: undefined } : x)));
              setTimeout(kick, 0);
            }}
            onDelete={() => { if (cloud && r.sync === "synced") markDeleted(r.id, app.id); save(records.filter((x) => x.id !== r.id)); setTimeout(kick, 0); }}
          />
        ))}
      </ul>
      )}
      </div>
      </div>
    </Screen>
  );
}

type Extra = { due: string; end: string; fieldId: string; cropId: string };
const EMPTY: Extra = { due: "", end: "", fieldId: "", cropId: "" };
const clean = (e: Extra) => ({ due: e.due || undefined, end: e.end || undefined, fieldId: e.fieldId || undefined, cropId: e.cropId || undefined });

function ExtraInputs({ app, v, set, fields, crops }: { app: MiniApp; v: Extra; set: (e: Extra) => void; fields: FarmRecord[]; crops: FarmRecord[] }) {
  const input = "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  return (
    <>
      {app.dates && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted-foreground">{app.dates[0]}<input type="date" className={input} value={v.due} onChange={(e) => set({ ...v, due: e.target.value })} /></label>
          {app.dates[1] && <label className="text-xs text-muted-foreground">{app.dates[1]}<input type="date" className={input} value={v.end} onChange={(e) => set({ ...v, end: e.target.value })} /></label>}
        </div>
      )}
      {app.links?.includes("field") && (
        <select aria-label="Field" className={input} value={v.fieldId} onChange={(e) => set({ ...v, fieldId: e.target.value })}>
          <option value="">{fields.length ? "Field (optional)" : "No fields yet — add one in Field Mapping"}</option>
          {fields.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
        </select>
      )}
      {app.links?.includes("crop") && (
        <select aria-label="Crop cycle" className={input} value={v.cropId} onChange={(e) => { const c = crops.find((x) => x.id === e.target.value); set({ ...v, cropId: e.target.value, fieldId: v.fieldId || c?.fieldId || "" }); }}>
          <option value="">{crops.length ? "Crop cycle (optional)" : "No crop cycles yet"}</option>
          {crops.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      )}
    </>
  );
}

const LINKED = ["tasks", "treatments", "maintenance", "finance"];
const money = (q?: string) => { const n = parseFloat((q ?? "").replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };

function RecordItem({ r, app, cloud, fields, crops, canWrite, canDelete, onSave, onDelete }: { r: FarmRecord; app: MiniApp; cloud: boolean; fields: FarmRecord[]; crops: FarmRecord[]; canWrite: boolean; canDelete: boolean; onSave: (u: Partial<FarmRecord>) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ title: r.title, detail: r.detail, qty: r.qty ?? "" });
  const [x, setX] = useState<Extra>({ due: r.due ?? "", end: r.end ?? "", fieldId: r.fieldId ?? "", cropId: r.cropId ?? "" });
  const field = fields.find((v) => v.id === r.fieldId), crop = crops.find((v) => v.id === r.cropId);
  // Things linked to this field / crop cycle from the other apps.
  const linked = app.id === "fields" || app.id === "crops"
    ? LINKED.flatMap((a) => read(a).filter((v) => (app.id === "fields" ? v.fieldId : v.cropId) === r.id).map((v) => ({ a, v })))
    : [];
  const cost = linked.filter((l) => l.a === "finance" || l.a === "maintenance").reduce((s, l) => s + money(l.v.qty), 0);
  const input = "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  if (editing)
    return (
      <li className="rounded-2xl border bg-card p-4">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!f.title.trim()) return;
            onSave({ title: f.title.trim(), detail: f.detail.trim(), qty: f.qty.trim(), ...clean(x) });
            setEditing(false);
          }}
        >
          <input aria-label={app.titleLabel} className={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <input aria-label={app.detailLabel} className={input} placeholder={app.detailLabel} value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} />
          {app.qtyLabel && <input aria-label={app.qtyLabel} className={input} placeholder={app.qtyLabel} value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} />}
          <ExtraInputs app={app} v={x} set={setX} fields={fields} crops={crops} />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setF({ title: r.title, detail: r.detail, qty: r.qty ?? "" }); setEditing(false); }} className="rounded-xl bg-secondary py-2 text-sm font-semibold text-secondary-foreground">Cancel</button>
            <button className="rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">Save changes</button>
          </div>
        </form>
      </li>
    );
  return (
    <li className="flex items-start gap-3 rounded-2xl border bg-card p-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-card-foreground">{r.title}</p>
          <SyncBadge status={r.sync} />
        </div>
        {r.detail && <p className="text-sm text-muted-foreground">{r.detail}</p>}
        <p className="mt-1 text-xs text-muted-foreground">
          {r.qty && <>{app.qtyLabel}: <b className="text-foreground">{r.qty}</b> · </>}
          {new Date(r.date).toLocaleDateString()}
          {r.due && <> · {app.dates?.[0]}: <b className="text-foreground">{r.due}</b></>}
          {r.end && <> · {app.dates?.[1]}: <b className="text-foreground">{r.end}</b></>}
        </p>
        {(field || crop) && <p className="mt-1 flex items-center gap-1 text-xs text-primary"><Link2 className="h-3 w-3" />{[field?.title, crop?.title].filter(Boolean).join(" · ")}</p>}
        {linked.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Linked: {LINKED.map((a) => { const n = linked.filter((l) => l.a === a).length; return n ? `${n} ${MINI_APPS.find((m) => m.id === a)?.name}` : null; }).filter(Boolean).join(" · ")}
            {cost !== 0 && <> · Net R{cost.toFixed(0)}</>}
          </p>
        )}
        {cloud && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {r.syncedAt ? `Last synced ${new Date(r.syncedAt).toLocaleString()}` : "Never synced"}
            {r.sync !== "synced" && r.syncedAt && " · has newer changes"}
          </p>
        )}
        {cloud && r.syncError && r.sync !== "synced" && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-destructive"><AlertTriangle className="h-3 w-3" />Upload failed: {r.syncError}</p>
        )}
      </div>
      {canWrite && <button aria-label="Edit" onClick={() => setEditing(true)} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>}
      {canDelete && <button aria-label="Delete" onClick={onDelete} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}
    </li>
  );
}
