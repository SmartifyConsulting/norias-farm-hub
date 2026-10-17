import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// FORUS Wallets & Payments — the Farmer Wallet is the FORUS wallet, white-labelled.
// Calls go through the server-only SDK mirror (forus-sdk.server.ts). With a test key, if the
// FORUS sandbox hasn't published an operation yet, we fall back to FORUS's documented test outcomes
// and flag the result as simulated (the browser keeps simulated history locally).
type Result<T> = { ok: true; data: T; simulated?: boolean } | { ok: false; error: string };

async function run<T>(
  fn: (f: import("./forus-sdk.server").default) => Promise<T>,
  fallback?: () => T | Promise<T>,
): Promise<Result<T>> {
  const { forusClient, ForusError, InsufficientFundsError, isTestKey } = await import("./forus-sdk.server");
  try {
    return { ok: true, data: await fn(forusClient()) };
  } catch (e) {
    console.error("FORUS", e);
    if (fallback && isTestKey() && e instanceof ForusError && (e.code === "operation_not_published" || e.status === 404)) {
      try { return { ok: true, data: await fallback(), simulated: true }; }
      catch (err) { return { ok: false, error: err instanceof Error ? err.message : "Test payment failed." }; }
    }
    if (e instanceof InsufficientFundsError) return { ok: false, error: "Not enough money in the wallet." };
    if (e instanceof ForusError) {
      if (e.code === "not_configured") return { ok: false, error: e.message };
      if (e.status === 404) return { ok: false, error: "Wallet service isn't switched on for this account yet." };
      return { ok: false, error: "Wallet service is unavailable right now." };
    }
    return { ok: false, error: "Couldn't reach the wallet service." };
  }
}

export type ForusWallet = { id: string; label?: string; currency: string; balance?: number; available_balance?: number };
export type ForusPayment = { id: string; status: string; amount: number; currency: string; reference?: string; description?: string | undefined; created_at?: string; method?: string };

const walletId = z.string().regex(/^wal_[A-Za-z0-9]+$/);
const rid = () => Math.random().toString(36).slice(2, 12) + Date.now().toString(36);

export const createWallet = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ label: z.string().min(1).max(80) }).parse(d))
  .handler(({ data }) => run<ForusWallet>(
    (f) => f.wallets.create({ currency: "ZAR", label: data.label }),
    () => ({ id: `wal_test${rid()}`, label: data.label, currency: "ZAR", balance: 0 }),
  ));

export const getWallet = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: walletId }).parse(d))
  .handler(({ data }) => run<ForusWallet>(
    (f) => f.wallets.retrieve(data.id),
    () => ({ id: data.id, currency: "ZAR", balance: 0 }),
  ));

export const listPayments = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ walletId }).parse(d))
  .handler(({ data }) => run<{ data: ForusPayment[] }>(
    (f) => f.payments.list({ wallet_id: data.walletId }),
    () => ({ data: [] }),
  ));

export const createPayment = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      walletId,
      amountCents: z.number().int().positive().max(100_000_000),
      reference: z.string().min(1).max(64),
      description: z.string().max(140).optional(),
      method: z.enum(["card", "mobile_money"]).optional(),
      cardNumber: z.string().max(25).optional(),
      mobileNumber: z.string().max(20).optional(),
    }).parse(d))
  .handler(({ data }) =>
    run<ForusPayment>(
      (f) => f.payments.create({
        amount: data.amountCents, currency: "ZAR", wallet_id: data.walletId,
        method: data.method, mobile_number: data.mobileNumber, reference: data.reference, description: data.description,
      }),
      async () => {
        const { simulateOutcome } = await import("./forus-sdk.server");
        const o = simulateOutcome({ method: data.method, card_number: data.cardNumber, mobile_number: data.mobileNumber });
        if (o.status === "failed") throw new Error(o.error);
        return {
          id: `pay_test${rid()}`, status: "completed", amount: data.amountCents, currency: "ZAR",
          reference: data.reference, description: data.description, created_at: new Date().toISOString(), method: data.method ?? "card",
        };
      },
    ));

export const creditWallet = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ walletId, amountCents: z.number().int().positive().max(100_000_000), reference: z.string().min(1).max(64) }).parse(d))
  .handler(({ data }) => run<ForusWallet>((f) => f.wallets.credit(data.walletId, { amount: data.amountCents, reference: data.reference })));

export const refundPayment = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().min(1).max(64), amountCents: z.number().int().positive().optional() }).parse(d))
  .handler(({ data }) => run<ForusPayment>((f) => f.payments.refund(data.id, { amount: data.amountCents })));

export const remittanceRate = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ from: z.string().length(3), to: z.string().length(3) }).parse(d))
  .handler(({ data }) => run((f) => f.remittances.rate(data)));
