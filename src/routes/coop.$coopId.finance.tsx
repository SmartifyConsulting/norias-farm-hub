import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { Screen } from "@/components/Dock";
import { supabase } from "@/integrations/supabase/client";
import { useCooperative } from "@/lib/coop";
import { useCoopLedger, type LedgerKind } from "@/lib/coop-governance";

export const Route = createFileRoute("/coop/$coopId/finance")({
  head: () => ({ meta: [{ title: "Finance — FarmerPlus" }] }),
  component: Finance,
});

const input =
  "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const btn =
  "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";
const KINDS: LedgerKind[] = [
  "contribution",
  "subscription",
  "share_capital",
  "loan",
  "expense",
  "other",
];

function Finance() {
  const { coopId } = Route.useParams();
  const { user, coop, canFinance, members, loading: coopLoading } = useCooperative(coopId);
  const { entries, loading, reload } = useCoopLedger(coopId, canFinance);
  const [kind, setKind] = useState<LedgerKind>("contribution");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [forMember, setForMember] = useState("");

  const totals = useMemo(() => {
    const income = entries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
    const expense = entries.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0);
    return { income, expense, net: income + expense };
  }, [entries]);
  const memberTotals = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of entries) if (e.user_id) m[e.user_id] = (m[e.user_id] ?? 0) + e.amount;
    return m;
  }, [entries]);

  if (!user || coopLoading || loading)
    return (
      <Screen title="Finance">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Screen>
    );
  if (!coop)
    return (
      <Screen title="Finance">
        <p className="text-sm text-muted-foreground">Co-operative not found.</p>
      </Screen>
    );

  const record = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    const signed = kind === "expense" ? -Math.abs(Number(amount)) : Math.abs(Number(amount));
    const { error } = await supabase.from("cooperative_ledger_entries").insert({
      cooperative_id: coopId,
      kind,
      amount: signed,
      description: description.trim(),
      user_id: forMember || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setAmount("");
    setDescription("");
    setForMember("");
    await reload();
    toast.success("Recorded");
  };

  return (
    <Screen title={`${coop.name} — Finance`}>
      <Link
        to="/coop/$coopId"
        params={{ coopId }}
        className="-mt-3 mb-4 inline-flex items-center text-sm text-muted-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {coop.name}
      </Link>

      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
        <div className="space-y-4">
          {canFinance && (
            <section className="grid grid-cols-3 gap-3">
              <div className="soft-card border p-3 text-center">
                <p className="font-display text-xl font-bold">{totals.income.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Income</p>
              </div>
              <div className="soft-card border p-3 text-center">
                <p className="font-display text-xl font-bold">{totals.expense.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Expenses</p>
              </div>
              <div className="soft-card border p-3 text-center">
                <p className="font-display text-xl font-bold">{totals.net.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Net</p>
              </div>
            </section>
          )}

          {canFinance && (
            <section className="rounded-2xl border bg-card p-4">
              <h2 className="mb-2 font-semibold">Record an entry</h2>
              <form onSubmit={record} className="space-y-2">
                <select
                  aria-label="Kind"
                  className={input}
                  value={kind}
                  onChange={(e) => setKind(e.target.value as LedgerKind)}
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k.replace("_", " ")}
                    </option>
                  ))}
                </select>
                {kind !== "expense" && kind !== "other" && (
                  <select
                    aria-label="Member"
                    className={input}
                    value={forMember}
                    onChange={(e) => setForMember(e.target.value)}
                  >
                    <option value="">Select member</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.email || m.user_id}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  className={input}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <input
                  className={input}
                  placeholder="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <button className={btn}>Record</button>
              </form>
            </section>
          )}

          {canFinance && Object.keys(memberTotals).length > 0 && (
            <section className="rounded-2xl border bg-card p-4 text-sm">
              <h2 className="mb-2 font-semibold">Member balances</h2>
              <ul className="divide-y">
                {Object.entries(memberTotals).map(([uid, total]) => {
                  const m = members.find((x) => x.user_id === uid);
                  return (
                    <li key={uid} className="flex items-center justify-between py-1">
                      <span>{m?.email || uid}</span>
                      <span>{total.toFixed(2)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <section className="rounded-2xl border bg-card p-4">
          <h2 className="mb-2 font-semibold">Ledger</h2>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {entries.map((e) => {
                const m = e.user_id ? members.find((x) => x.user_id === e.user_id) : null;
                return (
                  <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="truncate">
                      <span className="capitalize">{e.kind.replace("_", " ")}</span>
                      {m && ` — ${m.email || "member"}`}
                      {e.description && ` — ${e.description}`}
                    </span>
                    <span className={e.amount < 0 ? "text-destructive" : "text-success-foreground"}>
                      {e.amount.toFixed(2)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </Screen>
  );
}
