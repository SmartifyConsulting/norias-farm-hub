import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Landmark, GraduationCap, ShieldCheck, Banknote } from "lucide-react";
import { Screen } from "@/components/Dock";
import { useSettings } from "@/lib/farm";
import { addToPipeline } from "@/lib/network";
import { programmesFor, type GovProgramme } from "@/lib/govprogrammes";

export const Route = createFileRoute("/gov-programmes")({
  head: () => ({
    meta: [
      { title: "Government & Development — FarmerPlus" },
      {
        name: "description",
        content:
          "Government support programmes, funding and compliance help relevant to your country.",
      },
      { property: "og:title", content: "Government & Development — FarmerPlus" },
      { property: "og:description", content: "Government and development support for farmers." },
    ],
  }),
  component: GovProgrammesPage,
});

const TYPE_ICON: Record<GovProgramme["type"], typeof Landmark> = {
  funding: Banknote,
  support: Landmark,
  compliance: ShieldCheck,
  development: GraduationCap,
};
const TYPE_LABEL: Record<GovProgramme["type"], string> = {
  funding: "Funding",
  support: "Support",
  compliance: "Compliance",
  development: "Development",
};

export function GovProgrammesPage() {
  const [s] = useSettings();
  const country = s.country;
  const programmes = programmesFor(country);

  const track = (p: GovProgramme) => {
    const added = addToPipeline({
      title: p.name,
      oppId: `gov-${p.name.toLowerCase().replace(/\W+/g, "-")}`,
      participant: p.body,
    });
    toast(added ? "Added to Opportunity → Outcome" : "Already being tracked");
  };

  return (
    <Screen title="Government & Development">
      <p className="-mt-3 mb-4 text-sm text-muted-foreground">
        {country
          ? `Showing programmes for ${country}. Set your location in `
          : "Set your location in "}
        <Link to="/settings" className="font-semibold text-primary underline">
          Settings
        </Link>
        {country
          ? " if this isn't right."
          : " to see programmes for your country — showing general guidance for now."}{" "}
        Always confirm current eligibility and deadlines directly with the issuing department before
        applying.
      </p>
      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 xl:grid-cols-3">
        {programmes.map((p) => {
          const Icon = TYPE_ICON[p.type];
          return (
            <article key={p.name} className="rounded-2xl border bg-card p-4">
              <div className="mb-1 flex items-start justify-between gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                  {TYPE_LABEL[p.type]}
                </span>
              </div>
              <h3 className="font-semibold">{p.name}</h3>
              <p className="text-xs text-muted-foreground">{p.body}</p>
              <p className="mt-1 text-sm">{p.description}</p>
              <button
                onClick={() => track(p)}
                className="mt-3 rounded-xl bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground"
              >
                Track this
              </button>
            </article>
          );
        })}
      </div>
    </Screen>
  );
}
