import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Trash2,
  ChevronLeft,
  Pencil,
  AlertTriangle,
  CalendarDays,
  List,
  Link2,
  X,
} from "lucide-react";
import { FarmCalendar, eventsFor } from "@/components/FarmCalendar";
import { permissions, useTeam } from "@/lib/team";
import type { FarmRecord, MiniApp } from "@/lib/farm";
import { Screen, SyncBadge } from "@/components/Dock";
import { MINI_APPS, read, useOnline, useRecords, useSettings } from "@/lib/farm";
import { markDeleted, syncAnimals } from "@/lib/animal-sync";
import { useUser } from "@/lib/auth";
import { toast } from "sonner";
import { FarmMap } from "@/components/FarmMap";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/errors";
import {
  geocodeAddress,
  MAIN_PRODUCTIONS,
  PRODUCTION_CATEGORIES,
  saveFarmDetails,
  useFarmDetails,
  type FarmDetails,
} from "@/lib/farmdetails";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ROLES, useRole } from "@/lib/network";

export const Route = createFileRoute("/app/$appId")({
  loader: ({ params }) => {
    const app = MINI_APPS.find((a) => a.id === params.appId);
    if (!app) throw notFound();
    return { appId: app.id, name: app.name, blurb: app.blurb };
  },
  head: ({ loaderData }) => {
    const n = loaderData?.name ?? "Not found";
    const d = loaderData ? `${loaderData.blurb} — FarmerPlus mini-app.` : "Mini-app not found.";
    return {
      meta: [
        { title: `${n} — FarmerPlus` },
        { name: "description", content: d },
        { property: "og:title", content: `${n} — FarmerPlus` },
        { property: "og:description", content: d },
      ],
    };
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
    if (!r.ok)
      toast.error(
        "Couldn't sync yet — your changes are kept safely on this device and will sync automatically once we're able to reach the server.",
      );
  };
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [qty, setQty] = useState("");
  const [extra, setExtra] = useState<Extra>(EMPTY);
  const [view, setView] = useState<"list" | "calendar">("list");
  const { current, farms, reload: reloadFarms } = useTeam();
  const [viewFarmId, setViewFarmId] = useState<string | null>(null);
  const effectiveFarmId = viewFarmId ?? current?.id ?? null;
  const [addingFarm, setAddingFarm] = useState(false);
  const [savingFarm, setSavingFarm] = useState(false);
  const [newFarmName, setNewFarmName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newSizeHa, setNewSizeHa] = useState("");
  const [newMainProduction, setNewMainProduction] = useState("");
  const [newSubCategory, setNewSubCategory] = useState("");
  const [newRole, setNewRole] = useState<(typeof ROLES)[number]>(ROLES[0]!);
  const [queuedAssets, setQueuedAssets] = useState<
    { title: string; detail: string; qty: string }[]
  >([]);
  const [assetTitle, setAssetTitle] = useState("");
  const [assetDetail, setAssetDetail] = useState("");
  const [assetQty, setAssetQty] = useState("");
  const resetAddFarmForm = () => {
    setNewFarmName("");
    setNewAddress("");
    setNewSizeHa("");
    setNewMainProduction("");
    setNewSubCategory("");
    setNewRole(ROLES[0]!);
    setQueuedAssets([]);
    setAssetTitle("");
    setAssetDetail("");
    setAssetQty("");
  };
  const queueAsset = () => {
    if (!assetTitle.trim()) return;
    setQueuedAssets([
      ...queuedAssets,
      { title: assetTitle.trim(), detail: assetDetail.trim(), qty: assetQty.trim() },
    ]);
    setAssetTitle("");
    setAssetDetail("");
    setAssetQty("");
  };
  const addFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFarmName.trim() || savingFarm) return;
    setSavingFarm(true);
    const { data, error } = await supabase.rpc("create_farm", { _name: newFarmName.trim() });
    if (error) {
      toast.error(friendlyError(error));
      setSavingFarm(false);
      return;
    }
    const fid = typeof data === "string" ? data : null;
    if (fid) {
      const geocoded = await geocodeAddress(newAddress);
      saveFarmDetails(fid, {
        address: newAddress.trim(),
        sizeHa: newSizeHa.trim(),
        mainProduction: newMainProduction,
        subCategory: newSubCategory,
        role: newRole,
        lat: geocoded?.lat,
        lon: geocoded?.lon,
      });
      if (queuedAssets.length) {
        save([
          ...queuedAssets.map((a) => ({
            id: crypto.randomUUID(),
            title: a.title,
            detail: a.detail,
            qty: a.qty,
            date: new Date().toISOString(),
            sync: cloud
              ? user
                ? "pending"
                : "local"
              : online && settings.autoSync
                ? "synced"
                : online
                  ? "pending"
                  : "local",
          })),
          ...records,
        ] as FarmRecord[]);
      }
    }
    resetAddFarmForm();
    setAddingFarm(false);
    setSavingFarm(false);
    await reloadFarms();
    if (fid) setViewFarmId(fid);
    toast.success("Farm added");
  };
  const farmDetails = useFarmDetails(effectiveFarmId);
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState<FarmDetails>(farmDetails);
  const [, setGlobalRole] = useRole();
  useEffect(() => {
    setDetailsForm(farmDetails);
    setEditingDetails(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveFarmId]);
  useEffect(() => {
    // Opportunities matching reads one global "your role" — keep it in step with whichever
    // farm is selected here, since role is now captured per farm instead of once in Settings.
    if (farmDetails.role) setGlobalRole(farmDetails.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmDetails.role]);
  const { canWrite, canDelete } = permissions(current?.role);
  const fields = useRecords("fields").records;
  const crops = useRecords("crops").records;
  const animals = useRecords("animals").records;
  const belongsToFarm = (r: FarmRecord) => r.farmId == null || r.farmId === current?.id;
  const visibleRecords = records.filter(belongsToFarm);
  const visibleFields = fields.filter(belongsToFarm);
  const visibleCrops = crops.filter(belongsToFarm);
  const visibleAnimals = animals.filter(belongsToFarm);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if ((extra.fieldId && !visibleFields.some((f) => f.id === extra.fieldId)) ||
        (extra.cropId && !visibleCrops.some((c) => c.id === extra.cropId)) ||
        (extra.animalId && !visibleAnimals.some((a) => a.id === extra.animalId))) {
      toast.error("Choose a linked record from this farm.");
      return;
    }
    const crop = visibleCrops.find((c) => c.id === extra.cropId);
    if (crop?.fieldId && extra.fieldId && crop.fieldId !== extra.fieldId) {
      toast.error("The selected crop cycle belongs to another field.");
      return;
    }
    save([
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        detail: detail.trim(),
        qty: qty.trim(),
        ...clean(extra),
        farmId: current?.id ?? null,
        date: new Date().toISOString(),
        sync: cloud
          ? user
            ? "pending"
            : "local"
          : online && settings.autoSync
            ? "synced"
            : online
              ? "pending"
              : "local",
      },
      ...records,
    ]);
    setTimeout(kick, 0);
    setTitle("");
    setDetail("");
    setQty("");
    setExtra(EMPTY);
  };

  const input =
    "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  const isFarm = app.id === "farm";
  const recordsGrid = (
    <div className="md:grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:items-start md:gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <form onSubmit={add} className="space-y-2 rounded-2xl border bg-card p-4 md:sticky md:top-24">
        <input
          className={input}
          placeholder={app.titleLabel}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className={input}
          placeholder={app.detailLabel}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />
        {app.qtyLabel && (
          <input
            className={input}
            placeholder={app.qtyLabel}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        )}
        <ExtraInputs
          app={app}
          v={extra}
          set={setExtra}
          fields={visibleFields}
          crops={visibleCrops}
          animals={visibleAnimals}
        />
        {!canWrite && (
          <p className="text-center text-xs text-muted-foreground">
            You have view-only access to {current?.name}.
          </p>
        )}
        <button
          disabled={!canWrite}
          className="w-full disabled:opacity-50 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground"
        >
          Add record
        </button>
        {cloud && !user && (
          <p className="text-center text-xs text-muted-foreground">
            Saved on this device.{" "}
            <Link to="/auth" className="font-semibold text-primary">
              Sign in
            </Link>{" "}
            to back up and sync across devices.
          </p>
        )}
        {!online && (
          <p className="text-center text-xs text-muted-foreground">
            You're offline — records save on this device.
          </p>
        )}
      </form>
      <div className="mt-4 md:mt-0">
        {current && (
          <p className="mb-2 text-xs text-muted-foreground">
            Working in shared farm <b>{current.name}</b> ({current.role}) ·{" "}
            <Link to="/team" className="text-primary">
              Team
            </Link>
          </p>
        )}
        {app.dates && (
          <div className="mb-3 inline-flex rounded-full border bg-card p-1 text-sm">
            <button
              onClick={() => setView("list")}
              className={`rounded-full px-3 py-1 ${view === "list" ? "bg-primary text-primary-foreground" : ""}`}
            >
              <List className="mr-1 inline h-4 w-4" />
              List
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`rounded-full px-3 py-1 ${view === "calendar" ? "bg-primary text-primary-foreground" : ""}`}
            >
              <CalendarDays className="mr-1 inline h-4 w-4" />
              Calendar
            </button>
          </div>
        )}
        {view === "calendar" ? (
          <FarmCalendar events={eventsFor(app, visibleRecords)} />
        ) : (
          <ul className="space-y-2 md:mt-0 xl:grid xl:grid-cols-2 xl:gap-3 xl:space-y-0">
            {visibleRecords.length === 0 && (
              <li className="py-8 text-center xl:col-span-2 text-sm text-muted-foreground">
                No records yet.
              </li>
            )}
            {visibleRecords.map((r) => (
              <RecordItem
                key={r.id}
                r={r}
                app={app}
                cloud={cloud}
                fields={visibleFields}
                crops={visibleCrops}
                animals={visibleAnimals}
                canWrite={canWrite}
                activeFarmId={current?.id ?? null}
                activeFarmName={current?.name ?? ""}
                canDelete={canDelete}
                onSave={(u) => {
                  save(
                    records.map((x) =>
                      x.id === r.id
                        ? {
                            ...x,
                            ...u,
                            sync: cloud
                              ? user
                                ? "pending"
                                : "local"
                              : x.sync === "synced" && online
                                ? "synced"
                                : "pending",
                            syncError: undefined,
                          }
                        : x,
                    ),
                  );
                  setTimeout(kick, 0);
                }}
                onDelete={() => {
                  if (cloud && r.sync === "synced") markDeleted(r.id, app.id);
                  save(records.filter((x) => x.id !== r.id));
                  setTimeout(kick, 0);
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
  return (
    <Screen title={app.name}>
      <Link
        to="/apps"
        search={{ folder: undefined }}
        className="-mt-3 mb-4 inline-flex items-center text-sm text-muted-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        App Store
      </Link>
      {!isFarm && recordsGrid}
      {isFarm && (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 font-display text-lg font-semibold">Your farms</h2>
            <div className="flex flex-wrap items-center gap-2">
              {farms.length > 0 && (
                <button
                  onClick={() => setViewFarmId(null)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${effectiveFarmId === null ? "bg-primary text-primary-foreground" : ""}`}
                >
                  Just me (private)
                </button>
              )}
              {farms.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setViewFarmId(f.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${effectiveFarmId === f.id ? "bg-primary text-primary-foreground" : ""}`}
                >
                  {f.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAddingFarm(true)}
                className="rounded-full border border-dashed px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                + Add farm
              </button>
            </div>
          </section>

          <Dialog
            open={addingFarm}
            onOpenChange={(open) => {
              if (!open && !savingFarm) {
                setAddingFarm(false);
                resetAddFarmForm();
              }
            }}
          >
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add a farm</DialogTitle>
                <DialogDescription>
                  Capture the basics now — you can always fill in more later from Farm details.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={addFarm} className="space-y-3">
                <input
                  autoFocus
                  className={input}
                  placeholder="Farm name"
                  value={newFarmName}
                  onChange={(e) => setNewFarmName(e.target.value)}
                />
                <input
                  className={input}
                  placeholder="Address"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                />
                <input
                  className={input}
                  placeholder="Size (hectares)"
                  value={newSizeHa}
                  onChange={(e) => setNewSizeHa(e.target.value)}
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    aria-label="Main production"
                    className={input}
                    value={newMainProduction}
                    onChange={(e) => {
                      setNewMainProduction(e.target.value);
                      setNewSubCategory("");
                    }}
                  >
                    <option value="">Main production</option>
                    {MAIN_PRODUCTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Production subcategory"
                    className={input}
                    value={newSubCategory}
                    onChange={(e) => setNewSubCategory(e.target.value)}
                    disabled={!newMainProduction}
                  >
                    <option value="">
                      {newMainProduction
                        ? "Production subcategory"
                        : "Choose main production first"}
                    </option>
                    {(PRODUCTION_CATEGORIES[newMainProduction] ?? []).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="block text-sm font-medium">
                  Your role on this farm
                  <select
                    className={input}
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as (typeof ROLES)[number])}
                  >
                    {ROLES.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>

                <div className="rounded-2xl border p-3">
                  <p className="mb-2 text-sm font-semibold">Assets (optional)</p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Buildings, equipment or anything else — these show up as map icons.
                  </p>
                  {queuedAssets.length > 0 && (
                    <ul className="mb-2 space-y-1">
                      {queuedAssets.map((a, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between rounded-xl bg-muted px-3 py-1.5 text-sm"
                        >
                          <span>
                            {a.title}
                            {a.detail && (
                              <span className="text-muted-foreground"> · {a.detail}</span>
                            )}
                          </span>
                          <button
                            type="button"
                            aria-label={`Remove ${a.title}`}
                            onClick={() => setQueuedAssets(queuedAssets.filter((_, x) => x !== i))}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <input
                      className={`${input} max-w-[10rem]`}
                      placeholder="Asset name"
                      value={assetTitle}
                      onChange={(e) => setAssetTitle(e.target.value)}
                    />
                    <input
                      className={`${input} max-w-[9rem]`}
                      placeholder="Notes"
                      value={assetDetail}
                      onChange={(e) => setAssetDetail(e.target.value)}
                    />
                    <input
                      className={`${input} max-w-[7rem]`}
                      placeholder="Value"
                      value={assetQty}
                      onChange={(e) => setAssetQty(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={queueAsset}
                      disabled={!assetTitle.trim()}
                      className="rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <DialogFooter>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingFarm(false);
                      resetAddFarmForm();
                    }}
                    className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!newFarmName.trim() || savingFarm}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {savingFarm ? "Adding…" : "Add farm"}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Farm details</h2>
              {!editingDetails && (
                <button
                  type="button"
                  onClick={() => setEditingDetails(true)}
                  className="text-sm font-semibold text-primary"
                >
                  {farmDetails.address || farmDetails.mainProduction ? "Edit" : "+ Add details"}
                </button>
              )}
            </div>
            {editingDetails ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const addressChanged = detailsForm.address.trim() !== farmDetails.address.trim();
                  const geocoded = addressChanged
                    ? await geocodeAddress(detailsForm.address)
                    : { lat: detailsForm.lat, lon: detailsForm.lon };
                  saveFarmDetails(effectiveFarmId, {
                    ...detailsForm,
                    lat: geocoded?.lat,
                    lon: geocoded?.lon,
                  });
                  setEditingDetails(false);
                }}
                className="space-y-2 rounded-2xl border bg-card p-4"
              >
                <input
                  className={input}
                  placeholder="Address"
                  value={detailsForm.address}
                  onChange={(e) => setDetailsForm({ ...detailsForm, address: e.target.value })}
                />
                <input
                  className={input}
                  placeholder="Size (hectares)"
                  value={detailsForm.sizeHa}
                  onChange={(e) => setDetailsForm({ ...detailsForm, sizeHa: e.target.value })}
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    aria-label="Main production"
                    className={input}
                    value={detailsForm.mainProduction}
                    onChange={(e) =>
                      setDetailsForm({
                        ...detailsForm,
                        mainProduction: e.target.value,
                        subCategory: "",
                      })
                    }
                  >
                    <option value="">Main production</option>
                    {MAIN_PRODUCTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Production subcategory"
                    className={input}
                    value={detailsForm.subCategory}
                    onChange={(e) =>
                      setDetailsForm({ ...detailsForm, subCategory: e.target.value })
                    }
                    disabled={!detailsForm.mainProduction}
                  >
                    <option value="">
                      {detailsForm.mainProduction
                        ? "Production subcategory"
                        : "Choose main production first"}
                    </option>
                    {(PRODUCTION_CATEGORIES[detailsForm.mainProduction] ?? []).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="block text-sm font-medium">
                  Your role on this farm
                  <select
                    className={input}
                    value={detailsForm.role ?? ROLES[0]}
                    onChange={(e) =>
                      setDetailsForm({
                        ...detailsForm,
                        role: e.target.value as (typeof ROLES)[number],
                      })
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <p className="text-xs text-muted-foreground">
                  Add buildings, equipment and other assets in the Assets section below — they'll
                  show up as icons you can drag onto the farm map.
                </p>
                <div className="flex gap-2">
                  <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                    Save details
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailsForm(farmDetails);
                      setEditingDetails(false);
                    }}
                    className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : farmDetails.address || farmDetails.sizeHa || farmDetails.mainProduction ? (
              <p className="text-sm text-muted-foreground">
                {[
                  farmDetails.address,
                  farmDetails.sizeHa && `${farmDetails.sizeHa} ha`,
                  [farmDetails.mainProduction, farmDetails.subCategory].filter(Boolean).join(" · "),
                  farmDetails.role && `You: ${farmDetails.role}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No details captured yet.</p>
            )}
          </section>
          <section>
            <h2 className="mb-2 font-display text-lg font-semibold">Farm map</h2>
            <FarmMap
              farmId={effectiveFarmId}
              center={
                farmDetails.lat != null && farmDetails.lon != null
                  ? [farmDetails.lat, farmDetails.lon]
                  : undefined
              }
            />
          </section>
          <section>
            <h2 className="mb-2 font-display text-lg font-semibold">Assets</h2>
            {recordsGrid}
          </section>
          <FieldsSection />
        </div>
      )}
    </Screen>
  );
}

/** Fields, merged into My Farm: a simple list, with precise location now handled by pinning a field to the farm map above. */
function FieldsSection() {
  const { records, save } = useRecords("fields");
  const { current } = useTeam();
  const visibleFields = records.filter((r) => r.farmId == null || r.farmId === current?.id);
  const { records: cropCycles } = useRecords("crops");
  const { canWrite, canDelete } = permissions(current?.role);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [qty, setQty] = useState("");
  const input =
    "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    save([
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        detail: detail.trim(),
        qty: qty.trim(),
        date: new Date().toISOString(),
        sync: "local",
        farmId: current?.id ?? null,
      },
      ...records,
    ]);
    setTitle("");
    setDetail("");
    setQty("");
  };
  return (
    <section>
      <h2 className="mb-2 font-display text-lg font-semibold">Fields</h2>
      <form onSubmit={add} className="mb-3 flex flex-wrap gap-2">
        <input
          className={`${input} max-w-xs`}
          placeholder="Field name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className={`${input} max-w-xs`}
          placeholder="Crop / rotation"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />
        <input
          className={`${input} max-w-[10rem]`}
          placeholder="Area (ha)"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Add field
        </button>
      </form>
      {visibleFields.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No fields yet — add one above, then pin it on the farm map.
        </p>
      ) : (
        <ul className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 xl:grid-cols-3">
          {visibleFields.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 rounded-2xl border bg-card p-3 text-sm"
            >
              <div>
                <p className="font-semibold">{r.title}</p>
                {r.detail && <p className="text-xs text-muted-foreground">{r.detail}</p>}
                {r.qty && <p className="text-xs text-muted-foreground">{r.qty} ha</p>}
                {r.farmId == null && current?.id && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Unassigned legacy field</span>
                    {canWrite && <button type="button" className="rounded-lg border px-2 py-1 font-semibold text-primary" onClick={() => {
                      const children = cropCycles.filter((c) => c.fieldId === r.id);
                      if (children.some((c) => c.farmId != null && c.farmId !== current.id)) {
                        toast.error("This field has crop cycles assigned to another farm."); return;
                      }
                      if (children.some((c) => c.farmId == null)) {
                        toast.error("Assign linked crop cycles before assigning this field."); return;
                      }
                      if (!window.confirm("Assign " + r.title + " to " + current.name + "? " + children.length + " linked crop cycle(s) will remain unchanged.")) return;
                      save(records.map((f) => f.id === r.id ? { ...f, farmId: current.id, sync: "pending" as const } : f));
                    }}>Assign to {current.name}</button>}
                  </div>
                )}
              </div>
              <button
                aria-label="Remove field"
                disabled={!canDelete}
                onClick={() => {
                  if (cropCycles.some((c) => c.fieldId === r.id)) { toast.error("This field has linked crop cycles. Unlink them before deleting."); return; }
                  if (!window.confirm("Delete field " + r.title + "?")) return;
                  if (r.sync === "synced") markDeleted(r.id, "fields");
                  save(records.filter((x) => x.id !== r.id));
                }}
                className="text-muted-foreground hover:text-destructive disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type Extra = {
  due: string;
  end: string;
  fieldId: string;
  cropId: string;
  animalId: string;
  repeat: string;
};
const EMPTY: Extra = { due: "", end: "", fieldId: "", cropId: "", animalId: "", repeat: "" };
const clean = (e: Extra) => ({
  due: e.due || undefined,
  end: e.end || undefined,
  fieldId: e.fieldId || undefined,
  cropId: e.cropId || undefined,
  animalId: e.animalId || undefined,
  repeatDays: e.repeat ? Number(e.repeat) : undefined,
});
const REPEATS = [
  ["", "Does not repeat"],
  ["7", "Weekly"],
  ["30", "Monthly"],
  ["91", "Every 3 months"],
  ["182", "Every 6 months"],
  ["365", "Yearly"],
] as const;
const addDays = (d: string, n: number) => {
  const x = new Date(d + "T00:00");
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};
const todayIso = () => new Date().toISOString().slice(0, 10);
function dueStatus(r: FarmRecord) {
  if (!r.due) return null;
  const d =
    (new Date(r.due + "T00:00").getTime() - new Date(todayIso() + "T00:00").getTime()) / 864e5;
  if (d < 0) return { label: `Overdue ${-d}d`, cls: "bg-destructive text-destructive-foreground" };
  if (d <= 7)
    return {
      label: d === 0 ? "Due today" : `Due in ${d}d`,
      cls: "bg-accent text-accent-foreground",
    };
  return { label: "Upcoming", cls: "bg-secondary text-secondary-foreground" };
}

function ExtraInputs({
  app,
  v,
  set,
  fields,
  crops,
  animals = [],
}: {
  app: MiniApp;
  v: Extra;
  set: (e: Extra) => void;
  fields: FarmRecord[];
  crops: FarmRecord[];
  animals?: FarmRecord[];
}) {
  const input =
    "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  return (
    <>
      {app.dates && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted-foreground">
            {app.dates[0]}
            <input
              type="date"
              className={input}
              value={v.due}
              onChange={(e) => set({ ...v, due: e.target.value })}
            />
          </label>
          {app.dates[1] && (
            <label className="text-xs text-muted-foreground">
              {app.dates[1]}
              <input
                type="date"
                className={input}
                value={v.end}
                onChange={(e) => set({ ...v, end: e.target.value })}
              />
            </label>
          )}
        </div>
      )}
      {app.links?.includes("animal") && (
        <select
          aria-label="Animal"
          className={input}
          value={v.animalId}
          onChange={(e) => set({ ...v, animalId: e.target.value })}
        >
          <option value="">
            {animals.length ? "Animal (or whole herd)" : "No animals yet — add some in My Animals"}
          </option>
          {animals.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
      )}
      {app.recurring && (
        <select
          aria-label="Repeat"
          className={input}
          value={v.repeat}
          onChange={(e) => set({ ...v, repeat: e.target.value })}
        >
          {REPEATS.map(([d, l]) => (
            <option key={d} value={d}>
              {l}
            </option>
          ))}
        </select>
      )}
      {app.links?.includes("field") && (
        <select
          aria-label="Field"
          className={input}
          value={v.fieldId}
          onChange={(e) => set({ ...v, fieldId: e.target.value })}
        >
          <option value="">
            {fields.length ? "Field (optional)" : "No fields yet — add one in My Farm"}
          </option>
          {fields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.title}
            </option>
          ))}
        </select>
      )}
      {app.links?.includes("crop") && (
        <select
          aria-label="Crop cycle"
          className={input}
          value={v.cropId}
          onChange={(e) => {
            const c = crops.find((x) => x.id === e.target.value);
            set({ ...v, cropId: e.target.value, fieldId: v.fieldId || c?.fieldId || "" });
          }}
        >
          <option value="">{crops.length ? "Crop cycle (optional)" : "No crop cycles yet"}</option>
          {crops.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      )}
    </>
  );
}

const LINKED = ["tasks", "treatments", "maintenance", "finance", "harvest"];
const money = (q?: string) => {
  const n = parseFloat((q ?? "").replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
};

function RecordItem({
  r,
  app,
  cloud,
  fields,
  crops,
  animals,
  canWrite,
  activeFarmId,
  activeFarmName,
  canDelete,
  onSave,
  onDelete,
}: {
  r: FarmRecord;
  app: MiniApp;
  cloud: boolean;
  fields: FarmRecord[];
  crops: FarmRecord[];
  animals: FarmRecord[];
  canWrite: boolean;
  activeFarmId: string | null;
  activeFarmName: string;
  canDelete: boolean;
  onSave: (u: Partial<FarmRecord>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ title: r.title, detail: r.detail, qty: r.qty ?? "" });
  const [x, setX] = useState<Extra>({
    due: r.due ?? "",
    end: r.end ?? "",
    fieldId: r.fieldId ?? "",
    cropId: r.cropId ?? "",
    animalId: r.animalId ?? "",
    repeat: r.repeatDays ? String(r.repeatDays) : "",
  });
  const animal = animals.find((v) => v.id === r.animalId);
  const status = app.recurring ? dueStatus(r) : null;
  // Health items about this animal (shown on My Animals).
  const health = app.id === "animals" ? read("health").filter((h) => h.animalId === r.id) : [];
  const markDone = () => {
    const done = [todayIso(), ...(r.completed ?? [])];
    onSave({
      completed: done,
      due: r.repeatDays
        ? addDays(r.due && r.due > todayIso() ? r.due : todayIso(), r.repeatDays)
        : undefined,
    });
  };
  const field = fields.find((v) => v.id === r.fieldId),
    crop = crops.find((v) => v.id === r.cropId);
  // Things linked to this field / crop cycle from the other apps.
  const linked =
    app.id === "fields" || app.id === "crops"
      ? LINKED.flatMap((a) =>
          read(a)
            .filter((v) => (app.id === "fields" ? v.fieldId : v.cropId) === r.id && (v.farmId ?? null) === (r.farmId ?? null))
            .map((v) => ({ a, v })),
        )
      : [];
  const cost = linked
    .filter((l) => l.a === "finance" || l.a === "maintenance")
    .reduce((s, l) => s + money(l.v.qty), 0);
  const harvests = linked.filter((l) => l.a === "harvest");
  const harvestKg = harvests.reduce((sum, l) => sum + money(l.v.qty), 0);
  const input =
    "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  if (editing)
    return (
      <li className="rounded-2xl border bg-card p-4">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!f.title.trim()) return;
            if ((x.fieldId && !fields.some((v) => v.id === x.fieldId)) ||
                (x.cropId && !crops.some((v) => v.id === x.cropId)) ||
                (x.animalId && !animals.some((v) => v.id === x.animalId))) {
              toast.error("Choose a linked record from the selected farm.");
              return;
            }
            const selectedCrop = crops.find((v) => v.id === x.cropId);
            if (selectedCrop?.fieldId && x.fieldId && selectedCrop.fieldId !== x.fieldId) {
              toast.error("The selected crop cycle belongs to another field.");
              return;
            }
            onSave({
              title: f.title.trim(),
              detail: f.detail.trim(),
              qty: f.qty.trim(),
              ...clean(x),
            });
            setEditing(false);
          }}
        >
          <input
            aria-label={app.titleLabel}
            className={input}
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
          />
          <input
            aria-label={app.detailLabel}
            className={input}
            placeholder={app.detailLabel}
            value={f.detail}
            onChange={(e) => setF({ ...f, detail: e.target.value })}
          />
          {app.qtyLabel && (
            <input
              aria-label={app.qtyLabel}
              className={input}
              placeholder={app.qtyLabel}
              value={f.qty}
              onChange={(e) => setF({ ...f, qty: e.target.value })}
            />
          )}
          <ExtraInputs app={app} v={x} set={setX} fields={fields} crops={crops} animals={animals} />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setF({ title: r.title, detail: r.detail, qty: r.qty ?? "" });
                setEditing(false);
              }}
              className="rounded-xl bg-secondary py-2 text-sm font-semibold text-secondary-foreground"
            >
              Cancel
            </button>
            <button className="rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">
              Save changes
            </button>
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
          {status && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}>
              {status.label}
            </span>
          )}
          {app.recurring && !r.due && (r.completed?.length ?? 0) > 0 && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
              Done
            </span>
          )}
        </div>
        {app.id === "crops" && (
          <Link to="/crop-cycle/$cycleId" params={{ cycleId: r.id }}
            className="mt-2 inline-flex rounded-lg border px-3 py-1 text-xs font-semibold text-primary hover:bg-muted">
            Open production history
          </Link>
        )}
        {r.detail && <p className="text-sm text-muted-foreground">{r.detail}</p>}
        <p className="mt-1 text-xs text-muted-foreground">
          {r.qty && (
            <>
              {app.qtyLabel}: <b className="text-foreground">{r.qty}</b> ·{" "}
            </>
          )}
          {new Date(r.date).toLocaleDateString()}
          {r.due && (
            <>
              {" "}
              · {app.dates?.[0]}: <b className="text-foreground">{r.due}</b>
            </>
          )}
          {r.end && (
            <>
              {" "}
              · {app.dates?.[1]}: <b className="text-foreground">{r.end}</b>
            </>
          )}
        </p>
        {r.farmId == null && activeFarmId && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Unassigned legacy record</span>
            {canWrite && (
              <button
                type="button"
                onClick={() => {
                  if (r.fieldId && !fields.some((f) => f.id === r.fieldId && (f.farmId == null || f.farmId === activeFarmId))) {
                    toast.error("This record references a field from another farm.");
                    return;
                  }
                  if (r.cropId && !crops.some((c) => c.id === r.cropId && (c.farmId == null || c.farmId === activeFarmId))) {
                    toast.error("This record references a crop cycle from another farm.");
                    return;
                  }
                  if (r.animalId && !animals.some((a) => a.id === r.animalId && (a.farmId == null || a.farmId === activeFarmId))) {
                    toast.error("This record references an animal from another farm.");
                    return;
                  }
                  if (app.id === "crops") {
                    const children = LINKED.flatMap((a) => read(a).filter((v) => v.cropId === r.id));
                    if (children.some((v) => v.farmId != null && v.farmId !== activeFarmId)) {
                      toast.error("Linked crop activities belong to another farm. Resolve those records first.");
                      return;
                    }
                    if (children.some((v) => v.farmId == null)) {
                      toast.error("Assign the unassigned linked crop activities to this farm before assigning the crop cycle.");
                      return;
                    }
                  }
                  if (app.id === "animals") {
                    const children = read("health").filter((v) => v.animalId === r.id);
                    if (children.some((v) => v.farmId != null && v.farmId !== activeFarmId)) {
                      toast.error("Linked health records belong to another farm.");
                      return;
                    }
                    if (children.some((v) => v.farmId == null)) {
                      toast.error("Assign linked health records before assigning this animal.");
                      return;
                    }
                  }
                  if (window.confirm(`Assign this record to ${activeFarmName}? It will no longer appear as unassigned on other farms.`)) {
                    onSave({ farmId: activeFarmId });
                  }
                }}
                className="rounded-lg border px-2 py-1 font-semibold text-primary"
              >
                Assign to {activeFarmName}
              </button>
            )}
          </div>
        )}
        {animal && <p className="mt-1 text-xs text-primary">Animal: {animal.title}</p>}
        {app.recurring && (
          <p className="mt-1 text-xs text-muted-foreground">
            {r.repeatDays ? `Repeats every ${r.repeatDays} days` : "One-off"}
            {(r.completed?.length ?? 0) > 0 && (
              <>
                {" "}
                · Done: {r.completed!.slice(0, 4).join(", ")}
                {r.completed!.length > 4 && "…"}
              </>
            )}
          </p>
        )}
        {app.recurring && canWrite && r.due && (
          <button
            onClick={markDone}
            className="mt-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
          >
            Mark done{r.repeatDays ? " & schedule next" : ""}
          </button>
        )}
        {health.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Health: {health.map((h) => `${h.title}${h.due ? ` (next ${h.due})` : ""}`).join(" · ")}
          </p>
        )}
        {(field || crop) && (
          <p className="mt-1 flex items-center gap-1 text-xs text-primary">
            <Link2 className="h-3 w-3" />
            {[field?.title, crop?.title].filter(Boolean).join(" · ")}
          </p>
        )}
        {linked.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Linked:{" "}
            {LINKED.map((a) => {
              const n = linked.filter((l) => l.a === a).length;
              return n ? `${n} ${MINI_APPS.find((m) => m.id === a)?.name}` : null;
            })
              .filter(Boolean)
              .join(" · ")}
            {harvests.length > 0 && <> · Harvest {harvestKg.toLocaleString()} kg</>}
            {cost !== 0 && <> · Recorded finance R{cost.toFixed(0)}</>}
          </p>
        )}
        {cloud && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {r.syncedAt ? `Last synced ${new Date(r.syncedAt).toLocaleString()}` : "Never synced"}
            {r.sync !== "synced" && r.syncedAt && " · has newer changes"}
          </p>
        )}
        {cloud && r.syncError && r.sync !== "synced" && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-destructive">
            <AlertTriangle className="h-3 w-3" />
            Upload failed: {r.syncError}
          </p>
        )}
      </div>
      {canWrite && (
        <button
          aria-label="Edit"
          onClick={() => setEditing(true)}
          className="text-muted-foreground hover:text-primary"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {canDelete && (
        <button
          aria-label="Delete"
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}
