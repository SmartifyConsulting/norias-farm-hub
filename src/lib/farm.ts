import { useEffect, useState, useCallback } from "react";
import { Warehouse, PawPrint, NotebookPen, Wheat, Map, Package, type LucideIcon } from "lucide-react";

export type SyncStatus = "synced" | "pending" | "local";
export type FarmRecord = {
  id: string;
  title: string;
  detail: string;
  qty?: string;
  date: string;
  sync: SyncStatus;
};

export type MiniApp = {
  id: string;
  name: string;
  emoji: string;
  icon: LucideIcon;
  blurb: string;
  titleLabel: string;
  detailLabel: string;
  qtyLabel?: string;
};

export const MINI_APPS: MiniApp[] = [
  { id: "farm", name: "My Farm", emoji: "🏡", icon: Warehouse, blurb: "Buildings, equipment & assets", titleLabel: "Asset", detailLabel: "Notes", qtyLabel: "Value" },
  { id: "animals", name: "My Animals", emoji: "🐄", icon: PawPrint, blurb: "Herd records & health", titleLabel: "Animal / tag", detailLabel: "Breed & health", qtyLabel: "Weight (kg)" },
  { id: "diary", name: "Farm Diary", emoji: "📔", icon: NotebookPen, blurb: "Daily notes & tasks", titleLabel: "Entry", detailLabel: "What happened" },
  { id: "harvest", name: "Harvest", emoji: "🌾", icon: Wheat, blurb: "Yields by crop & season", titleLabel: "Crop", detailLabel: "Field / notes", qtyLabel: "Yield (kg)" },
  { id: "fields", name: "Field Mapping", emoji: "🗺️", icon: Map, blurb: "Plots, sizes & rotations", titleLabel: "Field name", detailLabel: "Crop / rotation", qtyLabel: "Area (ha)" },
  { id: "stock", name: "Stock", emoji: "📦", icon: Package, blurb: "Feed, seed & supplies", titleLabel: "Item", detailLabel: "Location", qtyLabel: "Quantity" },
];

const key = (app: string) => `farmerplus:${app}`;

function read(app: string): FarmRecord[] {
  try {
    return JSON.parse(localStorage.getItem(key(app)) || "[]");
  } catch {
    return [];
  }
}

export function useRecords(app: string) {
  const [records, setRecords] = useState<FarmRecord[]>([]);
  useEffect(() => setRecords(read(app)), [app]);
  const save = useCallback(
    (next: FarmRecord[]) => {
      localStorage.setItem(key(app), JSON.stringify(next));
      setRecords(next);
      window.dispatchEvent(new Event("farmerplus:change"));
    },
    [app],
  );
  return { records, save };
}

export function allRecordCounts() {
  let total = 0, pending = 0;
  for (const a of MINI_APPS) {
    const r = read(a.id);
    total += r.length;
    pending += r.filter((x) => x.sync !== "synced").length;
  }
  return { total, pending };
}

/** Simulated sync: marks all pending/local records as synced when online. */
export function syncAll() {
  for (const a of MINI_APPS) {
    const r = read(a.id).map((x) => ({ ...x, sync: "synced" as const }));
    localStorage.setItem(key(a.id), JSON.stringify(r));
  }
  window.dispatchEvent(new Event("farmerplus:change"));
}

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

export function useSettings() {
  const [s, setS] = useState({ farmName: "Green Acres", owner: "Farmer", units: "metric", autoSync: true, lat: 51.5, lon: -0.12 });
  useEffect(() => {
    try { const v = localStorage.getItem("farmerplus:settings"); if (v) setS((p) => ({ ...p, ...JSON.parse(v) })); } catch {}
  }, []);
  const update = (patch: Partial<typeof s>) => {
    const next = { ...s, ...patch };
    localStorage.setItem("farmerplus:settings", JSON.stringify(next));
    setS(next);
  };
  return [s, update] as const;
}
