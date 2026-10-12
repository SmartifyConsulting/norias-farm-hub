import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Screen } from "@/components/Dock";
import { rand } from "@/lib/agri";
import { STAGES, addToPipeline, usePipeline, type PipelineItem, type Stage } from "@/lib/network";

export const Route = createFileRoute("/outcomes")({
  head: () => ({
    meta: [
      { title: "Opportunity to Outcome — FarmerPlus" },
      {
        name: "description",
        content:
          "Track each opportunity from assessment and decision to action and the real outcome.",
      },
      { property: "og:title", content: "Opportunity to Outcome — FarmerPlus" },
      {
        property: "og:description",
        content: "Expected versus actual results, with reasons, for every opportunity you pursue.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OutcomesPage,
});

const input =
  "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const n = (s: string) => (s.trim() === "" ? undefined : parseFloat(s));

function OutcomesPage() {
  const [items, setItems] = usePipeline();
  const [title, setTitle] = useState("");
  const update = (id: string, patch: Partial<PipelineItem>, toStage?: Stage, note?: string) =>
    setItems(
      items.map((i) =>
        i.id === id
          ? {
              ...i,
              ...patch,
              ...(toStage
                ? {
                    stage: toStage,
                    history: [...i.history, { stage: toStage, at: new Date().toISOString(), note }],
                  }
                : {}),
            }
          : i,
      ),
    );
  const done = items.filter((i) => i.stage === "Outcome" && i.actual);
  const open = items.filter((i) => !done.includes(i) && i.decision !== "decline");
  const declined = items.filter((i) => i.decision === "decline");

  return (
    <Screen title="Opportunity → Outcome">
      <p className="-mt-3 mb-4 text-sm text-muted-foreground">
        Every step is your decision. Record what actually happened so future plans are based on
        evidence.
      </p>
      <ol className="mb-5 flex flex-wrap gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {STAGES.map((s, i) => (
          <li key={s} className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
            {i + 1}. {s}{" "}
            <span className="text-secondary-foreground">
              ({items.filter((x) => x.stage === s && x.decision !== "decline").length})
            </span>
          </li>
        ))}
      </ol>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          addToPipeline({ title });
          setTitle("");
        }}
        className="mb-5 flex max-w-xl gap-2"
      >
        <input
          className={input}
          placeholder="Track a new opportunity (or use Opportunities → Track)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button className="shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
          Add
        </button>
      </form>
      {items.length === 0 && (
        <p className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
          Nothing tracked yet. Open{" "}
          <Link to="/opportunities" className="font-semibold underline">
            Opportunities
          </Link>{" "}
          and tap "Track".
        </p>
      )}
      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-3">
        {open.map((i) => (
          <Card key={i.id} i={i} update={update} />
        ))}
      </div>
      {done.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-semibold">Outcome record</h2>
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="p-3">Opportunity</th>
                  <th className="p-3">Volume (exp → act)</th>
                  <th className="p-3">Revenue (exp → act)</th>
                  <th className="p-3">Date (exp → act)</th>
                  <th className="p-3">Reasons recorded</th>
                  <th className="p-3">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {done.map((i) => {
                  const dv = (i.actual?.volume ?? 0) - (i.expected?.volume ?? 0);
                  return (
                    <tr key={i.id} className="border-b last:border-0">
                      <td className="p-3 font-semibold">{i.title}</td>
                      <td className="p-3">
                        {i.expected?.volume ?? "—"} → {i.actual?.volume ?? "—"} t{" "}
                        {i.expected?.volume != null && i.actual?.volume != null && (
                          <span className={dv < 0 ? "text-destructive" : "text-success-foreground"}>
                            ({dv >= 0 ? "+" : ""}
                            {dv})
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {i.expected?.revenue != null ? rand(i.expected.revenue) : "—"} →{" "}
                        {i.actual?.revenue != null ? rand(i.actual.revenue) : "—"}
                      </td>
                      <td className="p-3">
                        {i.expected?.date ?? "—"} → {i.actual?.date ?? "—"}
                      </td>
                      <td className="p-3">
                        {i.actual?.reasons || (
                          <span className="text-muted-foreground">
                            No reason given — differences are not attributed
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {i.actual?.evidence || (
                          <span className="text-muted-foreground">Self-reported</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {declined.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Declined: {declined.map((d) => d.title).join(", ")}
        </p>
      )}
    </Screen>
  );
}

function Card({
  i,
  update,
}: {
  i: PipelineItem;
  update: (id: string, p: Partial<PipelineItem>, s?: Stage, note?: string) => void;
}) {
  const [notes, setNotes] = useState(i.notes ?? "");
  const [exp, setExp] = useState({
    volume: String(i.expected?.volume ?? ""),
    revenue: String(i.expected?.revenue ?? ""),
    date: i.expected?.date ?? "",
    deadline: i.deadline ?? "",
  });
  const [act, setAct] = useState({ volume: "", revenue: "", date: "", reasons: "", evidence: "" });
  const idx = STAGES.indexOf(i.stage);
  const btn = "rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground";
  return (
    <article className="rounded-2xl border bg-card p-4">
      <p className="font-semibold">{i.title}</p>
      {i.participant && <p className="text-xs text-muted-foreground">{i.participant}</p>}
      <div className="mt-2 flex gap-1">
        {STAGES.map((s, k) => (
          <span
            key={s}
            title={s}
            className={`h-1.5 flex-1 rounded-full ${k <= idx ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Now: {i.stage}
      </p>
      <div className="mt-3 space-y-2">
        {i.stage === "Opportunity" && (
          <button className={btn} onClick={() => update(i.id, {}, "Assessment")}>
            Start assessment
          </button>
        )}
        {i.stage === "Assessment" && (
          <>
            <textarea
              className={input}
              rows={2}
              placeholder="Assessment notes: fit, gaps, risks"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="flex gap-2">
              <Link to="/simulator" className="rounded-xl border px-3 py-1.5 text-xs font-semibold">
                Model in simulator
              </Link>
              <button className={btn} onClick={() => update(i.id, { notes }, "Decision")}>
                Ready to decide
              </button>
            </div>
          </>
        )}
        {i.stage === "Decision" && (
          <div className="flex gap-2">
            <button
              className={btn}
              onClick={() =>
                update(i.id, { decision: "pursue" }, "Commitment", "Decided to pursue")
              }
            >
              Pursue
            </button>
            <button
              className="rounded-xl border px-3 py-1.5 text-xs font-semibold"
              onClick={() => {
                update(i.id, { decision: "decline" }, undefined);
                toast("Marked as declined");
              }}
            >
              Decline
            </button>
          </div>
        )}
        {i.stage === "Commitment" && (
          <>
            <p className="text-xs text-muted-foreground">
              What do you expect? This becomes the baseline for the outcome.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input
                className={input}
                inputMode="decimal"
                placeholder="Volume (t)"
                value={exp.volume}
                onChange={(e) => setExp({ ...exp, volume: e.target.value })}
              />
              <input
                className={input}
                inputMode="decimal"
                placeholder="Revenue (R)"
                value={exp.revenue}
                onChange={(e) => setExp({ ...exp, revenue: e.target.value })}
              />
              <label className="text-[11px] text-muted-foreground">
                Delivery
                <input
                  type="date"
                  className={input}
                  value={exp.date}
                  onChange={(e) => setExp({ ...exp, date: e.target.value })}
                />
              </label>
              <label className="text-[11px] text-muted-foreground">
                Deadline
                <input
                  type="date"
                  className={input}
                  value={exp.deadline}
                  onChange={(e) => setExp({ ...exp, deadline: e.target.value })}
                />
              </label>
            </div>
            <button
              className={btn}
              onClick={() =>
                update(
                  i.id,
                  {
                    expected: {
                      volume: n(exp.volume),
                      revenue: n(exp.revenue),
                      date: exp.date || undefined,
                    },
                    deadline: exp.deadline || undefined,
                  },
                  "Action",
                  "Commitment confirmed by you",
                )
              }
            >
              Confirm my commitment
            </button>
          </>
        )}
        {i.stage === "Action" && (
          <button className={btn} onClick={() => update(i.id, {}, "Outcome")}>
            <Check className="mr-1 inline h-3 w-3" />
            Work done — record outcome
          </button>
        )}
        {i.stage === "Outcome" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <input
                className={input}
                inputMode="decimal"
                placeholder={`Actual t (exp ${i.expected?.volume ?? "?"})`}
                value={act.volume}
                onChange={(e) => setAct({ ...act, volume: e.target.value })}
              />
              <input
                className={input}
                inputMode="decimal"
                placeholder="Actual revenue"
                value={act.revenue}
                onChange={(e) => setAct({ ...act, revenue: e.target.value })}
              />
              <input
                aria-label="Actual date"
                type="date"
                className={`${input} col-span-2`}
                value={act.date}
                onChange={(e) => setAct({ ...act, date: e.target.value })}
              />
            </div>
            <textarea
              className={input}
              rows={2}
              placeholder="Why was it different? (only what you know)"
              value={act.reasons}
              onChange={(e) => setAct({ ...act, reasons: e.target.value })}
            />
            <input
              className={input}
              placeholder="Evidence (e.g. weighbridge slip #, invoice)"
              value={act.evidence}
              onChange={(e) => setAct({ ...act, evidence: e.target.value })}
            />
            <button
              className={btn}
              onClick={() =>
                update(
                  i.id,
                  {
                    actual: {
                      volume: n(act.volume),
                      revenue: n(act.revenue),
                      date: act.date || undefined,
                      reasons: act.reasons,
                      evidence: act.evidence,
                    },
                  },
                  "Outcome",
                  "Outcome recorded",
                )
              }
            >
              Save outcome
            </button>
          </>
        )}
      </div>
      <details className="mt-3 text-[11px] text-muted-foreground">
        <summary className="cursor-pointer">History</summary>
        {i.history.map((h, k) => (
          <p key={k}>
            {new Date(h.at).toLocaleDateString()} — {h.stage}
            {h.note ? `: ${h.note}` : ""}
          </p>
        ))}
      </details>
    </article>
  );
}
