import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Home, LayoutGrid, Wallet, Settings, Search, Sprout, LogIn } from "lucide-react";
import { useGuest, useUser } from "@/lib/auth";
import { MINI_APPS, useOnline } from "@/lib/farm";
import { NotificationBell } from "@/components/NotificationBell";
import { UserMenu } from "@/components/UserMenu";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/apps", label: "Apps", icon: LayoutGrid },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

/** Navigation is hidden on the signed-out landing and the auth page (full-screen sign-in layout). */
function useNavHidden() {
  const { pathname } = useLocation();
  const { user, loading } = useUser();
  const [guest] = useGuest();
  return pathname === "/auth" || (pathname === "/" && !loading && !user && !guest);
}

/** Mobile (< md): floating glass dock. */
export function Dock() {
  if (useNavHidden()) return null;
  return (
    <nav className="glass fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-1 rounded-3xl p-2 md:hidden">
      {items.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === "/" }}
          className="flex w-16 flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-medium text-foreground/80 transition-colors hover:bg-muted"
          activeProps={{ className: "!bg-card !text-foreground" }}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Tablet & desktop (md+): persistent top header with links, app search and actions. */
export function TopNav() {
  const hidden = useNavHidden();
  const { user } = useUser();
  const online = useOnline();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  if (hidden) return null;
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const hit = MINI_APPS.find((a) => a.name.toLowerCase().includes(q.trim().toLowerCase()));
    if (hit && q.trim()) { nav({ to: "/app/$appId", params: { appId: hit.id } }); setQ(""); }
  };
  return (
    <header className="fixed inset-x-0 top-0 z-50 hidden border-b bg-primary text-primary-foreground md:block">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-display text-lg font-bold">
          <Sprout className="h-5 w-5" /> FarmerPlus
        </Link>
        <nav className="flex items-center gap-1">
          {items.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-primary-foreground/75 hover:!bg-muted hover:!text-foreground"
              activeProps={{ className: "!bg-card !text-foreground font-semibold" }}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          ))}
        </nav>
        <form onSubmit={go} className="ml-auto hidden min-w-0 max-w-xs flex-1 items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1.5 lg:flex">
          <Search className="h-4 w-4 shrink-0 opacity-70" />
          <input aria-label="Search apps" list="fp-apps" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-primary-foreground/60" />
          <datalist id="fp-apps">{MINI_APPS.map((a) => <option key={a.id} value={a.name} />)}</datalist>
        </form>
        <div className="ml-auto flex shrink-0 items-center gap-3 lg:ml-0">
          <span className="flex items-center gap-1.5 text-xs text-primary-foreground/80">
            <span className={`h-2 w-2 rounded-full ${online ? "bg-success" : "bg-destructive"}`} />
            {online ? "Online" : "Offline"}
          </span>
          <NotificationBell className="hover:bg-primary-foreground/10" />
          {user ? (
            <UserMenu />
          ) : (
            <Link to="/auth" className="flex items-center gap-1 rounded-full bg-primary-foreground px-3 py-1.5 text-xs font-semibold text-primary"><LogIn className="h-3.5 w-3.5" />Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function SyncBadge({ status }: { status: "synced" | "pending" | "local" }) {
  const map = {
    synced: "bg-success-soft text-success-foreground",
    pending: "bg-warning-soft text-warning-foreground",
    local: "bg-muted text-muted-foreground",
  };
  const text = { synced: "Synced", pending: "Pending", local: "Local only" };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[status]}`}>{text[status]}</span>;
}

export function Screen({ title, children, wide = true }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <main className={`mx-auto min-h-screen max-w-md px-4 pb-32 pt-8 md:px-6 md:pb-12 md:pt-24 ${wide ? "md:max-w-5xl lg:max-w-7xl" : "md:max-w-2xl"}`}>
      <h1 className="mb-5 font-display text-3xl text-foreground md:text-4xl">{title}</h1>
      {children}
    </main>
  );
}
