import { useQuery } from "@tanstack/react-query";

const codes: Record<number, [string, string]> = {
  0: ["☀️", "Clear"],
  1: ["🌤️", "Mostly clear"],
  2: ["⛅", "Partly cloudy"],
  3: ["☁️", "Overcast"],
  45: ["🌫️", "Fog"],
  48: ["🌫️", "Fog"],
  51: ["🌦️", "Drizzle"],
  53: ["🌦️", "Drizzle"],
  55: ["🌦️", "Drizzle"],
  61: ["🌧️", "Rain"],
  63: ["🌧️", "Rain"],
  65: ["🌧️", "Heavy rain"],
  71: ["🌨️", "Snow"],
  73: ["🌨️", "Snow"],
  75: ["❄️", "Heavy snow"],
  80: ["🌦️", "Showers"],
  81: ["🌧️", "Showers"],
  82: ["⛈️", "Storms"],
  95: ["⛈️", "Thunderstorm"],
};

export function Weather({
  lat,
  lon,
  compact,
  place,
}: {
  lat: number;
  lon: number;
  compact?: boolean;
  place?: string | undefined;
}) {
  const { data, isError } = useQuery({
    queryKey: ["weather", lat, lon],
    queryFn: async () => {
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=10`,
      );
      if (!r.ok) throw new Error("weather");
      return r.json();
    },
    staleTime: 10 * 60 * 1000,
  });
  const c = data?.current;
  const [icon, label] = codes[c?.weather_code] ?? ["🌡️", isError ? "Offline" : "Loading…"];
  const forecast: { date: string; code: number; max: number; min: number; rain: number }[] = (
    data?.daily?.time ?? []
  ).map((date: string, i: number) => ({
    date,
    code: data.daily.weather_code[i],
    max: data.daily.temperature_2m_max[i],
    min: data.daily.temperature_2m_min[i],
    rain: data.daily.precipitation_probability_max[i],
  }));
  const dayLabel = (iso: string, i: number) => {
    if (i === 0) return "Today";
    if (i === 1) return "Tomorrow";
    return new Date(iso).toLocaleDateString("en-ZA", { weekday: "short" });
  };
  if (compact) {
    const rain = data?.daily?.precipitation_probability_max?.[0];
    return (
      <div
        className="soft-card space-y-3 border p-4"
        title={place ? `Weather in ${place}` : "Weather now"}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-earth-8 text-2xl">
            {icon}
          </span>
          <div className="min-w-0">
            <p className="font-display text-2xl font-bold leading-none">
              {c ? Math.round(c.temperature_2m) : "--"}°
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {label}
              {rain != null ? ` · ${rain}% rain` : ""}
            </p>
          </div>
        </div>
        {forecast.length > 1 && (
          <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
            {forecast.map((d, i) => {
              const [dIcon] = codes[d.code] ?? ["🌡️"];
              return (
                <div
                  key={d.date}
                  className="flex min-w-0 flex-col items-center gap-0.5 rounded-lg bg-muted px-0.5 py-1 text-center"
                >
                  <span className="truncate text-[9px] font-semibold text-muted-foreground">
                    {i === 0 ? "Td" : i === 1 ? "Tm" : dayLabel(d.date, i).slice(0, 2)}
                  </span>
                  <span className="text-sm leading-none">{dIcon}</span>
                  <span className="text-[9px] font-semibold leading-tight">
                    {Math.round(d.max)}°
                    <span className="text-muted-foreground">/{Math.round(d.min)}°</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-foreground/70">
            Weather now
          </p>
          <p className="font-display text-5xl text-foreground">
            {c ? Math.round(c.temperature_2m) : "--"}°
          </p>
          <p className="text-sm text-foreground/80">{label}</p>
        </div>
        <span className="text-6xl">{icon}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-foreground/80">
        <div>
          <b className="block text-base text-foreground">{c?.wind_speed_10m ?? "--"}</b>km/h wind
        </div>
        <div>
          <b className="block text-base text-foreground">{c?.relative_humidity_2m ?? "--"}%</b>
          humidity
        </div>
        <div>
          <b className="block text-base text-foreground">
            {data?.daily?.precipitation_probability_max?.[0] ?? "--"}%
          </b>
          rain chance
        </div>
      </div>
    </div>
  );
}
