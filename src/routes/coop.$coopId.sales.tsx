import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { Screen } from "@/components/Dock";
import { supabase } from "@/integrations/supabase/client";
import { useCooperative } from "@/lib/coop";
import { useCoopSales } from "@/lib/coop-trade";

export const Route = createFileRoute("/coop/$coopId/sales")({
  head: () => ({ meta: [{ title: "Collective Sales — FarmerPlus" }] }),
  component: Sales,
});

const input =
  "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const btn =
  "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";

function Sales() {
  const { coopId } = Route.useParams();
  const { user, coop, canTrade, loading: coopLoading } = useCooperative(coopId);
  const { listings, orders, allocations, loading, reload } = useCoopSales(coopId, canTrade);
  const [commodity, setCommodity] = useState("");
  const [grade, setGrade] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [buyerName, setBuyerName] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  const available = listings.filter((l) => l.status === "available");
  const byCommodity = useMemo(() => {
    const groups: Record<string, typeof available> = {};
    for (const l of available) (groups[l.commodity] ??= []).push(l);
    return groups;
  }, [available]);

  if (!user || coopLoading || loading)
    return (
      <Screen title="Collective Sales">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Screen>
    );
  if (!coop)
    return (
      <Screen title="Collective Sales">
        <p className="text-sm text-muted-foreground">Co-operative not found.</p>
      </Screen>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commodity.trim() || !qty) return;
    const { error } = await supabase.from("cooperative_sale_listings").insert({
      cooperative_id: coopId,
      commodity: commodity.trim(),
      grade: grade.trim(),
      qty: Number(qty),
      unit: unit.trim(),
      available_from: availableFrom || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setCommodity("");
    setGrade("");
    setQty("");
    setUnit("");
    setAvailableFrom("");
    await reload();
    toast.success("Produce listed");
  };

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const createOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0 || !unitPrice) return;
    const { error } = await supabase.rpc("create_sale_order", {
      _coop: coopId,
      _listing_ids: selectedIds,
      _buyer_name: buyerName.trim(),
      _unit_price: Number(unitPrice),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setSelected({});
    setBuyerName("");
    setUnitPrice("");
    await reload();
    toast.success("Sale order created and proceeds allocated to members");
  };

  const myAllocations = allocations.filter((a) => a.user_id === user.id);
  const allocationsFor = (orderId: string) => allocations.filter((a) => a.order_id === orderId);

  const markPaid = async (orderId: string, userId: string, paid: boolean) => {
    await supabase
      .from("cooperative_sale_allocations")
      .update({ paid: !paid })
      .eq("order_id", orderId)
      .eq("user_id", userId);
    await reload();
  };
  const markDelivered = async (orderId: string, status: "delivered") => {
    await supabase.from("cooperative_sale_orders").update({ status }).eq("id", orderId);
    await reload();
  };

  return (
    <Screen title={`${coop.name} — Sales`}>
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
          <section className="rounded-2xl border bg-card p-4">
            <h2 className="mb-2 font-semibold">List produce for sale</h2>
            <form onSubmit={submit} className="space-y-2">
              <input
                className={input}
                placeholder="Commodity (e.g. maize)"
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
              />
              <input
                className={input}
                placeholder="Grade / specification"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              />
              <div className="flex gap-2">
                <input
                  className={input}
                  type="number"
                  min="0"
                  placeholder="Quantity"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
                <input
                  className={input}
                  placeholder="Unit (kg, tonnes)"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>
              <input
                className={input}
                type="date"
                placeholder="Available from"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
              />
              <button className={btn}>List produce</button>
            </form>
          </section>

          <section className="rounded-2xl border bg-card p-4 text-sm">
            <h2 className="mb-2 font-semibold">My listings</h2>
            {listings.filter((l) => l.user_id === user.id).length === 0 ? (
              <p className="text-muted-foreground">No listings yet.</p>
            ) : (
              <ul className="divide-y">
                {listings
                  .filter((l) => l.user_id === user.id)
                  .map((l) => (
                    <li key={l.id} className="flex items-center justify-between py-2">
                      <span>
                        {l.commodity} — {l.qty} {l.unit}
                      </span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
                        {l.status}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          {canTrade && Object.keys(byCommodity).length > 0 && (
            <section className="rounded-2xl border bg-card p-4">
              <h2 className="mb-2 font-semibold">Available supply, by commodity</h2>
              {Object.entries(byCommodity).map(([name, ls]) => {
                const total = ls.reduce((s, l) => s + l.qty, 0);
                return (
                  <div key={name} className="mb-3 border-b pb-2 text-sm last:border-0">
                    <p className="font-semibold">
                      {name} — total {total} {ls[0]?.unit}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {ls.map((l) => (
                        <li key={l.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!selected[l.id]}
                            onChange={(e) =>
                              setSelected((s) => ({ ...s, [l.id]: e.target.checked }))
                            }
                          />
                          <span>
                            {l.qty} {l.unit}
                            {l.grade && ` — ${l.grade}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              <form onSubmit={createOrder} className="mt-3 space-y-2">
                <input
                  className={input}
                  placeholder="Buyer name"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                />
                <input
                  className={input}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Unit price"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                />
                <button className={btn} disabled={selectedIds.length === 0}>
                  Create sale from {selectedIds.length || 0} selected
                </button>
              </form>
            </section>
          )}
        </div>

        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">Sales</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {orders.map((o) => (
                <li key={o.id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {o.commodity}
                      {o.buyer_name && ` — ${o.buyer_name}`}
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
                      {o.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Unit price: {o.unit_price} / {o.unit}
                  </p>
                  <ul className="mt-2 divide-y">
                    {allocationsFor(o.id).map((a) => (
                      <li key={a.user_id} className="flex items-center justify-between py-1">
                        <span>
                          {a.qty} {o.unit} — {a.proceeds.toFixed(2)}
                          {a.user_id === user.id && " (you)"}
                        </span>
                        {canTrade ? (
                          <button
                            onClick={() => markPaid(o.id, a.user_id, a.paid)}
                            className={`rounded-full px-2 py-0.5 text-xs ${a.paid ? "bg-success-soft text-success-foreground" : "bg-warning-soft text-warning-foreground"}`}
                          >
                            {a.paid ? "Paid" : "Mark paid"}
                          </button>
                        ) : (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${a.paid ? "bg-success-soft text-success-foreground" : "bg-warning-soft text-warning-foreground"}`}
                          >
                            {a.paid ? "Paid" : "Unpaid"}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {canTrade && o.status === "confirmed" && (
                    <button
                      onClick={() => markDelivered(o.id, "delivered")}
                      className="mt-2 text-xs font-semibold text-earth-1"
                    >
                      Mark delivered
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!canTrade && myAllocations.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Your total proceeds across sales:{" "}
              {myAllocations.reduce((s, a) => s + a.proceeds, 0).toFixed(2)}
            </p>
          )}
        </section>
      </div>
    </Screen>
  );
}
