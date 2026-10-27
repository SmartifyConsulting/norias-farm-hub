import { useStore } from "./network";
import type { LGCourse } from "./learngrow.functions";

export type Accreditation = { courseId: string; title: string; code: string; issuedAt: string; name: string };
export type LearningState = { done: Record<string, string[]>; accreditations: Accreditation[] };

export const useLearning = () => useStore<LearningState>("farmerplus:learning", { done: {}, accreditations: [] });

export const lessonsOf = (c: LGCourse) => c.modules.flatMap((m) => m.lessons);

export function progressOf(state: LearningState, c: LGCourse) {
  const total = lessonsOf(c).length;
  const done = (state.done[c.id] ?? []).filter((id) => lessonsOf(c).some((l) => l.id === id)).length;
  return total ? Math.round((done / total) * 100) : 0;
}

/** Accreditation code: FP-ACCRED-<year>-<6 hex chars>. */
export function makeCode(now = new Date()) {
  const r = Array.from(crypto.getRandomValues(new Uint8Array(3))).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `FP-ACCRED-${now.getFullYear()}-${r}`;
}

/** Marks a lesson done; issues an accreditation once every lesson in the course is complete. */
export function completeLesson(state: LearningState, c: LGCourse, lessonId: string, name: string, now = new Date()): LearningState {
  const set = new Set(state.done[c.id] ?? []);
  set.add(lessonId);
  const next: LearningState = { ...state, done: { ...state.done, [c.id]: [...set] } };
  const all = lessonsOf(c).every((l) => set.has(l.id));
  if (all && !state.accreditations.some((a) => a.courseId === c.id)) {
    next.accreditations = [...state.accreditations, { courseId: c.id, title: c.title, code: makeCode(now), issuedAt: now.toISOString(), name }];
  }
  return next;
}
