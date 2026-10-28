import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Screen } from "@/components/Dock";
import { Card, Field, Stat, Tabs, Pill, inputCls, btn, btnGhost } from "@/components/vc-ui";
import {
  BODY_TYPES, FACILITY_KINDS, HOLDS_CAPACITY, PROVINCES, rand, today, uid, useBookings, useFacilities, useUsage, useVehicles, usedAt,
  type Booking, type Facility,
} from "@/lib/valuechain";
import { DemoBar } from "@/lib/vc-demo";
import { isDemo, metaKey } from "@/lib/vc-sync";
import { useUser } from "@/lib/auth";

/** Free tonnes at each facility, counting every device's bookings the server knows about plus this device's unsynced ones. */
function useFree() {
  const [bk] = useBookings(); const [usage] = useUsage();
  let synced = new Set<string>();
  try { synced = new Set(Object.keys(JSON.parse(localStorage.getItem(metaKey("farmerplus:vc:bookings")) || "{}"))); } catch { /* none */ }
  return (f: Facility) => {
    const used = isDemo(f)
      ? bk.filter((b) => b.kind === "Storage" && b.resourceId === f.id && HOLDS_CAPACITY.includes(b.status)).reduce((s, b) => s + b.qty, 0)
      : usedAt(f.id, bk, usage, synced);
    return Math.max(0, f.capacity - used);
  };
}

export const Route = createFileRoute("/logistics")({
  head: () => ({
    meta: [
      { title: "Logistics & Storage — FarmerPlus" },
      { name: "description", content: "Book trucks and storage for your harvest, or list your fleet and facilities." },
      { property: "og:title", content: "Logistics & Storage — FarmerPlus" },
      { property: "og:description", content: "Transport and storage bookings linked to real capacity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LogisticsPage,
});

const TABS = ["Book", "My bookings", "My fleet & facilities"] as const;

export function LogisticsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Book");
  const [v] = useVehicles(); const [fa] = useFacilities(); const [b] = useBookings(); const free = useFree();
  return (
    <Screen title="Logistics & Storage">
      <DemoBar />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Vehicles" value={v.length} />
        <Stat label="Payload" value={`${v.reduce((s, x) => s + x.tonnes, 0)} t`} />
        <Stat label="Free storage" value={`${fa.reduce((s, x) => s + free(x), 0)} t`} />
        <Stat label="Active bookings" value={b.filter((x) => !["Delivered", "Declined", "Cancelled"].includes(x.status)).length} />
      </div>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === "Book" && <Book />}
      {tab === "My bookings" && <Bookings />}
      {tab === "My fleet & facilities" && <Provider />}
    </Screen>
  );
}

function Book() {
  const [vehicles] = useVehicles(); const [fac] = useFacilities(); const [bk, setBk] = useBookings(); const freeOf = useFree();
  const [qty, setQty] = useState<Record<string, string>>({});
  const [route, setRoute] = useState<Record<string, string>>({});
  const book = (kind: Booking["kind"], id: string, max: number) => {
    const n = Number(qty[id]);
    if (!(n > 0) || n > max) { toast.error(`Enter between 1 and ${max} tonnes`); return; }
    if (kind === "Transport" && !route[id]?.includes("→") && !route[id]?.trim()) { toast.error("Enter where to and from"); return; }
    setBk([{ id: uid(), kind, resourceId: id, qty: n, from: route[id] ?? "", date: today(), status: "Requested" }, ...bk]);
    setQty({ ...qty, [id]: "" });
    toast.success(`${kind} requested`);
  };
  if (!vehicles.length && !fac.length) return <Card><p className="text-sm text-muted-foreground">No transport or storage is listed yet. Providers add them under “My fleet & facilities”.</p></Card>;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Transport">
        <ul className="space-y-3">{vehicles.map((v) => (
          <li key={v.id} className="rounded-xl border p-3 text-sm">
            <p className="font-semibold">{v.name} <span className="text-xs text-muted-foreground">({v.plate})</span></p>
            <p className="text-xs text-muted-foreground">{v.body} • {v.tonnes} t • based {v.base} • {rand(v.ratePerKm)}/km</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input className={`${inputCls} max-w-24`} placeholder="Tonnes" value={qty[v.id] ?? ""} onChange={(e) => setQty({ ...qty, [v.id]: e.target.value })} />
              <input className={`${inputCls} flex-1`} placeholder="From → to" value={route[v.id] ?? ""} onChange={(e) => setRoute({ ...route, [v.id]: e.target.value })} />
              <button className={btn} onClick={() => book("Transport", v.id, v.tonnes)}>Request</button>
            </div>
          </li>))}
        </ul>
      </Card>
      <Card title="Storage">
        <ul className="space-y-3">{fac.map((f) => {
          const free = freeOf(f);
          return (
            <li key={f.id} className="rounded-xl border p-3 text-sm">
              <p className="font-semibold">{f.name}</p>
              <p className="text-xs text-muted-foreground">{f.kind} • {f.province} • {free} of {f.capacity} t free{free <= 0 ? " — fully booked" : ""} • {rand(f.ratePerTMonth)}/t/month</p>
              <div className="mt-2 flex gap-2">
                <input className={`${inputCls} max-w-24`} placeholder="Tonnes" value={qty[f.id] ?? ""} onChange={(e) => setQty({ ...qty, [f.id]: e.target.value })} />
                <button className={btn} disabled={free <= 0} onClick={() => book("Storage", f.id, free)}>Reserve</button>
              </div>
            </li>);
        })}</ul>
      </Card>
    </div>
  );
}

const FLOW: Record<Booking["kind"], Booking["status"][]> = {
  Transport: ["Requested", "Accepted", "In transit", "Delivered"],
  Storage: ["Requested", "Accepted", "Stored"],
};

function Bookings() {
  const [bk, setBk] = useBookings(); const [v] = useVehicles(); const [fac] = useFacilities(); const { user } = useUser();
  if (!bk.length) return <Card><p className="text-sm text-muted-foreground">No bookings yet.</p></Card>;
  const res = (b: Booking) => (b.kind === "Transport" ? v.find((x) => x.id === b.resourceId) : fac.find((x) => x.id === b.resourceId)) as { name: string; _owner?: string } | undefined;
  const set = (b: Booking, status: Booking["status"]) => setBk(bk.map((x) => (x.id === b.id ? { ...x, status } : x)));
  return (
    <Card title="Bookings">
      <p className="mb-3 text-xs text-muted-foreground">Requested, accepted and stored bookings hold storage space. Declining or cancelling frees it for everyone.</p>
      <ul className="space-y-2">{bk.map((b) => {
        const f = FLOW[b.kind]; const next = f[f.indexOf(b.status) + 1];
        const r = res(b);
        // The provider moves a booking forward; the person who booked can cancel. Demo/local items: both.
        const provider = !r?._owner || r._owner === user?.id;
        const booker = !b._owner || b._owner === user?.id;
        const closed = ["Declined", "Cancelled", "Delivered", "Stored"].includes(b.status);
        return (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm">
            <span>{b.kind}: <b>{r?.name ?? "Removed"}</b> • {b.qty} t {b.from && `• ${b.from}`} • {b.date} <Pill tone={["Declined", "Cancelled"].includes(b.status) ? "bad" : next ? "warn" : "ok"}>{b.status}</Pill></span>
            {!["Declined", "Cancelled"].includes(b.status) && (
              <span className="flex gap-2">
                {next && provider && <button className={btnGhost} onClick={() => set(b, next)}>Mark {next.toLowerCase()}</button>}
                {b.status === "Requested" && provider && <button className={btnGhost} onClick={() => set(b, "Declined")}>Decline</button>}
                {!closed && booker && <button className={btnGhost} onClick={() => set(b, "Cancelled")}>Cancel</button>}
                {b.kind === "Storage" && b.status === "Stored" && booker && <button className={btnGhost} onClick={() => set(b, "Cancelled")}>Collect & release</button>}
              </span>
            )}
          </li>);
      })}</ul>
    </Card>
  );
}

function Provider() {
  const [vehicles, setV] = useVehicles(); const [fac, setF] = useFacilities(); const freeOf = useFree();
  const [v, sv] = useState({ name: "", plate: "", body: BODY_TYPES[0]!, tonnes: "", base: "", ratePerKm: "" });
  const [f, sf] = useState({ name: "", kind: FACILITY_KINDS[0]!, province: "Free State", capacity: "", ratePerTMonth: "" });
  const addV = () => {
    if (!v.name.trim() || !v.plate.trim() || !(Number(v.tonnes) > 0) || !(Number(v.ratePerKm) > 0)) { toast.error("Fill in name, plate, tonnes and rate"); return; }
    setV([{ id: uid(), ...v, tonnes: Number(v.tonnes), ratePerKm: Number(v.ratePerKm) }, ...vehicles]);
    sv({ name: "", plate: "", body: BODY_TYPES[0]!, tonnes: "", base: "", ratePerKm: "" }); toast.success("Vehicle added");
  };
  const addF = () => {
    if (!f.name.trim() || !(Number(f.capacity) > 0) || !(Number(f.ratePerTMonth) > 0)) { toast.error("Fill in name, capacity and rate"); return; }
    setF([{ id: uid(), ...f, capacity: Number(f.capacity), booked: 0, ratePerTMonth: Number(f.ratePerTMonth) }, ...fac]);
    sf({ name: "", kind: FACILITY_KINDS[0]!, province: "Free State", capacity: "", ratePerTMonth: "" }); toast.success("Facility added");
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Add a vehicle">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name"><input className={inputCls} value={v.name} onChange={(e) => sv({ ...v, name: e.target.value })} placeholder="10-ton truck" /></Field>
          <Field label="Number plate"><input className={inputCls} value={v.plate} onChange={(e) => sv({ ...v, plate: e.target.value })} /></Field>
          <Field label="Body type"><select className={inputCls} value={v.body} onChange={(e) => sv({ ...v, body: e.target.value })}>{BODY_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Payload (tonnes)"><input className={inputCls} value={v.tonnes} onChange={(e) => sv({ ...v, tonnes: e.target.value })} /></Field>
          <Field label="Base town"><input className={inputCls} value={v.base} onChange={(e) => sv({ ...v, base: e.target.value })} /></Field>
          <Field label="Rate (R per km)"><input className={inputCls} value={v.ratePerKm} onChange={(e) => sv({ ...v, ratePerKm: e.target.value })} /></Field>
        </div>
        <button className={`${btn} mt-3`} onClick={addV}>Add vehicle</button>
        <ul className="mt-4 space-y-1 text-sm">{vehicles.map((x) => <li key={x.id} className="flex justify-between">{x.name} • {x.tonnes} t <button className="text-xs text-destructive" onClick={() => setV(vehicles.filter((y) => y.id !== x.id))}>Remove</button></li>)}</ul>
      </Card>
      <Card title="Add a storage facility">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => sf({ ...f, name: e.target.value })} /></Field>
          <Field label="Type"><select className={inputCls} value={f.kind} onChange={(e) => sf({ ...f, kind: e.target.value })}>{FACILITY_KINDS.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Province"><select className={inputCls} value={f.province} onChange={(e) => sf({ ...f, province: e.target.value })}>{PROVINCES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Capacity (tonnes)"><input className={inputCls} value={f.capacity} onChange={(e) => sf({ ...f, capacity: e.target.value })} /></Field>
          <Field label="Rate (R per t / month)"><input className={inputCls} value={f.ratePerTMonth} onChange={(e) => sf({ ...f, ratePerTMonth: e.target.value })} /></Field>
        </div>
        <button className={`${btn} mt-3`} onClick={addF}>Add facility</button>
        <ul className="mt-4 space-y-1 text-sm">{fac.map((x) => <li key={x.id} className="flex justify-between">{x.name} • {x.capacity - freeOf(x)}/{x.capacity} t <button className="text-xs text-destructive" onClick={() => setF(fac.filter((y) => y.id !== x.id))}>Remove</button></li>)}</ul>
      </Card>
    </div>
  );
}
