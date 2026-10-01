import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const FARMSCHOOL_URL = "https://farmschool.lovable.app";

export type FarmSchoolCourse = { id: string; title: string; progress?: number; url?: string };

/** Reads courses + progress for the learner's email from FarmSchool, once FarmSchool issues an access key. */
export const getFarmSchoolCourses = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email: z.string().email().max(255) }).parse(d))
  .handler(async ({ data }): Promise<{ connected: boolean; courses: FarmSchoolCourse[]; error?: string }> => {
    const key = process.env["FARMSCHOOL_API_KEY"];
    if (!key) return { connected: false, courses: [] };
    try {
      const r = await fetch(`${FARMSCHOOL_URL}/api/public/learner-courses?email=${encodeURIComponent(data.email)}`, {
        headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      });
      if (!r.ok) return { connected: true, courses: [], error: `FarmSchool replied ${r.status}` };
      const j = (await r.json()) as { courses?: FarmSchoolCourse[] };
      return { connected: true, courses: Array.isArray(j.courses) ? j.courses.slice(0, 20) : [] };
    } catch {
      return { connected: true, courses: [], error: "FarmSchool could not be reached" };
    }
  });
