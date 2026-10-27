import type { FarmRecord } from "@/lib/farm";

/** Legacy stock rows have no product/unit metadata. Only explicitly typed movements participate in the ledger. */
export type StockMovement = FarmRecord & { productKey?: string; unit?: string; movementType?: "production" | "sale" | "adjustment"; referenceId?: string };
export const stockKey = (name: string) => name.trim().toLocaleLowerCase();
export function inventoryBalance(records: StockMovement[], farmId: string | null, animalId: string, product: string, unit: string) {
  return records.filter(r => r.farmId === farmId && r.animalId === animalId && r.productKey === stockKey(product) && r.unit === unit && !!r.movementType)
    .reduce((total, r) => { const n = Number(r.qty); return total + (Number.isFinite(n) ? n : 0); }, 0);
}
export function inventoryProducts(records: StockMovement[], farmId: string | null, animalId: string) {
  const products = new Map<string, { product: string; unit: string; balance: number }>();
  for (const r of records) {
    if (r.farmId !== farmId || r.animalId !== animalId || !r.productKey || !r.unit || !r.movementType) continue;
    const id = r.productKey + "|" + r.unit;
    const item = products.get(id) ?? { product: r.productKey, unit: r.unit, balance: 0 };
    const n = Number(r.qty);
    if (Number.isFinite(n)) item.balance += n;
    products.set(id, item);
  }
  return [...products.values()].sort((a, b) => a.product.localeCompare(b.product));
}