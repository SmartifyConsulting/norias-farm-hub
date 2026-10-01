import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Screen, SyncBadge } from "@/components/Dock";
import { useOnline } from "@/lib/farm";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — FarmerPlus" },
      { name: "description", content: "Track farm income and expenses in your FarmerPlus wallet." },
      { property: "og:title", content: "Wallet — FarmerPlus" },
      { property: "og:description", content: "Farm income and expenses at a glance." },
    ],
  }),
  component: WalletPage,
});

type Tx = { id: string; label: string; amount: number; date: string; sync: "synced" | "local" };

function WalletPage() {
  const online = useOnline();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  useEffect(() => { try { setTxs(JSON.parse(localStorage.getItem("farmerplus:wallet") || "[]")); } catch {} }, []);
  const persist = (n: Tx[]) => { localStorage.setItem("farmerplus:wallet", JSON.stringify(n)); setTxs(n); };
  const balance = txs.reduce((s, t) => s + t.amount, 0);
  const add = (sign: 1 | -1) => {
    const v = parseFloat(amount);
    if (!label.trim() || !v) return;
    persist([{ id: crypto.randomUUID(), label: label.trim(), amount: sign * Math.abs(v), date: new Date().toISOString(), sync: online ? "synced" : "local" }, ...txs]);
    setLabel(""); setAmount("");
  };
  const input = "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  return (
    <Screen title="Wallet">
      <div className="md:grid md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-start md:gap-6">
      <div className="md:sticky md:top-24">
      <div className="rounded-3xl bg-primary p-6 text-primary-foreground">
        <p className="text-xs uppercase tracking-widest opacity-80">Farm balance</p>
        <p className="font-display text-4xl">{balance.toLocaleString(undefined, { style: "currency", currency: "USD" })}</p>
      </div>
      <div className="mt-4 space-y-2 rounded-2xl border bg-card p-4">
        <input className={input} placeholder="Description (e.g. Sold 200kg wheat)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <input className={input} placeholder="Amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => add(1)} className="rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">+ Income</button>
          <button onClick={() => add(-1)} className="rounded-xl bg-secondary py-2 text-sm font-semibold text-secondary-foreground">− Expense</button>
        </div>
      </div>
      </div>
      <div className="mt-4 md:mt-0">
      <ul className="space-y-2 md:hidden">
        {txs.map((t) => (
          <li key={t.id} className="flex items-center justify-between rounded-2xl border bg-card p-4">
            <div>
              <p className="font-medium text-card-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString()} <SyncBadge status={t.sync} /></p>
            </div>
            <span className={`font-semibold ${t.amount < 0 ? "text-destructive" : "text-primary"}`}>{t.amount < 0 ? "−" : "+"}{Math.abs(t.amount).toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <table className="hidden w-full overflow-hidden rounded-2xl border bg-card text-sm md:table">
        <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr><th className="p-3">Description</th><th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3 text-right">Amount</th></tr>
        </thead>
        <tbody>
          {txs.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No transactions yet.</td></tr>}
          {txs.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="p-3 font-medium">{t.label}</td>
              <td className="p-3 text-muted-foreground">{new Date(t.date).toLocaleDateString()}</td>
              <td className="p-3"><SyncBadge status={t.sync} /></td>
              <td className={`p-3 text-right font-semibold ${t.amount < 0 ? "text-destructive" : "text-success"}`}>{t.amount < 0 ? "−" : "+"}{Math.abs(t.amount).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      </div>
    </Screen>
  );
}
