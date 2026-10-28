import { Link } from "@tanstack/react-router";
import { setActiveFarm, useTeam } from "@/lib/team";

/** Global farm context: the farmer selects a parent farm, not a team. */
export function FarmSwitcher({ compact = false }: { compact?: boolean }) {
  const { farms, active, loading, user } = useTeam();
  if (!user || loading) return null;
  return <div className={compact ? "flex flex-wrap items-center gap-2" : "flex min-w-0 items-center gap-2"}>
    <label htmlFor={compact ? "farm-select-mobile" : "farm-select-desktop"} className="shrink-0 text-xs font-medium">Farm</label>
    <select
      id={compact ? "farm-select-mobile" : "farm-select-desktop"}
      aria-label="Select active farm"
      className="min-w-0 max-w-48 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
      value={active ?? ""}
      onChange={e => setActiveFarm(e.target.value || null)}
    >
      <option value="">Personal / unassigned</option>
      {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
    </select>
    {farms.length === 0 && <Link to="/team" className="text-xs underline">Create farm</Link>}
  </div>;
}
