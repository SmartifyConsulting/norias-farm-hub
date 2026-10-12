import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { Screen } from "@/components/Dock";
import { supabase } from "@/integrations/supabase/client";
import { useCooperative } from "@/lib/coop";
import { useCoopGovernance, type VoteChoice } from "@/lib/coop-governance";

export const Route = createFileRoute("/coop/$coopId/governance")({
  head: () => ({ meta: [{ title: "Governance — FarmerPlus" }] }),
  component: Governance,
});

const input =
  "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const btn =
  "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";

function Governance() {
  const { coopId } = Route.useParams();
  const { user, coop, role, canGovern, loading: coopLoading } = useCooperative(coopId);
  const { meetings, resolutions, votes, actions, loading, reload } = useCoopGovernance(
    coopId,
    canGovern,
  );
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [agenda, setAgenda] = useState("");
  const [resTitle, setResTitle] = useState("");
  const [resDescription, setResDescription] = useState("");
  const [actionDescription, setActionDescription] = useState("");
  const [actionDue, setActionDue] = useState("");

  if (!user || coopLoading || loading)
    return (
      <Screen title="Governance">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Screen>
    );
  if (!coop || !role)
    return (
      <Screen title="Governance">
        <p className="text-sm text-muted-foreground">
          Only co-operative members can view governance.
        </p>
      </Screen>
    );

  const scheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim() || !meetingDate) return;
    const { error } = await supabase.from("cooperative_meetings").insert({
      cooperative_id: coopId,
      title: meetingTitle.trim(),
      meeting_date: meetingDate,
      agenda: agenda.trim(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setMeetingTitle("");
    setMeetingDate("");
    setAgenda("");
    await reload();
    toast.success("Meeting scheduled");
  };

  const proposeResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle.trim()) return;
    const { error } = await supabase.from("cooperative_resolutions").insert({
      cooperative_id: coopId,
      title: resTitle.trim(),
      description: resDescription.trim(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setResTitle("");
    setResDescription("");
    await reload();
    toast.success("Resolution proposed");
  };

  const cast = async (resolutionId: string, choice: VoteChoice) => {
    const { error } = await supabase
      .from("cooperative_votes")
      .upsert({ resolution_id: resolutionId, user_id: user.id, choice });
    if (error) {
      toast.error(error.message);
      return;
    }
    await reload();
  };

  const decide = async (resolutionId: string, status: "passed" | "rejected") => {
    await supabase
      .from("cooperative_resolutions")
      .update({ status, decided_at: new Date().toISOString() })
      .eq("id", resolutionId);
    await reload();
  };

  const addAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionDescription.trim()) return;
    const { error } = await supabase.from("cooperative_actions").insert({
      cooperative_id: coopId,
      description: actionDescription.trim(),
      due_date: actionDue || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setActionDescription("");
    setActionDue("");
    await reload();
    toast.success("Action added");
  };

  const toggleAction = async (id: string, status: "open" | "done") => {
    await supabase
      .from("cooperative_actions")
      .update({ status: status === "open" ? "done" : "open" })
      .eq("id", id);
    await reload();
  };

  const tally = (resolutionId: string) => {
    const vs = votes.filter((v) => v.resolution_id === resolutionId);
    return {
      for: vs.filter((v) => v.choice === "for").length,
      against: vs.filter((v) => v.choice === "against").length,
      abstain: vs.filter((v) => v.choice === "abstain").length,
    };
  };
  const myVote = (resolutionId: string) =>
    votes.find((v) => v.resolution_id === resolutionId && v.user_id === user.id)?.choice;

  return (
    <Screen title={`${coop.name} — Governance`}>
      <Link
        to="/coop/$coopId"
        params={{ coopId }}
        className="-mt-3 mb-4 inline-flex items-center text-sm text-muted-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {coop.name}
      </Link>

      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
        <div className="space-y-4">
          <section className="rounded-2xl border bg-card p-4">
            <h2 className="mb-2 font-semibold">Meetings</h2>
            {meetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No meetings yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {meetings.map((m) => (
                  <li key={m.id} className="py-2">
                    <p className="font-semibold">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.meeting_date} — {m.status}
                    </p>
                    {m.agenda && <p className="mt-1 text-xs">{m.agenda}</p>}
                  </li>
                ))}
              </ul>
            )}
            {canGovern && (
              <form onSubmit={scheduleMeeting} className="mt-3 space-y-2">
                <input
                  className={input}
                  placeholder="Meeting title"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                />
                <input
                  className={input}
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
                <input
                  className={input}
                  placeholder="Agenda"
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                />
                <button className={btn}>Schedule meeting</button>
              </form>
            )}
          </section>

          <section className="rounded-2xl border bg-card p-4">
            <h2 className="mb-2 font-semibold">Action register</h2>
            {actions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No actions yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {actions.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                    <span
                      className={a.status === "done" ? "text-muted-foreground line-through" : ""}
                    >
                      {a.description}
                      {a.due_date && ` — due ${a.due_date}`}
                    </span>
                    <button
                      onClick={() => toggleAction(a.id, a.status)}
                      className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize"
                    >
                      {a.status}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {canGovern && (
              <form onSubmit={addAction} className="mt-3 space-y-2">
                <input
                  className={input}
                  placeholder="Action / task"
                  value={actionDescription}
                  onChange={(e) => setActionDescription(e.target.value)}
                />
                <input
                  className={input}
                  type="date"
                  value={actionDue}
                  onChange={(e) => setActionDue(e.target.value)}
                />
                <button className={btn}>Add action</button>
              </form>
            )}
          </section>
        </div>

        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">Resolutions</h2>
          {resolutions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No resolutions yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {resolutions.map((r) => {
                const t = tally(r.id);
                const mine = myVote(r.id);
                return (
                  <li key={r.id} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{r.title}</span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
                        {r.status}
                      </span>
                    </div>
                    {r.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>
                    )}
                    <p className="mt-2 text-xs">
                      For {t.for} · Against {t.against} · Abstain {t.abstain}
                    </p>
                    {r.status === "proposed" && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(["for", "against", "abstain"] as VoteChoice[]).map((c) => (
                          <button
                            key={c}
                            onClick={() => cast(r.id, c)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${mine === c ? "bg-primary text-primary-foreground" : ""}`}
                          >
                            {c}
                          </button>
                        ))}
                        {canGovern && (
                          <>
                            <button
                              onClick={() => decide(r.id, "passed")}
                              className="rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success-foreground"
                            >
                              Record as passed
                            </button>
                            <button
                              onClick={() => decide(r.id, "rejected")}
                              className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive"
                            >
                              Record as rejected
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {canGovern && (
            <form onSubmit={proposeResolution} className="space-y-2 border-t pt-3">
              <input
                className={input}
                placeholder="Resolution title"
                value={resTitle}
                onChange={(e) => setResTitle(e.target.value)}
              />
              <input
                className={input}
                placeholder="Description"
                value={resDescription}
                onChange={(e) => setResDescription(e.target.value)}
              />
              <button className={btn}>Propose resolution</button>
            </form>
          )}
        </section>
      </div>
    </Screen>
  );
}
