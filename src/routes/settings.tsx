import { createFileRoute } from "@tanstack/react-router";
import { Screen } from "@/components/Dock";
import { Switch } from "@/components/ui/switch";
import { MINI_APPS, useSettings } from "@/lib/farm";

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
  const input = "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  const locate = () => navigator.geolocation?.getCurrentPosition((p) => update({ lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }));
  const clear = () => {
    if (!confirm("Delete all farm records on this device?")) return;
    MINI_APPS.forEach((a) => localStorage.removeItem(`farmerplus:${a.id}`));
    localStorage.removeItem("farmerplus:wallet");
  };
  return (
    <Screen title="Settings">
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
      <section className="mt-4 rounded-2xl border bg-card p-4">
        <p className="text-sm font-medium">Install FarmerPlus</p>
        <p className="text-xs text-muted-foreground">Use your browser's "Add to Home Screen" or install option to put FarmerPlus on your phone.</p>
      </section>
      <button onClick={clear} className="mt-4 w-full rounded-xl border border-destructive py-2 text-sm font-semibold text-destructive">Clear all local data</button>
    </Screen>
  );
}
