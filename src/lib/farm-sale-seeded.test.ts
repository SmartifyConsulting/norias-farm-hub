import { beforeEach, describe, expect, test, vi } from "vitest";
import { commitSalePair, recoverPendingSales } from "./sale-journal";
import { decodeInventoryRecord, encodeInventoryDetail, type StockMovement } from "./inventory-ledger";
import type { FarmRecord } from "./farm";

const db = new Map<string, string>();
const reference = "11111111-1111-4111-8111-111111111111";
const farmId = "seed-farm";
const get = (app: string): FarmRecord[] => JSON.parse(db.get("farmerplus:" + app) ?? "[]");
const balance = () => get("stock").map(r => decodeInventoryRecord(r as StockMovement))
  .filter(r => r.farmId === farmId && !r.animalId && !r.cropId && r.productKey === "maize" && r.unit === "kg")
  .reduce((sum, r) => sum + Number(r.qty), 0);
beforeEach(() => {
  db.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => db.get(k) ?? null,
    setItem: (k: string, v: string) => { db.set(k, v); },
  });
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  db.set("farmerplus:stock", JSON.stringify([{
    id: "production-1", farmId, title: "Maize harvest", detail: encodeInventoryDetail("", "maize", "kg", "production"),
    productKey: "maize", unit: "kg", movementType: "production", qty: "10", date: "2026-10-28", sync: "synced",
  }]));
});
describe("seeded farm-level maize sales", () => {
  test("selling 3 kg reduces 10 kg to 7 kg and creates R150 finance entry", () => {
    expect(balance()).toBe(10);
    const stock: StockMovement = {
      id: "sale-stock-1", farmId, title: "Sale dispatch: maize",
      detail: encodeInventoryDetail("Sale reference: " + reference, "maize", "kg", "sale", reference),
      productKey: "maize", unit: "kg", movementType: "sale", referenceId: reference,
      qty: "-3", date: "2026-10-28", sync: "pending",
    };
    const finance: FarmRecord = {
      id: "sale-finance-1", farmId, title: "Sale: maize",
      detail: "Sale reference: " + reference + "; quantity: 3",
      qty: "150", date: "2026-10-28", sync: "pending",
    };
    commitSalePair(reference, stock, finance);
    expect(balance()).toBe(7);
    expect(get("finance")).toHaveLength(1);
    expect(get("finance")[0].qty).toBe("150");
    expect(get("stock").find(r => r.id === "sale-stock-1")?.animalId).toBeUndefined();
    expect(get("stock").find(r => r.id === "sale-stock-1")?.cropId).toBeUndefined();
    expect(recoverPendingSales()).toBe(0);
    expect(balance()).toBe(7);
    expect(get("finance")).toHaveLength(1);
  });
});
