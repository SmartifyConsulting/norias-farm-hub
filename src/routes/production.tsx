import { createFileRoute, Link } from "@tanstack/react-router";
import { Screen } from "@/components/Dock";
import { useTeam } from "@/lib/team";
export const Route = createFileRoute("/production")({ component: Page });
const sections = [["Crop cycles","crops"],["Animals & livestock","animals"],["Farm activities","tasks"],["Inventory & stock","stock"]] as const;
function Page() {
  const { current } = useTeam();
  return <Screen title="Production">
    <p className="mb-5 text-sm text-muted-foreground">Manage farm production from planning to available inventory. {current ? "Farm: " + current.name : "Select your farm to see its records."}</p>
    <div className="grid gap-4 sm:grid-cols-2">{sections.map(([label,id]) => <Link key={id} to="/app/$appId" params={{ appId: id }} className="rounded-2xl border bg-card p-5 hover:border-primary"><h2 className="font-semibold">{label}</h2><span className="mt-2 inline-block text-sm text-primary">Open →</span></Link>)}</div>
  </Screen>;
}
