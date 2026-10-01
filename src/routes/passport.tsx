import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Screen } from "@/components/Dock";
import { ProvenanceBadge } from "@/components/ProvenanceBadge";
import { PASSPORT_FIELDS, effectiveSource, usePassport, type Claim } from "@/lib/agri";

export const Route = createFileRoute("/passport")({
  head: () => ({
    meta: [
      { title: "Capability Passport — FarmerPlus" },
      { name: "description", content: "Your farm's land, infrastructure, certifications and supply track record in one reusable passport." },
      { property: "og:title", content: "Capability Passport — FarmerPlus" },
      { property: "og:description", content: "A reusable farm capability profile for matching with buyers and opportunities." },
    ],
  }),
  component: PassportPage,
});

/** Values the app can work out from existing farm records. */
function derived(): Record<string, string> {
  const read = (k: string) => { try { return JSON.parse(localStorage.getItem(`farmerplus:${k}`) || "[]") as { qty?: string; title: string }[]; } catch { return []; } };
  const fields = read("fields"), harvest = read("harvest");
  const out: Record<string, string> = {};
  const ha = fields.reduce((s, r) => s + (parseFloat(r.qty ?? "") || 0), 0);
  if (ha) out.landInProduction = String(ha);
  const kg = harvest.reduce((s, r) => s + (parseFloat(r.qty ?? "") || 0), 0);
  if (kg) out.volumesSupplied = String(+(kg / 1000).toFixed(1));
  const crops = [...new Set(harvest.map((r) => r.title.trim()).filter(Boolean))];
  if (crops.length) out.cropsSupplied = crops.join(", ");
  return out;
}

function PassportPage() {
  const [p, setP] = usePassport();
  const [d, setD] = useState<Record<string, string>>({});
  useEffect(() => setD(derived()), []);
  const set = (key: string, patch: Partial<Claim>) => {
    const prev = p[key] ?? { value: "", source: "user" as const };
    // Any edit by the farmer becomes a user-provided claim; verification can only come from a reviewer.
    setP({ ...p, [key]: { ...prev, ...patch, source: "user" } });
  };
  const filled = PASSPORT_FIELDS.filter((f) => p[f.key]?.value || d[f.key]).length;
  const input = "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <Screen title="Capability Passport">
      <div className="mb-4 rounded-2xl border bg-card p-4">
        <p className="text-sm">{filled} of {PASSPORT_FIELDS.length} capabilities captured. Your passport is used to find <Link to="/opportunities" className="font-semibold text-primary underline">matching opportunities</Link>.</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${(filled / PASSPORT_FIELDS.length) * 100}%` }} /></div>
        <p className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <ProvenanceBadge source="user" /> you entered it
          <ProvenanceBadge source="derived" /> worked out from your records
          <ProvenanceBadge source="verified" /> checked by a reviewer
          <ProvenanceBadge source="expired" /> past its expiry date
        </p>
      </div>
      {(["Farm", "Commercial"] as const).map((g) => (
        <section key={g} className="mb-6">
          <h2 className="mb-2 font-display text-lg font-semibold">{g === "Farm" ? "Farm capability" : "Commercial capability"}</h2>
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
            {PASSPORT_FIELDS.filter((f) => f.group === g).map((f) => {
              const c = p[f.key];
              const auto = !c?.value && d[f.key];
              return (
                <div key={f.key} className="rounded-2xl border bg-card p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <label htmlFor={f.key} className="text-sm font-medium">{f.label}</label>
                    <ProvenanceBadge source={auto ? "derived" : c?.value ? effectiveSource(c) : undefined} />
                  </div>
                  <input id={f.key} className={input} placeholder={auto ? d[f.key] : f.hint} value={c?.value ?? ""} onChange={(e) => set(f.key, { value: e.target.value })} />
                  {c?.value && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input aria-label={`${f.label} evidence`} className={`${input} text-xs`} placeholder="Evidence (doc name / link)" value={c.evidence ?? ""} onChange={(e) => set(f.key, { evidence: e.target.value })} />
                      <input aria-label={`${f.label} expiry`} type="date" className={`${input} text-xs`} value={c.expires ?? ""} onChange={(e) => set(f.key, { expires: e.target.value })} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <button onClick={() => toast.success("Passport saved on this device")} className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground md:mx-auto md:block md:max-w-md">Save passport</button>
    </Screen>
  );
}
