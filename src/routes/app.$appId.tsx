import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, ChevronLeft, Pencil, AlertTriangle } from "lucide-react";
import type { FarmRecord, MiniApp } from "@/lib/farm";
import { Screen, SyncBadge } from "@/components/Dock";
import { MINI_APPS, useOnline, useRecords, useSettings } from "@/lib/farm";
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
  const cloud = app.id === "animals";
  const kick = async () => {
    if (!(cloud && user && online && settings.autoSync)) return;
    const r = await syncAnimals();
    if (!r.ok) toast.error(`Couldn't sync yet — kept on this device (${r.error})`);
  };
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [qty, setQty] = useState("");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    save([
      { id: crypto.randomUUID(), title: title.trim(), detail: detail.trim(), qty: qty.trim(), date: new Date().toISOString(), sync: cloud ? (user ? "pending" : "local") : online && settings.autoSync ? "synced" : online ? "pending" : "local" },
      ...records,
    ]);
    setTimeout(kick, 0);
    setTitle(""); setDetail(""); setQty("");
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
        <button className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">Add record</button>
        {cloud && !user && (
          <p className="text-center text-xs text-muted-foreground">
            Saved on this device. <Link to="/auth" className="font-semibold text-primary">Sign in</Link> to back up and sync across devices.
          </p>
        )}
        {!online && <p className="text-center text-xs text-muted-foreground">You're offline — records save on this device.</p>}
      </form>
      <ul className="mt-4 space-y-2 md:mt-0 xl:grid xl:grid-cols-2 xl:gap-3 xl:space-y-0">
        {records.length === 0 && <li className="py-8 text-center xl:col-span-2 text-sm text-muted-foreground">No records yet.</li>}
        {records.map((r) => (
          <RecordItem
            key={r.id}
            r={r}
            app={app}
            cloud={cloud}
            onSave={(u) => {
              save(records.map((x) => (x.id === r.id ? { ...x, ...u, sync: cloud ? (user ? "pending" : "local") : x.sync === "synced" && online ? "synced" : "pending", syncError: undefined } : x)));
              setTimeout(kick, 0);
            }}
            onDelete={() => { if (cloud && r.sync === "synced") markDeleted(r.id); save(records.filter((x) => x.id !== r.id)); setTimeout(kick, 0); }}
          />
        ))}
      </ul>
      </div>
    </Screen>
  );
}

function RecordItem({ r, app, cloud, onSave, onDelete }: { r: FarmRecord; app: MiniApp; cloud: boolean; onSave: (u: Pick<FarmRecord, "title" | "detail" | "qty">) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ title: r.title, detail: r.detail, qty: r.qty ?? "" });
  const input = "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  if (editing)
    return (
      <li className="rounded-2xl border bg-card p-4">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!f.title.trim()) return;
            onSave({ title: f.title.trim(), detail: f.detail.trim(), qty: f.qty.trim() });
            setEditing(false);
          }}
        >
          <input aria-label={app.titleLabel} className={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <input aria-label={app.detailLabel} className={input} placeholder={app.detailLabel} value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} />
          {app.qtyLabel && <input aria-label={app.qtyLabel} className={input} placeholder={app.qtyLabel} value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} />}
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
        </p>
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
      <button aria-label="Edit" onClick={() => setEditing(true)} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
      <button aria-label="Delete" onClick={onDelete} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
    </li>
  );
}
