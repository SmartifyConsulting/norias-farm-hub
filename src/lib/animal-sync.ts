import { supabase } from "@/integrations/supabase/client";
import type { FarmRecord } from "./farm";

const KEY = "farmerplus:animals";
const TOMB = "farmerplus:animals:deleted";

const read = <T,>(k: string, d: T): T => {
  try { return JSON.parse(localStorage.getItem(k) || "") as T; } catch { return d; }
};

export function markDeleted(id: string) {
  const t = read<string[]>(TOMB, []);
  if (!t.includes(id)) localStorage.setItem(TOMB, JSON.stringify([...t, id]));
}

let running: Promise<{ ok: boolean; error?: string }> | null = null;

/** Push local unsynced animal records + deletions to the cloud, then pull the account's records. */
export function syncAnimals() {
  if (running) return running;
  running = (async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { ok: false, error: "Sign in to sync" };
      if (!navigator.onLine) return { ok: false, error: "Offline" };

      const tomb = read<string[]>(TOMB, []);
      if (tomb.length) {
        const { error } = await supabase.from("animal_records").delete().in("id", tomb);
        if (error) throw error;
        localStorage.setItem(TOMB, "[]");
      }

      const local = read<FarmRecord[]>(KEY, []);
      const unsynced = local.filter((r) => r.sync !== "synced");
      if (unsynced.length) {
        const { error } = await supabase.from("animal_records").upsert(
          unsynced.map((r) => ({ id: r.id, user_id: u.user!.id, title: r.title, detail: r.detail, qty: r.qty ?? "", recorded_at: r.date, updated_at: new Date().toISOString() })),
        );
        if (error) throw error;
      }

      const { data, error } = await supabase.from("animal_records").select("*").order("recorded_at", { ascending: false });
      if (error) throw error;
      const merged: FarmRecord[] = (data ?? []).map((r) => ({ id: r.id, title: r.title, detail: r.detail, qty: r.qty, date: r.recorded_at, sync: "synced" }));
      // Keep anything added locally while this sync was running (not yet uploaded).
      const serverIds = new Set(merged.map((r) => r.id));
      const dead = new Set(read<string[]>(TOMB, []));
      const fresh = read<FarmRecord[]>(KEY, []).filter((r) => r.sync !== "synced" && !serverIds.has(r.id) && !dead.has(r.id));
      localStorage.setItem(KEY, JSON.stringify([...fresh, ...merged].filter((r) => !dead.has(r.id))));
      window.dispatchEvent(new Event("farmerplus:change"));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Sync failed" };
    } finally {
      running = null;
    }
  })();
  return running;
}

export function unsyncedAnimalCount() {
  return read<FarmRecord[]>(KEY, []).filter((r) => r.sync !== "synced").length + read<string[]>(TOMB, []).length;
}
