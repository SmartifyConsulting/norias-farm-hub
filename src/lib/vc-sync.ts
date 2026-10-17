import { supabase } from "@/integrations/supabase/client";
import { activeFarmId } from "./team";

/** Local store key → cloud collection. Each store is an array of { id, ... } kept in localStorage. */
export const VC_COLLECTIONS: Record<string, string> = {
  "farmerplus:vc:farmers": "farmers",
  "farmerplus:vc:visits": "visits",
  "farmerplus:vc:inspections": "inspections",
  "farmerplus:vc:jobs": "jobs",
  "farmerplus:vc:applications": "applications",
  "farmerplus:vc:cover": "cover",
  "farmerplus:vc:vehicles": "vehicles",
  "farmerplus:vc:facilities": "facilities",
  "farmerplus:vc:bookings": "bookings",
};
/** Facility id → tonnes held by active storage bookings across all users (from the server). */
export const USAGE_KEY = "farmerplus:vc:usage";
/** Records the server refused on the last sync: id → reason. */
export const REJECTED_KEY = "farmerplus:vc:rejected";

type Item = { id: string; _owner?: string; _farm?: string | null } & Record<string, unknown>;
type Meta = Record<string, string>; // id -> hash of last synced content
export const metaKey = (k: string) => `${k}:synced`;
const read = <T,>(k: string, d: T): T => { try { return (JSON.parse(localStorage.getItem(k) || "null") as T) ?? d; } catch { return d; } };
/** Demo records live on this device only and never go to the cloud. */
export const isDemo = (i: { id: string }) => i.id.startsWith("demo-");

/** Content without the server-provided bookkeeping fields. */
export function clean(i: Item): Record<string, unknown> {
  const { _owner: _o, _farm: _f, ...rest } = i;
  return rest;
}
export const hashOf = (i: Item) => JSON.stringify(clean(i));

/** Items that changed since the last sync, and ids deleted locally since then. Demo items are ignored. */
export function diff(local: Item[], meta: Meta) {
  const real = local.filter((i) => !isDemo(i));
  const changed = real.filter((i) => meta[i.id] !== hashOf(i));
  const ids = new Set(real.map((i) => i.id));
  const deleted = Object.keys(meta).filter((id) => !ids.has(id));
  return { changed, deleted };
}

export function vcUnsynced() {
  let n = 0;
  for (const k of Object.keys(VC_COLLECTIONS)) {
    const d = diff(read<Item[]>(k, []), read<Meta>(metaKey(k), {}));
    n += d.changed.length + d.deleted.length;
  }
  return n;
}

const friendly = (m: string) => m.replace(/^OVERBOOKED:\s*/, "Fully booked — ");

/** Push local changes for each collection, then pull everything this account may see. Offline edits stay queued. */
export async function syncValueChain(userId: string) {
  const farm = activeFarmId();
  const rejected: Record<string, string> = {};
  for (const [k, collection] of Object.entries(VC_COLLECTIONS)) {
    const local = read<Item[]>(k, []);
    const meta = read<Meta>(metaKey(k), {});
    const { changed, deleted } = diff(local, meta);
    if (deleted.length) {
      const { error } = await supabase.from("vc_records").delete().eq("collection", collection).in("id", deleted);
      if (error) throw error;
    }
    const refused = new Set<string>();
    if (changed.length) {
      const rows = changed.map((i) => ({
        collection, id: i.id, data: clean(i) as never, updated_at: new Date().toISOString(),
        owner_id: i._owner ?? userId,
        farm_id: i._farm !== undefined ? i._farm : collection === "applications" ? null : farm,
      }));
      const { error } = await supabase.from("vc_records").upsert(rows, { onConflict: "collection,id" });
      if (error) {
        // Network problems keep everything queued; a rule refusal only drops the offending record.
        if (!error.code || error.message?.includes("Failed to fetch")) throw error;
        for (const r of rows) {
          const one = await supabase.from("vc_records").upsert(r, { onConflict: "collection,id" });
          if (one.error) {
            if (!one.error.code) throw one.error;
            refused.add(r.id);
            rejected[r.id] = friendly(one.error.message);
          }
        }
      }
    }

    const { data, error } = await supabase.from("vc_records").select("id,owner_id,farm_id,data").eq("collection", collection);
    if (error) throw error;
    // Re-read: edits made while this sync was running stay local and go up next time.
    const now = read<Item[]>(k, []);
    const pushed: Meta = { ...meta };
    for (const i of changed) if (!refused.has(i.id)) pushed[i.id] = hashOf(i);
    for (const id of deleted) delete pushed[id];
    const later = diff(now, pushed);
    // Refused records revert to the server copy (or disappear if they never existed there).
    const laterChanged = new Map(later.changed.filter((i) => !refused.has(i.id) || hashOf(i) !== hashOf(changed.find((c) => c.id === i.id) ?? i) || false).map((i) => [i.id, i]));
    for (const id of refused) {
      const edited = now.find((i) => i.id === id);
      const sent = changed.find((i) => i.id === id);
      if (edited && sent && hashOf(edited) === hashOf(sent)) laterChanged.delete(id);
    }
    const laterDeleted = new Set(later.deleted);
    const server: Item[] = (data ?? []).map((r) => ({ ...(r.data as Record<string, unknown>), id: r.id, _owner: r.owner_id, _farm: r.farm_id }));
    const serverIds = new Set(server.map((i) => i.id));
    const out: Item[] = [
      ...now.filter(isDemo),
      ...[...laterChanged.values()].filter((i) => !serverIds.has(i.id)),
      ...server.filter((i) => !laterDeleted.has(i.id)).map((i) => laterChanged.get(i.id) ?? i),
    ];
    const nextMeta: Meta = {};
    for (const i of server) nextMeta[i.id] = hashOf(i);
    localStorage.setItem(k, JSON.stringify(out));
    localStorage.setItem(metaKey(k), JSON.stringify(nextMeta));
  }
  const { data: usage } = await supabase.rpc("vc_facility_usage");
  localStorage.setItem(USAGE_KEY, JSON.stringify(Object.fromEntries((usage ?? []).map((u) => [u.facility_id, Number(u.used)]))));
  localStorage.setItem(REJECTED_KEY, JSON.stringify(rejected));
}
