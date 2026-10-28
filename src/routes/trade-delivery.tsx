import { LogisticsPage } from "@/routes/logistics";
import { OutcomesPage } from "@/routes/outcomes";
import { OpportunitiesPage } from "@/routes/opportunities";
import { JourneyTabs } from "@/components/JourneyTabs";
import { createFileRoute } from "@tanstack/react-router";
import { Screen } from "@/components/Dock";
import { useTeam } from "@/lib/team";


export const Route = createFileRoute("/trade-delivery")({ component: TradeDelivery });
const sections = [
  { title: "Find buyers & opportunities", description: "Match your farm's products to buyer demand.", to: "/opportunities", component: OpportunitiesPage },
  { title: "Arrange transport & storage", description: "Plan collection, storage and delivery.", to: "/logistics", component: LogisticsPage },
  { title: "Track commitments", description: "Follow deliveries and outcomes through to completion.", to: "/outcomes", component: OutcomesPage },
] as const;
function TradeDelivery() {
  const { current } = useTeam();
  return <Screen title="Trade & Delivery">
    <p className="mb-5 text-sm text-muted-foreground">Manage buyers, transport, delivery and fulfilment. Sales and finance are under My Business. {current ? "Working farm: " + current.name : "Choose a farm in the farm selector to work with farm inventory."}</p>
    <JourneyTabs sections={sections.map(s => ({ label: s.title, description: s.description, to: s.to, component: "component" in s ? s.component : undefined }))} />
  </Screen>;
}
