import { describe, expect, test } from "vitest";
import { decodeInventoryRecord, encodeInventoryDetail, inventoryBalance, inventoryProducts, type StockMovement } from "./inventory-ledger";

const base = { date: "2026-10-28T00:00:00Z", sync: "local" as const, farmId: "farm-a", animalId: "animal-a" };
const movement = (id: string, product: string, unit: string, qty: number, type: "production" | "sale" = "production"): StockMovement => ({
  ...base, id, title: product, detail: encodeInventoryDetail("test", product, unit, type), qty: String(qty),
});

describe("livestock inventory ledger", () => {
  test("round-trips structured movements through detail-only cloud storage", () => {
    const original = movement("one", "Milk", "litres", 12);
    const restored = decodeInventoryRecord({ ...base, id: original.id, title: original.title, detail: original.detail, qty: original.qty });
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
  test("malformed metadata does not invent inventory", () => {
    const bad: StockMovement = { ...base, id: "bad", title: "Milk", detail: "[[inventory:invalid]]", qty: "50" };
    expect(inventoryProducts([bad], "farm-a", "animal-a")).toEqual([]);
  });
});
