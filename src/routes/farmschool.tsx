import { createFileRoute, Link } from "@tanstack/react-router";
import { Screen } from "@/components/Dock";
import { FarmSchoolLink, useFarmSchool } from "@/components/FarmSchool";
import { useUser } from "@/lib/auth";

export const Route = createFileRoute("/farmschool")({
  head: () => ({
    meta: [
      { title: "FarmSchool learning — FarmerPlus" },
      { name: "description", content: "Your FarmSchool courses and progress inside FarmerPlus." },
      { property: "og:title", content: "FarmSchool learning — FarmerPlus" },
      { property: "og:description", content: "Continue your FarmSchool farming courses from FarmerPlus." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FarmSchoolPage,
});

function FarmSchoolPage() {
  const { user } = useUser();
  const { data, isLoading } = useFarmSchool();
  return (
    <Screen title="FarmSchool" wide={false}>
      <section className="soft-card space-y-3 border p-5">
        <p className="text-sm text-muted-foreground">FarmSchool is our learning partner. Courses and progress for <b>{user?.email ?? "your account"}</b> appear here once connected.</p>
        {!user && <Link to="/auth" className="inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Sign in to connect</Link>}
        {user && isLoading && <p className="text-sm">Checking FarmSchool…</p>}
        {user && data && !data.connected && (
          <p className="rounded-xl bg-muted p-3 text-sm">The FarmSchool connection is being set up. Until then, open FarmSchool directly with the same email.</p>
        )}
        {data?.error && <p className="text-sm text-destructive">{data.error}</p>}
        {data?.courses.length ? (
          <ul className="divide-y">
            {data.courses.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="flex-1">{c.title}</span>
                {c.progress != null && <span className="w-24"><span className="block h-2 rounded-full bg-muted"><span className="block h-2 rounded-full bg-earth-1" style={{ width: `${Math.min(100, c.progress)}%` }} /></span></span>}
                {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="font-semibold text-earth-3">Continue</a>}
              </li>
            ))}
          </ul>
        ) : null}
        <FarmSchoolLink />
      </section>
    </Screen>
  );
}
