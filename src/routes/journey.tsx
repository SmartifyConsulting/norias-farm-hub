import { createFileRoute, Link } from "@tanstack/react-router";
import { Screen } from "@/components/Dock";
import { useState } from "react";
import { useStore } from "@/lib/network";
import { AppLink } from "@/components/AppLink";
import { appById } from "@/lib/app-registry";
import { useSettings } from "@/lib/farm";
import { useTeam } from "@/lib/team";
import { useFarmDetails } from "@/lib/farmdetails";
import { Building2, Sprout, Truck, Users, ChartNoAxesCombined, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/journey")({
  head: () => ({ meta: [{ title: "My Farming Journey — FarmerPlus" }] }),
  component: FarmingJourney,
});

/** Existing routes only: this page introduces no new storage, permissions or business logic. */
const stages = [
  {
    title: "1. My Business",
    subtitle: "Start with the farm, its land, animals, people and equipment.",
    icon: Building2,
    steps: [
      { id: "farm", why: "Set up your farm and assets" },
      { id: "team", why: "Choose who works on the farm" },
      { id: "passport", why: "Describe what your farm can supply" },
    ],
  },
  {
    title: "2. Production",
    subtitle: "Follow the production activities relevant to your farm.",
    icon: Sprout,
    steps: [
      { id: "tasks", why: "Schedule and complete farm activities" },
      { id: "treatments", why: "Record inputs and treatments" },
      { id: "stock", why: "Track stock and supplies" },
    ],
  },
  {
    title: "3. Trade & Delivery",
    subtitle: "Find buyers, combine supply, arrange transport and track transactions.",
    icon: Truck,
    steps: [
      { id: "opportunities", why: "Find a buyer or trading opportunity" },
      { id: "collective", why: "Combine supply with other farmers" },
      { id: "traceability", why: "Record the product's origin and journey" },
      { id: "logistics", why: "Book transport or storage" },
      { id: "outcomes", why: "Track the commitment through to its outcome" },
    ],
  },
  {
    title: "4. Networks & Programmes",
    subtitle: "Join cooperatives and discover development or funding support.",
    icon: Users,
    steps: [
      { id: "cooperative", why: "Manage cooperative membership and trade" },
      { id: "gov-programmes", why: "Discover government support programmes" },
      { id: "grants", why: "Track your grant applications" },
      { id: "capacity", why: "Find shared equipment and facilities" },
    ],
  },
  {
    title: "5. Performance",
    subtitle: "Review your costs, risks and results, then plan the next cycle.",
    icon: ChartNoAxesCombined,
    steps: [
      { id: "finance", why: "Review costs and sales" },
      { id: "simulator", why: "Compare production scenarios" },
      { id: "risks", why: "Monitor risks and responses" },
      { id: "outcomes", why: "Review what actually happened" },
    ],
  },
] as const;

function FarmingJourney() {
  const [settings] = useSettings();
  const { active, current } = useTeam();
  const details = useFarmDetails(active);
  const [types, setTypes] = useStore<string[]>("farmerplus:journey:types:" + (active ?? "personal"), []);
  const category = details.mainProduction;
  const suggested = category === "Livestock" || category === "Poultry" ? ["livestock"]
    : ["Field crops", "Horticulture", "Industrial and plantation crops", "Pasture and fodder"].includes(category) ? ["crops"]
    : category === "Other" && details.subCategory === "Mixed farming" ? ["crops", "livestock"]
    : ["Aquaculture", "Beekeeping", "Forestry and nurseries"].includes(category) ? ["other"] : [];
  const effectiveTypes = types.length ? types : suggested;
  const [all, setAll] = useState(false);
  const toggle = (type: string) => setTypes(effectiveTypes.includes(type) ? effectiveTypes.filter(t => t !== type) : [...effectiveTypes, type]);
  return (
    <Screen title="My Farming Journey">
      <p className="mb-3 text-sm text-muted-foreground">
        Follow your work from setting up the farm through production, selling and results.
        Choose any step to open the existing tool; you can return here at any time.
      </p>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Working context</p>
          <p className="font-semibold">{current?.name || settings.farmName || "My Farm"}</p>
          <p className="text-xs text-muted-foreground">{active ? "Active farm selected" : "Choose or create a farm to link your work"}</p>
        </div>
        <Link to="/team" className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-muted">
          Manage farm & team
        </Link>
      </div>
      <section className="mb-6 rounded-2xl border bg-card p-4">
        <h2 className="font-display text-xl font-semibold">What do you produce?</h2>
        <p className="mb-3 text-sm text-muted-foreground">Choose one or more for this farm. This changes your journey view, not farm records.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {[{id:"crops",label:"Crops"},{id:"livestock",label:"Livestock"},{id:"other",label:"Other (bees, fish, nursery...)"}].map(option => (
            <button key={option.id} type="button" aria-pressed={effectiveTypes.includes(option.id)}
              onClick={() => toggle(option.id)}
              className={effectiveTypes.includes(option.id) ? "rounded-xl border-2 border-primary bg-primary/5 p-3 text-left text-sm font-semibold" : "rounded-xl border p-3 text-left text-sm font-semibold hover:bg-muted"}>
              {effectiveTypes.includes(option.id) ? "✓ " : ""}{option.label}
            </button>
          ))}
        </div>
        {suggested.length > 0 && types.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Suggested from this farm’s main production: {category}. Adjust if needed.</p>}
        {effectiveTypes.includes("other") && <p className="mt-2 text-xs text-muted-foreground">Specialist production workflows are not yet built; shared tasks, stock and trade remain available.</p>}
        <button type="button" className="mt-3 text-sm font-semibold text-primary underline" onClick={() => setAll(!all)}>
          {all ? "Show my activities" : "Show all activities"}
        </button>
      </section>
      <div className="space-y-5">
        {stages.map((stage) => {
          const Icon = stage.icon;
          return (
            <section key={stage.title} className="rounded-2xl border bg-card p-4 md:p-5">
              <div className="mb-4 flex items-start gap-3">
                <span className="rounded-xl bg-secondary p-2.5 text-secondary-foreground"><Icon className="h-5 w-5" /></span>
                <div>
                  <h2 className="font-display text-xl font-semibold">{stage.title}</h2>
                  <p className="text-sm text-muted-foreground">{stage.subtitle}</p>
                </div>
              </div>
              <ol className="grid gap-2 md:grid-cols-2">
                {(stage.title.startsWith("2.") ? [
                  ...(effectiveTypes.includes("crops") || all ? [{id:"crops",why:"Plan planting and crop cycles"}] : []),
                  ...stage.steps,
                  ...(effectiveTypes.includes("crops") || all ? [{id:"harvest",why:"Record crop harvests"}] : []),
                  ...(effectiveTypes.includes("livestock") || all ? [{id:"animals",why:"Manage animals and herds"},{id:"health",why:"Manage animal health"}] : []),
                ] : stage.steps).map((step, index) => {
                  const app = appById(step.id);
                  if (!app) return null;
                  return (
                    <li key={step.id}>
                      <AppLink app={app} className="flex h-full items-center gap-3 rounded-xl border p-3 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">{index + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{app.name}</span>
                          <span className="block text-xs text-muted-foreground">{step.why}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </AppLink>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
      <div className="mt-6 rounded-2xl border bg-muted/50 p-4 text-sm">
        <p className="font-semibold">Need a different tool?</p>
        <p className="mt-1 text-muted-foreground">All existing apps, custom folders and favourites remain available.</p>
        <Link to="/apps" search={{ folder: undefined }} className="mt-2 inline-flex items-center gap-1 font-semibold text-primary underline">
          Open all apps <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Screen>
  );
}
