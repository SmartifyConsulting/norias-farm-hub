import { describe, expect, it } from "vitest";
import { suggestedPremium, validSaId } from "./valuechain";

describe("value chain rules", () => {
  it("rejects a made-up ID number", () => expect(validSaId("NOT-A-VALID-ID")).toBe(false));
  it("accepts a valid SA ID", () => expect(validSaId("8001015009087")).toBe(true));
  it("premium uses base rate and drought loading", () =>
    expect(suggestedPremium(250_000_000, 3.5, "Drought")).toBe(12_250_000));
});
