import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { GraduationCap, ExternalLink } from "lucide-react";
import { useUser } from "@/lib/auth";
import { FARMSCHOOL_URL, getFarmSchoolCourses } from "@/lib/farmschool.functions";

export function useFarmSchool() {
  const { user } = useUser();
  const fn = useServerFn(getFarmSchoolCourses);
  return useQuery({
    queryKey: ["farmschool", user?.email],
    enabled: !!user?.email,
    queryFn: () => fn({ data: { email: user!.email! } }),
    staleTime: 5 * 60 * 1000,
  });
}

export function FarmSchoolCard() {
  const { data } = useFarmSchool();
  const course = data?.courses.find((c) => (c.progress ?? 0) < 100) ?? data?.courses[0];
  return (
    <section className="soft-card flex flex-wrap items-center gap-4 border p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-earth-10 text-background"><GraduationCap className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-semibold">{course ? "Continue learning" : "Learn with FarmSchool"}</p>
        <p className="truncate text-sm text-muted-foreground">{course ? `${course.title}${course.progress != null ? ` · ${course.progress}% done` : ""}` : "Short farming courses from FarmSchool."}</p>
      </div>
      <Link to="/farmschool" className="rounded-full bg-earth-1 px-4 py-1.5 text-sm font-semibold text-background">Open</Link>
    </section>
  );
}

export function FarmSchoolLink() {
  return (
    <a href={FARMSCHOOL_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-earth-1 px-4 py-2 text-sm font-semibold text-background">
      Open FarmSchool <ExternalLink className="h-4 w-4" />
    </a>
  );
}
