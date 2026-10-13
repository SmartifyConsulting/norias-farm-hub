import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FarmRecord, MiniApp } from "@/lib/farm";
import { useSettings } from "@/lib/farm";
import { WEATHER_CODES } from "@/components/Weather";

export type CalEvent = { id: string; date: string; label: string; kind: string };

/** Turn dated records into calendar events (start + optional end). */
export function eventsFor(app: MiniApp, records: FarmRecord[]): CalEvent[] {
  if (!app.dates) return [];
  const out: CalEvent[] = [];
  for (const r of records) {
    if (r.due) out.push({ id: r.id + "s", date: r.due, label: r.title, kind: app.dates[0] });
    if (r.end && app.dates[1])
      out.push({ id: r.id + "e", date: r.end, label: r.title, kind: app.dates[1] });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function FarmCalendar({ events }: { events: CalEvent[] }) {
  const [s] = useSettings();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const todayIso = iso(new Date());
  const first = new Date(cursor);
  const offset = (first.getDay() + 6) % 7;
  const daysIn = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + daysIn) / 7) * 7 }, (_, i) => {
    const day = i - offset + 1;
    return day >= 1 && day <= daysIn
      ? iso(new Date(cursor.getFullYear(), cursor.getMonth(), day))
      : null;
  });
  const by = (d: string) => events.filter((e) => e.date === d);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return iso(d);
  });
  const overdue = events.filter((e) => e.date < todayIso).slice(-3);
  const move = (n: number) => {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() + n);
    setCursor(d);
  };

  // Same 14-day outlook as the Weather card, keyed by date, so due dates can show what the
  // weather's expected to be that day — mapped onto both the week strip and the month grid.
  const { data: forecast } = useQuery({
    queryKey: ["weather", s.lat, s.lon],
    queryFn: async () => {
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=14`,
      );
      if (!r.ok) throw new Error("weather");
      return r.json();
    },
    staleTime: 10 * 60 * 1000,
  });
  const weatherByDate: Record<string, { code: number; max: number; min: number }> = {};
  (forecast?.daily?.time ?? []).forEach((date: string, i: number) => {
    weatherByDate[date] = {
      code: forecast.daily.weather_code[i],
      max: forecast.daily.temperature_2m_max[i],
      min: forecast.daily.temperature_2m_min[i],
    };
  });

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="mb-2 font-semibold">This week</h2>
        {overdue.length > 0 && (
          <p className="mb-2 text-xs text-destructive">
            Past: {overdue.map((e) => `${e.label} (${e.kind} ${e.date})`).join(" · ")}
          </p>
        )}
        <ul className="grid gap-2 sm:grid-cols-7">
          {week.map((d) => {
            const w = weatherByDate[d];
            const [wIcon] = w ? (WEATHER_CODES[w.code] ?? ["🌡️"]) : [];
            return (
              <li
                key={d}
                className={`rounded-xl border p-2 text-xs ${d === todayIso ? "border-primary" : ""}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <p className="font-semibold">
                    {new Date(d + "T00:00").toLocaleDateString(undefined, {
                      weekday: "short",
                      day: "numeric",
                    })}
                  </p>
                  {w && (
                    <span
                      className="shrink-0 text-[10px] text-muted-foreground"
                      title={`${Math.round(w.max)}°/${Math.round(w.min)}°`}
                    >
                      {wIcon} {Math.round(w.max)}°
                    </span>
                  )}
                </div>
                {by(d).length === 0 ? (
                  <p className="text-muted-foreground">—</p>
                ) : (
                  by(d).map((e) => (
                    <p key={e.id} className="truncate">
                      <span className="text-muted-foreground">{e.kind}:</span> {e.label}
                    </p>
                  ))
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="rounded-2xl border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <button aria-label="Previous month" onClick={() => move(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="font-semibold">
            {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h2>
          <button aria-label="Next month" onClick={() => move(1)}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            const w = d ? weatherByDate[d] : undefined;
            const [wIcon] = w ? (WEATHER_CODES[w.code] ?? ["🌡️"]) : [];
            return (
              <div
                key={i}
                className={`min-h-14 rounded-lg p-1 text-[10px] ${d ? "bg-muted/40 border" : ""} ${d === todayIso ? "ring-2 ring-primary" : ""}`}
              >
                {d && (
                  <div className="flex items-center justify-between gap-0.5">
                    <p className="font-semibold">{Number(d.slice(8))}</p>
                    {w && (
                      <span title={`${Math.round(w.max)}°/${Math.round(w.min)}°`}>{wIcon}</span>
                    )}
                  </div>
                )}
                {d &&
                  by(d).map((e) => (
                    <p
                      key={e.id}
                      title={`${e.kind}: ${e.label}`}
                      className="truncate rounded bg-primary px-1 text-primary-foreground"
                    >
                      {e.label}
                    </p>
                  ))}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
