import { createFileRoute, Link } from "@tanstack/react-router";
import { Screen } from "@/components/Dock";
import { MINI_APPS } from "@/lib/farm";
import { APP_PHOTOS } from "@/lib/app-photos";
import { BadgeCheck, Handshake, Calculator, Tractor, CloudLightning, Users, Route as RouteIcon, ScanLine, Landmark, Wheat, Stethoscope } from "lucide-react";

const INTEL = [
  { to: "/passport", name: "Capability Passport", blurb: "Land, infrastructure, certifications & supply record", icon: BadgeCheck },
  { to: "/opportunities", name: "Opportunities", blurb: "Buyer demand, contracts & services matched to you", icon: Handshake },
  { to: "/simulator", name: "Decision Simulator", blurb: "Compare crops, costs and price or yield shocks", icon: Calculator },
  { to: "/capacity", name: "Shared Capacity", blurb: "Equipment, trucks, storage & labour near you", icon: Tractor },
  { to: "/risks", name: "Risk & Response", blurb: "Forecast and field risks with responses you approve", icon: CloudLightning },
  { to: "/collective", name: "Collective", blurb: "Bulk buying and combined supply lots", icon: Users },
  { to: "/outcomes", name: "Opportunity → Outcome", blurb: "Decide, commit, act and record what happened", icon: RouteIcon },
  { to: "/traceability", name: "Traceability", blurb: "Batch records from field to buyer", icon: ScanLine },
  { to: "/funding", name: "Funding Readiness", blurb: "What a lender or funder may ask for", icon: Landmark },
  { to: "/vet-check", name: "Animal Symptom Check", blurb: "Describe symptoms, add a photo, get care guidance", icon: Stethoscope },
  { to: "/copilot", name: "Farm Copilot", blurb: "Ask questions about your farm data", icon: Wheat },
] as const;

export const Route = createFileRoute("/apps")({
  head: () => ({
    meta: [
      { title: "App Store — FarmerPlus" },
      { name: "description", content: "Browse FarmerPlus mini-apps: My Farm, My Animals, Farm Diary, Harvest, Field Mapping and Stock." },
      { property: "og:title", content: "App Store — FarmerPlus" },
      { property: "og:description", content: "All the mini-apps you need to run your farm." },
    ],
  }),
  component: Apps,
});

function Apps() {
  return (
    <Screen title="App Store">
      <Link to="/team" className="mb-4 flex items-center gap-4 rounded-2xl border bg-card p-4 transition hover:shadow-md">
        <img src={APP_PHOTOS.team} alt="" loading="lazy" width={56} height={56} className="h-14 w-14 shrink-0 rounded-full object-cover" />
        <div className="flex-1">
          <p className="font-semibold text-card-foreground">Farm Team</p>
          <p className="text-sm text-muted-foreground">Share your farm and give each person owner, manager, worker or viewer access</p>
        </div>
      </Link>
      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-3">
        {MINI_APPS.map((a) => (
          <Link key={a.id} to="/app/$appId" params={{ appId: a.id }} className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition hover:shadow-md">
            <img src={APP_PHOTOS[a.id]} alt="" loading="lazy" width={56} height={56} className="h-14 w-14 shrink-0 rounded-full object-cover" />
            <div className="flex-1">
              <p className="font-semibold text-card-foreground">{a.name}</p>
              <p className="text-sm text-muted-foreground">{a.blurb}</p>
            </div>
            <span className="rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">OPEN</span>
          </Link>
        ))}
      </div>
      <h2 className="mb-3 mt-8 font-display text-lg font-semibold">Farm intelligence</h2>
      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-3">
        {INTEL.map((a) => (
          <Link key={a.to} to={a.to} className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition hover:shadow-md">
            <img src={APP_PHOTOS[a.to]} alt="" loading="lazy" width={56} height={56} className="h-14 w-14 shrink-0 rounded-full object-cover" />
            <div className="flex-1">
              <p className="font-semibold text-card-foreground">{a.name}</p>
              <p className="text-sm text-muted-foreground">{a.blurb}</p>
            </div>
            <span className="rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">OPEN</span>
          </Link>
        ))}
      </div>
    </Screen>
  );
}
