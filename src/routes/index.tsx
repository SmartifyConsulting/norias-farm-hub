import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import bg from "@/assets/countryside.jpg";
import { Weather } from "@/components/Weather";
import { toast } from "sonner";
import { MINI_APPS, allRecordCounts, syncAll, useOnline, useSettings } from "@/lib/farm";
import { useGuest, useUser } from "@/lib/auth";
import { AuthLanding } from "@/components/AuthLanding";
import { ActionDashboard } from "@/components/ActionDashboard";
import { NotificationBell } from "@/components/NotificationBell";

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
  const { user, loading } = useUser();
  const [guest] = useGuest();
  const [syncing, setSyncing] = useState(false);
  const doSync = async () => {
    setSyncing(true);
    const r = await syncAll();
    setSyncing(false);
    if (r.ok) toast.success("Records synced");
    else if (!user) toast("Animal records need an account to sync to the cloud", { action: { label: "Sign in", onClick: () => (window.location.href = "/auth") } });
    else toast.error(r.error ?? "Sync failed");
  };
  const [counts, setCounts] = useState({ total: 0, pending: 0 });
  useEffect(() => {
    const u = () => setCounts(allRecordCounts());
    u();
    window.addEventListener("farmerplus:change", u);
    return () => window.removeEventListener("farmerplus:change", u);
  }, []);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (!loading && !user && !guest) return <AuthLanding initial="signup" />;

  return (
    <div className="relative min-h-screen">
      <img src={bg} alt="" width={1024} height={1792} className="fixed inset-0 -z-10 h-full w-full object-cover" />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background/10 via-transparent to-background/60" />
      <main className="mx-auto max-w-md space-y-4 px-4 pb-32 pt-10 md:grid md:max-w-5xl md:grid-cols-2 md:gap-6 md:space-y-0 md:px-6 md:pb-12 md:pt-24 lg:max-w-7xl lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
        <div className="glass rounded-3xl px-5 py-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-foreground/80">{greet}, {s.owner}</p>
              <h1 className="font-display text-3xl text-foreground">{s.farmName}</h1>
            </div>
            <NotificationBell className="bg-card/60 text-foreground md:hidden" />
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className={`h-2 w-2 rounded-full ${online ? "bg-primary" : "bg-destructive"}`} />
            <span className="text-foreground/80">{online ? "Online" : "Offline — saving locally"}</span>
            <span className="ml-auto text-foreground/80">{counts.total} records · {counts.pending} unsynced</span>
          </div>
          {!user && (
            <Link to="/auth" className="mt-2 block text-center text-xs font-semibold text-foreground underline">Sign in to back up your records</Link>
          )}
          {counts.pending > 0 && online && (
            <button onClick={doSync} disabled={syncing} className="mt-3 w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {syncing ? "Syncing…" : `Sync ${counts.pending} records`}
            </button>
          )}
        </div>
        <Weather lat={s.lat} lon={s.lon} />
        </div>
        <div className="space-y-4 md:col-span-2 lg:col-span-8 md:space-y-6">
        <div className="grid grid-cols-3 gap-4 pt-2 md:content-start md:grid-cols-3 md:pt-0 lg:grid-cols-6">
          {MINI_APPS.map((a) => (
            <Link key={a.id} to="/app/$appId" params={{ appId: a.id }} className="flex flex-col items-center gap-1.5 md:glass md:rounded-3xl md:p-4">
              <span className="glass flex h-16 w-16 items-center justify-center rounded-2xl text-foreground"><a.icon className="h-8 w-8" /></span>
              <span className="text-center text-xs font-semibold text-foreground drop-shadow">{a.name}</span>
            </Link>
          ))}
        </div>
        <ActionDashboard />
        </div>
      </main>
    </div>
  );
}
