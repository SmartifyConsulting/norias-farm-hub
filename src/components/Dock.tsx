import { Link } from "@tanstack/react-router";
import { Home, LayoutGrid, Wallet, Settings } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/apps", label: "Apps", icon: LayoutGrid },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Dock() {
  return (
    <nav className="glass fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-1 rounded-3xl p-2">
      {items.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === "/" }}
          className="flex w-16 flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-medium text-foreground/80 transition-colors hover:bg-card/40"
          activeProps={{ className: "bg-card/60 text-primary" }}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function SyncBadge({ status }: { status: "synced" | "pending" | "local" }) {
  const map = {
    synced: "bg-primary/15 text-primary",
    pending: "bg-accent text-accent-foreground",
    local: "bg-muted text-muted-foreground",
  };
  const text = { synced: "Synced", pending: "Pending", local: "Local only" };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[status]}`}>{text[status]}</span>;
}

export function Screen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-32 pt-8">
      <h1 className="mb-5 font-display text-3xl text-foreground">{title}</h1>
      {children}
    </main>
  );
}
