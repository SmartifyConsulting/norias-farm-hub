import { recoverPendingSales } from "./sale-journal";
import { decodeInventoryRecord } from "./inventory-ledger";
import { supabase } from "@/integrations/supabase/client";
import { MINI_APPS, type FarmRecord } from "./farm";
import { activeFarmId } from "./team";
import { syncValueChain, vcUnsynced } from "./vc-sync";

/** Mini-apps whose records sync to the cloud (all of them). */
const APPS = MINI_APPS.map((a) => a.id);
/** AgriSphere + wallet/settings stores backed up as whole documents. */
const DOC_KEYS = [
  "farmerplus:passport", "farmerplus:demand", "farmerplus:capacity", "farmerplus:risks", "farmerplus:pipeline",
  "farmerplus:pools", "farmerplus:pools:own", "farmerplus:batches", "farmerplus:role", "farmerplus:notify",
  "farmerplus:notify:read", "farmerplus:wallet", "farmerplus:settings", "farmerplus:vc:baseRate", "farmerplus:activeRole", "farmerplus:learning",
];
const DIRTY = "farmerplus:docs:dirty";
const key = (app: string) => `farmerplus:${app}`;
const tombKey = (app: string) => `farmerplus:${app}:deleted`;

const read = <T,>(k: string, d: T): T => {
  try { return JSON.parse(localStorage.getItem(k) || "") as T; } catch { return d; }
};

export function markDeleted(id: string, app = "animals") {
  const t = read<string[]>(tombKey(app), []);
  if (!t.includes(id)) localStorage.setItem(tombKey(app), JSON.stringify([...t, id]));
}

/** Track local edits to AgriSphere stores so the next sync uploads them. */
if (typeof window !== "undefined") {
  const orig = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k: string, v: string) {
    orig.call(this, k, v);
    if (this === window.localStorage && DOC_KEYS.includes(k) && !(window as unknown as { __fpPull?: boolean }).__fpPull) {
      const d = new Set(read<string[]>(DIRTY, []));
      if (!d.has(k)) { d.add(k); orig.call(this, DIRTY, JSON.stringify([...d])); }
    }
  };
}

let running: Promise<{ ok: boolean; error?: string }> | null = null;

/** Push unsynced records/deletions/documents for every tool, then pull the account's data. */
export function syncAll() {
  if (running) return running;
  running = (async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { ok: false, error: "Sign in to sync" };
      if (!navigator.onLine) return { ok: false, error: "Offline" };
      recoverPendingSales();
      const uidv = u.user.id;

      for (const app of APPS) {
        const tomb = read<string[]>(tombKey(app), []);
        if (tomb.length) {
          const { error } = await supabase.from("animal_records").delete().in("id", tomb);
          if (error) throw error;
          localStorage.setItem(tombKey(app), "[]");
        }
        // Sale pairs must be committed by the atomic RPC, never independent upserts.
        const unsynced = read<FarmRecord[]>(key(app), []).filter((r) => {
          if (r.sync === "synced") return false;
          if (app === "stock" && decodeInventoryRecord(r).movementType === "sale") return false;
          if (app === "finance" && r.title.startsWith("Sale: ") && /Sale reference:\s*[a-f0-9-]{36}/i.test(r.detail)) return false;
          return true;
        });
        if (unsynced.length) {
          const { error } = await supabase.from("animal_records").upsert(
            unsynced.map((r) => ({ ...((app === "stock" && decodeInventoryRecord(r).movementType) ? (() => { const stock = decodeInventoryRecord(r); return { product_key: stock.productKey ?? null, unit: stock.unit ?? null, movement_type: stock.movementType ?? null, sale_reference: stock.referenceId || null }; })() : {}), id: r.id, app, title: r.title, detail: r.detail, qty: r.qty ?? "", recorded_at: r.date, updated_at: new Date().toISOString(), farm_id: r.farmId === undefined ? activeFarmId() : r.farmId, field_id: r.fieldId ?? "", crop_id: r.cropId ?? "", due_on: r.due || null, ends_on: r.end || null, animal_id: r.animalId ?? "", repeat_days: r.repeatDays ?? null, completed: (r.completed ?? []) as never })),
          );
          if (error) throw error;
        }
      }

      // Commit sale pairs only through the server transaction. Keep local rows pending on failure.
      const localStock = read<FarmRecord[]>(key("stock"), []);
      const localFinance = read<FarmRecord[]>(key("finance"), []);
      const saleRef = (detail: string) => detail.match(/Sale reference:\\s*([a-f0-9-]{36})/i)?.[1];
      const saleErrors: string[] = [];
      for (const stockRow of localStock) {
        const movement = decodeInventoryRecord(stockRow);
        if (movement.movementType !== "sale" || stockRow.sync === "synced") continue;
        const reference = movement.referenceId ?? saleRef(stockRow.detail);
        const financeRow = localFinance.find(r => r.sync !== "synced" && saleRef(r.detail) === reference);
        if (!reference || !financeRow || !stockRow.farmId) { saleErrors.push("Sale is missing its reference, finance entry, or farm"); continue; }
        const quantity = -Number(stockRow.qty), amount = Number(financeRow.qty);
        if (!movement.productKey || !movement.unit || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(amount) || amount < 0) { saleErrors.push("Invalid pending sale"); continue; }
        const params = {
          p_sale_reference: reference, p_stock_id: stockRow.id, p_finance_id: financeRow.id,
          p_farm_id: stockRow.farmId, p_animal_id: stockRow.animalId ?? "",
          p_crop_id: stockRow.cropId ?? "", p_product: movement.productKey,
          p_unit: movement.unit, p_quantity: quantity, p_amount: amount,
        };
        const rpcClient = supabase as unknown as { rpc: (name: string, args: typeof params) => Promise<{ error: { message: string } | null }> };
        const { error: saleError } = await rpcClient.rpc("record_atomic_sale", params);
        if (saleError) { saleErrors.push(saleError.message); continue; }
        for (const [appName, id] of [["stock", stockRow.id], ["finance", financeRow.id]] as const) {
          const rows = read<FarmRecord[]>(key(appName), []);
          localStorage.setItem(key(appName), JSON.stringify(rows.map(r => r.id === id ? { ...r, sync: "synced", syncError: undefined } : r)));
        }
      }
      if (saleErrors.length) throw new Error("Pending sale not confirmed: " + saleErrors[0]);
      const { data, error } = await supabase.from("animal_records").select("*").order("recorded_at", { ascending: false });
      if (error) throw error;
      const now = new Date().toISOString();
      for (const app of APPS) {
        const merged: FarmRecord[] = (data ?? []).filter((r) => r.app === app).map((r) => ({ id: r.id, title: r.title, detail: r.detail, qty: r.qty, date: r.recorded_at, sync: "synced", syncedAt: now, farmId: r.farm_id, fieldId: r.field_id || undefined, cropId: r.crop_id || undefined, due: r.due_on ?? undefined, end: r.ends_on ?? undefined, animalId: r.animal_id || undefined, repeatDays: r.repeat_days ?? undefined, completed: Array.isArray(r.completed) ? (r.completed as string[]) : [], ...(app === "stock" ? { productKey: r.product_key ?? undefined, unit: r.unit ?? undefined, movementType: r.movement_type ?? undefined, referenceId: r.sale_reference ?? undefined } : {}) }));
        const serverIds = new Set(merged.map((r) => r.id));
        const dead = new Set(read<string[]>(tombKey(app), []));
        const fresh = read<FarmRecord[]>(key(app), []).filter((r) => r.sync !== "synced" && !serverIds.has(r.id) && !dead.has(r.id));
        localStorage.setItem(key(app), JSON.stringify([...fresh, ...merged].filter((r) => !dead.has(r.id))));
      }

      // Documents: upload dirty keys, then pull everything not dirty.
      const dirty = read<string[]>(DIRTY, []);
      if (dirty.length) {
        const rows = dirty.map((k) => ({ user_id: uidv, key: k, value: read<unknown>(k, null) as never, updated_at: now })).filter((r) => r.value !== null);
        if (rows.length) {
          const { error: e2 } = await supabase.from("user_data").upsert(rows);
          if (e2) throw e2;
        }
        localStorage.setItem(DIRTY, "[]");
      }
      const { data: docs, error: e3 } = await supabase.from("user_data").select("key,value");
      if (e3) throw e3;
      const w = window as unknown as { __fpPull?: boolean };
      w.__fpPull = true;
      try {
        const stillDirty = new Set(read<string[]>(DIRTY, []));
        for (const d of docs ?? []) if (!stillDirty.has(d.key)) localStorage.setItem(d.key, JSON.stringify(d.value));
      } finally { w.__fpPull = false; }

      await syncValueChain(uidv);
      const refused = Object.values(read<Record<string, string>>("farmerplus:vc:rejected", {}));
      if (refused.length) import("sonner").then(({ toast }) => toast.error(`${refused.length} change(s) were refused: ${refused[0]}`));

      localStorage.setItem("farmerplus:lastSynced", new Date().toISOString());
      window.dispatchEvent(new Event("farmerplus:change"));
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Sync failed";
      for (const app of APPS) {
        const local = read<FarmRecord[]>(key(app), []).map((r) => (r.sync !== "synced" ? { ...r, syncError: msg } : r));
        localStorage.setItem(key(app), JSON.stringify(local));
      }
      window.dispatchEvent(new Event("farmerplus:change"));
      return { ok: false, error: msg };
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Back-compat alias. */
export const syncAnimals = syncAll;

export function unsyncedCount() {
  let n = read<string[]>(DIRTY, []).length + vcUnsynced();
  for (const app of APPS) n += read<FarmRecord[]>(key(app), []).filter((r) => r.sync !== "synced").length + read<string[]>(tombKey(app), []).length;
  return n;
}
export const unsyncedAnimalCount = unsyncedCount;
