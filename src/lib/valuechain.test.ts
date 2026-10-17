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
