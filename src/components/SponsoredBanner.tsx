import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SPONSORED_ADS } from "@/lib/sponsoredAds";
import { supabase } from "@/integrations/supabase/client";

type DisplayAd = {
  id: string;
  sponsor: string;
  title: string;
  blurb: string;
  cta: string;
  tag: string;
  from: string;
  to: string;
  real: boolean;
};

/** A single, slowly auto-rotating sponsored "ad image" — a colour gradient card. Shows real,
 * paid, currently-active campaigns from the `active_ads` view first, then fills any remaining
 * rotation slots with seed placeholders so the banner is never empty. Advances every 7s. */
export function SponsoredBanner({
  className = "",
  offset = 0,
}: {
  className?: string;
  /** Starting index into the rotation, so two banners on the same page don't show the same ad
   * at the same time. */
  offset?: number;
}) {
  const [paidAds, setPaidAds] = useState<DisplayAd[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("active_ads").select("*");
      if (cancelled || !data) return;
      setPaidAds(
        data
          .filter((a): a is typeof a & { id: string } => !!a.id)
          .map((a) => ({
            id: a.id,
            sponsor: a.company_name ?? "",
            title: a.title ?? "",
            blurb: a.blurb ?? "",
            cta: a.cta ?? "Learn more",
            tag: a.tag ?? "Sponsored",
            from: a.gradient_from ?? "#16a34a",
            to: a.gradient_to ?? "#052e14",
            real: true,
          })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ads: DisplayAd[] =
    paidAds.length > 0
      ? paidAds
      : SPONSORED_ADS.map((a) => ({
          id: a.id,
          sponsor: a.sponsor,
          title: a.title,
          blurb: a.blurb,
          cta: a.cta,
          tag: a.tag,
          from: a.from,
          to: a.to,
          real: false,
        }));

  const [i, setI] = useState(offset);
  useEffect(() => {
    setI((v) => v % ads.length);
    const t = setInterval(() => setI((v) => (v + 1) % ads.length), 7000);
    return () => clearInterval(t);
  }, [ads.length]);

  // ads.length can shrink between the offset-based initial state and the effect above catching
  // up (e.g. real paid ads replacing a longer seed list) — guard the render itself, not just i.
  const ad = ads[i % ads.length]!;
  const impressed = useRef(new Set<string>());
  useEffect(() => {
    if (!ad.real || impressed.current.has(ad.id)) return;
    impressed.current.add(ad.id);
    void supabase.rpc("record_ad_event", { _campaign: ad.id, _kind: "impression" });
  }, [ad]);

  const onCtaClick = () => {
    if (ad.real) {
      void supabase.rpc("record_ad_event", { _campaign: ad.id, _kind: "click" });
      toast(`${ad.sponsor} · ${ad.cta}`, {
        icon: "📣",
        description: "This ad doesn't link out yet — it's shown for engagement tracking only.",
      });
    } else {
      toast("This is a placeholder ad — nothing to connect to yet.", { icon: "📣" });
    }
  };

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Megaphone className="h-3.5 w-3.5" />
          Sponsored
        </p>
        <Link
          to="/advertise"
          className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
        >
          Advertise here
        </Link>
      </div>
      <div
        key={ad.id}
        className="relative flex min-h-[140px] animate-in flex-col justify-between overflow-hidden rounded-2xl p-5 text-white shadow-md fade-in duration-500"
        style={{ backgroundImage: `linear-gradient(to bottom right, ${ad.from}, ${ad.to})` }}
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
          onClick={onCtaClick}
          className="self-start rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black"
        >
          {ad.cta} →
        </button>
      </div>
      <div className="mt-2 flex justify-center gap-1.5">
        {ads.map((a, idx) => (
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
