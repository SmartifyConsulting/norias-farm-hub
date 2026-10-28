import { createFileRoute, Link } from "@tanstack/react-router";
import { Screen } from "@/components/Dock";
import { useTeam } from "@/lib/team";
import { ShoppingCart, Truck, PackageCheck, ClipboardList, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/trade-delivery")({ component: TradeDelivery });
const sections = [
  { title: "Sell farm products", description: "Choose stock, record a sale and reconcile income.", to: "/sales", icon: ShoppingCart },
  { title: "Find buyers & opportunities", description: "Match your farm's products to buyer demand.", to: "/opportunities", icon: ClipboardList },
  { title: "Arrange transport & storage", description: "Plan collection, storage and delivery.", to: "/app/logistics", icon: Truck },
  { title: "Track commitments", description: "Follow deliveries and outcomes through to completion.", to: "/app/outcomes", icon: PackageCheck },
] as const;
function TradeDelivery() {
  const { current } = useTeam();
  return <Screen title="Trade & Delivery">
    <p className="mb-5 text-sm text-muted-foreground">From available stock to buyers, sales, fulfilment and payment. {current ? "Working farm: " + current.name : "Choose a farm in the farm selector to work with farm inventory."}</p>
    <div className="grid gap-4 sm:grid-cols-2">{sections.map(s => <Link key={s.title} to={s.to} className="group rounded-2xl border bg-card p-5 hover:border-primary hover:shadow-sm">
      <s.icon className="mb-3 h-7 w-7 text-primary" /><h2 className="font-semibold">{s.title}</h2><p className="mt-1 text-sm text-muted-foreground">{s.description}</p><span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">Open <ArrowRight className="h-4 w-4" /></span>
    </Link>)}</div>
  </Screen>;
}
