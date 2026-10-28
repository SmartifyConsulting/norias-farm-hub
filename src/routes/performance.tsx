import { JourneyTabs } from "@/components/JourneyTabs";
import { createFileRoute } from "@tanstack/react-router";
import { Screen } from "@/components/Dock";
import { useTeam } from "@/lib/team";
export const Route = createFileRoute("/performance")({ component: Page });
const sections = [["Finance & profitability","finance"],["Outcomes & results","outcomes"],["Risk monitoring","risks"],["Planning scenarios","simulator"]] as const;
function Page() {
  const { current } = useTeam();
  return <Screen title="Performance">
    <p className="mb-5 text-sm text-muted-foreground">Understand farm finances, outcomes, risks and the next production cycle. {current ? "Farm: " + current.name : "Select your farm to see its records."}</p>
    <JourneyTabs sections={sections.map(([label, id]) => ({ label, description: "Manage " + label.toLowerCase() + " for your selected farm.", to: "/app/" + id }))} />
  </Screen>;
}
