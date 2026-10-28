import { createFileRoute, Link } from "@tanstack/react-router";
import { Screen } from "@/components/Dock";
import { useTeam } from "@/lib/team";
export const Route = createFileRoute("/performance")({ component: Page });
const sections = [["Finance & profitability","finance"],["Outcomes & results","outcomes"],["Risk monitoring","risks"],["Planning scenarios","simulator"]] as const;
function Page() {
  const { current } = useTeam();
  return <Screen title="Performance">
    <p className="mb-5 text-sm text-muted-foreground">Understand farm finances, outcomes, risks and the next production cycle. {current ? "Farm: " + current.name : "Select your farm to see its records."}</p>
    <div className="grid gap-4 sm:grid-cols-2">{sections.map(([label,id]) => <Link key={id} to="/app/$appId" params={{ appId: id }} className="rounded-2xl border bg-card p-5 hover:border-primary"><h2 className="font-semibold">{label}</h2><span className="mt-2 inline-block text-sm text-primary">Open →</span></Link>)}</div>
  </Screen>;
}
