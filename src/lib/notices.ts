import { matchOpportunity, SAMPLE_OPPORTUNITIES, usePassport } from "@/lib/agri";
import { useNotifyPrefs, usePipeline, useReadNotices, useRisks, type NotifyType } from "@/lib/network";

export type Notice = { id: string; type: NotifyType; text: string; to: string };
const days = (d?: string) => (d ? (new Date(d).getTime() - Date.now()) / 864e5 : Infinity);

/** Computed from local data; nothing is sent anywhere. */
export function useNotices() {
  const [passport] = usePassport();
  const [risks] = useRisks();
  const [pipe] = usePipeline();
  const [prefs] = useNotifyPrefs();
  const [read, setRead] = useReadNotices();
  const all: Notice[] = [];
  for (const o of SAMPLE_OPPORTUNITIES) {
    const m = matchOpportunity(passport, o);
    if (m.score >= 50) all.push({ id: `m-${o.id}`, type: "New matching opportunity", text: `${m.label}: ${o.title}`, to: "/opportunities" });
    const d = days(o.deadline);
    if (d >= 0 && d <= 30) all.push({ id: `c-${o.id}`, type: "Opportunity closing soon", text: `${o.title} closes ${o.deadline}`, to: "/opportunities" });
  }
  for (const r of risks) if (["detected", "predicted", "recommended"].includes(r.stage)) all.push({ id: `r-${r.id}`, type: "Risk detected", text: r.title, to: "/risks" });
  for (const p of pipe) {
    if (p.stage === "Commitment" || p.stage === "Action") { const d = days(p.deadline); if (d <= 14) all.push({ id: `k-${p.id}`, type: "Commitment approaching", text: `${p.title} due ${p.deadline ?? "soon"}`, to: "/outcomes" }); }
    if (p.stage === "Action" && p.expected?.date && days(p.expected.date) < 0) all.push({ id: `o-${p.id}`, type: "Outcome due for recording", text: `Record the outcome of ${p.title}`, to: "/outcomes" });
  }
  for (const [k, c] of Object.entries(passport)) { const d = days(c.expires); if (d <= 30) all.push({ id: `v-${k}`, type: "Verification expiring", text: `Evidence for "${k}" ${d < 0 ? "has expired" : "expires soon"}`, to: "/passport" }); }
  const notices = all.filter((n) => prefs[n.type] !== false);
  const unread = notices.filter((n) => !read.includes(n.id));
  return { notices, unread, markAll: () => setRead(notices.map((n) => n.id)) };
}
