import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// FORUS Wallets & Payments — the Farmer Wallet is the FORUS wallet, white-labelled.
// Calls go through the server-only SDK mirror (forus-sdk.server.ts).
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: (f: import("./forus-sdk.server").default) => Promise<T>): Promise<Result<T>> {
  const { forusClient, ForusError, InsufficientFundsError } = await import("./forus-sdk.server");
  try {
    return { ok: true, data: await fn(forusClient()) };
  } catch (e) {
    console.error("FORUS", e);
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
export type ForusPayment = { id: string; status: string; amount: number; currency: string; reference?: string; description?: string; created_at?: string };

const walletId = z.string().regex(/^wal_[A-Za-z0-9]+$/);

export const createWallet = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ label: z.string().min(1).max(80) }).parse(d))
  .handler(({ data }) => run<ForusWallet>((f) => f.wallets.create({ currency: "ZAR", label: data.label })));

export const getWallet = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: walletId }).parse(d))
  .handler(({ data }) => run<ForusWallet>((f) => f.wallets.retrieve(data.id)));

export const listPayments = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ walletId }).parse(d))
  .handler(({ data }) => run<{ data: ForusPayment[] }>((f) => f.payments.list({ wallet_id: data.walletId })));

export const createPayment = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      walletId,
      amountCents: z.number().int().positive().max(100_000_000),
      reference: z.string().min(1).max(64),
      description: z.string().max(140).optional(),
      method: z.enum(["card", "mobile_money"]).optional(),
    }).parse(d))
  .handler(({ data }) =>
    run<ForusPayment>((f) =>
      f.payments.create({
        amount: data.amountCents, currency: "ZAR", wallet_id: data.walletId,
        method: data.method, reference: data.reference, description: data.description,
      })));

export const creditWallet = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ walletId, amountCents: z.number().int().positive().max(100_000_000), reference: z.string().min(1).max(64) }).parse(d))
  .handler(({ data }) => run<ForusWallet>((f) => f.wallets.credit(data.walletId, { amount: data.amountCents, reference: data.reference })));

export const refundPayment = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().min(1).max(64), amountCents: z.number().int().positive().optional() }).parse(d))
  .handler(({ data }) => run<ForusPayment>((f) => f.payments.refund(data.id, { amount: data.amountCents })));

export const remittanceRate = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ from: z.string().length(3), to: z.string().length(3) }).parse(d))
  .handler(({ data }) => run((f) => f.remittances.rate(data)));
