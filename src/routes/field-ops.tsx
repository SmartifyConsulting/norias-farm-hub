import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle } from "lucide-react";
import { Screen } from "@/components/Dock";
import { Card, Field, Stat, Tabs, Pill, inputCls, btn, btnGhost } from "@/components/vc-ui";
import { useUser } from "@/lib/auth";
import { profileOf } from "@/lib/profile";
import {
  PROVINCES, newAin, uid, today, useInspections, useRegFarmers, useVisits, validSaId, verificationOf,
  type Inspection,
} from "@/lib/valuechain";

export const Route = createFileRoute("/field-ops")({
  head: () => ({
    meta: [
      { title: "Field Operations — FarmerPlus" },
      { name: "description", content: "Register farmers, schedule visits and record field inspections with clear verification rules." },
      { property: "og:title", content: "Field Operations — FarmerPlus" },
      { property: "og:description", content: "Farmer registry, visits and inspections for extension and field officers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FieldOps,
});

const TABS = ["Farmers", "Visits", "Inspections"] as const;

function FieldOps() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Farmers");
  const [farmers] = useRegFarmers();
  const [visits] = useVisits();
  const [insp] = useInspections();
  const verified = farmers.filter((f) => verificationOf(f, insp).verified).length;
  return (
    <Screen title="Field Operations">
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Registered farmers" value={farmers.length} />
        <Stat label="Verified" value={verified} />
        <Stat label="Upcoming visits" value={visits.filter((v) => !v.done && v.date >= today()).length} />
        <Stat label="Inspections" value={insp.length} />
      </div>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === "Farmers" && <Farmers />}
      {tab === "Visits" && <Visits />}
      {tab === "Inspections" && <Inspections />}
    </Screen>
  );
}

const blank = { first: "", last: "", idNumber: "", phone: "", province: "Gauteng", commodity: "", hectares: "" };

function Farmers() {
  const [farmers, setFarmers] = useRegFarmers();
  const [insp] = useInspections();
  const [f, setF] = useState(blank);
  const [err, setErr] = useState<Partial<Record<keyof typeof blank, string>>>({});
  const save = () => {
    const e: Partial<Record<keyof typeof blank, string>> = {};
    if (!/^[\p{L}' -]{2,}$/u.test(f.first.trim())) e.first = "Enter a first name";
    if (!/^[\p{L}' -]{2,}$/u.test(f.last.trim())) e.last = "Enter a last name (hyphens allowed)";
    if (!validSaId(f.idNumber.trim())) e.idNumber = "Enter a valid 13-digit SA ID number";
    if (!/^(\+27|0)\d{9}$/.test(f.phone.replace(/\s/g, ""))) e.phone = "Use 0821234567 or +27821234567";
    if (!f.commodity.trim()) e.commodity = "What does this farmer grow or keep?";
    const ha = Number(f.hectares);
    if (!(ha > 0 && ha <= 5000)) e.hectares = "Farm size must be between 0 and 5,000 ha";
    setErr(e);
    if (Object.keys(e).length) return;
    const dup = farmers.find((x) => x.idNumber === f.idNumber.trim());
    if (dup) {
      toast(`${dup.first} ${dup.last} is already registered (${dup.ain}) — no duplicate created.`);
      return;
    }
    setFarmers([
      { id: uid(), ain: newAin(), first: f.first.trim(), last: f.last.trim(), idNumber: f.idNumber.trim(),
        phone: f.phone.replace(/\s/g, ""), province: f.province, commodity: f.commodity.trim(), hectares: ha, createdAt: today() },
      ...farmers,
    ]);
    setF(blank);
    toast.success("Farmer registered. They set their own password when they first sign in.");
  };
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card title="Register a farmer">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name" error={err.first}><input className={inputCls} value={f.first} onChange={set("first")} /></Field>
          <Field label="Last name" error={err.last}><input className={inputCls} value={f.last} onChange={set("last")} /></Field>
          <Field label="SA ID number" error={err.idNumber}><input className={inputCls} inputMode="numeric" value={f.idNumber} onChange={set("idNumber")} /></Field>
          <Field label="Phone" error={err.phone}><input className={inputCls} value={f.phone} onChange={set("phone")} placeholder="082 123 4567" /></Field>
          <Field label="Province"><select className={inputCls} value={f.province} onChange={set("province")}>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Main commodity" error={err.commodity}><input className={inputCls} value={f.commodity} onChange={set("commodity")} placeholder="Maize" /></Field>
          <Field label="Farm size (ha)" error={err.hectares}><input className={inputCls} inputMode="decimal" value={f.hectares} onChange={set("hectares")} /></Field>
        </div>
        <button className={`${btn} mt-4 w-full`} onClick={save}>Register farmer</button>
      </Card>
      <Card title="Farmer registry">
        {farmers.length === 0 ? <p className="text-sm text-muted-foreground">No farmers registered yet.</p> : (
          <ul className="space-y-3">
            {farmers.map((x) => {
              const v = verificationOf(x, insp);
              return (
                <li key={x.id} className="rounded-xl border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{x.first} {x.last} <span className="font-mono text-xs text-muted-foreground">{x.ain}</span></p>
                    <Pill tone={v.verified ? "ok" : "warn"}>{v.verified ? "Verified" : "Not yet verified"}</Pill>
                  </div>
                  <p className="text-xs text-muted-foreground">{x.commodity} • {x.hectares} ha • {x.province} • {x.phone}</p>
                  <ul className="mt-2 flex flex-wrap gap-3 text-xs">
                    {v.checks.map((c) => (
                      <li key={c.label} className="flex items-center gap-1">
                        {c.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}{c.label}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function useOfficer() {
  const { user } = useUser();
  return profileOf(user).full || "Me";
}

function Visits() {
  const [farmers] = useRegFarmers();
  const [visits, setVisits] = useVisits();
  const officer = useOfficer();
  const [f, setF] = useState({ farmerId: "", date: "", type: "Verification" });
  const name = (id: string) => { const x = farmers.find((y) => y.id === id); return x ? `${x.first} ${x.last}` : "Unknown"; };
  const add = () => {
    if (!f.farmerId || !f.date) { toast.error("Choose a farmer and a date"); return; }
    if (f.date < today()) { toast.error("Visit date can't be in the past"); return; }
    setVisits([{ id: uid(), ...f, officer }, ...visits]);
    setF({ farmerId: "", date: "", type: "Verification" });
    toast.success("Visit scheduled");
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Schedule a visit">
        {farmers.length === 0 ? <p className="text-sm text-muted-foreground">Register a farmer first.</p> : (
          <div className="space-y-3">
            <Field label="Farmer"><select className={inputCls} value={f.farmerId} onChange={(e) => setF({ ...f, farmerId: e.target.value })}><option value="">Select…</option>{farmers.map((x) => <option key={x.id} value={x.id}>{x.first} {x.last} — {x.province}</option>)}</select></Field>
            <Field label="Date"><input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            <Field label="Visit type"><select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{["Verification", "Advisory", "Input delivery", "Harvest check"].map((t) => <option key={t}>{t}</option>)}</select></Field>
            <p className="text-xs text-muted-foreground">Assigned to you ({officer}).</p>
            <button className={btn} onClick={add}>Schedule</button>
          </div>
        )}
      </Card>
      <Card title="Visits">
        {visits.length === 0 ? <p className="text-sm text-muted-foreground">No visits yet.</p> : (
          <ul className="space-y-2">
            {visits.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 rounded-xl border p-3 text-sm">
                <div><p className="font-medium">{name(v.farmerId)} • {v.type}</p><p className="text-xs text-muted-foreground">{v.date} • {v.officer}</p></div>
                {v.done ? <Pill tone="ok">Done</Pill> : <button className={btnGhost} onClick={() => setVisits(visits.map((y) => y.id === v.id ? { ...y, done: true } : y))}>Mark done</button>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Inspections() {
  const [farmers] = useRegFarmers();
  const [insp, setInsp] = useInspections();
  const officer = useOfficer();
  const [f, setF] = useState({ farmerId: "", result: "Pass" as Inspection["result"], notes: "", gps: "" });
  const locate = () => navigator.geolocation?.getCurrentPosition(
    (p) => setF((s) => ({ ...s, gps: `${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}` })),
    () => toast.error("Couldn't get your location"),
  );
  const add = () => {
    if (!f.farmerId) { toast.error("Choose a farmer"); return; }
    if (f.notes.trim().length < 10) { toast.error("Add at least a short note (10+ characters)"); return; }
    setInsp([{ id: uid(), date: today(), officer, ...f }, ...insp]);
    setF({ farmerId: "", result: "Pass", notes: "", gps: "" });
    toast.success("Inspection recorded");
  };
  const name = (id: string) => { const x = farmers.find((y) => y.id === id); return x ? `${x.first} ${x.last}` : "Unknown"; };
  const tone = { Pass: "ok", Conditional: "warn", Fail: "bad" } as const;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Record inspection">
        {farmers.length === 0 ? <p className="text-sm text-muted-foreground">Register a farmer first.</p> : (
          <div className="space-y-3">
            <Field label="Farmer"><select className={inputCls} value={f.farmerId} onChange={(e) => setF({ ...f, farmerId: e.target.value })}><option value="">Select…</option>{farmers.map((x) => <option key={x.id} value={x.id}>{x.first} {x.last}</option>)}</select></Field>
            <Field label="Result"><select className={inputCls} value={f.result} onChange={(e) => setF({ ...f, result: e.target.value as Inspection["result"] })}>{["Pass", "Conditional", "Fail"].map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Notes"><textarea className={inputCls} rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
            <div className="flex gap-2"><input className={inputCls} placeholder="GPS (optional)" value={f.gps} onChange={(e) => setF({ ...f, gps: e.target.value })} /><button className={btnGhost} onClick={locate}>Use my location</button></div>
            <button className={btn} onClick={add}>Save inspection</button>
          </div>
        )}
      </Card>
      <Card title="Inspection history">
        {insp.length === 0 ? <p className="text-sm text-muted-foreground">No inspections yet.</p> : (
          <ul className="space-y-2">
            {insp.map((i) => (
              <li key={i.id} className="rounded-xl border p-3 text-sm">
                <div className="flex justify-between gap-2"><p className="font-medium">{name(i.farmerId)}</p><Pill tone={tone[i.result]}>{i.result}</Pill></div>
                <p className="text-xs text-muted-foreground">{i.date} • {i.officer}{i.gps && ` • ${i.gps}`}</p>
                <p className="mt-1 text-xs">{i.notes}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
