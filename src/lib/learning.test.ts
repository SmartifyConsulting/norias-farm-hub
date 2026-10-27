import { describe, expect, it } from "vitest";
import { completeLesson, makeCode } from "./learning";
import type { LGCourse } from "./learngrow.functions";

const course: LGCourse = { id: "c", title: "Soil", category: "Ops", creator: "x", duration: "1h", description: "",
  modules: [{ title: "M", duration: "", lessons: [{ id: "a", title: "A", duration: "", type: "video" }, { id: "b", title: "B", duration: "", type: "file" }] }] };

describe("FarmerPlus accreditation", () => {
  it("is not issued until every lesson is complete", () => {
    const s = completeLesson({ done: {}, accreditations: [] }, course, "a", "Jo");
    expect(s.accreditations).toHaveLength(0);
  });
  it("is issued once all lessons are complete, only once", () => {
    let s = completeLesson({ done: {}, accreditations: [] }, course, "a", "Jo");
    s = completeLesson(s, course, "b", "Jo");
    s = completeLesson(s, course, "b", "Jo");
    expect(s.accreditations).toHaveLength(1);
    expect(s.accreditations[0]!.name).toBe("Jo");
  });
  it("uses the FP-ACCRED-<year>-XXXXXX code format", () => {
    expect(makeCode(new Date("2026-10-27"))).toMatch(/^FP-ACCRED-2026-[0-9A-F]{6}$/);
  });
});
