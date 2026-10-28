import { createContext, useContext } from "react";
import logo from "@/assets/farmerplus-logo.png.asset.json";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Home,
  Warehouse,
  Receipt,
  Route as JourneyIcon,
  Wallet,
  Settings,
  Sprout,
  LogIn,
  Handshake,
} from "lucide-react";
import { useGuest, useUser } from "@/lib/auth";
import { useOnline } from "@/lib/farm";
import { NotificationBell } from "@/components/NotificationBell";
import { UserMenu } from "@/components/UserMenu";
import { FarmSwitcher } from "@/components/FarmSwitcher";

const items = [
  { to: "/", label: "Home", icon: Home, params: undefined },
  { to: "/farm-overview", label: "My Business", icon: Warehouse, params: undefined },
  { to: "/production", label: "Production", icon: Sprout, params: undefined },
  { to: "/trade-delivery", label: "Trade & Delivery", icon: Handshake, params: undefined },
  { to: "/programmes", label: "Networks & Programmes", icon: JourneyIcon, params: undefined },
  { to: "/wallet", label: "Wallet", icon: Wallet, params: undefined },
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
    <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-around overflow-x-auto border-t border-primary-foreground/10 bg-primary px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 text-primary-foreground md:hidden">
      {items.map(({ to, label, icon: Icon, params }) => (
        <Link
          key={to}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          to={to as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          params={(params ?? {}) as any}
          activeOptions={{ exact: to === "/" }}
          className="flex min-w-[76px] flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10"
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
  if (hidden) return null;
  return (
    <header className="fixed inset-x-0 top-0 z-50 hidden border-b bg-primary text-primary-foreground md:block">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-6">
        <Link to="/" className="flex shrink-0 items-center" aria-label="FarmerPlus home">
          <img src={logo.url} alt="FarmerPlus" className="h-8 w-auto" />
        </Link>
        <FarmSwitcher />
        <nav className="flex flex-1 items-center justify-center gap-1">
          {items.map(({ to, label, icon: Icon, params }) => (
            <Link
              key={to}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              to={to as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              params={(params ?? {}) as any}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-medium text-primary-foreground/75 hover:!bg-muted hover:!text-foreground"
              activeProps={{ className: "!bg-card !text-foreground font-semibold" }}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-primary-foreground/80">
            <span className={`h-2 w-2 rounded-full ${online ? "bg-success" : "bg-destructive"}`} />
            {online ? "Online" : "Offline"}
          </span>
          <NotificationBell className="hover:bg-primary-foreground/10" />
          {user ? (
            <UserMenu />
          ) : (
            <>
              <Link
                to="/settings"
                aria-label="Settings"
                className="rounded-full p-1.5 hover:bg-primary-foreground/10"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <Link
                to="/auth"
                className="flex items-center gap-1 rounded-full bg-primary-foreground px-3 py-1.5 text-xs font-semibold text-primary"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign in
              </Link>
            </>
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
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[status]}`}
    >
      {text[status]}
    </span>
  );
}

export const EmbeddedScreenContext = createContext(false);

export function Screen({
  title,
  children,
  wide = true,
}: {
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const embedded = useContext(EmbeddedScreenContext);
  if (embedded) return <section className="w-full min-w-0"><div className="space-y-4">{children}</div></section>;
  return (
    <main
      className={`mx-auto min-h-screen max-w-md px-4 pb-32 pt-8 md:px-6 md:pb-12 md:pt-24 ${wide ? "md:max-w-5xl lg:max-w-7xl" : "md:max-w-2xl"}`}
    >
      <h1 className="mb-5 font-display text-3xl text-foreground md:text-4xl">{title}</h1>
      {children}
    </main>
  );
}
