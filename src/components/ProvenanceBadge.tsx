import type { Provenance } from "@/lib/agri";

const STYLE: Record<Provenance, [string, string]> = {
  user: ["User-provided", "bg-secondary text-secondary-foreground"],
  verified: ["Verified", "bg-primary text-primary-foreground"],
  derived: ["System-derived", "bg-accent text-accent-foreground"],
  expired: ["Expired", "bg-destructive/15 text-destructive"],
};

export function ProvenanceBadge({ source }: { source?: Provenance }) {
  if (!source) return null;
  const [label, cls] = STYLE[source];
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>;
}
