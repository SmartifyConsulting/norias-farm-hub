import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, ChevronLeft } from "lucide-react";
import { Screen, SyncBadge } from "@/components/Dock";
import { MINI_APPS, useOnline, useRecords, useSettings } from "@/lib/farm";

export const Route = createFileRoute("/app/$appId")({
  loader: ({ params }) => {
    const app = MINI_APPS.find((a) => a.id === params.appId);
    if (!app) throw notFound();
    return { app };
  },
  head: ({ loaderData }) => {
    const n = loaderData?.app.name ?? "Not found";
    const d = loaderData ? `${loaderData.app.blurb} — FarmerPlus mini-app.` : "Mini-app not found.";
    return { meta: [{ title: `${n} — FarmerPlus` }, { name: "description", content: d }, { property: "og:title", content: `${n} — FarmerPlus` }, { property: "og:description", content: d }] };
  },
  component: MiniAppPage,
});

function MiniAppPage() {
  const { app } = Route.useLoaderData();
  const { records, save } = useRecords(app.id);
  const online = useOnline();
  const [settings] = useSettings();
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [qty, setQty] = useState("");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    save([
      { id: crypto.randomUUID(), title: title.trim(), detail: detail.trim(), qty: qty.trim() || undefined, date: new Date().toISOString(), sync: online && settings.autoSync ? "synced" : online ? "pending" : "local" },
      ...records,
    ]);
    setTitle(""); setDetail(""); setQty("");
  };

  const input = "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  return (
    <Screen title={app.name}>
      <Link to="/apps" className="-mt-3 mb-4 inline-flex items-center text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" />App Store</Link>
      <form onSubmit={add} className="space-y-2 rounded-2xl border bg-card p-4">
        <input className={input} placeholder={app.titleLabel} value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={input} placeholder={app.detailLabel} value={detail} onChange={(e) => setDetail(e.target.value)} />
        {app.qtyLabel && <input className={input} placeholder={app.qtyLabel} value={qty} onChange={(e) => setQty(e.target.value)} />}
        <button className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">Add record</button>
        {!online && <p className="text-center text-xs text-muted-foreground">You're offline — records save on this device.</p>}
      </form>
      <ul className="mt-4 space-y-2">
        {records.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">No records yet.</li>}
        {records.map((r) => (
          <li key={r.id} className="flex items-start gap-3 rounded-2xl border bg-card p-4">
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
            </div>
            <button aria-label="Delete" onClick={() => save(records.filter((x) => x.id !== r.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
