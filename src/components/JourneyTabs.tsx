import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { EmbeddedScreenContext } from "@/components/Dock";
import type { ComponentType } from "react";
type Section = { label: string; description: string; to: string; component?: ComponentType | undefined };
export function JourneyTabs({ sections }: { sections: readonly Section[] }) {
  const [active, setActive] = useState(0);
  const selected = sections[active] ?? sections[0];
  if (!selected) return null;
  const Content = selected.component;
  return <section>
    <div role="tablist" aria-label="Journey sections" className="mb-5 flex gap-1 overflow-x-auto border-b pb-0.5">
      {sections.map((section, index) => <button key={section.label} type="button" role="tab" aria-selected={active === index} onClick={() => setActive(index)}
        className={active === index ? "shrink-0 border-b-2 border-primary px-4 py-3 text-sm font-semibold text-primary" : "shrink-0 border-b-2 border-transparent px-4 py-3 text-sm text-muted-foreground hover:text-foreground"}>
        {section.label}
      </button>)}
    </div>
    <div role="tabpanel" className="min-h-48 py-4">
      {Content ? <EmbeddedScreenContext.Provider value={true}><Content /></EmbeddedScreenContext.Provider> : <>
      <h2 className="text-xl font-semibold">{selected.label}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{selected.description}</p>
      <Link to={selected.to as "/sales"} className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Open {selected.label}</Link></>}
    </div>
  </section>;
}
