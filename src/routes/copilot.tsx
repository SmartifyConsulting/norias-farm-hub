import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Wheat, Send, Square } from "lucide-react";
import { Screen } from "@/components/Dock";
import { MINI_APPS } from "@/lib/farm";
import { matchOpportunity, readPassport } from "@/lib/agri";
import { readStore } from "@/lib/network";
import { sharedNow } from "@/lib/shared";

export const Route = createFileRoute("/copilot")({
  head: () => ({
    meta: [
      { title: "Farm Copilot — FarmerPlus" },
      {
        name: "description",
        content:
          "Ask questions about your opportunities, gaps, risks, commitments and capacity, answered from your own farm data.",
      },
      { property: "og:title", content: "Farm Copilot — FarmerPlus" },
      {
        property: "og:description",
        content: "An assistant that explains its reasoning and never commits on your behalf.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CopilotPage,
});

const PROMPTS = [
  "Show me opportunities suitable for this farm.",
  "What am I missing to qualify for the maize offtake?",
  "Which risks should I address first?",
  "Summarise my current commitments.",
  "Where do I have unused capacity?",
  "What happens if the buyer requires delivery two weeks earlier?",
];

type Msg = { role: "user" | "assistant"; content: string };

function buildContext() {
  const passport = readPassport();
  const {
    opportunities: SAMPLE_OPPORTUNITIES,
    capacity: SAMPLE_CAPACITY,
    pools: SAMPLE_POOLS,
  } = sharedNow();
  const records = Object.fromEntries(
    MINI_APPS.map((a) => [
      a.id,
      readStore<{ title: string; detail?: string; qty?: string; date?: string }[]>(
        `farmerplus:${a.id}`,
        [],
      )
        .slice(0, 30)
        .map(({ title, detail, qty, date }) => ({ title, detail, qty, date })),
    ]),
  );
  return JSON.stringify({
    farm: readStore("farmerplus:settings", {}),
    passport,
    records,
    opportunities: SAMPLE_OPPORTUNITIES.map((o) => ({
      ...o,
      match: matchOpportunity(passport, o),
    })),
    buyerDemandPostedByUser: readStore("farmerplus:demand", []),
    pipeline: readStore("farmerplus:pipeline", []),
    risks: readStore("farmerplus:risks", []),
    sharedCapacity: [...readStore("farmerplus:capacity", []), ...SAMPLE_CAPACITY],
    collectivePools: SAMPLE_POOLS,
    poolPledges: readStore("farmerplus:pools", {}),
    batches: readStore("farmerplus:batches", []),
    notes:
      "Opportunities, capacity and pools are fictional sample listings from the shared network, not live market data.",
  });
}

function CopilotPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const ask = async (q: string) => {
    if (!q.trim() || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q.trim() }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setText("");
    setBusy(true);
    const ac = new AbortController();
    abort.current = ac;
    try {
      const r = await fetch("/api/copilot", {
        method: "POST",
        signal: ac.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context: buildContext() }),
      });
      if (!r.ok || !r.body) throw new Error("unavailable");
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs([...next, { role: "assistant", content: acc }]);
      }
      if (!acc)
        setMsgs([
          ...next,
          { role: "assistant", content: "No answer was returned. Please try again." },
        ]);
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setMsgs([
          ...next,
          {
            role: "assistant",
            content: "⚠ The copilot couldn't answer that just now — please try again.",
          },
        ]);
    } finally {
      setBusy(false);
      abort.current = null;
    }
  };

  return (
    <Screen title="Farm Copilot" wide={false}>
      <p className="-mt-3 mb-4 text-sm text-muted-foreground">
        Answers come from your records on this device. It explains its reasoning, marks estimates,
        and never accepts, signs or pays for anything.
      </p>
      <div className="space-y-4 pb-36 md:pb-28">
        {msgs.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => ask(p)}
                className="rounded-2xl border bg-card p-3 text-left text-sm hover:shadow-md"
              >
                {p}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, k) =>
          m.role === "user" ? (
            <div
              key={k}
              className="ml-auto w-fit max-w-[85%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              {m.content}
            </div>
          ) : (
            <div key={k} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Wheat className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed">
                {m.content || (
                  <span className="animate-pulse text-muted-foreground">
                    Looking at your farm data…
                  </span>
                )}
              </div>
            </div>
          ),
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
        className="fixed inset-x-0 bottom-24 mx-auto flex max-w-md gap-2 px-4 md:bottom-6 md:max-w-2xl md:px-6"
      >
        <textarea
          aria-label="Ask the copilot"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(text);
            }
          }}
          placeholder="Ask about opportunities, gaps, risks…"
          className="flex-1 resize-none rounded-2xl border bg-card px-4 py-3 text-sm shadow-md outline-none focus:ring-2 focus:ring-ring"
        />
        {busy ? (
          <button
            type="button"
            aria-label="Stop"
            onClick={() => abort.current?.abort()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground"
          >
            <Square className="h-4 w-4" />
          </button>
        ) : (
          <button
            aria-label="Send"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </form>
    </Screen>
  );
}
