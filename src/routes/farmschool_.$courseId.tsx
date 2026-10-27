import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Award, CheckCircle2, Circle, FileText, PlayCircle, Printer } from "lucide-react";
import { Screen } from "@/components/Dock";
import { useUser } from "@/lib/auth";
import { completeLesson, progressOf, useLearning } from "@/lib/learning";
import { learnGrowQuery } from "./farmschool";

export const Route = createFileRoute("/farmschool_/$courseId")({
  head: () => ({
    meta: [
      { title: "Course — Learn & Grow on FarmerPlus" },
      { name: "description", content: "Take this Learn & Grow course and earn a FarmerPlus accreditation." },
      { property: "og:title", content: "Course — Learn & Grow on FarmerPlus" },
      { property: "og:description", content: "Agri course with FarmerPlus accreditation." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoursePage,
});

function CoursePage() {
  const { courseId } = Route.useParams();
  const { data, isLoading } = useQuery(learnGrowQuery);
  const [state, setState] = useLearning();
  const { user } = useUser();
  const [open, setOpen] = useState<string | null>(null);
  const course = data?.courses.find((c) => c.id === courseId);
  if (isLoading) return <Screen title="Course"><p className="text-sm">Loading…</p></Screen>;
  if (!course) return <Screen title="Course"><p className="text-sm">Course not found. <Link to="/farmschool" className="underline">Back to courses</Link></p></Screen>;

  const meta = (user?.user_metadata ?? {}) as { full_name?: string; first_name?: string; last_name?: string };
  const name = meta.full_name || [meta.first_name, meta.last_name].filter(Boolean).join(" ") || user?.email || "FarmerPlus farmer";
  const done = new Set(state.done[course.id] ?? []);
  const acc = state.accreditations.find((a) => a.courseId === course.id);
  const p = progressOf(state, course);

  return (
    <Screen title={course.title} wide={false}>
      <Link to="/farmschool" className="text-sm underline">← All courses</Link>
      <section className="soft-card space-y-2 border p-4">
        <p className="text-sm text-muted-foreground">{course.description}</p>
        <p className="text-xs text-muted-foreground">{course.creator} · {course.duration} · from Learn & Grow</p>
        <span className="block h-2 rounded-full bg-muted"><span className="block h-2 rounded-full bg-earth-1" style={{ width: `${p}%` }} /></span>
        <p className="text-xs">{p}% done — finish every lesson to earn your accreditation.</p>
      </section>

      {acc && (
        <section className="soft-card space-y-2 border-2 border-earth-1 p-6 text-center print:shadow-none">
          <Award className="mx-auto h-10 w-10 text-earth-1" />
          <p className="label-caps text-xs tracking-[0.15em]">FarmerPlus Accreditation</p>
          <p className="text-sm">This certifies that</p>
          <p className="font-display text-2xl font-bold">{acc.name}</p>
          <p className="text-sm">has completed</p>
          <p className="font-display text-lg font-semibold">{acc.title}</p>
          <p className="text-xs text-muted-foreground">Issued {new Date(acc.issuedAt).toLocaleDateString()} · Code <span className="font-mono">{acc.code}</span></p>
          <button onClick={() => window.print()} className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground print:hidden"><Printer className="h-4 w-4" />Print / save PDF</button>
        </section>
      )}

      {course.modules.map((m) => (
        <section key={m.title} className="soft-card border p-4">
          <h2 className="font-display font-semibold">{m.title}</h2>
          <ul className="mt-2 divide-y">
            {m.lessons.map((l) => {
              const isDone = done.has(l.id);
              return (
                <li key={l.id} className="py-2.5">
                  <button onClick={() => setOpen(open === l.id ? null : l.id)} className="flex w-full items-center gap-3 text-left text-sm">
                    {isDone ? <CheckCircle2 className="h-5 w-5 text-earth-1" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                    {l.type === "video" ? <PlayCircle className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    <span className="flex-1">{l.title}</span>
                    <span className="text-xs text-muted-foreground">{l.duration}</span>
                  </button>
                  {open === l.id && (
                    <div className="mt-3 space-y-3 pl-8">
                      {l.type === "video" && l.video_url
                        ? <video src={l.video_url} controls className="w-full rounded-xl" />
                        : l.body
                          ? <div className="whitespace-pre-line rounded-xl bg-muted p-3 text-sm leading-relaxed">{l.body}</div>
                          : l.quiz?.length
                            ? <ol className="list-decimal space-y-2 rounded-xl bg-muted p-3 pl-7 text-sm">{l.quiz.map((q, i) => <li key={i}><p className="font-medium">{q.q}</p><ul className="list-disc pl-5">{q.options.filter(Boolean).map((o, j) => <li key={j}>{o}</li>)}</ul></li>)}</ol>
                            : <p className="rounded-xl bg-muted p-3 text-sm">{l.type === "video" ? "Watch this lesson, then mark it complete." : "Complete this assignment, then mark it complete."}</p>}
                      {!isDone && (
                        <button onClick={() => setState(completeLesson(state, course, l.id, name))} className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">Mark complete</button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </Screen>
  );
}
