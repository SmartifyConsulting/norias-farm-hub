import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Screen } from "@/components/Dock";
import { DEFAULT_SCENARIO, rand, simulate, type Scenario } from "@/lib/agri";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Decision Simulator — FarmerPlus" },
      {
        name: "description",
        content:
          "Compare crops, equipment choices, price drops and yield shocks before committing resources.",
      },
      { property: "og:title", content: "Decision Simulator — FarmerPlus" },
      {
        property: "og:description",
        content: "Model farm scenarios: cost, capital, revenue and gross margin.",
      },
    ],
  }),
  component: SimulatorPage,
});

const SOY: Scenario = {
  ...DEFAULT_SCENARIO,
  name: "Soybeans",
  crop: "soybeans",
  yieldPerHa: 2.8,
  pricePerT: 7200,
  inputCostPerHa: 9000,
};

const NUM_FIELDS: [keyof Scenario, string][] = [
  ["hectares", "Land (ha)"],
  ["yieldPerHa", "Expected yield (t/ha)"],
  ["pricePerT", "Selling price (R/t)"],
  ["inputCostPerHa", "Input cost (R/ha)"],
  ["labourCost", "Labour (R)"],
  ["equipmentCost", "Equipment cost (R)"],
  ["transportPerT", "Transport (R/t)"],
  ["storagePerT", "Storage (R/t)"],
  ["capital", "Available capital (R)"],
];

function SimulatorPage() {
  const [list, setList] = useState<Scenario[]>([DEFAULT_SCENARIO, SOY]);
  const upd = (i: number, patch: Partial<Scenario>) =>
    setList(list.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const input =
    "w-full rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring";
  return (
    <Screen title="Decision Simulator">
      <p className="mb-4 text-sm text-muted-foreground">
        Estimates only, based on the figures you enter. Planting delays reduce yield by about 1.5%
        per week.
      </p>
      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 xl:grid-cols-3">
        {list.map((s, i) => {
          const r = simulate(s);
          return (
            <section key={i} className="rounded-2xl border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <input
                  aria-label="Scenario name"
                  className={`${input} font-semibold`}
                  value={s.name}
                  onChange={(e) => upd(i, { name: e.target.value })}
                />
                {list.length > 1 && (
                  <button
                    onClick={() => setList(list.filter((_, j) => j !== i))}
                    className="text-xs text-destructive"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {NUM_FIELDS.map(([k, label]) => (
                  <label key={k} className="text-[11px] text-muted-foreground">
                    {label}
                    <input
                      type="number"
                      className={input}
                      value={s[k] as number}
                      onChange={(e) => upd(i, { [k]: +e.target.value } as Partial<Scenario>)}
                    />
                  </label>
                ))}
                <label className="text-[11px] text-muted-foreground">
                  Equipment
                  <select
                    className={input}
                    value={s.equipment}
                    onChange={(e) => upd(i, { equipment: e.target.value as Scenario["equipment"] })}
                  >
                    <option value="hire">Hire</option>
                    <option value="buy">Buy</option>
                    <option value="own">Already own</option>
                  </select>
                </label>
              </div>
              <div className="mt-3 space-y-2 text-xs">
                {(
                  [
                    ["yieldShock", "Yield change", -50, 30],
                    ["priceShock", "Price change", -50, 30],
                    ["delayWeeks", "Planting delay (weeks)", 0, 8],
                  ] as const
                ).map(([k, label, min, max]) => (
                  <label key={k} className="block">
                    {label}:{" "}
                    <b>
                      {s[k]}
                      {k === "delayWeeks" ? "" : "%"}
                    </b>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      value={s[k]}
                      onChange={(e) => upd(i, { [k]: +e.target.value })}
                      className="w-full accent-[var(--primary)]"
                    />
                  </label>
                ))}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {[
                  ["Expected output", `${r.tonnes.toFixed(0)} t`],
                  ["Estimated revenue", rand(r.revenue)],
                  ["Estimated total cost", rand(r.totalCost)],
                  ["Capital required", rand(r.capitalRequired)],
                  ["Break-even price", `${rand(r.breakEvenPrice)}/t`],
                  ["Financing needed", rand(r.financing)],
                ].map(([a, b]) => (
                  <div key={a} className="rounded-xl bg-secondary p-2 text-secondary-foreground">
                    <dt className="text-muted-foreground">{a}</dt>
                    <dd className="font-semibold">{b}</dd>
                  </div>
                ))}
              </dl>
              <div
                className={`mt-2 rounded-xl p-3 text-center ${r.margin >= 0 ? "bg-primary text-primary-foreground" : "bg-destructive/15 text-destructive"}`}
              >
                <p className="text-[11px]">Estimated gross margin</p>
                <p className="font-display text-xl font-bold">
                  {rand(r.margin)} ({r.marginPct.toFixed(0)}%)
                </p>
              </div>
            </section>
          );
        })}
      </div>
      <button
        onClick={() =>
          setList([...list, { ...DEFAULT_SCENARIO, name: `Scenario ${list.length + 1}` }])
        }
        className="mt-4 w-full rounded-xl border bg-card py-2 text-sm font-semibold md:mx-auto md:block md:max-w-md"
      >
        + Add scenario
      </button>
    </Screen>
  );
}
