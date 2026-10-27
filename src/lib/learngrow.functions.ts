import { createServerFn } from "@tanstack/react-start";

export const LEARN_GROW_URL = "https://farmschool.lovable.app";

export type LGLesson = { id: string; title: string; duration: string; type: "video" | "file"; video_url?: string | null; body?: string | undefined; quiz?: { q: string; options: string[] }[] | undefined };
export type LGModule = { title: string; duration: string; lessons: LGLesson[] };
export type LGCourse = { id: string; title: string; category: string; creator: string; duration: string; description: string; modules: LGModule[] };

const mods = (topic: string): LGModule[] => [
  { title: `Module 1: Introduction to ${topic}`, duration: "2h 54m", lessons: [
    { id: "l1", title: `Understanding ${topic} fundamentals`, duration: "01 h 54 m", type: "video" },
    { id: "l2", title: "Key components and equipment", duration: "01 h 00 m", type: "video" },
    { id: "l3", title: "Assignment", duration: "PDF", type: "file" },
  ] },
  { title: "Module 2: Daily Operations", duration: "1h 30m", lessons: [
    { id: "l4", title: "Routines, checklists and records", duration: "00 h 45 m", type: "video" },
    { id: "l5", title: "Troubleshooting common issues", duration: "00 h 45 m", type: "video" },
  ] },
  { title: "Module 3: Scaling Up", duration: "1h 10m", lessons: [
    { id: "l6", title: "Planning for growth", duration: "00 h 40 m", type: "video" },
    { id: "l7", title: "Final assessment", duration: "PDF", type: "file" },
  ] },
];

/** Mirror of the Learn & Grow catalogue, used until the API key is connected. */
const FALLBACK: LGCourse[] = [
  { id: "aquaponics-basics", title: "Aquaponics Systems: From Design to First Harvest", category: "Aquaponics", creator: "Amara Okoye", duration: "3h 45m", description: "Learn how fish and plants grow together in one closed-loop system — from tank sizing to your first harvest.", modules: mods("Aquaponics") },
  { id: "water-quality", title: "Water Stewardship & Quality Testing", category: "Water Quality", creator: "Daniel Mensah", duration: "1h 55m", description: "Measure pH, ammonia and nitrates with confidence and keep your system healthy all season.", modules: mods("Water Quality") },
  { id: "farm-operations", title: "Farm Operations Rhythm for Small Teams", category: "Operations", creator: "Grace Wanjiru", duration: "5h 30m", description: "Build weekly routines, roles and records that keep a small farm running smoothly.", modules: mods("Farm Operations") },
  { id: "market-access", title: "Market Readiness: Selling Your Produce", category: "Market Access", creator: "Samuel Kariuki", duration: "4h 20m", description: "Price, package and sell your produce to local buyers, restaurants and co-operatives.", modules: mods("Market Access") },
  { id: "smart-monitoring", title: "Smart Monitoring with Sensors", category: "Monitoring", creator: "Lina Haddad", duration: "2h 40m", description: "Use low-cost sensors and dashboards to watch your crops and tanks from anywhere.", modules: mods("Sensor Monitoring") },
  { id: "soil-health", title: "Soil Health & Composting", category: "Operations", creator: "Thabo Nkosi", duration: "2h 10m", description: "Build rich, living soil with compost, cover crops and simple soil tests.", modules: mods("Soil Health") },
];

const STUDIO_DB = "https://xwcntcrthitfjrdmlcow.supabase.co";
const STUDIO_KEY = "sb_publishable_-27_QfrmxNqW7A35FUP1_g_Hd7FFF18"; // Learn & Grow publishable key (public reads of published courses)

type StudioLesson = { id: string; title: string; kind: string; position: number; body: string; video_url: string | null; quiz: { q: string; options: string[] }[] | null };
type StudioCourse = { id: string; title: string; category: string; description: string; level: string; studio_lessons: StudioLesson[] };

async function fetchStudioCourses(): Promise<LGCourse[]> {
  try {
    const r = await fetch(`${STUDIO_DB}/rest/v1/studio_courses?select=id,title,category,description,level,studio_lessons(id,title,kind,position,body,video_url,quiz)&published=eq.true&order=updated_at.desc`, { headers: { apikey: STUDIO_KEY, Accept: "application/json" } });
    if (!r.ok) { console.error("Studio courses", r.status); return []; }
    const rows = (await r.json()) as StudioCourse[];
    return rows.filter((c) => c.studio_lessons?.length).map((c) => {
      const lessons = [...c.studio_lessons].sort((a, b) => a.position - b.position);
      return {
        id: c.id, title: c.title, category: c.category || "General", creator: "Learn & Grow Studio",
        duration: `${lessons.length} lessons`, description: c.description || `${c.level} course from Learn & Grow.`,
        modules: [{ title: "Course lessons", duration: `${lessons.length} lessons`, lessons: lessons.map((l) => ({
          id: l.id, title: l.title, duration: l.kind === "quiz" ? "Quiz" : l.kind === "video" ? "Video" : "Reading",
          type: l.kind === "video" ? "video" as const : "file" as const, video_url: l.video_url, body: l.body || undefined,
          quiz: l.kind === "quiz" ? (l.quiz ?? []) : undefined,
        })) }],
      };
    });
  } catch (e) { console.error(e); return []; }
}

async function _getCatalogue(): Promise<{ live: boolean; courses: LGCourse[]; error?: string }> {
    const key = process.env["LEARN_GROW_API_KEY"];
    if (!key) return { live: false, courses: FALLBACK };
    try {
      const r = await fetch(`${LEARN_GROW_URL}/api/public/v1/courses`, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" } });
      if (!r.ok) { console.error("Learn & Grow", r.status); return { live: false, courses: FALLBACK, error: "Learn & Grow could not be reached — showing the saved catalogue." }; }
      const j = (await r.json()) as { courses?: LGCourse[] };
      return { live: true, courses: Array.isArray(j.courses) && j.courses.length ? j.courses : FALLBACK };
    } catch (e) {
      console.error(e);
      return { live: false, courses: FALLBACK, error: "Learn & Grow could not be reached — showing the saved catalogue." };
    }
  }

export const getLearnGrowCourses = createServerFn({ method: "GET" }).handler(async () => {
  const [base, studio] = await Promise.all([_getCatalogue(), fetchStudioCourses()]);
  return { ...base, courses: [...studio, ...base.courses] };
});
