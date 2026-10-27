import { describe, expect, test } from "vitest";
import { decodeInventoryRecord, encodeInventoryDetail, inventoryBalance, inventoryProducts, saleReconciliation, type StockMovement } from "./inventory-ledger";

const base = { date: "2026-10-28T00:00:00Z", sync: "local" as const, farmId: "farm-a", animalId: "animal-a" };
const movement = (id: string, product: string, unit: string, qty: number, type: "production" | "sale" = "production"): StockMovement => ({
  ...base, id, title: product, detail: encodeInventoryDetail("test", product, unit, type), qty: String(qty),
});

describe("livestock inventory ledger", () => {
  test("round-trips structured movements through detail-only cloud storage", () => {
    const original = movement("one", "Milk", "litres", 12);
    const restored = decodeInventoryRecord({ ...base, id: original.id, title: original.title, detail: original.detail, qty: original.qty ?? "" });
    expect(restored.productKey).toBe("milk");
    expect(restored.unit).toBe("litres");
    expect(restored.movementType).toBe("production");
  });
  test("isolates farm, animal, product and unit", () => {
    const rows = [
      movement("one", "Milk", "litres", 12),
      movement("two", "milk", "litres", -4, "sale"),
      movement("three", "Eggs", "dozens", 9),
      { ...movement("four", "Milk", "litres", 100), farmId: "farm-b" },
      { ...movement("five", "Milk", "litres", 100), animalId: "animal-b" },
      movement("six", "Milk", "kg", 20),
    ];
    expect(inventoryBalance(rows, "farm-a", "animal-a", "milk", "litres")).toBe(8);
    expect(inventoryBalance(rows, "farm-a", "animal-a", "Milk", "kg")).toBe(20);
    expect(inventoryProducts(rows, "farm-a", "animal-a")).toHaveLength(3);
  });
  test("excludes unstructured legacy rows from balances", () => {
    const legacy: StockMovement = { ...base, id: "legacy", title: "Milk", detail: "old record", qty: "500" };
    expect(inventoryBalance([legacy], "farm-a", "animal-a", "Milk", "litres")).toBe(0);
  });
  test("detects unmatched sale records in either direction", () => {
    const id1 = "11111111-1111-4111-8111-111111111111";
    const id2 = "22222222-2222-4222-8222-222222222222";
    const stock = [{ ...movement("sale1", "Milk", "litres", -2, "sale"), detail: encodeInventoryDetail("Sale reference: " + id1, "Milk", "litres", "sale", id1) }];
    const finance = [{ ...base, id: "payment2", title: "Sale: Milk", detail: "Sale reference: " + id2, qty: "50" }];
    expect(saleReconciliation(stock, finance, "farm-a", "animal-a")).toEqual({ missingFinance: [id1], missingStock: [id2] });
  });
  test("matched sale pair has no reconciliation warning", () => {
    const ref = "33333333-3333-4333-8333-333333333333";
    const stock = [{ ...movement("dispatch", "Milk", "litres", -3, "sale"), detail: encodeInventoryDetail("Sale reference: " + ref, "Milk", "litres", "sale", ref) }];
    const finance = [{ ...base, id: "invoice", title: "Sale: Milk", detail: "Sale reference: " + ref, qty: "90" }];
    expect(saleReconciliation(stock, finance, "farm-a", "animal-a")).toEqual({ missingFinance: [], missingStock: [] });
    expect(saleReconciliation(stock, finance, "farm-b", "animal-a")).toEqual({ missingFinance: [], missingStock: [] });
  });
  test("malformed metadata does not invent inventory", () => {
    const bad: StockMovement = { ...base, id: "bad", title: "Milk", detail: "[[inventory:invalid]]", qty: "50" };
    expect(inventoryProducts([bad], "farm-a", "animal-a")).toEqual([]);
  });
});
