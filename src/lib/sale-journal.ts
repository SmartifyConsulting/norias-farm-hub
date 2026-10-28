import { read, type FarmRecord } from "./farm";

const JOURNAL = "farmerplus:sale-journal";
type PendingSale = { reference: string; stock: FarmRecord; finance: FarmRecord };
const load = (): PendingSale[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(JOURNAL) || "[]");
    return Array.isArray(value) ? value.filter((x): x is PendingSale =>
      !!x && typeof x === "object" && typeof x.reference === "string" &&
      !!x.stock && typeof x.stock.id === "string" && !!x.finance && typeof x.finance.id === "string") : [];
  } catch { return []; }
};
const persist = (pending: PendingSale[]) => localStorage.setItem(JOURNAL, JSON.stringify(pending));
const notify = () => window.dispatchEvent(new Event("farmerplus:change"));

/** Replay durable sale pairs after an interrupted two-key localStorage write.
 * This provides local crash recovery, not cross-device/database atomicity.
 */
export function recoverPendingSales() {
  const pending = load();
  if (!pending.length) return 0;
  for (const sale of pending) {
    for (const [app, record] of [["stock", sale.stock], ["finance", sale.finance]] as const) {
      const existing = read(app);
      if (!existing.some(r => r.id === record.id)) {
        localStorage.setItem("farmerplus:" + app, JSON.stringify([record, ...existing]));
      }
    }
    persist(load().filter(item => item.reference !== sale.reference));
  }
  notify();
  return pending.length;
}

/** Journal first; replay missing half on reload or before the next sale/sync. */
export function commitSalePair(reference: string, stock: FarmRecord, finance: FarmRecord) {
  recoverPendingSales();
  persist([...load(), { reference, stock, finance }]);
  recoverPendingSales();
}
