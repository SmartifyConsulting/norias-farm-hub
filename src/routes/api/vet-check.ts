import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  symptoms: z.string().min(3).max(4000),
  animal: z.string().max(4000).optional(),
  image: z.string().max(6_000_000).regex(/^data:image\/(png|jpe?g|webp|gif);base64,/).optional(),
});

const SYSTEM = `You are FarmerPlus Animal Care Guide for South African farmers. Give practical, safe guidance from the described symptoms (and photo if provided).
Format in short markdown sections:
## Possible concerns  (2-4 possibilities, each labelled "possible", with what points to it — never a definitive diagnosis)
## Check now  (what to observe/measure: temperature, appetite, breathing, etc.)
## Care steps  (safe immediate care: isolate, water, shade, clean wounds…; no prescription-only drug doses)
## Call a vet urgently if  (clear red flags)
## Next steps  (practical plan for the next 24-72h, including record-keeping)
Rules: be concise; say what you could not tell from the info/photo; mention notifiable diseases (e.g. foot-and-mouth) must be reported to the State Vet if suspected. End with: "This is guidance, not a veterinary diagnosis."`;

export const Route = createFileRoute("/api/vet-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("The symptom check is not configured.", { status: 500 });
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Please describe the symptoms (and use a photo under 4 MB).", { status: 400 });
        const { symptoms, animal, image } = parsed.data;
        const content: object[] = [{ type: "input_text", text: `Animal record: ${animal || "not given"}\n\nSymptoms: ${symptoms}` }];
        if (image) content.push({ type: "input_image", image_url: image });
        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
          body: JSON.stringify({
            model: "openai/gpt-6-astra", stream: true, store: false, reasoning: { effort: "low" },
            input: [{ role: "system", content: SYSTEM }, { role: "user", content }],
          }),
        });
        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          let msg = "The symptom check is unavailable right now.";
          if (upstream.status === 429) msg = "Too many requests — please wait a moment and try again.";
          else if (upstream.status === 402) msg = "AI credits have run out for this workspace.";
          else { try { msg = JSON.parse(text)?.error?.message ?? msg; } catch { /* keep */ } }
          return new Response(msg, { status: upstream.status });
        }
        const dec = new TextDecoder(), enc = new TextEncoder();
        let buf = "";
        const stream = upstream.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, ctrl) {
            buf += dec.decode(chunk, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const l of lines) {
              if (!l.startsWith("data:")) continue;
              const d = l.slice(5).trim();
              if (!d || d === "[DONE]") continue;
              try {
                const ev = JSON.parse(d);
                if (ev.type === "response.output_text.delta" && ev.delta) ctrl.enqueue(enc.encode(ev.delta));
                if (ev.type === "response.failed" || ev.type === "error") ctrl.enqueue(enc.encode("\n\n[The guide could not finish this answer.]"));
              } catch { /* partial */ }
            }
          },
        }));
        return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
      },
    },
  },
});
