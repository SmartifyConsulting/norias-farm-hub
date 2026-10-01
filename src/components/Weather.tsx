import { useQuery } from "@tanstack/react-query";

const codes: Record<number, [string, string]> = {
  0: ["☀️", "Clear"], 1: ["🌤️", "Mostly clear"], 2: ["⛅", "Partly cloudy"], 3: ["☁️", "Overcast"],
  45: ["🌫️", "Fog"], 48: ["🌫️", "Fog"], 51: ["🌦️", "Drizzle"], 53: ["🌦️", "Drizzle"], 55: ["🌦️", "Drizzle"],
  61: ["🌧️", "Rain"], 63: ["🌧️", "Rain"], 65: ["🌧️", "Heavy rain"], 71: ["🌨️", "Snow"], 73: ["🌨️", "Snow"],
  75: ["❄️", "Heavy snow"], 80: ["🌦️", "Showers"], 81: ["🌧️", "Showers"], 82: ["⛈️", "Storms"], 95: ["⛈️", "Thunderstorm"],
};

export function Weather({ lat, lon, compact, place }: { lat: number; lon: number; compact?: boolean; place?: string | undefined }) {
  const { data, isError } = useQuery({
    queryKey: ["weather", lat, lon],
    queryFn: async () => {
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=precipitation_probability_max&timezone=auto&forecast_days=1`,
      );
      if (!r.ok) throw new Error("weather");
      return r.json();
    },
    staleTime: 10 * 60 * 1000,
  });
  const c = data?.current;
  const [icon, label] = codes[c?.weather_code] ?? ["🌡️", isError ? "Offline" : "Loading…"];
  if (compact) {
    const rain = data?.daily?.precipitation_probability_max?.[0];
    return (
      <div className="soft-card flex items-center gap-3 border p-4" title={place ? `Weather in ${place}` : "Weather now"}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-earth-8 text-2xl">{icon}</span>
        <div className="min-w-0">
          <p className="font-display text-2xl font-bold leading-none">{c ? Math.round(c.temperature_2m) : "--"}°</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{label}{rain != null ? ` · ${rain}% rain` : ""}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-foreground/70">Weather now</p>
          <p className="font-display text-5xl text-foreground">{c ? Math.round(c.temperature_2m) : "--"}°</p>
          <p className="text-sm text-foreground/80">{label}</p>
        </div>
        <span className="text-6xl">{icon}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-foreground/80">
        <div><b className="block text-base text-foreground">{c?.wind_speed_10m ?? "--"}</b>km/h wind</div>
        <div><b className="block text-base text-foreground">{c?.relative_humidity_2m ?? "--"}%</b>humidity</div>
        <div><b className="block text-base text-foreground">{data?.daily?.precipitation_probability_max?.[0] ?? "--"}%</b>rain chance</div>
      </div>
    </div>
  );
}
