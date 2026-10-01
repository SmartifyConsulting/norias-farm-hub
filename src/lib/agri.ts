import { useEffect, useState } from "react";

/** Provenance of a passport claim. Only "verified" may be shown as verified. */
export type Provenance = "user" | "verified" | "derived" | "expired";
export type Claim = { value: string; source: Provenance; evidence?: string; expires?: string };

export type PassportFieldDef = { key: string; label: string; group: "Farm" | "Commercial"; hint?: string };
export const PASSPORT_FIELDS: PassportFieldDef[] = [
  { key: "location", label: "Farm / location", group: "Farm", hint: "e.g. Bethlehem, Free State" },
  { key: "landAvailable", label: "Land available (ha)", group: "Farm" },
  { key: "landInProduction", label: "Land under production (ha)", group: "Farm" },
  { key: "crops", label: "Crops", group: "Farm", hint: "comma separated" },
  { key: "productionCapacity", label: "Production capacity (t / season)", group: "Farm" },
  { key: "expectedYield", label: "Expected yield (t/ha)", group: "Farm" },
  { key: "historicalYield", label: "Historical yield (t/ha)", group: "Farm" },
  { key: "water", label: "Water availability", group: "Farm" },
  { key: "irrigation", label: "Irrigation capability", group: "Farm", hint: "yes / no / type" },
  { key: "storage", label: "Storage capability (t)", group: "Farm" },
  { key: "coldStorage", label: "Cold storage", group: "Farm", hint: "yes / no" },
  { key: "packhouse", label: "Packhouse capability", group: "Farm", hint: "yes / no" },
  { key: "equipment", label: "Equipment", group: "Farm" },
  { key: "machinery", label: "Machinery", group: "Farm" },
  { key: "labour", label: "Labour capacity (people)", group: "Farm" },
  { key: "transport", label: "Transport capability", group: "Farm", hint: "yes / no / trucks" },
  { key: "certifications", label: "Certifications", group: "Farm", hint: "e.g. GlobalG.A.P., Organic" },
  { key: "training", label: "Training", group: "Farm" },
  { key: "compliance", label: "Compliance information", group: "Farm" },
  { key: "cropsSupplied", label: "Crops supplied", group: "Commercial" },
  { key: "historicalSupply", label: "Historical supply", group: "Commercial" },
  { key: "volumesSupplied", label: "Volumes supplied (t)", group: "Commercial" },
  { key: "grade", label: "Quality / grade", group: "Commercial" },
  { key: "deliveryHistory", label: "Delivery history", group: "Commercial" },
  { key: "buyers", label: "Buyer relationships", group: "Commercial" },
  { key: "availableCapacity", label: "Available production capacity (t)", group: "Commercial" },
  { key: "seasonCapacity", label: "Available capacity by season", group: "Commercial" },
  { key: "commitments", label: "Current commitments (t)", group: "Commercial" },
];

export type Passport = Record<string, Claim>;
const PKEY = "farmerplus:passport";

function useLocal<T>(key: string, init: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(init);
  useEffect(() => {
    try { const raw = localStorage.getItem(key); if (raw) setV(JSON.parse(raw)); } catch { /* ignore */ }
  }, [key]);
  const set = (next: T) => { localStorage.setItem(key, JSON.stringify(next)); setV(next); };
  return [v, set];
}

/** Claims past their expiry date are reported as expired, never as verified. */
export function effectiveSource(c?: Claim): Provenance | undefined {
  if (!c) return undefined;
  if (c.expires && new Date(c.expires) < new Date()) return "expired";
  return c.source;
}

export function usePassport() {
  return useLocal<Passport>(PKEY, {});
}
export function readPassport(): Passport {
  try { return JSON.parse(localStorage.getItem(PKEY) || "{}"); } catch { return {}; }
}

export type OppType = "Buyer demand" | "Contract farming" | "Funding" | "Finance" | "Equipment" | "Storage" | "Transport" | "Programme" | "Training" | "Inputs" | "Cooperative";
export type Opportunity = {
  id: string;
  type: OppType;
  title: string;
  description: string;
  crop?: string | undefined;
  location: string;
  requiredVolume?: number;
  quality?: string | undefined;
  deliveryPeriod?: string | undefined;
  frequency?: string | undefined;
  deadline?: string | undefined;
  value?: string | undefined;
  certifications?: string[] | undefined;
  infrastructure?: ("irrigation" | "storage" | "coldStorage" | "packhouse" | "transport")[] | undefined;
  participant: string;
  status: "Open" | "Closing soon" | "Closed";
  /** Volume already pledged by other producers (sample data for gap analysis). */
  matchedVolume?: number;
  own?: boolean;
};

export const SAMPLE_OPPORTUNITIES: Opportunity[] = [
  { id: "o1", type: "Buyer demand", title: "Yellow maize offtake", description: "Mill seeking grade YM1 yellow maize for the coming season.", crop: "maize", location: "Free State", requiredVolume: 10000, quality: "Grade YM1", deliveryPeriod: "May – Jul", frequency: "Monthly", deadline: "2026-12-15", value: "R3,900 / t indicative", infrastructure: ["storage"], participant: "Central Milling Co.", status: "Open", matchedVolume: 7500 },
  { id: "o2", type: "Contract farming", title: "Soybean contract growers", description: "Processor contracting irrigated soybean growers with input support.", crop: "soybeans", location: "Mpumalanga", requiredVolume: 4000, quality: "Non-GMO preferred", deliveryPeriod: "Apr – Jun", deadline: "2026-11-30", value: "R7,200 / t", certifications: ["GlobalG.A.P."], infrastructure: ["irrigation"], participant: "Highveld Oilseeds", status: "Open", matchedVolume: 1200 },
  { id: "o3", type: "Buyer demand", title: "Export citrus — packhouse-ready", description: "Exporter seeking packed soft citrus for EU markets.", crop: "citrus", location: "Limpopo", requiredVolume: 800, quality: "Class 1", deliveryPeriod: "Jun – Aug", deadline: "2026-10-20", certifications: ["GlobalG.A.P.", "SIZA"], infrastructure: ["packhouse", "coldStorage", "transport"], participant: "Sun Export Partners", status: "Closing soon", matchedVolume: 300 },
  { id: "o4", type: "Funding", title: "Emerging farmer production grant", description: "Blended grant for land preparation and inputs.", location: "National", deadline: "2027-01-31", value: "Up to R250,000", participant: "Agri Development Fund", status: "Open" },
  { id: "o5", type: "Equipment", title: "Combine harvester hire", description: "Shared harvester available by the day during harvest.", location: "Free State", value: "R4,500 / day", participant: "District Co-op", status: "Open" },
  { id: "o6", type: "Storage", title: "Silo space available", description: "Bulk grain silo space for the next 6 months.", crop: "maize", location: "Free State", requiredVolume: 3000, value: "R95 / t / month", participant: "GrainStore Silos", status: "Open" },
  { id: "o7", type: "Transport", title: "Backhaul trucking to Gauteng", description: "Flatbed and tipper capacity returning empty to Gauteng.", location: "Free State", value: "R380 / t", participant: "Route Logistics", status: "Open" },
  { id: "o8", type: "Training", title: "GlobalG.A.P. readiness course", description: "Three-day course preparing growers for certification audits.", location: "Online", deadline: "2026-11-10", participant: "Agri Skills Academy", status: "Open" },
];

const DKEY = "farmerplus:demand";
export function useDemand() {
  return useLocal<Opportunity[]>(DKEY, []);
}

const num = (s?: string) => { const n = parseFloat((s ?? "").replace(/[^\d.]/g, "")); return isNaN(n) ? 0 : n; };
const yes = (s?: string) => !!s && !/^(no|none|0|n\/a)$/i.test(s.trim());

export type MatchResult = { score: number; reasons: string[]; gaps: string[]; label: "Potential Match" | "Appears Suitable" | "Requirements Identified" | "Further Verification Required" };

/** Rule-based, explainable matching. Never a confirmed agreement. */
export function matchOpportunity(p: Passport, o: Opportunity): MatchResult {
  const reasons: string[] = [], gaps: string[] = [];
  let score = 0, checks = 0;
  const v = (k: string) => (effectiveSource(p[k]) === "expired" ? undefined : p[k]?.value);
  const crops = `${v("crops") ?? ""},${v("cropsSupplied") ?? ""}`.toLowerCase();
  if (o.crop) {
    checks++;
    if (crops.includes(o.crop.toLowerCase().replace(/s$/, ""))) { score++; reasons.push(`Crop matches (${o.crop})`); }
    else gaps.push(`${o.crop} is not listed in your crops`);
  }
  const loc = (v("location") ?? "").toLowerCase();
  if (o.location && !/national|online/i.test(o.location)) {
    checks++;
    if (loc && loc.includes(o.location.toLowerCase())) { score++; reasons.push("Location is suitable"); }
    else gaps.push(loc ? `Delivery to ${o.location} may need transport` : "Add your farm location");
  }
  if (o.requiredVolume && o.type !== "Storage") {
    checks++;
    const cap = num(v("availableCapacity")) || num(v("productionCapacity")) - num(v("commitments"));
    if (cap >= o.requiredVolume) { score++; reasons.push("Production capacity appears sufficient"); }
    else if (cap > 0) { score += 0.5; reasons.push(`You could supply about ${cap.toLocaleString()} t`); gaps.push(`Additional ${(o.requiredVolume - cap).toLocaleString()} t required (e.g. via a cooperative)`); }
    else gaps.push("Add your available production capacity");
  }
  const infraLabel: Record<string, string> = { irrigation: "Irrigation", storage: "Storage", coldStorage: "Cold storage", packhouse: "Packhouse", transport: "Transport" };
  for (const i of o.infrastructure ?? []) {
    checks++;
    if (yes(v(i))) { score++; reasons.push(`${infraLabel[i]} capability exists`); }
    else gaps.push(`${infraLabel[i]} required`);
  }
  for (const c of o.certifications ?? []) {
    checks++;
    if ((v("certifications") ?? "").toLowerCase().includes(c.toLowerCase())) { score++; reasons.push(`${c} certification listed`); }
    else gaps.push(`${c} certification missing`);
  }
  if (o.type === "Funding" || o.type === "Finance") reasons.push("Open to producers in your area");
  const pct = checks ? score / checks : 0.5;
  const unverified = Object.values(p).some((c) => c.source === "user");
  const label = pct >= 0.85 ? (unverified ? "Further Verification Required" : "Appears Suitable") : pct >= 0.5 ? "Potential Match" : "Requirements Identified";
  return { score: Math.round(pct * 100), reasons, gaps, label };
}

export type Scenario = {
  name: string; crop: string; hectares: number; yieldPerHa: number; pricePerT: number;
  inputCostPerHa: number; labourCost: number; equipment: "hire" | "buy" | "own"; equipmentCost: number;
  transportPerT: number; storagePerT: number; capital: number; yieldShock: number; priceShock: number; delayWeeks: number;
};

export const DEFAULT_SCENARIO: Scenario = {
  name: "Maize", crop: "maize", hectares: 50, yieldPerHa: 6, pricePerT: 3900, inputCostPerHa: 12000, labourCost: 120000,
  equipment: "hire", equipmentCost: 90000, transportPerT: 380, storagePerT: 95, capital: 500000, yieldShock: 0, priceShock: 0, delayWeeks: 0,
};

/** Delayed planting trims ~1.5% yield per week (indicative assumption). */
export function simulate(s: Scenario) {
  const yieldFactor = (1 + s.yieldShock / 100) * Math.max(0, 1 - 0.015 * s.delayWeeks);
  const tonnes = s.hectares * s.yieldPerHa * yieldFactor;
  const price = s.pricePerT * (1 + s.priceShock / 100);
  const revenue = tonnes * price;
  const equip = s.equipment === "own" ? 0 : s.equipmentCost;
  const variable = s.hectares * s.inputCostPerHa + tonnes * (s.transportPerT + s.storagePerT);
  const totalCost = variable + s.labourCost + equip;
  const capitalRequired = s.equipment === "buy" ? totalCost : totalCost * 0.7;
  const margin = revenue - totalCost;
  const breakEvenPrice = tonnes ? totalCost / tonnes : 0;
  const financing = Math.max(0, capitalRequired - s.capital);
  return { tonnes, revenue, totalCost, capitalRequired, margin, marginPct: revenue ? (margin / revenue) * 100 : 0, breakEvenPrice, financing };
}

export const rand = (n: number) => `R${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
