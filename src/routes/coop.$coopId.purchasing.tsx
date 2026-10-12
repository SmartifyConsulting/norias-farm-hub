import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { Screen } from "@/components/Dock";
import { supabase } from "@/integrations/supabase/client";
import { useCooperative } from "@/lib/coop";
import { useCoopPurchasing } from "@/lib/coop-trade";

export const Route = createFileRoute("/coop/$coopId/purchasing")({
  head: () => ({ meta: [{ title: "Collective Purchasing — FarmerPlus" }] }),
  component: Purchasing,
});

const input =
  "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const btn =
  "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";

function Purchasing() {
  const { coopId } = Route.useParams();
  const { user, coop, canTrade, loading: coopLoading } = useCooperative(coopId);
  const { requests, orders, allocations, loading, reload } = useCoopPurchasing(coopId, canTrade);
  const [item, setItem] = useState("");
  const [category, setCategory] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [supplierName, setSupplierName] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  const open = requests.filter((r) => r.status === "open");
  const byItem = useMemo(() => {
    const groups: Record<string, typeof open> = {};
    for (const r of open) (groups[r.item] ??= []).push(r);
    return groups;
  }, [open]);

  if (!user || coopLoading || loading)
    return (
      <Screen title="Collective Purchasing">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Screen>
    );
  if (!coop)
    return (
      <Screen title="Collective Purchasing">
        <p className="text-sm text-muted-foreground">Co-operative not found.</p>
      </Screen>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.trim() || !qty) return;
    const { error } = await supabase.from("cooperative_purchase_requests").insert({
      cooperative_id: coopId,
      item: item.trim(),
      category: category.trim(),
      qty: Number(qty),
      unit: unit.trim(),
      needed_by: neededBy || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setItem("");
    setCategory("");
    setQty("");
    setUnit("");
    setNeededBy("");
    await reload();
    toast.success("Request submitted");
  };

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const createOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0 || !unitPrice) return;
    const { error } = await supabase.rpc("create_purchase_order", {
      _coop: coopId,
      _request_ids: selectedIds,
      _supplier_name: supplierName.trim(),
      _unit_price: Number(unitPrice),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setSelected({});
    setSupplierName("");
    setUnitPrice("");
    await reload();
    toast.success("Order created and allocated to members");
  };

  const myAllocations = allocations.filter((a) => a.user_id === user.id);
  const allocationsFor = (orderId: string) => allocations.filter((a) => a.order_id === orderId);

  const markPaid = async (orderId: string, userId: string, paid: boolean) => {
    await supabase
      .from("cooperative_purchase_allocations")
      .update({ paid: !paid })
      .eq("order_id", orderId)
      .eq("user_id", userId);
    await reload();
  };
  const markDelivered = async (orderId: string, status: "delivered") => {
    await supabase.from("cooperative_purchase_orders").update({ status }).eq("id", orderId);
    await reload();
  };

  return (
    <Screen title={`${coop.name} — Purchasing`}>
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
            <h2 className="mb-2 font-semibold">Request an input</h2>
            <form onSubmit={submit} className="space-y-2">
              <input
                className={input}
                placeholder="Item (e.g. maize seed)"
                value={item}
                onChange={(e) => setItem(e.target.value)}
              />
              <input
                className={input}
                placeholder="Category (e.g. seed, fertiliser)"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
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
                  placeholder="Unit (kg, bags)"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>
              <input
                className={input}
                type="date"
                placeholder="Needed by"
                value={neededBy}
                onChange={(e) => setNeededBy(e.target.value)}
              />
              <button className={btn}>Submit request</button>
            </form>
          </section>

          <section className="rounded-2xl border bg-card p-4 text-sm">
            <h2 className="mb-2 font-semibold">My requests</h2>
            {requests.filter((r) => r.user_id === user.id).length === 0 ? (
              <p className="text-muted-foreground">No requests yet.</p>
            ) : (
              <ul className="divide-y">
                {requests
                  .filter((r) => r.user_id === user.id)
                  .map((r) => (
                    <li key={r.id} className="flex items-center justify-between py-2">
                      <span>
                        {r.item} — {r.qty} {r.unit}
                      </span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
                        {r.status}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          {canTrade && Object.keys(byItem).length > 0 && (
            <section className="rounded-2xl border bg-card p-4">
              <h2 className="mb-2 font-semibold">Open demand, by item</h2>
              {Object.entries(byItem).map(([itemName, reqs]) => {
                const total = reqs.reduce((s, r) => s + r.qty, 0);
                return (
                  <div key={itemName} className="mb-3 border-b pb-2 text-sm last:border-0">
                    <p className="font-semibold">
                      {itemName} — total {total} {reqs[0]?.unit}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {reqs.map((r) => (
                        <li key={r.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!selected[r.id]}
                            onChange={(e) =>
                              setSelected((s) => ({ ...s, [r.id]: e.target.checked }))
                            }
                          />
                          <span>
                            {r.qty} {r.unit}
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
                  placeholder="Supplier name"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
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
                  Create order from {selectedIds.length || 0} selected
                </button>
              </form>
            </section>
          )}
        </div>

        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">Orders</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {orders.map((o) => (
                <li key={o.id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {o.item}
                      {o.supplier_name && ` — ${o.supplier_name}`}
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
                          {a.qty} {o.unit} — {a.cost.toFixed(2)}
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
              Your total across orders: {myAllocations.reduce((s, a) => s + a.cost, 0).toFixed(2)}
            </p>
          )}
        </section>
      </div>
    </Screen>
  );
}
