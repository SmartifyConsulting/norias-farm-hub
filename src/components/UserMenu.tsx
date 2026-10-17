import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Megaphone, Settings, ShieldCheck, UserCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { profileOf } from "@/lib/profile";
import { useIsAdmin } from "@/lib/adPackages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLES, useActiveRole, type RoleId } from "@/lib/valuechain";
import { isPrivileged, requestRole, useRoleGrants } from "@/lib/vc-roles";

/** Where each role lands when switched to. Screens are shared; the role only changes the starting point. */
const ROLE_HOME: Record<RoleId, "/" | "/field-ops" | "/coop" | "/gov-programmes" | "/logistics" | "/insurance" | "/opportunities"> = {
  farmer: "/",
  "field-officer": "/field-ops",
  "coop-lead": "/coop",
  "programme-manager": "/gov-programmes",
  "service-provider": "/logistics",
  "financial-partner": "/insurance",
  buyer: "/opportunities",
};

export async function signOutEverywhere(nav: ReturnType<typeof useNavigate>, clear: () => void) {
  const { syncAll, unsyncedCount } = await import("@/lib/animal-sync");
  if (unsyncedCount() > 0) {
    const r = await syncAll();
    if (
      !r.ok &&
      !confirm(`${unsyncedCount()} changes haven't reached the cloud yet. Sign out and lose them?`)
    )
      return;
  }
  clear();
  await supabase.auth.signOut();
  toast("Signed out");
  nav({ to: "/auth", replace: true });
}

export function UserAvatar({ className = "h-9 w-9" }: { className?: string }) {
  const { user } = useUser();
  const p = profileOf(user);
  return (
    <Avatar className={className}>
      {p.avatar && (
        <AvatarImage src={p.avatar} alt={p.full || "Profile photo"} className="object-cover" />
      )}
      <AvatarFallback className="bg-earth-1 text-xs font-bold text-background">
        {p.initials}
      </AvatarFallback>
    </Avatar>
  );
}

export function UserMenu() {
  const { user } = useUser();
  const nav = useNavigate();
  const qc = useQueryClient();
  const isAdmin = useIsAdmin(user?.id);
  const [role, setRole] = useActiveRole();
  const grants = useRoleGrants(user?.id);
  if (!user) return null;
  const p = profileOf(user);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <UserAvatar />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-semibold">{p.full || "Your account"}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{p.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 pb-2">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Working as
          </label>
          <select
            aria-label="Working as"
            className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm"
            value={role}
            onChange={async (e) => {
              const next = e.target.value as RoleId;
              if (!grants.canUse(next)) {
                const st = grants.statusOf(next);
                if (st === "pending") { toast("Your request is waiting for an admin to approve it."); return; }
                const reason = prompt(`Request ${ROLES.find((r) => r.id === next)?.name} access. Why do you need it? (an admin will review)`);
                if (reason === null) return;
                try { await requestRole(next, reason); toast.success("Request sent to an admin"); grants.reload(); }
                catch (err) { toast.error((err as Error).message); }
                return;
              }
              setRole(next);
              const to = ROLE_HOME[next];
              if (to) nav({ to });
            }}
          >
            {ROLES.map((r) => {
              const st = grants.statusOf(r.id);
              const tag = !isPrivileged(r.id) || st === "approved" ? "" : st === "pending" ? " (awaiting approval)" : " (request access)";
              return <option key={r.id} value={r.id}>{r.name}{tag}</option>;
            })}
          </select>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings" hash="profile">
            <UserRound className="mr-2 h-4 w-4" />
            Profile & photo
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/advertise">
            <Megaphone className="mr-2 h-4 w-4" />
            Sponsored Ads
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin/ads">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Admin: Ad charges
            </Link>
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin/roles">
              <UserCheck className="mr-2 h-4 w-4" />
              Admin: Role approvals
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() =>
            signOutEverywhere(nav, () => {
              qc.cancelQueries();
              qc.clear();
            })
          }
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
