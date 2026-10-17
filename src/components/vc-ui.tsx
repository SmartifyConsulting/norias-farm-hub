import type { ReactNode } from "react";

export const inputCls =
  "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

export function Card({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: readonly T[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium ${value === t ? "bg-foreground text-background" : "bg-card hover:bg-muted"}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export function Pill({ tone, children }: { tone: "ok" | "warn" | "bad" | "info"; children: ReactNode }) {
  const c = { ok: "bg-primary/15 text-primary", warn: "bg-warning/20 text-foreground", bad: "bg-destructive/15 text-destructive", info: "bg-muted text-foreground" }[tone];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c}`}>{children}</span>;
}

export const btn = "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50";
export const btnGhost = "rounded-xl border px-3 py-1.5 text-xs font-medium hover:bg-muted";
