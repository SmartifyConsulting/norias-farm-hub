import { CoopDirectory } from "@/routes/coop.index";
import { GovProgrammesPage } from "@/routes/gov-programmes";
import { EmbeddedScreenContext } from "@/components/Dock";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Screen } from "@/components/Dock";
import { useStore } from "@/lib/network";
import { useTeam } from "@/lib/team";
import { Plus, Users, CalendarCheck, Truck, ChartNoAxesCombined, Wallet, ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/programmes")({ component: Programmes });
type Workstream = { id: string; name: string; owner: string; due: string; status: "Planned" | "In progress" | "Completed"; target: string };
type Programme = { id: string; name: string; sponsor: string; start: string; end: string; budget: string; goal: string; workstreams: Workstream[] };
const TEMPLATE: Programme = { id: "ecd-nutrition-template", name: "ECD Nutrition Support — illustrative template", sponsor: "", start: "", end: "", budget: "", goal: "Coordinate farmer sourcing, food procurement, warehousing, packing, delivery and outcome reporting.", workstreams: [
  { id: "procurement", name: "Farmer onboarding & procurement", owner: "", due: "", status: "Planned", target: "Verified participating farmers and supply commitments" },
  { id: "warehouse", name: "Warehousing & quality control", owner: "", due: "", status: "Planned", target: "Stock receipt, inspection and traceability" },
  { id: "packaging", name: "Food packaging & allocation", owner: "", due: "", status: "Planned", target: "Packed quantities allocated to centres" },
  { id: "distribution", name: "Distribution to ECD centres", owner: "", due: "", status: "Planned", target: "Deliveries confirmed and exceptions tracked" },
  { id: "reporting", name: "Payments, monitoring & reporting", owner: "", due: "", status: "Planned", target: "Payments reconciled and delivery KPIs reported" },
]};
function Programmes() {
  const { current } = useTeam();
  const [programmes, setProgrammes] = useStore<Programme[]>("farmerplus:programme:workspace:v1", []);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [tab, setTab] = useState(0);
  const selected = programmes.find(p => p.id === selectedId) ?? programmes[0];
  const update = (next: Programme) => setProgrammes(programmes.map(p => p.id === next.id ? next : p));
  const create = (p: Programme) => { setProgrammes([...programmes, p]); setSelectedId(p.id); };
  const add = () => { if (!name.trim()) return; create({ id: crypto.randomUUID(), name: name.trim(), sponsor: "", start: "", end: "", budget: "", goal: "", workstreams: [] }); setName(""); };
  const input = "w-full rounded-lg border bg-background p-2 text-sm";
  return <Screen title="Networks & Programmes">
    <p className="mb-5 text-sm text-muted-foreground">Coordinate programmes, farmers, resources, milestones, deliveries and measurable outcomes. This is a development workspace; tender-specific compliance must be validated against the tender documents.</p>
    <div role="tablist" aria-label="Networks and programmes" className="mb-5 flex gap-1 overflow-x-auto border-b">
      {(["Programmes", "Cooperatives & networks", "Government support", "Grants & funding"] as const).map((label, index) => <button key={label} role="tab" aria-selected={tab === index} onClick={() => setTab(index)} className={tab === index ? "shrink-0 border-b-2 border-primary px-4 py-3 text-sm font-semibold text-primary" : "shrink-0 px-4 py-3 text-sm text-muted-foreground"}>{label}</button>)}
    </div>
    {tab !== 0 ? tab === 1 ? <EmbeddedScreenContext.Provider value={true}><CoopDirectory /></EmbeddedScreenContext.Provider> : tab === 2 ? <EmbeddedScreenContext.Provider value={true}><GovProgrammesPage /></EmbeddedScreenContext.Provider> : <section role="tabpanel" className="min-h-48 py-4"><h2 className="text-xl font-semibold">{["", "Cooperatives & networks", "Government support", "Grants & funding"][tab]}</h2><p className="my-3 text-sm text-muted-foreground">Open the existing workspace to manage this area.</p>{tab === 1 ? <Link className="text-primary underline" to="/coop">Open cooperatives</Link> : tab === 2 ? <Link className="text-primary underline" to="/gov-programmes">Open government support</Link> : <Link className="text-primary underline" to="/app/$appId" params={{appId:"grants"}}>Open grants</Link>}</section> :
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-2xl border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">My programmes</h2>
        {programmes.map(p => <button key={p.id} onClick={() => setSelectedId(p.id)} className={selected?.id === p.id ? "mb-2 w-full rounded-lg bg-primary p-3 text-left text-sm font-semibold text-primary-foreground" : "mb-2 w-full rounded-lg border p-3 text-left text-sm"}>{p.name}</button>)}
        <label className="mt-3 block text-xs font-semibold">New programme<input className={input + " mt-1"} value={name} onChange={e => setName(e.target.value)} placeholder="Programme name" /></label>
        <button onClick={add} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary p-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Create programme</button>
        <button onClick={() => create({ ...TEMPLATE, id: crypto.randomUUID() })} className="mt-2 w-full rounded-lg border p-2 text-sm">Use ECD nutrition template</button>
        <p className="mt-3 text-xs text-muted-foreground">Working farm: {current?.name ?? "Not selected"}. Draft programme details are saved on this device, not yet shared across users.</p>
      </aside>
      <div className="space-y-5">
        {!selected ? <div className="rounded-2xl border bg-card p-8 text-center"><h2 className="text-xl font-semibold">Create a programme to begin</h2><p className="mt-2 text-sm text-muted-foreground">Define the objective, delivery period, budget, workstreams and performance measures.</p></div> : <>
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-xl font-semibold">Programme setup</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {([["name","Programme name"],["sponsor","Sponsor / contracting authority"],["start","Start date"],["end","End date"],["budget","Budget (R)"],["goal","Purpose and expected outcomes"]] as const).map(([key,label]) => <label key={key} className={key === "goal" ? "text-sm sm:col-span-2" : "text-sm"}>{label}<input type={key === "start" || key === "end" ? "date" : "text"} className={input + " mt-1"} value={selected[key]} onChange={e => update({ ...selected, [key]: e.target.value })} /></label>)}
            </div>
          </section>
          <section className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-xl font-semibold">Workstreams & milestones</h2><button className="rounded-lg border px-3 py-2 text-sm" onClick={() => update({ ...selected, workstreams: [...selected.workstreams, { id: crypto.randomUUID(), name: "New workstream", owner: "", due: "", status: "Planned", target: "" }] })}>Add workstream</button></div>
            {selected.workstreams.length === 0 && <p className="text-sm text-muted-foreground">Add a workstream to assign responsibilities, deadlines and measurable deliverables.</p>}
            <div className="space-y-3">{selected.workstreams.map(w => <div key={w.id} className="rounded-xl border p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs">Workstream<input className={input} value={w.name} onChange={e => update({ ...selected, workstreams: selected.workstreams.map(x => x.id === w.id ? { ...x, name: e.target.value } : x) })} /></label>
                <label className="text-xs">Responsible party<input className={input} value={w.owner} onChange={e => update({ ...selected, workstreams: selected.workstreams.map(x => x.id === w.id ? { ...x, owner: e.target.value } : x) })} /></label>
                <label className="text-xs">Due date<input type="date" className={input} value={w.due} onChange={e => update({ ...selected, workstreams: selected.workstreams.map(x => x.id === w.id ? { ...x, due: e.target.value } : x) })} /></label>
                <label className="text-xs">Status<select className={input} value={w.status} onChange={e => update({ ...selected, workstreams: selected.workstreams.map(x => x.id === w.id ? { ...x, status: e.target.value as Workstream["status"] } : x) })}><option>Planned</option><option>In progress</option><option>Completed</option></select></label>
                <label className="text-xs sm:col-span-2">Deliverable / KPI<input className={input} value={w.target} onChange={e => update({ ...selected, workstreams: selected.workstreams.map(x => x.id === w.id ? { ...x, target: e.target.value } : x) })} /></label>
              </div>
            </div>)}</div>
          </section>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-4"><CalendarCheck className="mb-2 text-primary" /><p className="text-2xl font-semibold">{selected.workstreams.filter(w => w.status === "Completed").length}/{selected.workstreams.length}</p><p className="text-xs text-muted-foreground">Milestones completed</p></div>
            <Link to="/trade-delivery" className="rounded-xl border bg-card p-4"><Truck className="mb-2 text-primary" /><p className="font-semibold">Procurement & delivery</p><p className="text-xs text-muted-foreground">Open trade workflows</p></Link>
            <Link to="/outcomes" className="rounded-xl border bg-card p-4"><ChartNoAxesCombined className="mb-2 text-primary" /><p className="font-semibold">Outcome tracking</p><p className="text-xs text-muted-foreground">Review programme results</p></Link>
          </div>
        </>}
      </div>
    </div>}
  </Screen>;
}
