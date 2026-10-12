import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { SPONSORED_ADS } from "@/lib/sponsoredAds";

/** A single, slowly auto-rotating sponsored "ad image" — a colour gradient card standing in for a
 * real creative until an ad provider/network is wired up. Advances every 7s; dots let you jump. */
export function SponsoredBanner({ className = "" }: { className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % SPONSORED_ADS.length), 7000);
    return () => clearInterval(t);
  }, []);
  const ad = SPONSORED_ADS[i]!;
  return (
    <div className={className}>
      <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Megaphone className="h-3.5 w-3.5" />
        Sponsored
      </p>
      <div
        key={ad.id}
        className={`relative flex min-h-[140px] animate-in flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-md fade-in duration-500 ${ad.gradient}`}
      >
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            {ad.tag}
          </span>
          <span className="text-xs font-semibold opacity-80">{ad.sponsor}</span>
        </div>
        <div>
          <h3 className="font-display text-lg font-bold leading-tight">{ad.title}</h3>
          <p className="mt-1 text-sm opacity-90">{ad.blurb}</p>
        </div>
        <button
          type="button"
          onClick={() =>
            toast("This is a placeholder ad — nothing to connect to yet.", { icon: "📣" })
          }
          className="self-start rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black"
        >
          {ad.cta} →
        </button>
      </div>
      <div className="mt-2 flex justify-center gap-1.5">
        {SPONSORED_ADS.map((a, idx) => (
          <button
            key={a.id}
            type="button"
            aria-label={`Show ${a.sponsor} ad`}
            onClick={() => setI(idx)}
            className={`h-1.5 rounded-full transition-all ${idx === i ? "w-4 bg-foreground" : "w-1.5 bg-muted-foreground/30"}`}
          />
        ))}
      </div>
    </div>
  );
}
