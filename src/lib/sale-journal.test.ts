import { beforeEach, describe, expect, test, vi } from "vitest";
import { commitSalePair, recoverPendingSales } from "./sale-journal";
import type { FarmRecord } from "./farm";

const data = new Map<string, string>();
let failKey: string | null = null;
const storage = {
  getItem: vi.fn((key: string) => data.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    if (key === failKey) throw new Error("Simulated interruption");
    data.set(key, value);
  }),
};
const record = (id: string): FarmRecord => ({
  id, title: id, detail: "Sale reference: 11111111-1111-4111-8111-111111111111",
  qty: "1", date: "2026-10-28T00:00:00Z", sync: "pending", farmId: "farm-a",
});
const entries = (app: string): FarmRecord[] => JSON.parse(data.get("farmerplus:" + app) ?? "[]") as FarmRecord[];

beforeEach(() => {
  data.clear();
  failKey = null;
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
});

describe("durable sale journal", () => {
  test("writes both records and clears the journal", () => {
    commitSalePair("ref-a", record("stock-a"), record("finance-a"));
    expect(entries("stock").map(r => r.id)).toEqual(["stock-a"]);
    expect(entries("finance").map(r => r.id)).toEqual(["finance-a"]);
    expect(data.get("farmerplus:sale-journal")).toBe("[]");
  });

  test("recovers after finance write is interrupted without duplicating stock", () => {
    failKey = "farmerplus:finance";
    expect(() => commitSalePair("ref-b", record("stock-b"), record("finance-b"))).toThrow("Simulated interruption");
    expect(entries("stock")).toHaveLength(1);
    expect(entries("finance")).toHaveLength(0);
    expect(JSON.parse(data.get("farmerplus:sale-journal") ?? "[]")).toHaveLength(1);
    failKey = null;
    expect(recoverPendingSales()).toBe(1);
    expect(recoverPendingSales()).toBe(0);
    expect(entries("stock").map(r => r.id)).toEqual(["stock-b"]);
    expect(entries("finance").map(r => r.id)).toEqual(["finance-b"]);
  });

  test("recovers when the first stock write was interrupted", () => {
    failKey = "farmerplus:stock";
    expect(() => commitSalePair("ref-c", record("stock-c"), record("finance-c"))).toThrow("Simulated interruption");
    expect(entries("stock")).toHaveLength(0);
    failKey = null;
    expect(recoverPendingSales()).toBe(1);
    expect(entries("stock")).toHaveLength(1);
    expect(entries("finance")).toHaveLength(1);
  });

  test("does not replace or duplicate existing records on replay", () => {
    data.set("farmerplus:stock", JSON.stringify([record("stock-d")]));
    data.set("farmerplus:finance", JSON.stringify([record("finance-d")]));
    data.set("farmerplus:sale-journal", JSON.stringify([{ reference: "ref-d", stock: record("stock-d"), finance: record("finance-d") }]));
    expect(recoverPendingSales()).toBe(1);
    expect(entries("stock")).toHaveLength(1);
    expect(entries("finance")).toHaveLength(1);
  });
});
