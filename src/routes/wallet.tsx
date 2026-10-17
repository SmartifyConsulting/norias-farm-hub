import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Screen } from "@/components/Dock";
import { createPayment, createWallet, getWallet, listPayments, type ForusPayment, type ForusWallet } from "@/lib/forus.functions";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Farmer Wallet — FarmerPlus" },
      { name: "description", content: "Your FarmerPlus Farmer Wallet: balance, payments and payouts in ZAR." },
      { property: "og:title", content: "Farmer Wallet — FarmerPlus" },
      { property: "og:description", content: "Receive and send farm payments in ZAR." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WalletPage,
});

const KEY = "farmerplus:walletId";
const zar = (cents: number) => (cents / 100).toLocaleString("en-ZA", { style: "currency", currency: "ZAR" });

function WalletPage() {
  const create = useServerFn(createWallet);
  const fetchWallet = useServerFn(getWallet);
  const fetchPayments = useServerFn(listPayments);
  const pay = useServerFn(createPayment);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<ForusWallet | null>(null);
  const [payments, setPayments] = useState<ForusPayment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => { setWalletId(localStorage.getItem(KEY)); }, []);

  const refresh = useCallback(async (id: string) => {
    const w = await fetchWallet({ data: { id } });
    if (!w.ok) return setError(w.error);
    setWallet(w.data); setError(null);
    const p = await fetchPayments({ data: { walletId: id } });
    if (p.ok) setPayments(p.data.data ?? []);
  }, [fetchWallet, fetchPayments]);

  useEffect(() => { if (walletId) refresh(walletId); }, [walletId, refresh]);

  const open = async () => {
    setBusy(true);
    const r = await create({ data: { label: "Farmer Wallet" } });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    localStorage.setItem(KEY, r.data.id); setWalletId(r.data.id); setWallet(r.data);
  };

  const receive = async () => {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!walletId || !cents || cents <= 0) return;
    setBusy(true);
    const r = await pay({ data: { walletId, amountCents: cents, reference: `fp_${Date.now()}`, description: desc || undefined } });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setAmount(""); setDesc(""); refresh(walletId);
  };

  const input = "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  const balance = wallet?.available_balance ?? wallet?.balance ?? 0;

  return (
    <Screen title="Farmer Wallet">
      <div className="md:grid md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-start md:gap-6">
        <div className="space-y-4 md:sticky md:top-24">
          <div className="rounded-3xl bg-primary p-6 text-primary-foreground">
            <p className="text-xs uppercase tracking-widest opacity-80">Available balance</p>
            <p className="font-display text-4xl">{zar(balance)}</p>
            {walletId && <p className="mt-2 font-mono text-xs opacity-80">{walletId}</p>}
          </div>
          {error && <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {!walletId ? (
            <button disabled={busy} onClick={open} className="w-full rounded-xl bg-foreground py-3 text-sm font-semibold text-background disabled:opacity-60">
              {busy ? "Opening…" : "Open my Farmer Wallet"}
            </button>
          ) : (
            <div className="space-y-2 rounded-2xl border bg-card p-4">
              <p className="text-sm font-semibold">Receive a payment</p>
              <input className={input} placeholder="Amount (R)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <input className={input} placeholder="Description (e.g. 200kg wheat)" value={desc} onChange={(e) => setDesc(e.target.value)} />
              <button disabled={busy} onClick={receive} className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {busy ? "Processing…" : "Request payment"}
              </button>
            </div>
          )}
        </div>
        <div className="mt-4 md:mt-0">
          <ul className="space-y-2">
            {payments.length === 0 && <li className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">No payments yet.</li>}
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-2xl border bg-card p-4">
                <div>
                  <p className="font-medium">{p.description || p.reference || "Payment"}</p>
                  <p className="text-xs text-muted-foreground">{p.created_at ? new Date(p.created_at).toLocaleDateString("en-ZA") : ""} · {p.status}</p>
                </div>
                <span className="font-semibold text-success">+{zar(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Screen>
  );
}
