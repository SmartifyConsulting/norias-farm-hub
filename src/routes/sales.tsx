import { createFileRoute, Link } from "@tanstack/react-router";
import { Screen } from "@/components/Dock";
import { useState } from "react";
import { DirectSale } from "@/components/DirectSale";
import { permissions } from "@/lib/team";
import { useRecords } from "@/lib/farm";
import { useTeam } from "@/lib/team";
import { decodeInventoryRecord, type StockMovement } from "@/lib/inventory-ledger";

export const Route = createFileRoute("/sales")({ component: SalesHub });

function SalesHub() {
  const { current } = useTeam();
  const [selectedKey, setSelectedKey] = useState("");
  const { records: stock } = useRecords("stock");
  const { records: animals } = useRecords("animals");
  const { records: crops } = useRecords("crops");
  const { records: finance } = useRecords("finance");
  if (!current) return <Screen title="Sales"><p>Select a farm using the farm selector first.</p><Link to="/farm-overview" className="text-primary underline">Choose farm</Link></Screen>;
  const entries = stock.filter(r => r.farmId === current.id).map(r => decodeInventoryRecord(r as StockMovement));
  const balances = new Map<string, { product: string; unit: string; entity: string; entityId: string; quantity: number }>();
  for (const r of entries) {
    if (!r.productKey || !r.unit || !r.movementType) continue;
    const entity = r.animalId ? "animal" : r.cropId ? "crop" : "farm";
    const entityId = r.animalId || r.cropId || "";
    const key = [entity, entityId, r.productKey, r.unit].join("|");
    const existing = balances.get(key) ?? { product: r.productKey, unit: r.unit, entity, entityId, quantity: 0 };
    const amount = Number(r.qty);
    if (Number.isFinite(amount)) existing.quantity += amount;
    balances.set(key, existing);
  }
  const available = [...balances.values()].filter(r => r.quantity > 0);
  const sales = finance.filter(r => r.farmId === current.id && r.title.startsWith("Sale: "));
  const selected = available.find(r => [r.entity,r.entityId,r.product,r.unit].join("|") === selectedKey);
  return <Screen title={"Sales · " + current.name}>
    <p className="mb-5 text-sm text-muted-foreground">Choose an available product below. Each sale must be linked to the inventory source so stock and finance can be reconciled.</p>
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 text-xl font-semibold">Available to sell</h2>
        {available.length === 0 && <p className="text-sm text-muted-foreground">No structured stock is available for this farm. Record production against an animal or crop cycle first.</p>}
        {available.map(item => {
          const animal = animals.find(a => a.id === item.entityId && a.farmId === current.id);
          const crop = crops.find(c => c.id === item.entityId && c.farmId === current.id);
          return <div key={[item.entity,item.entityId,item.product,item.unit].join("|")} className="flex flex-wrap items-center justify-between gap-3 border-t py-3">
            <div><p className="font-semibold capitalize">{item.product}</p><p className="text-sm text-muted-foreground">{item.quantity} {item.unit} · {animal?.title ?? crop?.title ?? "Farm-level inventory"}</p></div>
            {item.entity === "animal" && animal ? <Link className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground" to="/animal/$animalId" params={{animalId:animal.id}}>Record sale</Link> :
              item.entity === "crop" && crop ? <Link className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground" to="/crop-cycle/$cycleId" params={{cycleId:crop.id}}>Record sale</Link> :
              <span className="text-xs text-muted-foreground">Farm-level sales require server support</span>}
          </div>;
        })}
      </section>
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 text-xl font-semibold">Recent sales</h2>
        {selected && <DirectSale farmId={current.id} role={current.role} item={selected} onClose={() => setSelectedKey("")} />}
        {sales.length === 0 && <p className="text-sm text-muted-foreground">No sales recorded for this farm.</p>}
        {sales.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20).map(s => <div key={s.id} className="flex items-center justify-between gap-2 border-t py-3 text-sm"><div><p className="font-semibold">{s.title}</p><p className="text-xs text-muted-foreground">{s.sync === "synced" ? "Synced" : "Pending cloud confirmation"}</p></div><span>R{s.qty}</span></div>)}
        <Link to="/app/$appId" params={{appId:"finance"}} className="mt-3 inline-block text-sm font-semibold text-primary underline">View finance ledger</Link>
      </section>
    </div>
  </Screen>;
}
