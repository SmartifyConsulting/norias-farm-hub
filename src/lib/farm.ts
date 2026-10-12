import { useEffect, useState, useCallback } from "react";
import {
  Warehouse,
  PawPrint,
  NotebookPen,
  Wheat,
  Map,
  Package,
  ListTodo,
  Sprout,
  Wrench,
  FlaskConical,
  Receipt,
  Syringe,
  ShieldCheck,
  HandCoins,
  Gavel,
  UserRound,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export type SyncStatus = "synced" | "pending" | "local";
export type FarmRecord = {
  id: string;
  title: string;
  detail: string;
  qty?: string;
  date: string;
  sync: SyncStatus;
  syncedAt?: string;
  syncError?: string | undefined;
  farmId?: string | null | undefined;
  fieldId?: string | undefined;
  cropId?: string | undefined;
  due?: string | undefined;
  end?: string | undefined;
  animalId?: string | undefined;
  repeatDays?: number | undefined;
  completed?: string[] | undefined;
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
  /** Date inputs: [start/due label, optional end label]. Shown on the calendar. */
  dates?: [string] | [string, string];
  /** Link to a field and/or crop cycle. */
  links?: ("field" | "crop" | "animal")[];
  /** Recurring schedule with completion tracking. */
  recurring?: boolean;
};

export const MINI_APPS: MiniApp[] = [
  {
    id: "farm",
    name: "My Farm",
    emoji: "🏡",
    icon: Warehouse,
    blurb: "Buildings, equipment & assets",
    titleLabel: "Asset",
    detailLabel: "Notes",
    qtyLabel: "Value",
  },
  {
    id: "animals",
    name: "My Animals",
    emoji: "🐄",
    icon: PawPrint,
    blurb: "Herd records & health",
    titleLabel: "Animal / tag",
    detailLabel: "Breed & health",
    qtyLabel: "Weight (kg)",
  },
  {
    id: "health",
    name: "Animal Health",
    emoji: "💉",
    icon: Syringe,
    blurb: "Vaccinations, treatments & checkups",
    titleLabel: "Vaccination / treatment / checkup",
    detailLabel: "Product, dose or vet notes",
    dates: ["Next due"],
    links: ["animal"],
    recurring: true,
  },
  {
    id: "diary",
    name: "Farm Diary",
    emoji: "📔",
    icon: NotebookPen,
    blurb: "Daily notes & tasks",
    titleLabel: "Entry",
    detailLabel: "What happened",
  },
  {
    id: "harvest",
    name: "Harvest",
    emoji: "🌾",
    icon: Wheat,
    blurb: "Yields by crop & season",
    titleLabel: "Crop",
    detailLabel: "Field / notes",
    qtyLabel: "Yield (kg)",
  },
  {
    id: "fields",
    name: "Fields",
    emoji: "🗺️",
    icon: Map,
    blurb: "Plots, sizes & rotations — now part of My Farm",
    titleLabel: "Field name",
    detailLabel: "Crop / rotation",
    qtyLabel: "Area (ha)",
  },
  {
    id: "stock",
    name: "Stock",
    emoji: "📦",
    icon: Package,
    blurb: "Feed, seed & supplies",
    titleLabel: "Item",
    detailLabel: "Location",
    qtyLabel: "Quantity",
  },
  {
    id: "tasks",
    name: "Tasks",
    emoji: "✅",
    icon: ListTodo,
    blurb: "Jobs, assignees & due dates",
    titleLabel: "Task",
    detailLabel: "Field / assignee / notes",
    dates: ["Due date"],
    links: ["field", "crop"],
  },
  {
    id: "crops",
    name: "Crop Cycles",
    emoji: "🌱",
    icon: Sprout,
    blurb: "Plantings from sowing to harvest",
    titleLabel: "Crop & field",
    detailLabel: "Variety / stage",
    qtyLabel: "Area (ha)",
    dates: ["Planting date", "Harvest date"],
    links: ["field"],
  },
  {
    id: "treatments",
    name: "Inputs & Sprays",
    emoji: "🧪",
    icon: FlaskConical,
    blurb: "Fertiliser, spray & vet treatments",
    titleLabel: "Product",
    detailLabel: "Field or animal / rate / withholding",
    qtyLabel: "Amount used",
    dates: ["Date"],
    links: ["field", "crop"],
  },
  {
    id: "maintenance",
    name: "Maintenance",
    emoji: "🔧",
    icon: Wrench,
    blurb: "Equipment services & repairs",
    titleLabel: "Equipment",
    detailLabel: "Work done / next service",
    qtyLabel: "Cost (R)",
    dates: ["Date"],
    links: ["field", "crop"],
  },
  {
    id: "finance",
    name: "Costs & Sales",
    emoji: "🧾",
    icon: Receipt,
    blurb: "Expenses and income by enterprise",
    titleLabel: "Item (cost or sale)",
    detailLabel: "Enterprise / buyer / supplier",
    qtyLabel: "Amount (R, minus for cost)",
    dates: ["Date"],
    links: ["field", "crop"],
  },
  {
    id: "compliance",
    name: "Compliance & Registration",
    emoji: "🛡️",
    icon: ShieldCheck,
    blurb: "Permits, registrations and renewal dates",
    titleLabel: "Permit / registration",
    detailLabel: "Issuing body / notes",
    dates: ["Renewal due"],
    recurring: true,
  },
  {
    id: "grants",
    name: "Grant & Subsidy Tracker",
    emoji: "💰",
    icon: HandCoins,
    blurb: "Applications for grants, subsidies and funding",
    titleLabel: "Grant / subsidy",
    detailLabel: "Provider / notes",
    qtyLabel: "Amount applied for (R)",
    dates: ["Deadline"],
  },
  {
    id: "land-applications",
    name: "Land & Development Applications",
    emoji: "⚖️",
    icon: Gavel,
    blurb: "Track an application's status through a government process",
    titleLabel: "Application",
    detailLabel: "Type / reference number / status",
    dates: ["Decision expected"],
  },
  {
    id: "extension",
    name: "Extension Officer Visits",
    emoji: "🧑‍🌾",
    icon: UserRound,
    blurb: "Your assigned extension officer and a log of visits",
    titleLabel: "Officer name",
    detailLabel: "Contact details / what was discussed",
    dates: ["Visit date"],
  },
  {
    id: "returns",
    name: "Reporting & Returns",
    emoji: "📜",
    icon: ScrollText,
    blurb: "Recurring statutory reports and returns due to government bodies",
    titleLabel: "Report / return",
    detailLabel: "Body / frequency",
    dates: ["Due date"],
    recurring: true,
  },
];

const key = (app: string) => `farmerplus:${app}`;

export function read(app: string): FarmRecord[] {
  try {
    return JSON.parse(localStorage.getItem(key(app)) || "[]");
  } catch {
    return [];
  }
}

export function useRecords(app: string) {
  const [records, setRecords] = useState<FarmRecord[]>([]);
  useEffect(() => {
    const u = () => setRecords(read(app));
    u();
    window.addEventListener("farmerplus:change", u);
    return () => window.removeEventListener("farmerplus:change", u);
  }, [app]);
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
  let total = 0,
    pending = 0;
  for (const a of MINI_APPS) {
    const r = read(a.id);
    total += r.length;
    pending += r.filter((x) => x.sync !== "synced").length;
  }
  return { total, pending };
}

/** Every mini-app and AgriSphere tool syncs to the signed-in account. */
export async function syncAll() {
  const { syncAll: run } = await import("./animal-sync");
  return run();
}

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true),
      off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function useLastSynced() {
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  useEffect(() => {
    const u = () => setLastSynced(localStorage.getItem("farmerplus:lastSynced"));
    u();
    window.addEventListener("farmerplus:change", u);
    return () => window.removeEventListener("farmerplus:change", u);
  }, []);
  return lastSynced;
}

type FarmSettings = {
  farmName: string;
  owner: string;
  units: string;
  autoSync: boolean;
  lat: number;
  lon: number;
  placeName?: string;
  country?: string;
};
export function useSettings() {
  const [s, setS] = useState<FarmSettings>({
    farmName: "Green Acres",
    owner: "Farmer",
    units: "metric",
    autoSync: true,
    lat: 51.5,
    lon: -0.12,
  });
  useEffect(() => {
    const load = () => {
      try {
        const v = localStorage.getItem("farmerplus:settings");
        if (v) setS((p) => ({ ...p, ...JSON.parse(v) }));
      } catch {}
    };
    load();
    window.addEventListener("farmerplus:settings", load);
    return () => window.removeEventListener("farmerplus:settings", load);
  }, []);
  const update = (patch: Partial<FarmSettings>) => {
    let cur: FarmSettings = s;
    try {
      const v = localStorage.getItem("farmerplus:settings");
      if (v) cur = { ...s, ...JSON.parse(v) };
    } catch {}
    const next = { ...cur, ...patch };
    localStorage.setItem("farmerplus:settings", JSON.stringify(next));
    setS(next);
    window.dispatchEvent(new Event("farmerplus:settings"));
  };
  return [s, update] as const;
}
