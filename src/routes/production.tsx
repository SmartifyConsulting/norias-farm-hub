import { EmbeddedMiniApp } from "@/routes/app.$appId";
import { JourneyTabs } from "@/components/JourneyTabs";
import { createFileRoute } from "@tanstack/react-router";
import { Screen } from "@/components/Dock";
import { useTeam } from "@/lib/team";
export const Route = createFileRoute("/production")({ component: Page });
const sections = [["Crop cycles","crops"],["Animals & livestock","animals"],["Farm activities","tasks"],["Inventory & stock","stock"]] as const;
function Page() {
  const { current } = useTeam();
  return <Screen title="Production">
    <p className="mb-5 text-sm text-muted-foreground">Manage farm production from planning to available inventory. {current ? "Farm: " + current.name : "Select your farm to see its records."}</p>
    <JourneyTabs sections={sections.map(([label, id]) => ({ label, description: "Manage " + label.toLowerCase() + " for your selected farm.", to: "/app/" + id, component: () => <EmbeddedMiniApp appId={id} /> }))} />
  </Screen>;
}
