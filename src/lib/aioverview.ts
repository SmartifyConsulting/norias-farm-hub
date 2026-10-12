import { useEffect, useState } from "react";

const todayKey = () => `farmerplus:aiOverview:${new Date().toISOString().slice(0, 10)}`;

/**
 * A short, real AI-generated summary of the day — weather + what's due — refreshed once per day
 * and cached in localStorage so Home doesn't call the copilot endpoint on every visit.
 */
export function useAiOverview(context: Record<string, unknown> | null) {
  const [overview, setOverview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!context) return;
    const k = todayKey();
    const cached = localStorage.getItem(k);
    if (cached) {
      setOverview(cached);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch("/api/copilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content:
                  "Give a friendly, practical 2-sentence overview of today for this farm, weaving together what's due, active risks and the top opportunity below. No headings, no bullet points, no greeting — just the 2 sentences.",
              },
            ],
            context: JSON.stringify(context),
          }),
        });
        if (!res.ok || !res.body) throw new Error("unavailable");
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let text = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          text += dec.decode(value, { stream: true });
        }
        if (!cancelled && text.trim()) {
          localStorage.setItem(k, text.trim());
          setOverview(text.trim());
        } else if (!cancelled) {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(context)]);

  return { overview, loading, error };
}
