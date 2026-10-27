import type { FarmRecord } from "@/lib/farm";

/** Legacy stock rows have no product/unit metadata. Only explicitly typed movements participate in the ledger. */
export type StockMovement = FarmRecord & { productKey?: string; unit?: string; movementType?: "production" | "sale" | "adjustment"; referenceId?: string };
const marker = "[[inventory:";
export function encodeInventoryDetail(detail: string, product: string, unit: string, type: "production" | "sale" | "adjustment", referenceId?: string) {
  return detail + "\\n" + marker + encodeURIComponent(JSON.stringify({ productKey: stockKey(product), unit, movementType: type, referenceId })) + "]]";
}
export function decodeInventoryRecord(record: StockMovement): StockMovement {
  const pos = record.detail.lastIndexOf(marker);
  if (pos < 0) return record;
  const end = record.detail.indexOf("]]", pos);
  if (end < 0) return record;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(record.detail.slice(pos + marker.length, end)));
    if (!parsed || typeof parsed !== "object") return record;
    const data = parsed as Partial<StockMovement>;
    if (typeof data.productKey !== "string" || typeof data.unit !== "string" || !["production", "sale", "adjustment"].includes(data.movementType ?? "")) return record;
    return { ...record, productKey: data.productKey, unit: data.unit, movementType: data.movementType as "production" | "sale" | "adjustment", ...(typeof data.referenceId === "string" ? { referenceId: data.referenceId } : {}) };
  } catch { return record; }
}
export const stockKey = (name: string) => name.trim().toLocaleLowerCase();
export function inventoryBalance(records: StockMovement[], farmId: string | null, animalId: string, product: string, unit: string) {
  return records.map(decodeInventoryRecord).filter(r => r.farmId === farmId && r.animalId === animalId && r.productKey === stockKey(product) && r.unit === unit && !!r.movementType)
    .reduce((total, r) => { const n = Number(r.qty); return total + (Number.isFinite(n) ? n : 0); }, 0);
}
export function inventoryProducts(records: StockMovement[], farmId: string | null, animalId: string) {
  const products = new Map<string, { product: string; unit: string; balance: number }>();
  for (const raw of records) {
    const r = decodeInventoryRecord(raw);
    if (r.farmId !== farmId || r.animalId !== animalId || !r.productKey || !r.unit || !r.movementType) continue;
    const id = r.productKey + "|" + r.unit;
    const item = products.get(id) ?? { product: r.productKey, unit: r.unit, balance: 0 };
    const n = Number(r.qty);
    if (Number.isFinite(n)) item.balance += n;
    products.set(id, item);
  }
  return [...products.values()].sort((a, b) => a.product.localeCompare(b.product));
}