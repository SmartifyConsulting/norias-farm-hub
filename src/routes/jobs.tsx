import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useUser } from "@/lib/auth";
import { Screen } from "@/components/Dock";
import { Card, Field, Tabs, Pill, inputCls, btn, btnGhost } from "@/components/vc-ui";
import { JOB_CATEGORIES, JOB_TYPES, PROVINCES, rand, today, uid, useJobs, useApplications, type Job } from "@/lib/valuechain";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Agri Jobs — FarmerPlus" },
      { name: "description", content: "Find farm work or post jobs across the agricultural value chain in South Africa." },
      { property: "og:title", content: "Agri Jobs — FarmerPlus" },
      { property: "og:description", content: "Farm, packhouse, machinery and logistics jobs near you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JobsPage,
});

const TABS = ["Find work", "My job posts", "Post a job"] as const;

function JobsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Find work");
  return (
    <Screen title="Agri Jobs">
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === "Find work" && <Board />}
      {tab === "My job posts" && <MyJobs />}
      {tab === "Post a job" && <PostJob onDone={() => setTab("My job posts")} />}
    </Screen>
  );
}

const pay = (j: Job) => `${rand(j.minPay)}${j.maxPay > j.minPay ? ` – ${rand(j.maxPay)}` : ""} / ${j.period}`;

function Board() {
  const [jobs] = useJobs();
  const [apps, setApps] = useApplications();
  const [q, setQ] = useState("");
  const [type, setType] = useState("All");
  const [prov, setProv] = useState("All");
  const [applyTo, setApplyTo] = useState<string | null>(null);
  const [a, setA] = useState({ name: "", phone: "", note: "" });
  const list = jobs.filter((j) => j.status === "Active" && j.deadline >= today()
    && (type === "All" || j.type === type) && (prov === "All" || j.province === prov)
    && `${j.title} ${j.category} ${j.town}`.toLowerCase().includes(q.toLowerCase()));
  const apply = (id: string) => {
    if (a.name.trim().length < 2 || !/^(\+27|0)\d{9}$/.test(a.phone.replace(/\s/g, ""))) { toast.error("Enter your name and a valid SA phone number"); return; }
    setApps([{ id: uid(), jobId: id, ...a, at: today() }, ...apps]);
    setApplyTo(null); setA({ name: "", phone: "", note: "" });
    toast.success("Application sent");
  };
  return (
    <>
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <input className={inputCls} placeholder="Search jobs" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}><option>All</option>{JOB_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        <select className={inputCls} value={prov} onChange={(e) => setProv(e.target.value)}><option>All</option>{PROVINCES.map((t) => <option key={t}>{t}</option>)}</select>
      </div>
      {list.length === 0 ? <Card><p className="text-sm text-muted-foreground">No open jobs match. Post one from “Post a job”.</p></Card> : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((j) => (
            <Card key={j.id} title={j.title} action={<Pill tone="info">{j.type}</Pill>}>
              <p className="text-sm text-muted-foreground">{j.category} • {j.town}, {j.province} • {j.openings} opening{j.openings > 1 ? "s" : ""}</p>
              <p className="mt-1 text-sm font-semibold">{pay(j)}</p>
              <p className="mt-2 line-clamp-3 text-sm">{j.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">Apply by {j.deadline}</p>
              {applyTo === j.id ? (
                <div className="mt-3 space-y-2">
                  <input className={inputCls} placeholder="Your name" value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} />
                  <input className={inputCls} placeholder="Phone" value={a.phone} onChange={(e) => setA({ ...a, phone: e.target.value })} />
                  <textarea className={inputCls} rows={2} placeholder="Experience (optional)" value={a.note} onChange={(e) => setA({ ...a, note: e.target.value })} />
                  <div className="flex gap-2"><button className={btn} onClick={() => apply(j.id)}>Send application</button><button className={btnGhost} onClick={() => setApplyTo(null)}>Cancel</button></div>
                </div>
              ) : <button className={`${btn} mt-3`} onClick={() => setApplyTo(j.id)}>Apply</button>}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function MyJobs() {
  const [all, setJobs] = useJobs();
  const [apps] = useApplications();
  const { user } = useUser();
  const jobs = all.filter((j) => !j._owner || j._owner === user?.id);
  const setMine = (next: Job[]) => setJobs([...all.filter((j) => !jobs.includes(j)), ...next]);
  if (!jobs.length) return <Card><p className="text-sm text-muted-foreground">You haven't posted a job yet.</p></Card>;
  return (
    <div className="space-y-3">
      {jobs.map((j) => (
        <Card key={j.id} title={j.title} action={<Pill tone={j.status === "Active" ? "ok" : "info"}>{j.status}</Pill>}>
          <p className="text-sm text-muted-foreground">{j.town}, {j.province} • {pay(j)} • posted {j.postedAt}</p>
          <p className="mt-2 text-sm font-medium">{apps.filter((p) => p.jobId === j.id).length} applicant{apps.filter((p) => p.jobId === j.id).length === 1 ? "" : "s"}</p>
          <ul className="mt-1 space-y-1 text-sm">{apps.filter((p) => p.jobId === j.id).map((p) => <li key={p.id}>{p.name} • {p.phone}{p.note && ` — ${p.note}`}</li>)}</ul>
          <div className="mt-3 flex gap-2">
            <button className={btnGhost} onClick={() => setMine(jobs.map((x) => x.id === j.id ? { ...x, status: x.status === "Active" ? "Closed" : "Active" } : x))}>{j.status === "Active" ? "Close job" : "Reopen"}</button>
            <button className={`${btnGhost} text-destructive`} onClick={() => confirm("Delete this job?") && setMine(jobs.filter((x) => x.id !== j.id))}>Delete</button>
          </div>
        </Card>
      ))}
    </div>
  );
}

const blank = { title: "", category: JOB_CATEGORIES[0]!, type: JOB_TYPES[0]!, province: "Gauteng", town: "", openings: "1", minPay: "", maxPay: "", period: "month", deadline: "", description: "", requirements: "" };

function PostJob({ onDone }: { onDone: () => void }) {
  const [jobs, setJobs] = useJobs();
  const [f, setF] = useState(blank);
  const [err, setErr] = useState<Partial<Record<keyof typeof blank, string>>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = () => {
    if (busy) return;
    const e: Partial<Record<keyof typeof blank, string>> = {};
    if (f.title.trim().length < 3) e.title = "Give the job a title";
    if (!f.town.trim()) e.town = "Which town or farm area?";
    if (!(Number(f.openings) >= 1)) e.openings = "At least one opening";
    const min = Number(f.minPay), max = f.maxPay ? Number(f.maxPay) : min;
    if (!(min > 0)) e.minPay = "Enter the minimum pay";
    if (max < min) e.maxPay = "Maximum can't be less than the minimum";
    if (!f.deadline || f.deadline < today()) e.deadline = "Choose a closing date from today onwards";
    if (f.description.trim().length < 20) e.description = "Describe the role in a sentence or two";
    if (!f.requirements.trim()) e.requirements = "List what applicants need";
    setErr(e);
    if (Object.keys(e).length) { toast.error("Please fix the highlighted fields"); return; }
    setBusy(true);
    setJobs([{ id: uid(), ...f, title: f.title.trim(), openings: Number(f.openings), minPay: min, maxPay: max, postedAt: today(), status: "Active" }, ...jobs]);
    setF(blank); setBusy(false);
    toast.success("Job posted");
    onDone();
  };
  return (
    <Card title="Post a job">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Job title" error={err.title}><input className={inputCls} value={f.title} onChange={set("title")} placeholder="Farm manager" /></Field>
        <Field label="Category"><select className={inputCls} value={f.category} onChange={set("category")}>{JOB_CATEGORIES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Employment type"><select className={inputCls} value={f.type} onChange={set("type")}>{JOB_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Openings" error={err.openings}><input className={inputCls} inputMode="numeric" value={f.openings} onChange={set("openings")} /></Field>
        <Field label="Province"><select className={inputCls} value={f.province} onChange={set("province")}>{PROVINCES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Town / area" error={err.town}><input className={inputCls} value={f.town} onChange={set("town")} placeholder="Bethlehem" /></Field>
        <Field label="Minimum pay (R)" error={err.minPay}><input className={inputCls} inputMode="numeric" value={f.minPay} onChange={set("minPay")} /></Field>
        <Field label="Maximum pay (R, optional)" error={err.maxPay}><input className={inputCls} inputMode="numeric" value={f.maxPay} onChange={set("maxPay")} /></Field>
        <Field label="Paid per"><select className={inputCls} value={f.period} onChange={set("period")}>{["day", "week", "month"].map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Closing date" error={err.deadline}><input type="date" className={inputCls} value={f.deadline} onChange={set("deadline")} /></Field>
        <div className="md:col-span-2"><Field label="About the role" error={err.description}><textarea className={inputCls} rows={3} value={f.description} onChange={set("description")} /></Field></div>
        <div className="md:col-span-2"><Field label="Requirements" error={err.requirements}><textarea className={inputCls} rows={2} value={f.requirements} onChange={set("requirements")} /></Field></div>
      </div>
      <button className={`${btn} mt-4`} disabled={busy} onClick={submit}>Publish job</button>
    </Card>
  );
}
