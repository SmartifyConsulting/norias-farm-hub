import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Screen } from "@/components/Dock";
import { Card, Field, Stat, Tabs, Pill, inputCls, btn, btnGhost } from "@/components/vc-ui";
import { PERILS, PROVINCES, rand, suggestedPremium, today, uid, useBaseRate, useCover, type CoverRequest } from "@/lib/valuechain";

export const Route = createFileRoute("/insurance")({
  head: () => ({
    meta: [
      { title: "Farm Insurance — FarmerPlus" },
      { name: "description", content: "Request crop and livestock cover, compare risk-based quotes and submit claims." },
      { property: "og:title", content: "Farm Insurance — FarmerPlus" },
      { property: "og:description", content: "Risk-based quotes, active policies and claims in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InsurancePage,
});

const TABS = ["My cover", "Underwriter desk"] as const;

function InsurancePage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("My cover");
  const [cover] = useCover();
  const active = cover.filter((c) => c.status === "Active");
  return (
    <Screen title="Farm Insurance">
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Awaiting quote" value={cover.filter((c) => c.status === "Needs quote").length} />
        <Stat label="Active policies" value={active.length} />
        <Stat label="Cover value" value={rand(active.reduce((s, c) => s + c.value, 0))} />
        <Stat label="Open claims" value={cover.flatMap((c) => c.claims).filter((c) => c.status === "Submitted").length} />
      </div>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === "My cover" ? <Farmer /> : <Underwriter />}
    </Screen>
  );
}

const statusTone = { "Needs quote": "warn", Quoted: "info", Active: "ok", Declined: "bad" } as const;

function Farmer() {
  const [cover, setCover] = useCover();
  const [f, setF] = useState({ crop: "", value: "", province: "Free State", peril: ! });
  const [claim, setClaim] = useState<Record<string, { amount: string; reason: string }>>({});
  const add = () => {
    const v = Number(f.value);
    if (!f.crop.trim() || !(v > 0)) { toast.error("Enter what to cover and its value"); return; }
    setCover([{ id: uid(), crop: f.crop.trim(), value: v, province: f.province, peril: f.peril, status: "Needs quote", createdAt: today(), claims: [] }, ...cover]);
    setF({ ...f, crop: "", value: "" });
    toast.success("Cover requested");
  };
  const upd = (id: string, p: Partial<CoverRequest>) => setCover(cover.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const accept = (c: CoverRequest) => {
    const s = new Date(); const e = new Date(); e.setFullYear(e.getFullYear() + 1);
    upd(c.id, { status: "Active", startsOn: s.toISOString().slice(0, 10), endsOn: e.toISOString().slice(0, 10) });
    toast.success("Policy is active");
  };
  const fileClaim = (c: CoverRequest) => {
    const x = claim[c.id]; const amt = Number(x?.amount);
    if (!(amt > 0) || amt > c.value) { toast.error(`Claim must be between R1 and ${rand(c.value)}`); return; }
    if (!x?.reason.trim()) { toast.error("Describe what happened"); return; }
    upd(c.id, { claims: [...c.claims, { id: uid(), date: today(), amount: amt, reason: x.reason.trim(), status: "Submitted" }] });
    setClaim({ ...claim, [c.id]: { amount: "", reason: "" } });
    toast.success("Claim submitted");
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card title="Request cover">
        <div className="space-y-3">
          <Field label="What to insure"><input className={inputCls} value={f.crop} onChange={(e) => setF({ ...f, crop: e.target.value })} placeholder="Maize, 120 ha" /></Field>
          <Field label="Value (R)"><input className={inputCls} inputMode="numeric" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field>
          <Field label="Province"><select className={inputCls} value={f.province} onChange={(e) => setF({ ...f, province: e.target.value })}>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Risk to cover"><select className={inputCls} value={f.peril} onChange={(e) => setF({ ...f, peril: e.target.value })}>{PERILS.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <button className={btn} onClick={add}>Request quote</button>
        </div>
      </Card>
      <Card title="My requests & policies">
        {cover.length === 0 ? <p className="text-sm text-muted-foreground">No cover requested yet.</p> : (
          <ul className="space-y-3">
            {cover.map((c) => (
              <li key={c.id} className="rounded-xl border p-3 text-sm">
                <div className="flex justify-between gap-2"><p className="font-semibold">{c.crop} • {c.peril}</p><Pill tone={statusTone[c.status]}>{c.status}</Pill></div>
                <p className="text-xs text-muted-foreground">{rand(c.value)} • {c.province}</p>
                {c.status === "Quoted" && (
                  <div className="mt-2 rounded-lg bg-muted p-2">
                    <p>Premium <b>{rand(c.premium ?? 0)}</b> / year • Deductible {c.deductible}%</p>
                    <p className="text-xs">{c.terms}</p>
                    <div className="mt-2 flex gap-2"><button className={btn} onClick={() => accept(c)}>Accept</button><button className={btnGhost} onClick={() => upd(c.id, { status: "Declined" })}>Decline</button></div>
                  </div>
                )}
                {c.status === "Active" && (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs">Cover {c.startsOn} to {c.endsOn} • Premium {rand(c.premium ?? 0)}</p>
                    {c.claims.map((k) => <p key={k.id} className="text-xs">Claim {k.date}: {rand(k.amount)} — {k.reason} <Pill tone={k.status === "Rejected" ? "bad" : k.status === "Submitted" ? "warn" : "ok"}>{k.status}</Pill></p>)}
                    <div className="flex flex-wrap gap-2">
                      <input className={`${inputCls} max-w-32`} placeholder="Claim R" value={claim[c.id]?.amount ?? ""} onChange={(e) => setClaim({ ...claim, [c.id]: { reason: claim[c.id]?.reason ?? "", amount: e.target.value } })} />
                      <input className={`${inputCls} flex-1`} placeholder="What happened" value={claim[c.id]?.reason ?? ""} onChange={(e) => setClaim({ ...claim, [c.id]: { amount: claim[c.id]?.amount ?? "", reason: e.target.value } })} />
                      <button className={btnGhost} onClick={() => fileClaim(c)}>Submit claim</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Underwriter() {
  const [cover, setCover] = useCover();
  const [rate, setRate] = useBaseRate();
  const [q, setQ] = useState<Record<string, { premium: string; deductible: string; terms: string }>>({});
  const upd = (id: string, p: Partial<CoverRequest>) => setCover(cover.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const quote = (c: CoverRequest) => {
    const x = q[c.id]; const sug = suggestedPremium(c.value, rate, c.peril);
    const prem = Number(x?.premium || sug); const ded = Number(x?.deductible || 10);
    if (prem < sug * 0.5 || prem > sug * 2) { toast.error(`Premium must be within 50%–200% of the risk-based ${rand(sug)}`); return; }
    if (!(ded >= 0 && ded <= 50)) { toast.error("Deductible must be 0–50%"); return; }
    upd(c.id, { status: "Quoted", premium: prem, deductible: ded, terms: x?.terms || `${c.peril} cover. ${ded}% deductible.` });
    toast.success("Quote sent");
  };
  const pending = cover.filter((c) => c.status === "Needs quote");
  const claims = cover.flatMap((c) => c.claims.map((k) => ({ c, k }))).filter(({ k }) => k.status === "Submitted" || k.status === "Approved");
  const setClaim = (cid: string, kid: string, status: "Approved" | "Rejected" | "Paid") => {
    const c = cover.find((x) => x.id === cid)!;
    upd(cid, { claims: c.claims.map((k) => (k.id === kid ? { ...k, status } : k)) });
  };
  return (
    <div className="space-y-4">
      <Card title="Underwriting rules">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Base premium rate (% of value)"><input className={`${inputCls} w-32`} type="number" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value) || 0)} /></Field>
          <p className="text-xs text-muted-foreground">Suggested premium = value × base rate × risk loading (e.g. drought ×1.4, hail ×1.2).</p>
        </div>
      </Card>
      <Card title={`Requests needing a quote (${pending.length})`}>
        {pending.length === 0 ? <p className="text-sm text-muted-foreground">Nothing waiting.</p> : (
          <ul className="space-y-3">
            {pending.map((c) => {
              const sug = suggestedPremium(c.value, rate, c.peril);
              return (
                <li key={c.id} className="rounded-xl border p-3 text-sm">
                  <p className="font-semibold">{c.crop} • {c.peril} • {c.province}</p>
                  <p className="text-xs text-muted-foreground">Value {rand(c.value)} • risk-based premium {rand(sug)}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[8rem_6rem_1fr_auto_auto]">
                    <input className={inputCls} placeholder={String(sug)} value={q[c.id]?.premium ?? ""} onChange={(e) => setQ({ ...q, [c.id]: { ...{ deductible: "", terms: "" }, ...q[c.id], premium: e.target.value } })} />
                    <input className={inputCls} placeholder="10 %" value={q[c.id]?.deductible ?? ""} onChange={(e) => setQ({ ...q, [c.id]: { ...{ premium: "", terms: "" }, ...q[c.id], deductible: e.target.value } })} />
                    <input className={inputCls} placeholder="Terms" value={q[c.id]?.terms ?? ""} onChange={(e) => setQ({ ...q, [c.id]: { ...{ premium: "", deductible: "" }, ...q[c.id], terms: e.target.value } })} />
                    <button className={btn} onClick={() => quote(c)}>Send quote</button>
                    <button className={btnGhost} onClick={() => upd(c.id, { status: "Declined" })}>Decline</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Card title="Claims">
        {claims.length === 0 ? <p className="text-sm text-muted-foreground">No open claims.</p> : (
          <ul className="space-y-2">
            {claims.map(({ c, k }) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm">
                <span>{c.crop} • {rand(k.amount)} — {k.reason} <Pill tone="warn">{k.status}</Pill></span>
                <span className="flex gap-2">
                  {k.status === "Submitted" ? (<><button className={btnGhost} onClick={() => setClaim(c.id, k.id, "Approved")}>Approve</button><button className={btnGhost} onClick={() => setClaim(c.id, k.id, "Rejected")}>Reject</button></>)
                    : <button className={btnGhost} onClick={() => setClaim(c.id, k.id, "Paid")}>Mark paid</button>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
