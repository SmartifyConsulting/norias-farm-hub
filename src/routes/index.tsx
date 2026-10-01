import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Weather } from "@/components/Weather";
import { toast } from "sonner";
import { CloudUpload, Database, ListTodo, TriangleAlert, ChevronRight } from "lucide-react";
import { MINI_APPS, allRecordCounts, syncAll, useOnline, useSettings } from "@/lib/farm";
import { useGuest, useUser } from "@/lib/auth";
import { AuthLanding } from "@/components/AuthLanding";
import { ActionDashboard } from "@/components/ActionDashboard";
import { NotificationBell } from "@/components/NotificationBell";
import { useNotices } from "@/lib/notices";
import { useRisks } from "@/lib/network";
import { appTone } from "@/lib/app-colors";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FarmerPlus — Your farm in your pocket" },
      { name: "description", content: "Farm management app with weather, animals, harvest, fields and stock records that work offline." },
      { property: "og:title", content: "FarmerPlus — Your farm in your pocket" },
      { property: "og:description", content: "Weather, animals, harvest, fields and stock records — offline ready." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const [s] = useSettings();
  const online = useOnline();
  const { user, loading } = useUser();
  const [guest] = useGuest();
  const { notices } = useNotices();
  const [risks] = useRisks();
  const [syncing, setSyncing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const doSync = async () => {
    setSyncing(true);
    const r = await syncAll();
    setSyncing(false);
    if (r.ok) toast.success("Records synced");
    else if (!user) toast("Records need an account to sync to the cloud", { action: { label: "Sign in", onClick: () => (window.location.href = "/auth") } });
    else toast.error(r.error ?? "Sync failed");
  };
  const [counts, setCounts] = useState({ total: 0, pending: 0 });
  useEffect(() => {
    setMounted(true);
    const u = () => setCounts(allRecordCounts());
    u();
    window.addEventListener("farmerplus:change", u);
    return () => window.removeEventListener("farmerplus:change", u);
  }, []);
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateText = now.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
  const tasksDue = notices.filter((n) => /due|overdue/i.test(n.text)).length;
  const activeRisks = risks.filter((r) => r.stage !== "completed" && r.stage !== "dismissed").length;
  const today = notices.slice(0, 5);

  if (!loading && !user && !guest) return <AuthLanding initial="signup" />;

  const stats = [
    { label: "Records", value: counts.total, icon: Database, tone: appTone(0) },
    { label: "Waiting to sync", value: counts.pending, icon: CloudUpload, tone: appTone(1) },
    { label: "Due soon", value: tasksDue, icon: ListTodo, tone: appTone(2) },
    { label: "Active risks", value: activeRisks, icon: TriangleAlert, tone: appTone(3) },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md space-y-6 px-4 pb-32 pt-8 md:max-w-5xl md:px-6 md:pb-12 md:pt-24 lg:max-w-7xl">
        {/* Greeting */}
        <section className="relative overflow-hidden rounded-3xl bg-brand-ink px-6 py-7 text-background md:px-10 md:py-10">
          <div className="absolute inset-x-0 bottom-0 flex h-1.5">
            <span className="flex-1 bg-brand-green" /><span className="flex-1 bg-brand-yellow" /><span className="flex-1 bg-brand-orange" /><span className="flex-1 bg-brand-red" />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-background/70" suppressHydrationWarning>{mounted ? dateText : "\u00a0"}</p>
              <h1 className="mt-1 font-display text-3xl font-bold md:text-5xl" suppressHydrationWarning>{mounted ? greet : "Welcome"}, {s.owner}</h1>
              <p className="mt-2 text-base text-background/80 md:text-lg">Here's what's happening at <span className="font-semibold text-brand-yellow">{s.farmName}</span> today.</p>
            </div>
            <NotificationBell className="bg-background/10 text-background md:hidden" />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 rounded-full bg-background/10 px-3 py-1">
              <span className={`h-2 w-2 rounded-full ${online ? "bg-brand-green" : "bg-brand-red"}`} />
              {online ? "Online" : "Offline — saving locally"}
            </span>
            {!user && <Link to="/auth" className="rounded-full bg-brand-green px-3 py-1 font-semibold text-background">Sign in to back up your records</Link>}
            {counts.pending > 0 && online && (
              <button onClick={doSync} disabled={syncing} className="rounded-full bg-brand-yellow px-3 py-1 font-semibold text-brand-ink disabled:opacity-60">
                {syncing ? "Syncing…" : `Sync ${counts.pending} records`}
              </button>
            )}
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {stats.map((st) => (
            <div key={st.label} className="soft-card flex items-center gap-3 border p-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${st.tone}`}><st.icon className="h-5 w-5" /></span>
              <div>
                <p className="font-display text-2xl font-bold leading-none">{st.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{st.label}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Weather + Today */}
        <section className="grid gap-4 md:grid-cols-2 md:gap-6">
          <Weather lat={s.lat} lon={s.lon} />
          <div className="soft-card border p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Today</h2>
              <span className="rounded-full bg-brand-orange px-2.5 py-0.5 text-xs font-semibold text-background">{notices.length} items</span>
            </div>
            {today.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing needs your attention right now.</p>
            ) : (
              <ul className="divide-y">
                {today.map((n, i) => (
                  <li key={n.id}>
                    <Link to={n.to} className="flex items-center gap-3 py-2.5 text-sm hover:text-brand-orange">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${appTone(i)}`} />
                      <span className="flex-1">{n.text}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Apps */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Your apps</h2>
            <Link to="/apps" className="text-sm font-semibold text-brand-green">See all</Link>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 md:gap-4">
            {MINI_APPS.map((a, i) => (
              <Link key={a.id} to="/app/$appId" params={{ appId: a.id }} className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-3 transition hover:-translate-y-0.5 hover:shadow-md">
                <span className={`flex h-14 w-14 items-center justify-center rounded-full ${appTone(i)}`}><a.icon className="h-7 w-7" /></span>
                <span className="text-center text-xs font-semibold">{a.name}</span>
              </Link>
            ))}
          </div>
        </section>

        <ActionDashboard />
      </main>
    </div>
  );
}
