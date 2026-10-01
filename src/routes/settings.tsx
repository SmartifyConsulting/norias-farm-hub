import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { Screen } from "@/components/Dock";
import { Switch } from "@/components/ui/switch";
import { MINI_APPS, useSettings } from "@/lib/farm";
import { NOTIFY_TYPES, ROLES, useNotifyPrefs, useRole, type Role } from "@/lib/network";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — FarmerPlus" },
      { name: "description", content: "Set your farm name, location for weather, and sync preferences." },
      { property: "og:title", content: "Settings — FarmerPlus" },
      { property: "og:description", content: "Farm profile, weather location and sync settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [s, update] = useSettings();
  const [role, setRole] = useRole();
  const [prefs, setPrefs] = useNotifyPrefs();
  const { user } = useUser();
  const qc = useQueryClient();
  const nav = useNavigate();
  const signOut = async () => {
    const { syncAnimals, unsyncedAnimalCount } = await import("@/lib/animal-sync");
    if (unsyncedAnimalCount() > 0) {
      const r = await syncAnimals();
      if (!r.ok && !confirm(`${unsyncedAnimalCount()} changes haven't reached the cloud yet (${r.error}). Sign out and lose them?`)) return;
    }
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    localStorage.removeItem("farmerplus:animals");
    localStorage.removeItem("farmerplus:animals:deleted");
    window.dispatchEvent(new Event("farmerplus:change"));
    toast("Signed out");
    nav({ to: "/auth", replace: true });
  };
  const input = "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  const locate = () => navigator.geolocation?.getCurrentPosition((p) => update({ lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }));
  const clear = () => {
    if (!confirm("Delete all farm records on this device?")) return;
    MINI_APPS.forEach((a) => localStorage.removeItem(`farmerplus:${a.id}`));
    localStorage.removeItem("farmerplus:wallet");
    localStorage.removeItem("farmerplus:animals:deleted");
    window.dispatchEvent(new Event("farmerplus:change"));
    toast("Local data cleared");
  };
  return (
    <Screen title="Settings">
      <div className="md:grid md:grid-cols-2 md:gap-4 md:[&>*]:mt-0 md:[&>*]:mb-0">
      <section className="mb-4 rounded-2xl border bg-card p-4">
        <p className="text-sm font-medium">Account</p>
        {user ? (
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="truncate text-xs text-muted-foreground">{user.email} · Animal records sync to the cloud</p>
            <button onClick={signOut} className="shrink-0 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">Sign out</button>
          </div>
        ) : (
          <Link to="/auth" className="mt-2 block rounded-xl bg-primary py-2 text-center text-sm font-semibold text-primary-foreground">Sign in to sync</Link>
        )}
      </section>
      <section className="space-y-3 rounded-2xl border bg-card p-4">
        <label className="block text-sm font-medium">Farm name<input className={input} value={s.farmName} onChange={(e) => update({ farmName: e.target.value })} /></label>
        <label className="block text-sm font-medium">Your name<input className={input} value={s.owner} onChange={(e) => update({ owner: e.target.value })} /></label>
      </section>
      <section className="mt-4 space-y-3 rounded-2xl border bg-card p-4">
        <p className="text-sm font-medium">Weather location</p>
        <p className="text-xs text-muted-foreground">{s.lat}, {s.lon}</p>
        <button onClick={locate} className="w-full rounded-xl bg-secondary py-2 text-sm font-semibold text-secondary-foreground">Use my location</button>
      </section>
      <section className="mt-4 flex items-center justify-between rounded-2xl border bg-card p-4">
        <div><p className="text-sm font-medium">Auto-sync when online</p><p className="text-xs text-muted-foreground">New records are marked synced immediately</p></div>
        <Switch checked={s.autoSync} onCheckedChange={(v) => update({ autoSync: v })} />
      </section>
      <section className="mt-4 space-y-2 rounded-2xl border bg-card p-4">
        <label className="block text-sm font-medium">Your role
          <select className={input} value={role} onChange={(e) => setRole(e.target.value as Role)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
        </label>
        <p className="text-xs text-muted-foreground">Shapes which opportunities you see. Your private farm, financial and commercial data is never shown to others.</p>
      </section>
      <section className="mt-4 space-y-2 rounded-2xl border bg-card p-4">
        <p className="text-sm font-medium">Notifications</p>
        {NOTIFY_TYPES.map((t) => (
          <div key={t} className="flex items-center justify-between text-sm"><span>{t}</span><Switch aria-label={t} checked={prefs[t] !== false} onCheckedChange={(v) => setPrefs({ ...prefs, [t]: v })} /></div>
        ))}
      </section>
      <section className="mt-4 rounded-2xl border bg-card p-4">
        <p className="text-sm font-medium">Install FarmerPlus</p>
        <p className="text-xs text-muted-foreground">Use your browser's "Add to Home Screen" or install option to put FarmerPlus on your phone.</p>
      </section>
      <button onClick={clear} className="mt-4 w-full rounded-xl border border-destructive py-2 text-sm font-semibold text-destructive">Clear all local data</button>
      </div>
    </Screen>
  );
}
