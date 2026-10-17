import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// FORUS Wallets & Payments — the Farmer Wallet is the FORUS wallet, white-labelled.
// Key stays server-side. Base URL overridable via FORUS_API_BASE.
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function forus<T>(path: string, init?: { method?: string; body?: unknown }): Promise<Result<T>> {
  const key = process.env["FORUS_API_KEY"];
  if (!key) return { ok: false, error: "Wallet service is not configured." };
  const base = (process.env["FORUS_API_BASE"] || "https://api.forus.digital/v1").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}${path}`, {
      method: init?.method ?? "GET",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("FORUS", res.status, path, json);
      return { ok: false, error: res.status === 404 ? "Wallet service isn't switched on for this account yet." : "Wallet service is unavailable right now." };
    }
    return { ok: true, data: json as T };
  } catch (e) {
    console.error("FORUS fetch failed", e);
    return { ok: false, error: "Couldn't reach the wallet service." };
  }
}

export type ForusWallet = { id: string; label?: string; currency: string; balance?: number; available_balance?: number };
export type ForusPayment = { id: string; status: string; amount: number; currency: string; reference?: string; description?: string; created_at?: string };

export const createWallet = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ label: z.string().min(1).max(80) }).parse(d))
  .handler(({ data }) => forus<ForusWallet>("/wallets", { method: "POST", body: { currency: "ZAR", label: data.label } }));

export const getWallet = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().regex(/^wal_[A-Za-z0-9]+$/) }).parse(d))
  .handler(({ data }) => forus<ForusWallet>(`/wallets/${data.id}`));

export const listPayments = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ walletId: z.string().regex(/^wal_[A-Za-z0-9]+$/) }).parse(d))
  .handler(({ data }) => forus<{ data: ForusPayment[] }>(`/payments?wallet_id=${data.walletId}`));

export const createPayment = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      walletId: z.string().regex(/^wal_[A-Za-z0-9]+$/),
      amountCents: z.number().int().positive().max(100_000_000),
      reference: z.string().min(1).max(64),
      description: z.string().max(140).optional(),
    }).parse(d))
  .handler(({ data }) =>
    forus<ForusPayment>("/payments", {
      method: "POST",
      body: { amount: data.amountCents, currency: "ZAR", wallet_id: data.walletId, reference: data.reference, description: data.description },
    }));
