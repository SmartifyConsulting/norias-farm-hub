import { useState } from "react";
import { EmbeddedScreenContext } from "@/components/Dock";
import { PerformancePage } from "@/routes/performance";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Screen } from "@/components/Dock";
import { FarmSwitcher } from "@/components/FarmSwitcher";
import { useRecords } from "@/lib/farm";
import { useTeam } from "@/lib/team";
import { decodeInventoryRecord } from "@/lib/inventory-ledger";

export const Route = createFileRoute("/farm-overview")({ component: FarmOverview });

function FarmOverview() {
  const [tab, setTab] = useState<"overview" | "performance">("overview");
  const { current, farms, loading } = useTeam();
  const { records: animals } = useRecords("animals");
  const { records: crops } = useRecords("crops");
  const { records: stock } = useRecords("stock");
  const { records: finance } = useRecords("finance");
  const card = "rounded-2xl border bg-card p-4";
  const link = "text-sm font-semibold text-primary underline";
  if (loading) return <Screen title="Farm overview"><p>Loading farms…</p></Screen>;
  if (!current) return <Screen title="Farm overview"><p>Choose a farm below to view its animals, crops and inventory. <FarmSwitcher compact /></p>{farms.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No farms are available for this account.</p>}</Screen>;
  const own = (r: { farmId?: string | null | undefined }) => r.farmId === current.id;
  const farmAnimals = animals.filter(own);
  const farmCrops = crops.filter(own);
  const farmStock = stock.filter(own);
  const farmFinance = finance.filter(own);
  const orphanStock = farmStock.filter(r => !r.animalId && !r.cropId);
  return <Screen title={current.name}>
    <div role="tablist" aria-label="My Business sections" className="mb-5 flex gap-1 border-b">
      <button type="button" role="tab" aria-selected={tab === "overview"} onClick={() => setTab("overview")} className={tab === "overview" ? "border-b-2 border-primary px-4 py-3 text-sm font-semibold text-primary" : "px-4 py-3 text-sm text-muted-foreground"}>Business overview</button>
      <button type="button" role="tab" aria-selected={tab === "performance"} onClick={() => setTab("performance")} className={tab === "performance" ? "border-b-2 border-primary px-4 py-3 text-sm font-semibold text-primary" : "px-4 py-3 text-sm text-muted-foreground"}>Performance</button>
    </div>
    {tab === "performance" ? <EmbeddedScreenContext.Provider value={true}><PerformancePage /></EmbeddedScreenContext.Provider> : <>
    <p className="mb-5 text-sm text-muted-foreground">Farm → animals and crops → production → inventory → sales. Only records assigned to this farm appear below.</p>
    <div className="mb-5 md:hidden"><FarmSwitcher compact /></div>
    <div className="mb-5 flex flex-wrap gap-3">
      <Link to="/team" className={link}>Change farm</Link>
      <Link to="/app/$appId" params={{ appId: "animals" }} className={link}>Add animals</Link>
      <Link to="/app/$appId" params={{ appId: "crops" }} className={link}>Add crop cycles</Link>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <section className={card}><h2 className="mb-3 text-xl font-semibold">Animals ({farmAnimals.length})</h2>
        {farmAnimals.length === 0 ? <p className="text-sm text-muted-foreground">No animals assigned to this farm.</p> : farmAnimals.map(a => <div key={a.id} className="border-t py-3">
          <Link to="/animal/$animalId" params={{ animalId: a.id }} className={link}>{a.title}</Link>
          <p className="text-xs text-muted-foreground">Linked stock: {farmStock.filter(s => s.animalId === a.id).length} records · <Link to="/animal/$animalId" params={{ animalId: a.id }} className="underline">Production and sale details</Link></p>
        </div>)}
      </section>
      <section className={card}><h2 className="mb-3 text-xl font-semibold">Crop cycles ({farmCrops.length})</h2>
        {farmCrops.length === 0 ? <p className="text-sm text-muted-foreground">No crop cycles assigned to this farm.</p> : farmCrops.map(c => <div key={c.id} className="border-t py-3">
          <Link to="/crop-cycle/$cycleId" params={{ cycleId: c.id }} className={link}>{c.title}</Link>
          <p className="text-xs text-muted-foreground">Linked stock: {farmStock.filter(s => s.cropId === c.id).length} records</p>
        </div>)}
      </section>
      <section className={card}><h2 className="mb-3 text-xl font-semibold">Inventory ({farmStock.length} records)</h2>
        {farmStock.map(r => { const m = decodeInventoryRecord(r); return <div key={r.id} className="border-t py-2 text-sm"><span className="font-medium">{r.title}</span> — {r.qty} {m.unit ?? ""}<p className="text-xs text-muted-foreground">{r.animalId ? "Animal-linked" : r.cropId ? "Crop-linked" : "Farm-level / unassigned"} · {m.movementType ?? "Unclassified"} · {r.sync}</p></div>; })}
        {orphanStock.length > 0 && <p className="mt-3 rounded-lg bg-muted p-3 text-sm"> {orphanStock.length} stock record(s) are not linked to an animal or crop cycle. These cannot be sold through an animal or crop-cycle sale form.</p>}
        <Link to="/app/$appId" params={{ appId: "stock" }} className={link}>Open stock records</Link>
      </section>
      <section className={card}><h2 className="mb-3 text-xl font-semibold">Sales and finance ({farmFinance.length})</h2>
        {farmFinance.filter(r => r.title.startsWith("Sale: ")).map(r => <p key={r.id} className="border-t py-2 text-sm">{r.title} · R{r.qty} · {r.sync}</p>)}
        <p className="my-3 text-sm text-muted-foreground">Sale entry is currently available from a linked animal or crop-cycle detail screen. Farm-level stock sales are not yet supported.</p>
        <Link to="/app/$appId" params={{ appId: "finance" }} className={link}>Open finance records</Link>
      </section>
    </div>
    </>}
  </Screen>;
}
