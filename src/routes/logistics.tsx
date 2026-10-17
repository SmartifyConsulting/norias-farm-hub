import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Screen } from "@/components/Dock";
import { Card, Field, Stat, Tabs, Pill, inputCls, btn, btnGhost } from "@/components/vc-ui";
import {
  BODY_TYPES, FACILITY_KINDS, PROVINCES, rand, today, uid, useBookings, useFacilities, useVehicles, type Booking,
} from "@/lib/valuechain";

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

function LogisticsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Book");
  const [v] = useVehicles(); const [fa] = useFacilities(); const [b] = useBookings();
  return (
    <Screen title="Logistics & Storage">
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Vehicles" value={v.length} />
        <Stat label="Payload" value={`${v.reduce((s, x) => s + x.tonnes, 0)} t`} />
        <Stat label="Free storage" value={`${fa.reduce((s, x) => s + x.capacity - x.booked, 0)} t`} />
        <Stat label="Active bookings" value={b.filter((x) => !["Delivered", "Declined"].includes(x.status)).length} />
      </div>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === "Book" && <Book />}
      {tab === "My bookings" && <Bookings />}
      {tab === "My fleet & facilities" && <Provider />}
    </Screen>
  );
}

function Book() {
  const [vehicles] = useVehicles(); const [fac, setFac] = useFacilities(); const [bk, setBk] = useBookings();
  const [qty, setQty] = useState<Record<string, string>>({});
  const [route, setRoute] = useState<Record<string, string>>({});
  const book = (kind: Booking["kind"], id: string, max: number) => {
    const n = Number(qty[id]);
    if (!(n > 0) || n > max) return toast.error(`Enter between 1 and ${max} tonnes`);
    if (kind === "Transport" && !route[id]?.includes("→") && !route[id]?.trim()) return toast.error("Enter where to and from");
    if (kind === "Storage") setFac(fac.map((f) => (f.id === id ? { ...f, booked: f.booked + n } : f)));
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
          const free = f.capacity - f.booked;
          return (
            <li key={f.id} className="rounded-xl border p-3 text-sm">
              <p className="font-semibold">{f.name}</p>
              <p className="text-xs text-muted-foreground">{f.kind} • {f.province} • {free} of {f.capacity} t free • {rand(f.ratePerTMonth)}/t/month</p>
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
  const [bk, setBk] = useBookings(); const [v] = useVehicles(); const [fac, setFac] = useFacilities();
  if (!bk.length) return <Card><p className="text-sm text-muted-foreground">No bookings yet.</p></Card>;
  const name = (b: Booking) => (b.kind === "Transport" ? v.find((x) => x.id === b.resourceId)?.name : fac.find((x) => x.id === b.resourceId)?.name) ?? "Removed";
  const advance = (b: Booking) => {
    const f = FLOW[b.kind]; const next = f[f.indexOf(b.status) + 1];
    if (next) setBk(bk.map((x) => (x.id === b.id ? { ...x, status: next } : x)));
  };
  const decline = (b: Booking) => {
    if (b.kind === "Storage") setFac(fac.map((f) => (f.id === b.resourceId ? { ...f, booked: Math.max(0, f.booked - b.qty) } : f)));
    setBk(bk.map((x) => (x.id === b.id ? { ...x, status: "Declined" } : x)));
  };
  return (
    <Card title="Bookings">
      <ul className="space-y-2">{bk.map((b) => {
        const f = FLOW[b.kind]; const next = f[f.indexOf(b.status) + 1];
        return (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm">
            <span>{b.kind}: <b>{name(b)}</b> • {b.qty} t {b.from && `• ${b.from}`} • {b.date} <Pill tone={b.status === "Declined" ? "bad" : next ? "warn" : "ok"}>{b.status}</Pill></span>
            {next && b.status !== "Declined" && <span className="flex gap-2"><button className={btnGhost} onClick={() => advance(b)}>Mark {next.toLowerCase()}</button>{b.status === "Requested" && <button className={btnGhost} onClick={() => decline(b)}>Decline</button>}</span>}
          </li>);
      })}</ul>
    </Card>
  );
}

function Provider() {
  const [vehicles, setV] = useVehicles(); const [fac, setF] = useFacilities();
  const [v, sv] = useState({ name: "", plate: "", body: BODY_TYPES[0], tonnes: "", base: "", ratePerKm: "" });
  const [f, sf] = useState({ name: "", kind: FACILITY_KINDS[0], province: "Free State", capacity: "", ratePerTMonth: "" });
  const addV = () => {
    if (!v.name.trim() || !v.plate.trim() || !(Number(v.tonnes) > 0) || !(Number(v.ratePerKm) > 0)) return toast.error("Fill in name, plate, tonnes and rate");
    setV([{ id: uid(), ...v, tonnes: Number(v.tonnes), ratePerKm: Number(v.ratePerKm) }, ...vehicles]);
    sv({ name: "", plate: "", body: BODY_TYPES[0], tonnes: "", base: "", ratePerKm: "" }); toast.success("Vehicle added");
  };
  const addF = () => {
    if (!f.name.trim() || !(Number(f.capacity) > 0) || !(Number(f.ratePerTMonth) > 0)) return toast.error("Fill in name, capacity and rate");
    setF([{ id: uid(), ...f, capacity: Number(f.capacity), booked: 0, ratePerTMonth: Number(f.ratePerTMonth) }, ...fac]);
    sf({ name: "", kind: FACILITY_KINDS[0], province: "Free State", capacity: "", ratePerTMonth: "" }); toast.success("Facility added");
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
        <ul className="mt-4 space-y-1 text-sm">{fac.map((x) => <li key={x.id} className="flex justify-between">{x.name} • {x.booked}/{x.capacity} t <button className="text-xs text-destructive" onClick={() => setF(fac.filter((y) => y.id !== x.id))}>Remove</button></li>)}</ul>
      </Card>
    </div>
  );
}
