import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import bg from "@/assets/countryside.jpg";
import { Weather } from "@/components/Weather";
import { MINI_APPS, allRecordCounts, syncAll, useOnline, useSettings } from "@/lib/farm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FarmerPlus — Your farm in your pocket" },
      { name: "description", content: "Farm management app with weather, animals, harvest, fields and stock records that work offline." },
      { property: "og:title", content: "FarmerPlus — Your farm in your pocket" },
      { property: "og:description", content: "Weather, animals, harvest, fields and stock records — offline ready." },
    ],
  }),
  component: Home,
});

function Home() {
  const [s] = useSettings();
  const online = useOnline();
  const [counts, setCounts] = useState({ total: 0, pending: 0 });
  useEffect(() => {
    const u = () => setCounts(allRecordCounts());
    u();
    window.addEventListener("farmerplus:change", u);
    return () => window.removeEventListener("farmerplus:change", u);
  }, []);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="relative min-h-screen">
      <img src={bg} alt="" width={1024} height={1792} className="fixed inset-0 -z-10 h-full w-full object-cover" />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background/10 via-transparent to-background/60" />
      <main className="mx-auto max-w-md space-y-4 px-4 pb-32 pt-10">
        <div className="glass rounded-3xl px-5 py-4">
          <p className="text-sm text-foreground/80">{greet}, {s.owner}</p>
          <h1 className="font-display text-3xl text-foreground">{s.farmName}</h1>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className={`h-2 w-2 rounded-full ${online ? "bg-primary" : "bg-destructive"}`} />
            <span className="text-foreground/80">{online ? "Online" : "Offline — saving locally"}</span>
            <span className="ml-auto text-foreground/80">{counts.total} records · {counts.pending} unsynced</span>
          </div>
          {counts.pending > 0 && online && (
            <button onClick={syncAll} className="mt-3 w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">
              Sync {counts.pending} records
            </button>
          )}
        </div>
        <Weather lat={s.lat} lon={s.lon} />
        <div className="grid grid-cols-3 gap-4 pt-2">
          {MINI_APPS.map((a) => (
            <Link key={a.id} to="/app/$appId" params={{ appId: a.id }} className="flex flex-col items-center gap-1.5">
              <span className="glass flex h-16 w-16 items-center justify-center rounded-2xl text-foreground"><a.icon className="h-8 w-8" /></span>
              <span className="text-center text-xs font-semibold text-foreground drop-shadow">{a.name}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
