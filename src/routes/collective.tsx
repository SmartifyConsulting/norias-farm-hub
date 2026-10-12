import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Screen } from "@/components/Dock";
import { useShared } from "@/lib/shared";
import { uid, useOwnPools, usePools, type Pool } from "@/lib/network";
import { useMyCooperatives } from "@/lib/coop";

export const Route = createFileRoute("/collective")({
  head: () => ({
    meta: [
      { title: "Collective Buying & Supply — FarmerPlus" },
      {
        name: "description",
        content:
          "Join other farmers to buy inputs in bulk or combine harvests for large buyer orders.",
      },
      { property: "og:title", content: "Collective Buying & Supply — FarmerPlus" },
      {
        property: "og:description",
        content: "Bulk input buying and combined supply lots with nearby farms.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CollectivePage,
});

const input =
  "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function CollectivePage() {
  const [mine, setMine] = usePools();
  const [own, setOwn] = useOwnPools();
  const [tab, setTab] = useState<"buying" | "supply">("buying");
  const { active: myCoops } = useMyCooperatives();
  const { pools: SAMPLE_POOLS } = useShared();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [f, setF] = useState({
    title: "",
    item: "",
    unit: "t",
    target: "",
    location: "",
    closes: "",
    benefit: "",
  });

  const pools = [...own, ...SAMPLE_POOLS].filter((p) => p.mode === tab);
  const pledge = (p: Pool) => {
    const qty = parseFloat(draft[p.id] ?? "");
    if (!qty || qty <= 0) {
      toast.error("Enter how much you'd add");
      return;
    }
    setMine({ ...mine, [p.id]: { mine: qty, confirmed: false } });
    toast("Pledge saved — confirm it to join. You are not committed yet.");
  };
  const create = () => {
    const target = parseFloat(f.target);
    if (!f.title.trim() || !f.item.trim() || !target || !f.location.trim()) {
      toast.error("Title, item, target and location are required");
      return;
    }
    setOwn([
      {
        id: uid(),
        mode: tab,
        ...f,
        target,
        closes: f.closes || "Open",
        benefit: f.benefit || "Shared cost",
        members: [],
        own: true,
      },
      ...own,
    ]);
    setF({ title: "", item: "", unit: "t", target: "", location: "", closes: "", benefit: "" });
    toast.success("Group created");
  };

  return (
    <Screen title="Collective">
      <p className="-mt-3 mb-4 text-sm text-muted-foreground">
        Group with compatible farmers to buy in bulk or meet large orders together. You only join a
        group once you explicitly confirm.
      </p>
      {myCoops.length > 0 && (
        <p className="mb-4 rounded-xl bg-earth-6 p-3 text-xs text-brand-ink">
          A member of a co-operative? Collective purchasing and sales with tracked allocations and
          payments live on your co-operative's page —{" "}
          {myCoops.map(
            (m, i) =>
              m.cooperatives && (
                <span key={m.cooperative_id}>
                  {i > 0 && ", "}
                  <Link
                    to="/coop/$coopId"
                    params={{ coopId: m.cooperative_id }}
                    className="font-semibold underline"
                  >
                    {m.cooperatives.name}
                  </Link>
                </span>
              ),
          )}
          .
        </p>
      )}
      <div className="mb-4 flex w-fit rounded-full bg-secondary p-1 text-sm font-semibold">
        {(["buying", "supply"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setTab(m)}
            className={`rounded-full px-4 py-1.5 ${tab === m ? "bg-primary text-primary-foreground" : "text-secondary-foreground"}`}
          >
            {m === "buying" ? "Collective buying" : "Collective supply"}
          </button>
        ))}
      </div>
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_20rem] md:gap-6">
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {pools.map((p) => {
            const m = mine[p.id];
            const total = p.members.reduce((a, b) => a + b.qty, 0) + (m?.confirmed ? m.mine : 0);
            const pct = Math.min(100, (total / p.target) * 100);
            return (
              <article key={p.id} className="rounded-2xl border bg-card p-4">
                <p className="font-semibold">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {p.item} · {p.location} · closes {p.closes}
                </p>
                <p className="mt-1 text-xs text-success-foreground">
                  Potential advantage: {p.benefit}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {total.toLocaleString()} of {p.target.toLocaleString()} {p.unit} · still needed{" "}
                  {Math.max(0, p.target - total).toLocaleString()} {p.unit}
                </p>
                <ul className="mt-2 text-xs text-muted-foreground">
                  {p.members.map((x) => (
                    <li key={x.name}>
                      {x.name} — {x.qty} {p.unit}
                    </li>
                  ))}
                  {m?.confirmed && (
                    <li className="font-semibold text-foreground">
                      You — {m.mine} {p.unit}
                    </li>
                  )}
                </ul>
                {!m && (
                  <div className="mt-3 flex gap-2">
                    <input
                      aria-label="Your quantity"
                      inputMode="decimal"
                      className={input}
                      placeholder={`Your ${p.unit}`}
                      value={draft[p.id] ?? ""}
                      onChange={(e) => setDraft({ ...draft, [p.id]: e.target.value })}
                    />
                    <button
                      onClick={() => pledge(p)}
                      className="shrink-0 rounded-xl border px-3 text-sm font-semibold"
                    >
                      Pledge
                    </button>
                  </div>
                )}
                {m && !m.confirmed && (
                  <div className="mt-3 rounded-xl bg-warning-soft p-3 text-xs text-warning-foreground">
                    You pledged {m.mine} {p.unit}. Joining means the group may rely on this volume.
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => {
                          setMine({ ...mine, [p.id]: { ...m, confirmed: true } });
                          toast.success("You joined the group");
                        }}
                        className="rounded-lg bg-primary px-3 py-1 font-semibold text-primary-foreground"
                      >
                        Confirm and join
                      </button>
                      <button
                        onClick={() => {
                          const n = { ...mine };
                          delete n[p.id];
                          setMine(n);
                        }}
                        className="rounded-lg px-3 py-1 font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {m?.confirmed && (
                  <button
                    onClick={() => {
                      const n = { ...mine };
                      delete n[p.id];
                      setMine(n);
                      toast("You left the group");
                    }}
                    className="mt-3 text-xs font-semibold text-destructive"
                  >
                    Leave group
                  </button>
                )}
                {p.own && (
                  <button
                    onClick={() => setOwn(own.filter((x) => x.id !== p.id))}
                    className="ml-3 mt-3 text-xs font-semibold text-muted-foreground"
                  >
                    Delete group
                  </button>
                )}
              </article>
            );
          })}
        </div>
        <aside className="mt-6 h-fit space-y-3 rounded-2xl border bg-card p-4 md:sticky md:top-24 md:mt-0">
          <p className="text-sm font-semibold">
            Start a {tab === "buying" ? "buying" : "supply"} group
          </p>
          <input
            className={input}
            placeholder="Title"
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
          />
          <input
            className={input}
            placeholder={tab === "buying" ? "Input (e.g. diesel)" : "Product (e.g. soybeans)"}
            value={f.item}
            onChange={(e) => setF({ ...f, item: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className={input}
              inputMode="decimal"
              placeholder="Target"
              value={f.target}
              onChange={(e) => setF({ ...f, target: e.target.value })}
            />
            <input
              className={input}
              placeholder="Unit"
              value={f.unit}
              onChange={(e) => setF({ ...f, unit: e.target.value })}
            />
          </div>
          <input
            className={input}
            placeholder="Location"
            value={f.location}
            onChange={(e) => setF({ ...f, location: e.target.value })}
          />
          <input
            aria-label="Closes"
            type="date"
            className={input}
            value={f.closes}
            onChange={(e) => setF({ ...f, closes: e.target.value })}
          />
          <input
            className={input}
            placeholder="Expected advantage"
            value={f.benefit}
            onChange={(e) => setF({ ...f, benefit: e.target.value })}
          />
          <button
            onClick={create}
            className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground"
          >
            Create group
          </button>
        </aside>
      </div>
    </Screen>
  );
}
