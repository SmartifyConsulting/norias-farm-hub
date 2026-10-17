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
import { ROLES, useActiveRole } from "@/lib/valuechain";

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
  const [role] = useActiveRole();
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
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Working as
          </p>
          <p className="text-sm font-medium">{ROLES.find((r) => r.id === role)?.name}</p>
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
