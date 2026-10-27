import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Award, Search } from "lucide-react";
import { Screen } from "@/components/Dock";
import { getLearnGrowCourses } from "@/lib/learngrow.functions";
import { progressOf, useLearning } from "@/lib/learning";

export const learnGrowQuery = { queryKey: ["learngrow-courses"], queryFn: () => getLearnGrowCourses(), staleTime: 10 * 60 * 1000 };

export const Route = createFileRoute("/farmschool")({
  head: () => ({
    meta: [
      { title: "Learn & Grow courses — FarmerPlus" },
      { name: "description", content: "Search agri training from Learn & Grow, take the courses in FarmerPlus and earn FarmerPlus accreditation." },
      { property: "og:title", content: "Learn & Grow courses — FarmerPlus" },
      { property: "og:description", content: "Agri courses with FarmerPlus accreditation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LearnPage,
});

function LearnPage() {
  const { data, isLoading } = useQuery(learnGrowQuery);
  const [state] = useLearning();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const courses = data?.courses ?? [];
  const cats = ["All", ...new Set(courses.map((c) => c.category))];
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return courses.filter((c) => (cat === "All" || c.category === cat) &&
      (!t || `${c.title} ${c.description} ${c.category} ${c.creator}`.toLowerCase().includes(t)));
  }, [courses, q, cat]);

  return (
    <Screen title="Learn & Grow">
      <section className="soft-card space-y-3 border p-4">
        <p className="text-sm text-muted-foreground">Agri training from Learn & Grow. Finish every lesson in a course to earn a <b className="text-foreground">FarmerPlus accreditation</b>.</p>
        <label className="flex items-center gap-2 rounded-full border bg-background px-4 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses, e.g. soil, water, market" className="w-full bg-transparent text-sm outline-none" aria-label="Search courses" />
        </label>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${cat === c ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>{c}</button>
          ))}
        </div>
        {data?.error && <p className="text-xs text-muted-foreground">{data.error}</p>}
      </section>

      {state.accreditations.length > 0 && (
        <section className="soft-card space-y-2 border p-4">
          <h2 className="font-display text-base font-semibold">My FarmerPlus accreditations</h2>
          {state.accreditations.map((a) => (
            <Link key={a.code} to="/farmschool/$courseId" params={{ courseId: a.courseId }} className="flex items-center gap-3 rounded-xl bg-muted p-3 text-sm">
              <Award className="h-5 w-5 text-earth-1" /><span className="flex-1">{a.title}</span><span className="font-mono text-xs">{a.code}</span>
            </Link>
          ))}
        </section>
      )}

      {isLoading && <p className="text-sm">Loading courses…</p>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => {
          const p = progressOf(state, c);
          const acc = state.accreditations.some((a) => a.courseId === c.id);
          return (
            <Link key={c.id} to="/farmschool/$courseId" params={{ courseId: c.id }} className="soft-card flex flex-col gap-2 border p-4 hover:bg-muted">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">{c.category}</span>
                {acc && <span className="flex items-center gap-1 text-xs font-semibold text-earth-1"><Award className="h-4 w-4" />Accredited</span>}
              </div>
              <h3 className="font-display font-semibold">{c.title}</h3>
              <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
              <p className="text-xs text-muted-foreground">{c.creator} · {c.duration}</p>
              <span className="block h-2 rounded-full bg-muted"><span className="block h-2 rounded-full bg-earth-1" style={{ width: `${p}%` }} /></span>
              <span className="text-xs">{p}% done</span>
            </Link>
          );
        })}
        {!isLoading && !list.length && <p className="text-sm text-muted-foreground">No courses match your search.</p>}
      </div>
    </Screen>
  );
}
