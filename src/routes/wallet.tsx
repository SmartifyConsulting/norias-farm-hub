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
const SIM = "farmerplus:walletTestPayments";
const zar = (cents: number) => (cents / 100).toLocaleString("en-ZA", { style: "currency", currency: "ZAR" });
const PRESETS = [
  { label: "Card · success", method: "card" as const, value: "4242 4242 4242 4242" },
  { label: "Card · declined", method: "card" as const, value: "4000 0000 0000 0002" },
  { label: "Card · no funds", method: "card" as const, value: "4000 0000 0000 9995" },
  { label: "M-Pesa · success", method: "mobile_money" as const, value: "+254700000001" },
  { label: "M-Pesa · fails", method: "mobile_money" as const, value: "+254700000002" },
];

function readSim(id: string): ForusPayment[] {
  try { return (JSON.parse(localStorage.getItem(SIM) || "{}")[id] ?? []) as ForusPayment[]; } catch { return []; }
}
function writeSim(id: string, list: ForusPayment[]) {
  let all: Record<string, ForusPayment[]> = {};
  try { all = JSON.parse(localStorage.getItem(SIM) || "{}"); } catch { /* ignore */ }
  all[id] = list; localStorage.setItem(SIM, JSON.stringify(all));
}

function WalletPage() {
  const create = useServerFn(createWallet);
  const fetchWallet = useServerFn(getWallet);
  const fetchPayments = useServerFn(listPayments);
  const pay = useServerFn(createPayment);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<ForusWallet | null>(null);
  const [payments, setPayments] = useState<ForusPayment[]>([]);
  const [simulated, setSimulated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [method, setMethod] = useState<"card" | "mobile_money">("card");
  const [payer, setPayer] = useState("");

  useEffect(() => { setWalletId(localStorage.getItem(KEY)); }, []);

  const refresh = useCallback(async (id: string) => {
    const w = await fetchWallet({ data: { id } });
    if (!w.ok) return setError(w.error);
    setWallet(w.data); setError(null); setSimulated(!!w.simulated);
    const p = await fetchPayments({ data: { walletId: id } });
    if (p.ok) setPayments(p.simulated ? readSim(id) : p.data.data ?? []);
  }, [fetchWallet, fetchPayments]);

  useEffect(() => { if (walletId) refresh(walletId); }, [walletId, refresh]);

  const open = async () => {
    setBusy(true);
    const r = await create({ data: { label: "Farmer Wallet" } });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    localStorage.setItem(KEY, r.data.id); setSimulated(!!r.simulated); setWalletId(r.data.id); setWallet(r.data);
  };

  const receive = async () => {
    const cents = Math.round(parseFloat(amount) * 100);
    setNotice(null);
    if (!walletId || !cents || cents <= 0) return setError("Enter an amount in Rand.");
    setBusy(true);
    const r = await pay({ data: {
      walletId, amountCents: cents, reference: `fp_${Date.now()}`, description: desc || undefined, method,
      ...(method === "card" ? { cardNumber: payer } : { mobileNumber: payer }),
    } });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setError(null); setNotice(`Payment of ${zar(cents)} received.`);
    if (r.simulated) { const next = [r.data, ...readSim(walletId)]; writeSim(walletId, next); setPayments(next); }
    else refresh(walletId);
    setAmount(""); setDesc("");
  };

  const input = "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  const balance = simulated
    ? payments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0)
    : wallet?.available_balance ?? wallet?.balance ?? 0;

  return (
    <Screen title="Farmer Wallet">
      <div className="md:grid md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-start md:gap-6">
        <div className="space-y-4 md:sticky md:top-24">
          <div className="rounded-3xl bg-primary p-6 text-primary-foreground">
            <p className="text-xs uppercase tracking-widest opacity-80">Available balance</p>
            <p className="font-display text-4xl">{zar(balance)}</p>
            {walletId && <p className="mt-2 font-mono text-xs opacity-80">{walletId}</p>}
            {simulated && <p className="mt-2 inline-block rounded-full bg-background/20 px-2 py-0.5 text-xs font-semibold">Test mode</p>}
          </div>
          {error && <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {notice && <p className="rounded-xl border border-success/40 bg-success/10 p-3 text-sm text-success">{notice}</p>}
          {!walletId ? (
            <button disabled={busy} onClick={open} className="w-full rounded-xl bg-foreground py-3 text-sm font-semibold text-background disabled:opacity-60">
              {busy ? "Opening…" : "Open my Farmer Wallet"}
            </button>
          ) : (
            <div className="space-y-2 rounded-2xl border bg-card p-4">
              <p className="text-sm font-semibold">Receive a payment</p>
              <input className={input} placeholder="Amount (R)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <input className={input} placeholder="Description (e.g. 200kg wheat)" value={desc} onChange={(e) => setDesc(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                {(["card", "mobile_money"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => { setMethod(m); setPayer(""); }}
                    className={`rounded-xl border py-2 text-sm font-medium ${method === m ? "bg-foreground text-background" : "hover:bg-muted"}`}>
                    {m === "card" ? "Card" : "Mobile money"}
                  </button>
                ))}
              </div>
              <input className={input} placeholder={method === "card" ? "Card number" : "Mobile number (+254…)"} value={payer} onChange={(e) => setPayer(e.target.value)} />
              <button disabled={busy} onClick={receive} className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {busy ? "Processing…" : "Request payment"}
              </button>
              {simulated && (
                <div className="pt-2">
                  <p className="mb-1 text-xs text-muted-foreground">Test payers</p>
                  <div className="flex flex-wrap gap-1">
                    {PRESETS.map((p) => (
                      <button key={p.label} type="button" onClick={() => { setMethod(p.method); setPayer(p.value); if (!amount) setAmount("100"); }}
                        className="rounded-full border px-2 py-1 text-xs hover:bg-muted">{p.label}</button>
                    ))}
                  </div>
                </div>
              )}
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
