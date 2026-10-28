import { useState } from "react";
import { toast } from "sonner";
import { useUser } from "@/lib/auth";
import { read } from "@/lib/farm";
import type { FarmRecord } from "@/lib/farm";
import { permissions, type FarmRole } from "@/lib/team";
import { decodeInventoryRecord, encodeInventoryDetail, type StockMovement } from "@/lib/inventory-ledger";
import { commitSalePair, recoverPendingSales } from "@/lib/sale-journal";
import { syncAnimals } from "@/lib/animal-sync";

export type SaleProduct = { product: string; unit: string; entity: string; entityId: string; quantity: number };

export function DirectSale({ farmId, role, item, onClose }: { farmId: string; role: FarmRole; item: SaleProduct; onClose: () => void }) {
  const { user } = useUser();
  const [quantity, setQuantity] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !permissions(role).canWrite || item.entity === "farm") return;
    if (!user || !navigator.onLine) { toast.error("Sign in and connect to record a sale."); return; }
    const qty = Number(quantity), total = Number(amount);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(total) || total < 0) {
      toast.error("Enter a positive quantity and a valid total amount."); return;
    }
    recoverPendingSales();
    const balance = read("stock").map(r => decodeInventoryRecord(r as StockMovement))
      .filter(r => r.farmId === farmId && (r.animalId || "") === (item.entity === "animal" ? item.entityId : "") &&
        (r.cropId || "") === (item.entity === "crop" ? item.entityId : "") &&
        r.productKey === item.product && r.unit === item.unit && !!r.movementType)
      .reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
    if (qty > balance) { toast.error("Insufficient stock. Review the current balance."); return; }
    if (!window.confirm("Sell " + qty + " " + item.unit + " of " + item.product + " for R" + total.toFixed(2) + "?")) return;
    setSaving(true);
    try {
      const reference = crypto.randomUUID();
      const base = { date: new Date().toISOString(), sync: "pending" as const, farmId,
        ...(item.entity === "animal" ? { animalId: item.entityId } : { cropId: item.entityId }) };
      const stock: StockMovement = { ...base, id: crypto.randomUUID(), title: "Sale dispatch: " + item.product,
        detail: encodeInventoryDetail("Sale reference: " + reference, item.product, item.unit, "sale", reference),
        qty: String(-qty), productKey: item.product, unit: item.unit, movementType: "sale", referenceId: reference };
      const finance: FarmRecord = { ...base, id: crypto.randomUUID(), title: "Sale: " + item.product,
        detail: "Sale reference: " + reference + "; quantity: " + qty, qty: String(total) };
      commitSalePair(reference, stock, finance);
      onClose();
      const result = await syncAnimals();
      if (result.ok) toast.success("Sale recorded and synchronised.");
      else toast.error("Sale saved locally, but cloud confirmation is pending. Do not enter it again.");
    } finally { setSaving(false); }
  };
  return <section className="rounded-2xl border bg-card p-5">
    <h2 className="mb-2 text-xl font-semibold">Sell {item.product}</h2>
    <p className="mb-3 text-sm text-muted-foreground">Available: {item.quantity} {item.unit} · {item.entity} inventory</p>
    <form onSubmit={submit} className="grid gap-3">
      <label className="text-sm">Quantity ({item.unit})<input required type="number" min="0.001" step="any" max={item.quantity} value={quantity} onChange={e => setQuantity(e.target.value)} className="mt-1 block w-full rounded-lg border bg-background p-2" /></label>
      <label className="text-sm">Total amount (R)<input required type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 block w-full rounded-lg border bg-background p-2" /></label>
      <button disabled={saving} className="rounded-lg bg-primary p-3 font-semibold text-primary-foreground disabled:opacity-50">{saving ? "Recording…" : "Confirm sale"}</button>
      <button type="button" onClick={onClose} className="text-sm underline">Cancel</button>
    </form>
  </section>;
}
