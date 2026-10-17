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
  BadgeCheck,
  Handshake,
  Calculator,
  Tractor,
  CloudLightning,
  ShoppingBasket,
  Bot,
  Route as RouteIcon,
  ScanLine,
  Landmark,
  Stethoscope,
  GraduationCap,
  Users,
  Users2,
  ClipboardCheck,
  BriefcaseBusiness,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { MINI_APPS } from "@/lib/farm";

export type CategoryId =
  | "my-farm"
  | "production"
  | "marketplace"
  | "cooperatives"
  | "finance"
  | "knowledge"
  | "government";

export const CATEGORIES: { id: CategoryId; name: string; blurb: string }[] = [
  { id: "my-farm", name: "My Farm", blurb: "Your farm's profile, land and day-to-day records" },
  {
    id: "production",
    name: "Production & Operations",
    blurb: "Day-to-day work: planting, stock, tasks, risk",
  },
  { id: "marketplace", name: "Marketplace & Trade", blurb: "Buying, selling and traceability" },
  {
    id: "cooperatives",
    name: "Co-operatives & Collaboration",
    blurb: "Shared capacity and collective work",
  },
  { id: "finance", name: "Finance & Funding", blurb: "Costs, sales, funding and planning" },
  { id: "knowledge", name: "Knowledge & Support", blurb: "Learning, advice and AI assistance" },
  {
    id: "government",
    name: "Government & Development",
    blurb: "Programmes, compliance and development support",
  },
];

/** A single entry in the unified app registry: every mini-app and AgriSphere tool, one place. */
export type RegistryApp = {
  id: string;
  name: string;
  icon: LucideIcon;
  blurb: string;
  /** Route to navigate to. Mini-apps resolve to /app/$appId at render time. */
  to: string;
  params?: { appId: string };
  category: CategoryId;
  /** Stable colour tone, independent of list position or folder membership. */
  tone: number;
};

const INTEL_DEFS: Omit<RegistryApp, "tone">[] = [
  {
    id: "passport",
    name: "Capability Passport",
    blurb: "Land, infrastructure, certifications & supply record",
    icon: BadgeCheck,
    to: "/passport",
    category: "my-farm",
  },
  {
    id: "opportunities",
    name: "Trades",
    blurb: "Buyer demand, contracts & services matched to you",
    icon: Handshake,
    to: "/opportunities",
    category: "marketplace",
  },
  {
    id: "simulator",
    name: "Decision Simulator",
    blurb: "Compare crops, costs and price or yield shocks",
    icon: Calculator,
    to: "/simulator",
    category: "finance",
  },
  {
    id: "capacity",
    name: "Shared Capacity",
    blurb: "Equipment, trucks, storage & labour near you",
    icon: Tractor,
    to: "/capacity",
    category: "cooperatives",
  },
  {
    id: "risks",
    name: "Risk & Response",
    blurb: "Forecast and field risks with responses you approve",
    icon: CloudLightning,
    to: "/risks",
    category: "production",
  },
  {
    id: "collective",
    name: "Collective",
    blurb: "Bulk buying and combined supply lots",
    icon: ShoppingBasket,
    to: "/collective",
    category: "marketplace",
  },
  {
    id: "outcomes",
    name: "Opportunity → Outcome",
    blurb: "Decide, commit, act and record what happened",
    icon: RouteIcon,
    to: "/outcomes",
    category: "marketplace",
  },
  {
    id: "traceability",
    name: "Traceability",
    blurb: "Batch records from field to buyer",
    icon: ScanLine,
    to: "/traceability",
    category: "marketplace",
  },
  {
    id: "funding",
    name: "Funding Readiness",
    blurb: "What a lender or funder may ask for",
    icon: Landmark,
    to: "/funding",
    category: "finance",
  },
  {
    id: "vet-check",
    name: "Animal Symptom Check",
    blurb: "Describe symptoms, add a photo, get care guidance",
    icon: Stethoscope,
    to: "/vet-check",
    category: "knowledge",
  },
  {
    id: "copilot",
    name: "Farm Copilot",
    blurb: "Ask questions about your farm data",
    icon: Bot,
    to: "/copilot",
    category: "knowledge",
  },
];

const MINI_APP_CATEGORY: Record<string, CategoryId> = {
  farm: "my-farm",
  animals: "my-farm",
  diary: "my-farm",
  fields: "my-farm",
  crops: "my-farm",
  harvest: "production",
  stock: "production",
  tasks: "production",
  treatments: "production",
  maintenance: "production",
  health: "production",
  finance: "finance",
  compliance: "government",
  grants: "government",
  "land-applications": "government",
  extension: "government",
  returns: "government",
};

const EXTRA_DEFS: Omit<RegistryApp, "tone">[] = [
  {
    id: "cooperative",
    name: "Co-operatives",
    blurb: "Register or join a co-operative and manage its members and governance",
    icon: Users2,
    to: "/coop",
    category: "cooperatives",
  },
  {
    id: "team",
    name: "Farm Team",
    blurb: "Share your farm and give each person owner, manager, worker or viewer access",
    icon: Users,
    to: "/team",
    category: "cooperatives",
  },
  {
    id: "farmschool",
    name: "FarmSchool",
    blurb: "Farming courses and your learning progress",
    icon: GraduationCap,
    to: "/farmschool",
    category: "knowledge",
  },
  {
    id: "gov-programmes",
    name: "Government Programmes",
    blurb: "Funding, support and compliance programmes for your country",
    icon: Landmark,
    to: "/gov-programmes",
    category: "government",
  },
  {
    id: "field-ops",
    name: "Field Operations",
    blurb: "Register farmers, schedule visits and record inspections",
    icon: ClipboardCheck,
    to: "/field-ops",
    category: "government",
  },
  {
    id: "jobs",
    name: "Agri Jobs",
    blurb: "Find farm work or post jobs and review applicants",
    icon: BriefcaseBusiness,
    to: "/jobs",
    category: "marketplace",
  },
  {
    id: "insurance",
    name: "Farm Insurance",
    blurb: "Risk-based quotes, policies and claims",
    icon: ShieldCheck,
    to: "/insurance",
    category: "finance",
  },
  {
    id: "logistics",
    name: "Logistics & Storage",
    blurb: "Book trucks and storage, or list your fleet",
    icon: Truck,
    to: "/logistics",
    category: "cooperatives",
  },
];

/** Every app the App Store shows, in one place, each with a stable tone so colours never shift when reordered or re-foldered. */
export const APP_REGISTRY: RegistryApp[] = (() => {
  // "fields" is merged into My Farm's map (drawing + record pins) rather than shown as its own
  // App Store tile — its data and app.$appId route stay intact so existing field links still work.
  const mini: Omit<RegistryApp, "tone">[] = MINI_APPS.filter((a) => a.id !== "fields").map((a) => ({
    id: a.id,
    name: a.name,
    icon: a.icon,
    blurb: a.blurb,
    to: "/app/$appId",
    params: { appId: a.id },
    category: MINI_APP_CATEGORY[a.id] ?? "my-farm",
  }));
  const all = [...mini, ...INTEL_DEFS, ...EXTRA_DEFS];
  return all.map((a, i) => ({ ...a, tone: i }));
})();

export function appById(id: string): RegistryApp | undefined {
  return APP_REGISTRY.find((a) => a.id === id);
}

export function searchApps(query: string): RegistryApp[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return APP_REGISTRY.filter(
    (a) => a.name.toLowerCase().includes(q) || a.blurb.toLowerCase().includes(q),
  );
}
