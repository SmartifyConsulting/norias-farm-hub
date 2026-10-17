import { useStore, uid, today } from "@/lib/network";

/** Consolidated value-chain roles (replaces Agri-Noria's 40 separate accounts). One person may hold several. */
export const ROLES = [
  { id: "farmer", name: "Farmer" },
  { id: "field-officer", name: "Field officer" },
  { id: "coop-lead", name: "Co-op lead" },
  { id: "programme-manager", name: "Programme manager" },
  { id: "service-provider", name: "Service & logistics provider" },
  { id: "financial-partner", name: "Insurer / financier" },
  { id: "buyer", name: "Buyer" },
] as const;
export type RoleId = (typeof ROLES)[number]["id"];
export const useActiveRole = () => useStore<RoleId>("farmerplus:activeRole", "farmer");

export const PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "North West", "Northern Cape", "Western Cape",
];
export const rand = (n: number) => `R ${n.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;

/* ---------- Field operations ---------- */
export type RegFarmer = {
  id: string; ain: string; first: string; last: string; idNumber: string; phone: string;
  province: string; commodity: string; hectares: number; createdAt: string;
};
export type Visit = { id: string; farmerId: string; date: string; type: string; officer: string; done?: boolean };
export type Inspection = {
  id: string; farmerId: string; date: string; result: "Pass" | "Conditional" | "Fail";
  notes: string; gps: string; officer: string;
};
export const useRegFarmers = () => useStore<RegFarmer[]>("farmerplus:vc:farmers", []);
export const useVisits = () => useStore<Visit[]>("farmerplus:vc:visits", []);
export const useInspections = () => useStore<Inspection[]>("farmerplus:vc:inspections", []);

/** SA ID: 13 digits with valid Luhn check digit. */
export function validSaId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let d = Number(id[12 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}
/** Verified = valid ID + boundary/hectares + at least one passing inspection. Criteria are explicit. */
export function verificationOf(f: RegFarmer, insp: Inspection[]) {
  const checks = [
    { label: "Valid ID number", ok: validSaId(f.idNumber) },
    { label: "Farm size recorded", ok: f.hectares > 0 },
    { label: "Passed field inspection", ok: insp.some((i) => i.farmerId === f.id && i.result === "Pass") },
  ];
  return { checks, verified: checks.every((c) => c.ok) };
}
export const newAin = () => `AIN-${Math.floor(100000 + Math.random() * 900000)}`;

/* ---------- Jobs ---------- */
export type Job = {
  id: string; title: string; category: string; type: string; province: string; town: string;
  openings: number; minPay: number; maxPay: number; period: string; deadline: string;
  description: string; requirements: string; postedAt: string; applicants: Applicant[]; status: "Active" | "Closed";
};
export type Applicant = { id: string; name: string; phone: string; note: string; at: string };
export const JOB_CATEGORIES = ["Farm management", "Livestock", "Crops & agronomy", "Machinery operator", "Packhouse", "Logistics & driving", "General farm work"];
export const JOB_TYPES = ["Full time", "Part time", "Seasonal", "Contract", "Internship"];
export const useJobs = () => useStore<Job[]>("farmerplus:vc:jobs", []);

/* ---------- Insurance ---------- */
export type CoverRequest = {
  id: string; crop: string; value: number; province: string; peril: string;
  status: "Needs quote" | "Quoted" | "Active" | "Declined"; premium?: number; deductible?: number; terms?: string;
  startsOn?: string; endsOn?: string; createdAt: string; claims: Claim[];
};
export type Claim = { id: string; date: string; amount: number; reason: string; status: "Submitted" | "Approved" | "Rejected" | "Paid" };
export const PERILS = ["Drought", "Hail", "Flood", "Fire", "Pest & disease", "Multi-peril", "Livestock mortality", "Theft"];
/** Risk loading per peril, multiplied onto the insurer's base rate. */
export const PERIL_RISK: Record<string, number> = {
  Drought: 1.4, Hail: 1.2, Flood: 1.3, Fire: 1.0, "Pest & disease": 1.1, "Multi-peril": 1.6, "Livestock mortality": 1.25, Theft: 0.9,
};
export const useCover = () => useStore<CoverRequest[]>("farmerplus:vc:cover", []);
export const useBaseRate = () => useStore<number>("farmerplus:vc:baseRate", 3.5);
export const suggestedPremium = (value: number, baseRatePct: number, peril: string) =>
  Math.round(value * (baseRatePct / 100) * (PERIL_RISK[peril] ?? 1));

/* ---------- Logistics & storage ---------- */
export type Vehicle = { id: string; name: string; plate: string; body: string; tonnes: number; base: string; ratePerKm: number };
export type Facility = { id: string; name: string; kind: string; province: string; capacity: number; booked: number; ratePerTMonth: number };
export type Booking = {
  id: string; kind: "Transport" | "Storage"; resourceId: string; qty: number; from: string; to?: string;
  date: string; status: "Requested" | "Accepted" | "In transit" | "Delivered" | "Stored" | "Declined";
};
export const BODY_TYPES = ["Flatbed", "Refrigerated", "Grain tipper", "Livestock trailer", "Panel van"];
export const FACILITY_KINDS = ["Grain silo", "Cold room", "Dry warehouse", "Packhouse store"];
export const useVehicles = () => useStore<Vehicle[]>("farmerplus:vc:vehicles", []);
export const useFacilities = () => useStore<Facility[]>("farmerplus:vc:facilities", []);
export const useBookings = () => useStore<Booking[]>("farmerplus:vc:bookings", []);

export { uid, today };
