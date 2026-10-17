// Typed 1:1 mirror of @forus/sdk (not on public npm). Swap the import when FORUS publishes it.
// Server-only: holds the secret key. Amounts are always in cents.

export class ForusError extends Error {
  constructor(message: string, public status: number, public code?: string, public raw?: unknown) {
    super(message);
    this.name = "ForusError";
  }
}
export class InsufficientFundsError extends ForusError {
  constructor(message: string, raw?: unknown) {
    super(message, 402, "insufficient_funds", raw);
    this.name = "InsufficientFundsError";
  }
}

export type Wallet = { id: string; label?: string; currency: string; balance?: number; available_balance?: number };
export type Payment = {
  id: string; status: string; amount: number; currency: string; wallet_id?: string;
  method?: "card" | "mobile_money" | string; reference?: string; description?: string; created_at?: string;
};
export type Recipient = { name: string; account: string; bank_code: string; country: string };
export type Remittance = { id: string; status: string; amount: number; source_currency: string; destination_currency: string; reference?: string };
export type Settlement = { id: string; status: string; gross_amount: number; fees: number; net_amount: number; merchant_id?: string };
export type List<T> = { data: T[]; has_more?: boolean };

type Opts = { baseUrl?: string | undefined };

export default class Forus {
  private base: string;
  constructor(private apiKey: string, opts: Opts = {}) {
    this.base = (opts.baseUrl || "https://api.forus.digital/v1").replace(/\/$/, "");
  }

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : null,
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.message || `FORUS request failed (${res.status})`;
      if (json?.error === "insufficient_funds") throw new InsufficientFundsError(msg, json);
      throw new ForusError(msg, res.status, json?.error, json);
    }
    return json as T;
  }

  private qs(q: Record<string, unknown>) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v !== undefined) p.set(k, String(v));
    const s = p.toString();
    return s ? `?${s}` : "";
  }

  wallets = {
    create: (p: { currency: string; label?: string }) => this.req<Wallet>("POST", "/wallets", p),
    retrieve: (id: string) => this.req<Wallet>("GET", `/wallets/${encodeURIComponent(id)}`),
    credit: (id: string, p: { amount: number; reference: string }) =>
      this.req<Wallet>("POST", `/wallets/${encodeURIComponent(id)}/credit`, p),
    list: (p: { limit?: number } = {}) => this.req<List<Wallet>>("GET", `/wallets${this.qs(p)}`),
  };

  payments = {
    create: (p: {
      amount: number; currency: string; wallet_id: string; method?: "card" | "mobile_money" | undefined;
      mobile_number?: string | undefined; reference: string; description?: string | undefined;
    }) => this.req<Payment>("POST", "/payments", p),
    refund: (id: string, p: { amount?: number | undefined } = {}) =>
      this.req<Payment>("POST", `/payments/${encodeURIComponent(id)}/refund`, p),
    list: (p: { wallet_id?: string; limit?: number } = {}) => this.req<List<Payment>>("GET", `/payments${this.qs(p)}`),
  };

  remittances = {
    rate: (p: { from: string; to: string }) => this.req<{ rate: number; from: string; to: string }>("GET", `/remittances/rate${this.qs(p)}`),
    create: (p: { amount: number; source_currency: string; destination_currency: string; recipient: Recipient; reference: string }) =>
      this.req<Remittance>("POST", "/remittances", p),
  };

  settlement = {
    balance: (merchantId: string) => this.req<{ available: number; pending: number; currency: string }>("GET", `/settlement/balance${this.qs({ merchant_id: merchantId })}`),
    list: (p: { merchant_id: string; status?: string }) => this.req<List<Settlement>>("GET", `/settlement${this.qs(p)}`),
    retrieve: (id: string) => this.req<Settlement>("GET", `/settlement/${encodeURIComponent(id)}`),
  };

  webhooks = {
    // HMAC-SHA256 of the raw payload, hex, timing-safe compare.
    constructEvent: async (payload: string, signature: string, secret: string) => {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
      const expected = Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
      const sig = signature.replace(/^sha256=/, "");
      let diff = sig.length ^ expected.length;
      for (let i = 0; i < Math.max(sig.length, expected.length); i++) diff |= (sig.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
      if (diff !== 0) throw new ForusError("Invalid webhook signature", 400, "invalid_signature");
      return JSON.parse(payload) as { type: string; data: unknown };
    },
  };
}

export const SANDBOX = "https://sandbox-api.forus.digital/v1";

export function isTestKey() {
  return (process.env["FORUS_API_KEY"] || "").startsWith("forus_test");
}

export function forusClient() {
  const key = process.env["FORUS_API_KEY"];
  if (!key) throw new ForusError("Wallet service is not configured.", 500, "not_configured");
  return new Forus(key, { baseUrl: process.env["FORUS_API_BASE"] || (isTestKey() ? SANDBOX : undefined) });
}

// Sandbox test outcomes published by FORUS, used while the sandbox operations are unpublished.
export function simulateOutcome(p: { method?: string; card_number?: string; mobile_number?: string }):
  { status: "completed" } | { status: "failed"; error: string } {
  if (p.method === "mobile_money") {
    const n = (p.mobile_number || "").replace(/\s/g, "");
    if (n === "+254700000001") return { status: "completed" };
    if (n === "+254700000002") return { status: "failed", error: "Mobile money transaction failed." };
    return { status: "failed", error: "Use a sandbox test number (+254700000001 or +254700000002)." };
  }
  const c = (p.card_number || "").replace(/\s/g, "");
  if (c === "4242424242424242") return { status: "completed" };
  if (c === "4000000000000002") return { status: "failed", error: "Card was declined." };
  if (c === "4000000000009995") return { status: "failed", error: "Not enough money on the card." };
  return { status: "failed", error: "Use a sandbox test card (e.g. 4242 4242 4242 4242)." };
}
