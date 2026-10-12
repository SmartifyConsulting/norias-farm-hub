import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Weather } from "@/components/Weather";
import { toast } from "sonner";
import { CalendarClock, TriangleAlert, ChevronRight, Settings as SettingsIcon } from "lucide-react";
import { allRecordCounts, syncAll, useLastSynced, useOnline, useSettings } from "@/lib/farm";
import { useGuest, useUser } from "@/lib/auth";
import { AuthLanding } from "@/components/AuthLanding";
import { ActionDashboard } from "@/components/ActionDashboard";
import { NotificationBell } from "@/components/NotificationBell";
import { UserMenu } from "@/components/UserMenu";
import { FarmSchoolCard } from "@/components/FarmSchool";
import { profileOf } from "@/lib/profile";
import { useNotices } from "@/lib/notices";
import { useRisks } from "@/lib/network";
import { useAiOverview } from "@/lib/aioverview";
import { Sparkles } from "lucide-react";
import { appTone } from "@/lib/app-colors";
import { FarmMap } from "@/components/FarmMap";
import { useTeam } from "@/lib/team";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FarmerPlus — Your farm in your pocket" },
      {
        name: "description",
        content:
          "Farm management app with weather, animals, harvest, fields and stock records that work offline.",
      },
      { property: "og:title", content: "FarmerPlus — Your farm in your pocket" },
      {
        property: "og:description",
        content: "Weather, animals, harvest, fields and stock records — offline ready.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const [s] = useSettings();
  const { active: activeFarmId } = useTeam();
  const online = useOnline();
  const lastSynced = useLastSynced();
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
    else if (!user)
      toast("Records need an account to sync to the cloud", {
        action: { label: "Sign in", onClick: () => (window.location.href = "/auth") },
      });
    else toast.error("Couldn't sync your records — check your connection and try again.");
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
  const dateText = now.toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const tasksDue = notices.filter((n) => /due|overdue/i.test(n.text)).length;
  const activeRisks = risks.filter(
    (r) => r.stage !== "completed" && r.stage !== "dismissed",
  ).length;
  const today = notices.slice(0, 4);
  const firstName = profileOf(user).first || s.owner.split(" ")[0];
  const { overview, loading: overviewLoading } = useAiOverview(
    mounted
      ? { farmName: s.farmName, tasksDue, activeRisks, today: today.map((n) => n.text) }
      : null,
  );

  if (!loading && !user && !guest) return <AuthLanding initial="signin" />;

  const stats = [
    { label: "Due soon", value: tasksDue, icon: CalendarClock, tone: appTone(2) },
    { label: "Active risks", value: activeRisks, icon: TriangleAlert, tone: appTone(5) },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md space-y-4 px-4 pb-32 pt-8 md:max-w-5xl md:px-6 md:pb-8 md:pt-20 lg:max-w-7xl">
        {/* Greeting */}
        <section className="flex flex-wrap items-end justify-between gap-3 px-1 text-foreground">
          <div>
            <p className="text-sm text-muted-foreground" suppressHydrationWarning>
              {mounted ? dateText : "\u00a0"}
            </p>
            <h1 className="font-display text-3xl font-bold md:text-4xl" suppressHydrationWarning>
              {mounted ? greet : "Welcome"}, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground md:text-base">
              Here's what's happening at{" "}
              <span className="font-semibold text-earth-3">{s.farmName}</span> today.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
              <span
                className={`h-2 w-2 rounded-full ${online ? "bg-brand-green" : "bg-brand-red"}`}
              />
              {online ? "Online" : "Offline — saving locally"}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground">
              {lastSynced
                ? `Last synced ${new Date(lastSynced).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                : "Not synced yet"}
              {counts.pending > 0 && (
                <span className="rounded-full bg-brand-yellow px-1.5 py-0.5 text-[10px] font-bold text-brand-ink">
                  {counts.pending} to sync
                </span>
              )}
            </span>
            {!user && (
              <Link
                to="/auth"
                className="rounded-full bg-brand-green px-3 py-1 font-semibold text-background"
              >
                Sign in to back up your records
              </Link>
            )}
            {counts.pending > 0 && online && (
              <button
                onClick={doSync}
                disabled={syncing}
                className="rounded-full bg-brand-yellow px-3 py-1 font-semibold text-brand-ink disabled:opacity-60"
              >
                {syncing ? "Syncing…" : `Sync ${counts.pending} records`}
              </button>
            )}
            <span className="flex items-center gap-2 md:hidden">
              <NotificationBell />
              {user ? (
                <UserMenu />
              ) : (
                <Link
                  to="/settings"
                  aria-label="Settings"
                  className="rounded-full p-1.5 hover:bg-muted"
                >
                  <SettingsIcon className="h-5 w-5" />
                </Link>
              )}
            </span>
          </div>
        </section>

        {/* Weather + AI overview */}
        <section className="grid gap-3 md:grid-cols-2">
          <div className="space-y-3">
            <Weather lat={s.lat} lon={s.lon} place={s.placeName} compact />
            <div className="grid grid-cols-2 gap-3">
              {stats.map((st) => (
                <div key={st.label} className="soft-card flex items-center gap-3 border p-4">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${st.tone}`}
                  >
                    <st.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display text-2xl font-bold leading-none">{st.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{st.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="soft-card flex flex-col gap-2 border p-4">
            <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Overview
            </h2>
            {overviewLoading ? (
              <p className="text-sm text-muted-foreground">Thinking…</p>
            ) : overview ? (
              <p className="text-sm text-muted-foreground">{overview}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nothing to flag right now — check back later.
              </p>
            )}
          </div>
        </section>

        {/* Farm map (left) + Opportunities (right) */}
        <section className="grid gap-4 md:grid-cols-12">
          <div className="soft-card space-y-2 border p-4 md:col-span-7 lg:col-span-8">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Farm map</h2>
              <Link
                to="/app/$appId"
                params={{ appId: "farm" }}
                className="text-sm font-semibold text-earth-1"
              >
                Open My Farm
              </Link>
            </div>
            <FarmMap farmId={activeFarmId} />
          </div>
          <div className="space-y-4 md:col-span-5 lg:col-span-4">
            <div className="soft-card border p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display text-base font-semibold">Opportunities</h2>
                <span className="rounded-full bg-earth-6 px-2.5 py-0.5 text-xs font-semibold text-brand-ink">
                  {notices.length} items
                </span>
              </div>
              {today.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing needs your attention right now.
                </p>
              ) : (
                <ul className="divide-y">
                  {today.map((n, i) => (
                    <li key={n.id}>
                      <Link
                        to={n.to}
                        className="flex items-center gap-3 py-2 text-sm hover:text-earth-3"
                      >
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${appTone(i)}`} />
                        <span className="flex-1 truncate">{n.text}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <FarmSchoolCard />
        <ActionDashboard hideOpportunities />
      </main>
    </div>
  );
}
