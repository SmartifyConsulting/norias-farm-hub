import { createFileRoute, Link } from "@tanstack/react-router";
import { Screen } from "@/components/Dock";
import { MINI_APPS } from "@/lib/farm";

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
      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-3">
        {MINI_APPS.map((a) => (
          <Link key={a.id} to="/app/$appId" params={{ appId: a.id }} className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition hover:shadow-md">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary"><a.icon className="h-7 w-7" /></span>
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
