import { describe, expect, it } from "vitest";
import { suggestedPremium, validSaId } from "./valuechain";

describe("value chain rules", () => {
  it("rejects a made-up ID number", () => expect(validSaId("NOT-A-VALID-ID")).toBe(false));
  it("accepts a valid SA ID", () => expect(validSaId("8001015009087")).toBe(true));
  it("premium uses base rate and drought loading", () =>
    expect(suggestedPremium(250_000_000, 3.5, "Drought")).toBe(12_250_000));
});

import { diff, hashOf } from "./vc-sync";
describe("offline sync queue", () => {
  it("queues new, edited and deleted records", () => {
    const meta = { a: hashOf({ id: "a", v: 1 }), b: hashOf({ id: "b", v: 1 }) };
    const d = diff([{ id: "a", v: 1 }, { id: "b", v: 2 }, { id: "c", v: 1 }], { ...meta, gone: "x" });
    expect(d.changed.map((i) => i.id)).toEqual(["b", "c"]);
    expect(d.deleted).toEqual(["gone"]);
  });
  it("ignores server bookkeeping fields", () =>
    expect(hashOf({ id: "a", v: 1, _owner: "u" })).toBe(hashOf({ id: "a", v: 1 })));
});

import { usedAt } from "./valuechain";
import { demoData } from "./vc-demo";
describe("storage capacity", () => {
  const b = (id: string, qty: number, status: string) => ({ id, kind: "Storage", resourceId: "s", qty, from: "", date: "", status }) as never;
  it("adds unsynced active bookings to the server total", () =>
    expect(usedAt("s", [b("x", 30, "Requested"), b("y", 50, "Stored")], { s: 100 }, new Set(["y"]))).toBe(130));
  it("cancelled and declined bookings release space", () =>
    expect(usedAt("s", [b("x", 30, "Cancelled"), b("z", 20, "Declined")], {}, new Set())).toBe(0));
});
describe("demo data", () => {
  it("every booking, visit, inspection and application points at a real record", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = demoData() as Record<string, any[]>;
    const ids = (c: string) => new Set(d[c]!.map((x) => x.id));
    for (const v of [...d["visits"]!, ...d["inspections"]!]) expect(ids("farmers").has(v.farmerId as string)).toBe(true);
    for (const a of d["applications"]!) expect(ids("jobs").has(a.jobId as string)).toBe(true);
    for (const x of d["bookings"]!) expect(ids(x.kind === "Storage" ? "facilities" : "vehicles").has(x.resourceId as string)).toBe(true);
  });
});
