import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) })).min(1).max(40),
  context: z.string().max(60000),
});

const SYSTEM = `You are the FarmerPlus farm copilot. Answer ONLY from the farm data provided below (the user's own records on this device) plus general agricultural knowledge.
Rules:
- Explain your reasoning briefly and show the data/assumptions you used.
- Clearly label facts (from the data) versus estimates.
- Point out missing information instead of guessing. Never invent figures, buyers, prices or records.
- Never accept opportunities, enter contracts, commit the user, or move money. You can only recommend; the user decides.
- Use matching language like "Potential match" or "Appears suitable", never "approved" or "guaranteed".
- Be concise and practical. Use short headings or bullets. Currency is South African Rand (R).`;

export const Route = createFileRoute("/api/copilot")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("The copilot is not configured.", { status: 500 });
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid request", { status: 400 });
        const { messages, context } = parsed.data;
        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          signal: request.signal,
          headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            stream: true,
            store: false,
            reasoning: { effort: "low" },
            input: [
              { role: "system", content: `${SYSTEM}\n\nFARM DATA (JSON):\n${context}` },
              ...messages.map((m) => ({ role: m.role, content: m.content })),
            ],
          }),
        });
        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          let msg = "The copilot is unavailable right now.";
          if (upstream.status === 429) msg = "Too many requests — please wait a moment and try again.";
          else if (upstream.status === 402) msg = "AI credits have run out for this workspace.";
          else { try { msg = JSON.parse(text)?.error?.message ?? msg; } catch { /* keep */ } }
          return new Response(msg, { status: upstream.status });
        }
        const reader = upstream.body.getReader();
        const dec = new TextDecoder(), enc = new TextEncoder();
        let buf = "";
        const stream = new ReadableStream({
          async pull(ctrl) {
            const { value, done } = await reader.read();
            if (done) { ctrl.close(); return; }
            buf += dec.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const l of lines) {
              if (!l.startsWith("data:")) continue;
              const d = l.slice(5).trim();
              if (!d || d === "[DONE]") continue;
              try {
                const ev = JSON.parse(d);
                if (ev.type === "response.output_text.delta" && ev.delta) ctrl.enqueue(enc.encode(ev.delta));
                if (ev.type === "response.failed" || ev.type === "error") ctrl.enqueue(enc.encode("\n\n[The copilot could not finish this answer.]"));
              } catch { /* partial */ }
            }
          },
          cancel() { reader.cancel(); },
        });
        return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
      },
    },
  },
});
