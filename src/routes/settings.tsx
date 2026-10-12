import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useUser } from "@/lib/auth";
import { Screen } from "@/components/Dock";
import { UserAvatar, signOutEverywhere } from "@/components/UserMenu";
import { profileOf, removeAvatar, saveAccountName, uploadAvatar } from "@/lib/profile";
import { Switch } from "@/components/ui/switch";
import { MINI_APPS, useSettings } from "@/lib/farm";
import { NOTIFY_TYPES, useNotifyPrefs } from "@/lib/network";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — FarmerPlus" },
      {
        name: "description",
        content: "Set your farm name, location for weather, and sync preferences.",
      },
      { property: "og:title", content: "Settings — FarmerPlus" },
      { property: "og:description", content: "Farm profile, weather location and sync settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [s, update] = useSettings();
  const [prefs, setPrefs] = useNotifyPrefs();
  const { user } = useUser();
  const qc = useQueryClient();
  const nav = useNavigate();
  const signOut = () =>
    signOutEverywhere(nav, () => {
      qc.cancelQueries();
      qc.clear();
    });
  const input =
    "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  const [locating, setLocating] = useState(false);
  const [town, setTown] = useState("");
  const [hits, setHits] = useState<
    { name: string; admin1?: string; country?: string; latitude: number; longitude: number }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const setPlace = (lat: number, lon: number, placeName: string, country?: string) => {
    update({
      lat: +lat.toFixed(3),
      lon: +lon.toFixed(3),
      placeName,
      ...(country ? { country } : {}),
    });
    toast.success(`Weather location set to ${placeName}`);
  };
  const locate = () => {
    if (!navigator.geolocation) {
      toast.error("This browser can't share your location. Search for your town instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const { latitude: lat, longitude: lon } = p.coords;
        let name = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
        let country: string | undefined;
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&lat=${lat}&lon=${lon}`,
          );
          const j = await r.json();
          const a = j.address ?? {};
          name = a.city || a.town || a.village || a.municipality || a.county || name;
          country = a.country;
        } catch {}
        setLocating(false);
        setPlace(lat, lon, name, country);
      },
      (err) => {
        setLocating(false);
        toast.error(
          err.code === 1
            ? "Location permission was blocked. Allow location for this site, or search for your town below."
            : "Couldn't find your location. Search for your town below.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  };
  const searchTown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (town.trim().length < 2) return;
    try {
      const r = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?count=5&language=en&name=${encodeURIComponent(town.trim())}`,
      );
      const j = await r.json();
      setHits(j.results ?? []);
      if (!j.results?.length) toast("No towns found with that name");
    } catch {
      toast.error("Search failed — check your connection");
    }
  };
  const onPhoto = async (f?: File) => {
    if (!f || !user) return;
    setUploading(true);
    try {
      await uploadAvatar(user.id, f);
      toast.success("Profile photo updated");
    } catch {
      toast.error("Couldn't upload your photo — check your connection and try again.");
    }
    setUploading(false);
  };
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
        {user ? (
          <section
            id="profile"
            className="mb-4 space-y-3 rounded-2xl border bg-card p-4 md:col-span-2"
          >
            <div className="flex items-center gap-4">
              <UserAvatar className="h-16 w-16" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {profileOf(user).full || "Your account"}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <button
                onClick={signOut}
                className="shrink-0 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
              >
                Log out
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                {uploading ? "Uploading…" : "Upload photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    onPhoto(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              {profileOf(user).avatar && (
                <button
                  onClick={async () => {
                    await removeAvatar();
                    toast("Photo removed");
                  }}
                  className="rounded-xl border px-3 py-1.5 text-xs font-semibold"
                >
                  Remove
                </button>
              )}
              <span className="text-xs text-muted-foreground">JPG, PNG or WebP, up to 5 MB.</span>
            </div>
            <label className="block text-sm font-medium">
              Your name
              <input
                className={input}
                value={s.owner}
                onChange={(e) => update({ owner: e.target.value })}
                onBlur={() => s.owner.trim() && saveAccountName(s.owner)}
              />
            </label>
          </section>
        ) : (
          <section id="profile" className="mb-4 rounded-2xl border bg-card p-4 md:col-span-2">
            <p className="text-sm font-medium">Profile</p>
            <label className="mt-2 block text-sm font-medium">
              Your name
              <input
                className={input}
                value={s.owner}
                onChange={(e) => update({ owner: e.target.value })}
              />
            </label>
            <Link
              to="/auth"
              className="mt-3 block rounded-xl bg-primary py-2 text-center text-sm font-semibold text-primary-foreground"
            >
              Sign in to sync
            </Link>
          </section>
        )}
        <section className="mt-4 space-y-3 rounded-2xl border bg-card p-4">
          <p className="text-sm font-medium">Weather location</p>
          <p className="text-xs text-muted-foreground">
            {s.placeName ? `${s.placeName} · ` : ""}
            {s.lat}, {s.lon}
          </p>
          <button
            onClick={locate}
            disabled={locating}
            className="w-full rounded-xl bg-secondary py-2 text-sm font-semibold text-secondary-foreground disabled:opacity-60"
          >
            {locating ? "Finding you…" : "Use my location"}
          </button>
          <form onSubmit={searchTown} className="flex gap-2">
            <input
              className={input}
              value={town}
              onChange={(e) => setTown(e.target.value)}
              placeholder="Or type your town"
              aria-label="Town"
            />
            <button className="shrink-0 rounded-xl border px-3 text-sm font-semibold">
              Search
            </button>
          </form>
          {hits.length > 0 && (
            <ul className="divide-y rounded-xl border">
              {hits.map((h) => (
                <li key={`${h.latitude},${h.longitude}`}>
                  <button
                    onClick={() => {
                      setPlace(h.latitude, h.longitude, h.name, h.country);
                      setHits([]);
                      setTown("");
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    {h.name}
                    <span className="text-muted-foreground">
                      {[h.admin1, h.country].filter(Boolean).length
                        ? `, ${[h.admin1, h.country].filter(Boolean).join(", ")}`
                        : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="mt-4 flex items-center justify-between gap-3 rounded-2xl border bg-card p-4">
          <div>
            <p className="text-sm font-medium">FarmSchool</p>
            <p className="text-xs text-muted-foreground">
              See your courses and progress in FarmerPlus
            </p>
          </div>
          <Link
            to="/farmschool"
            className="shrink-0 rounded-xl bg-earth-1 px-3 py-1.5 text-xs font-semibold text-background"
          >
            Connect FarmSchool
          </Link>
        </section>
        <section className="mt-4 flex items-center justify-between rounded-2xl border bg-card p-4">
          <div>
            <p className="text-sm font-medium">Auto-sync when online</p>
            <p className="text-xs text-muted-foreground">
              New records are marked synced immediately
            </p>
          </div>
          <Switch checked={s.autoSync} onCheckedChange={(v) => update({ autoSync: v })} />
        </section>
        <section className="mt-4 space-y-2 rounded-2xl border bg-card p-4">
          <p className="text-sm font-medium">Notifications</p>
          {NOTIFY_TYPES.map((t) => (
            <div key={t} className="flex items-center justify-between text-sm">
              <span>{t}</span>
              <Switch
                aria-label={t}
                checked={prefs[t] !== false}
                onCheckedChange={(v) => setPrefs({ ...prefs, [t]: v })}
              />
            </div>
          ))}
        </section>
        <section className="mt-4 rounded-2xl border bg-card p-4">
          <p className="text-sm font-medium">Install FarmerPlus</p>
          <p className="text-xs text-muted-foreground">
            Use your browser's "Add to Home Screen" or install option to put FarmerPlus on your
            phone.
          </p>
        </section>
        <button
          onClick={clear}
          className="mt-4 w-full rounded-xl border border-destructive py-2 text-sm font-semibold text-destructive"
        >
          Clear all local data
        </button>
      </div>
    </Screen>
  );
}
