import { useEffect, useState } from "react";

/** Generic localStorage hook that also syncs across components via "farmerplus:change". */
export function useStore<T>(key: string, init: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(init);
  useEffect(() => {
    const load = () => { try { const raw = localStorage.getItem(key); setV(raw ? JSON.parse(raw) : init); } catch { /* ignore */ } };
    load();
    window.addEventListener("farmerplus:change", load);
    return () => window.removeEventListener("farmerplus:change", load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = (next: T) => { localStorage.setItem(key, JSON.stringify(next)); setV(next); window.dispatchEvent(new Event("farmerplus:change")); };
  return [v, set];
}
export function readStore<T>(key: string, init: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : init; } catch { return init; }
}
export const uid = () => Math.random().toString(36).slice(2, 10);
export const today = () => new Date().toISOString().slice(0, 10);

/* ---------- 6. Shared capacity ---------- */
export type CapacityKind = "Equipment" | "Transport" | "Storage" | "Cold storage" | "Packhouse" | "Labour" | "Processing";
export type CapacityListing = {
  id: string; mode: "offer" | "request"; kind: CapacityKind; title: string; location: string;
  from?: string; to?: string; rate?: string; quantity?: string; provider: string; own?: boolean; requests?: number;
};
export const SAMPLE_CAPACITY: CapacityListing[] = [
  { id: "c1", mode: "offer", kind: "Equipment", title: "Combine harvester (with operator)", location: "Free State", from: "2027-04-01", to: "2027-06-30", rate: "R4,500 / day", provider: "District Co-op" },
  { id: "c2", mode: "offer", kind: "Equipment", title: "6-row planter", location: "Free State", from: "2026-10-15", to: "2026-12-15", rate: "R1,800 / day", provider: "Mokoena Farms" },
  { id: "c3", mode: "offer", kind: "Transport", title: "34t tipper — backhaul to Gauteng", location: "Free State", rate: "R380 / t", quantity: "34 t / trip", provider: "Route Logistics" },
  { id: "c4", mode: "offer", kind: "Storage", title: "Grain silo space", location: "Free State", rate: "R95 / t / month", quantity: "3,000 t", provider: "GrainStore Silos" },
  { id: "c5", mode: "offer", kind: "Cold storage", title: "Cold room space (2–4 °C)", location: "Limpopo", rate: "R45 / pallet / day", quantity: "40 pallets", provider: "Tzaneen Cold Chain" },
  { id: "c6", mode: "offer", kind: "Packhouse", title: "Citrus packing line time", location: "Limpopo", rate: "R1.10 / kg", provider: "Letaba Packers" },
  { id: "c7", mode: "offer", kind: "Labour", title: "Seasonal harvest team (12 people)", location: "Mpumalanga", rate: "R350 / person / day", provider: "AgriCrew Services" },
  { id: "c8", mode: "request", kind: "Transport", title: "Need refrigerated truck to Durban", location: "Limpopo", from: "2026-11-01", provider: "Sample grower" },
];
export const useCapacity = () => useStore<CapacityListing[]>("farmerplus:capacity", []);

/* ---------- 7. Risk & response ---------- */
export type RiskStage = "detected" | "predicted" | "recommended" | "approved" | "completed" | "dismissed";
export type Risk = {
  id: string; kind: "Weather" | "Disease" | "Pest" | "Supply" | "Market"; title: string; detail: string;
  severity: "Low" | "Medium" | "High"; source: "detected" | "predicted"; affects: string; actions: string[];
  stage: RiskStage; capacityKind?: CapacityKind; createdAt: string; history: { stage: RiskStage; at: string }[];
};
export const useRisks = () => useStore<Risk[]>("farmerplus:risks", []);

type Daily = { time: string[]; temperature_2m_min: number[]; temperature_2m_max: number[]; precipitation_sum: number[]; wind_speed_10m_max: number[] };
/** Turn a 7-day forecast into risk signals. These are predictions, never facts. */
export function risksFromForecast(d: Daily): Omit<Risk, "id" | "stage" | "createdAt" | "history">[] {
  const out: Omit<Risk, "id" | "stage" | "createdAt" | "history">[] = [];
  const minT = Math.min(...d.temperature_2m_min), maxT = Math.max(...d.temperature_2m_max);
  const rain = d.precipitation_sum.reduce((a, b) => a + b, 0), wind = Math.max(...d.wind_speed_10m_max);
  const day = (arr: number[], v: number) => d.time[arr.indexOf(v)];
  if (minT <= 2) out.push({ kind: "Weather", title: `Frost risk (${minT.toFixed(0)} °C on ${day(d.temperature_2m_min, minT)})`, detail: "Forecast minimum near or below freezing.", severity: minT <= 0 ? "High" : "Medium", source: "predicted", affects: "Young crops, citrus, vegetables", actions: ["Delay planting or transplanting", "Prepare frost cover or irrigation", "Move vulnerable animals to shelter"] });
  if (maxT >= 35) out.push({ kind: "Weather", title: `Heat stress (${maxT.toFixed(0)} °C on ${day(d.temperature_2m_max, maxT)})`, detail: "Very high temperatures forecast.", severity: maxT >= 38 ? "High" : "Medium", source: "predicted", affects: "Animals, crops at flowering", actions: ["Increase water for animals", "Irrigate early morning", "Avoid spraying in midday heat"] });
  if (rain >= 60) out.push({ kind: "Weather", title: `Heavy rain (${rain.toFixed(0)} mm this week)`, detail: "High weekly rainfall may delay harvest and transport.", severity: rain >= 100 ? "High" : "Medium", source: "predicted", affects: "Harvest, field access, deliveries", actions: ["Bring harvest forward", "Check drainage", "Arrange covered storage"], capacityKind: "Storage" });
  if (rain < 2 && maxT >= 28) out.push({ kind: "Weather", title: "Dry, hot week", detail: `Only ${rain.toFixed(1)} mm rain forecast.`, severity: "Medium", source: "predicted", affects: "Rain-fed crops, grazing", actions: ["Plan irrigation", "Check water storage", "Review grazing rotation"] });
  if (wind >= 50) out.push({ kind: "Weather", title: `Strong wind (${wind.toFixed(0)} km/h)`, detail: "Damaging gusts forecast.", severity: "Medium", source: "predicted", affects: "Structures, spraying", actions: ["Postpone spraying", "Secure tunnels and sheds"] });
  return out;
}

/* ---------- 8 & 9. Opportunity → outcome pipeline ---------- */
export const STAGES = ["Opportunity", "Assessment", "Decision", "Commitment", "Action", "Outcome"] as const;
export type Stage = (typeof STAGES)[number];
export type PipelineItem = {
  id: string; title: string; oppId?: string; participant?: string; stage: Stage;
  decision?: "pursue" | "decline" | undefined; notes?: string | undefined; deadline?: string | undefined;
  expected?: { volume?: number | undefined; revenue?: number | undefined; date?: string | undefined } | undefined;
  actual?: { volume?: number | undefined; revenue?: number | undefined; date?: string | undefined; reasons?: string | undefined; evidence?: string | undefined } | undefined;
  history: { stage: Stage; at: string; note?: string | undefined }[];
};
export const usePipeline = () => useStore<PipelineItem[]>("farmerplus:pipeline", []);
export function addToPipeline(p: Omit<PipelineItem, "id" | "stage" | "history">) {
  const list = readStore<PipelineItem[]>("farmerplus:pipeline", []);
  if (p.oppId && list.some((i) => i.oppId === p.oppId)) return false;
  list.unshift({ ...p, id: uid(), stage: "Opportunity", history: [{ stage: "Opportunity", at: new Date().toISOString() }] });
  localStorage.setItem("farmerplus:pipeline", JSON.stringify(list));
  window.dispatchEvent(new Event("farmerplus:change"));
  return true;
}

/* ---------- 10. Collective buying / supply ---------- */
export type Pool = {
  id: string; mode: "buying" | "supply"; title: string; item: string; unit: string; target: number;
  location: string; closes: string; benefit: string; members: { name: string; qty: number }[]; mine?: number; confirmed?: boolean; own?: boolean;
};
export const SAMPLE_POOLS: Pool[] = [
  { id: "p1", mode: "buying", title: "Bulk LAN fertiliser order", item: "LAN 28%", unit: "t", target: 60, location: "Free State", closes: "2026-10-31", benefit: "~12% bulk discount + shared delivery", members: [{ name: "Farmer A", qty: 20 }, { name: "Farmer B", qty: 15 }] },
  { id: "p2", mode: "buying", title: "Hybrid maize seed", item: "Maize seed", unit: "bags", target: 400, location: "Free State", closes: "2026-10-20", benefit: "Volume price tier", members: [{ name: "Farmer C", qty: 120 }, { name: "Farmer D", qty: 90 }] },
  { id: "p3", mode: "supply", title: "Combined maize lot for Central Milling", item: "Yellow maize YM1", unit: "t", target: 2500, location: "Free State", closes: "2026-12-10", benefit: "Meets the mill's minimum lot; shared transport", members: [{ name: "Farmer A", qty: 600 }, { name: "Farmer E", qty: 450 }, { name: "Farmer F", qty: 300 }] },
];
export const usePools = () => useStore<Record<string, { mine: number; confirmed: boolean }>>("farmerplus:pools", {});
export const useOwnPools = () => useStore<Pool[]>("farmerplus:pools:own", []);

/* ---------- 11. Traceability ---------- */
export type TraceLevel = "recorded" | "self-declared" | "verified" | "certified";
export type TraceStep = { step: string; value: string; level: TraceLevel; at?: string };
export type Batch = { id: string; code: string; crop: string; createdAt: string; steps: TraceStep[] };
export const TRACE_STEPS = ["Farm", "Field", "Crop", "Production cycle", "Inputs / treatments", "Harvest", "Batch", "Storage", "Transport", "Buyer"];
export const useBatches = () => useStore<Batch[]>("farmerplus:batches", []);

/* ---------- 16 & 17. Notifications + role ---------- */
export type Role = "Farmer" | "Farm manager" | "Buyer" | "Agricultural supplier" | "Agronomist" | "Equipment owner" | "Logistics provider" | "Storage provider" | "Finance provider" | "Cooperative" | "Agricultural programme";
export const ROLES: Role[] = ["Farmer", "Farm manager", "Buyer", "Agricultural supplier", "Agronomist", "Equipment owner", "Logistics provider", "Storage provider", "Finance provider", "Cooperative", "Agricultural programme"];
export const useRole = () => useStore<Role>("farmerplus:role", "Farmer");
export const NOTIFY_TYPES = ["New matching opportunity", "Opportunity closing soon", "Missing requirement", "Risk detected", "Commitment approaching", "Outcome due for recording", "Verification expiring"] as const;
export type NotifyType = (typeof NOTIFY_TYPES)[number];
export const useNotifyPrefs = () => useStore<Record<string, boolean>>("farmerplus:notify", {});
export const useReadNotices = () => useStore<string[]>("farmerplus:notify:read", []);
