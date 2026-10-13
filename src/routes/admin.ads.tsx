import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Screen } from "@/components/Dock";
import { useUser } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import {
  adPackagesTable,
  formatRand,
  useAdPackages,
  useIsAdmin,
  type AdPackage,
} from "@/lib/adPackages";

export const Route = createFileRoute("/admin/ads")({
  head: () => ({
    meta: [
      { title: "Ad charges admin — FarmerPlus" },
      { name: "description", content: "Set and edit the packages and prices advertisers pay." },
      { property: "og:title", content: "Ad charges admin — FarmerPlus" },
      { property: "og:description", content: "Manage FarmerPlus sponsored ad packages and prices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminAdsPage,
});

const input =
  "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function AdminAdsPage() {
  const { user, loading } = useUser();
  const isAdmin = useIsAdmin(user?.id);
  const { packages, reload } = useAdPackages(true);

  if (loading || isAdmin === null)
    return (
      <Screen title="Ad charges">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Screen>
    );
  if (!isAdmin)
    return (
      <Screen title="Ad charges">
        <p className="rounded-2xl border bg-card p-4 text-sm">Only admins can open this page.</p>
      </Screen>
    );

  return (
    <Screen title="Ad charges">
      <p className="mb-4 text-sm text-muted-foreground">
        These packages appear in the advertiser's Ad package list. Changes apply immediately to new ads.
      </p>
      <div className="space-y-3">
        {packages.map((p) => (
          <PackageRow key={p.id} pkg={p} onChanged={reload} />
        ))}
        <NewPackage nextOrder={packages.length + 1} onAdded={reload} />
      </div>
    </Screen>
  );
}

function PackageRow({ pkg, onChanged }: { pkg: AdPackage; onChanged: () => void }) {
  const [name, setName] = useState(pkg.name);
  const [price, setPrice] = useState(String(pkg.price_cents / 100));
  const [days, setDays] = useState(String(pkg.days));
  const [busy, setBusy] = useState(false);
  const dirty =
    name !== pkg.name || Number(price) * 100 !== pkg.price_cents || Number(days) !== pkg.days;

  const update = async (fields: Partial<AdPackage>, msg: string) => {
    setBusy(true);
    const { error } = await adPackagesTable().update(fields).eq("id", pkg.id);
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    toast.success(msg);
    onChanged();
  };
  const save = () => {
    const cents = Math.round(Number(price) * 100);
    const d = Math.round(Number(days));
    if (!name.trim() || !(cents >= 0) || !(d > 0)) return toast.error("Enter a name, price and days.");
    update({ name: name.trim(), price_cents: cents, days: d }, "Package saved");
  };
  const remove = async () => {
    if (!confirm(`Delete the ${pkg.name} package?`)) return;
    const { error } = await adPackagesTable().delete().eq("id", pkg.id);
    if (error) return toast.error(friendlyError(error));
    toast.success("Package deleted");
    onChanged();
  };

  return (
    <div className={`rounded-2xl border bg-card p-4 ${pkg.active ? "" : "opacity-60"}`}>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-[2fr_1fr_1fr_auto]">
        <label className="col-span-2 text-xs text-muted-foreground md:col-span-1">
          Package name
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-xs text-muted-foreground">
          Price (R)
          <input className={input} type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label className="text-xs text-muted-foreground">
          Days shown
          <input className={input} type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
        </label>
        <div className="col-span-2 flex items-end gap-2 md:col-span-1">
          <button
            type="button"
            onClick={save}
            disabled={!dirty || busy}
            className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => update({ active: !pkg.active }, pkg.active ? "Package hidden" : "Package shown")}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            {pkg.active ? "Hide" : "Show"}
          </button>
          <button type="button" aria-label="Delete package" onClick={remove} className="rounded-xl border p-2 text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Currently {formatRand(pkg.price_cents)} for {pkg.days} days{pkg.active ? "" : " · hidden from advertisers"}
      </p>
    </div>
  );
}

function NewPackage({ nextOrder, onAdded }: { nextOrder: number; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("30");
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(Number(price) * 100);
    const d = Math.round(Number(days));
    if (!name.trim() || !(cents >= 0) || price === "" || !(d > 0)) return toast.error("Enter a name, price and days.");
    const { error } = await adPackagesTable().insert({ name: name.trim(), price_cents: cents, days: d, sort_order: nextOrder });
    if (error) return toast.error(friendlyError(error));
    toast.success("Package added");
    setName("");
    setPrice("");
    onAdded();
  };
  return (
    <form onSubmit={add} className="rounded-2xl border border-dashed bg-card p-4">
      <p className="mb-2 text-sm font-semibold">Add a package</p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-[2fr_1fr_1fr_auto]">
        <input className={`${input} col-span-2 md:col-span-1`} placeholder="Package name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={input} type="number" min={0} step="0.01" placeholder="Price (R)" value={price} onChange={(e) => setPrice(e.target.value)} />
        <input className={input} type="number" min={1} placeholder="Days" value={days} onChange={(e) => setDays(e.target.value)} />
        <button type="submit" className="col-span-2 flex items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground md:col-span-1">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
    </form>
  );
}
