import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, X } from "lucide-react";
import { Screen } from "@/components/Dock";
import { useRecords } from "@/lib/farm";
import { useUser } from "@/lib/auth";

export const Route = createFileRoute("/vet-check")({
  head: () => ({
    meta: [
      { title: "Animal Symptom Check — FarmerPlus" },
      {
        name: "description",
        content:
          "Describe an animal's symptoms, add a photo, and get practical care guidance and next steps.",
      },
      { property: "og:title", content: "Animal Symptom Check — FarmerPlus" },
      {
        property: "og:description",
        content: "AI care guidance for livestock symptoms — not a veterinary diagnosis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VetCheck,
});

const input =
  "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function VetCheck() {
  const { records: animals } = useRecords("animals");
  const health = useRecords("health");
  const { user } = useUser();
  const [animalId, setAnimalId] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = (f?: File) => {
    if (!f) return;
    if (f.size > 4_000_000) {
      toast.error("Photo must be under 4 MB");
      return;
    }
    const r = new FileReader();
    r.onload = () => setImage(r.result as string);
    r.readAsDataURL(f);
  };

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (symptoms.trim().length < 3) {
      toast.error("Describe the symptoms first");
      return;
    }
    const a = animals.find((x) => x.id === animalId);
    setBusy(true);
    setAnswer("");
    try {
      const res = await fetch("/api/vet-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms,
          animal: a ? `${a.title} — ${a.detail}${a.qty ? `, ${a.qty} kg` : ""}` : undefined,
          image: image ?? undefined,
        }),
      });
      if (!res.ok || !res.body) {
        toast.error("Couldn't get symptom guidance right now — please try again in a moment.");
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer((s) => s + dec.decode(value, { stream: true }));
      }
    } catch {
      toast.error("Couldn't reach the guide — check your connection");
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const first =
      answer
        .split("\n")
        .find((l) => l.trim() && !l.startsWith("#"))
        ?.slice(0, 140) ?? "";
    health.save([
      {
        id: crypto.randomUUID(),
        title: `Symptom check: ${symptoms.slice(0, 60)}`,
        detail: first,
        date: new Date().toISOString(),
        animalId: animalId || undefined,
        completed: [new Date().toISOString().slice(0, 10)],
        sync: user ? "pending" : "local",
      },
      ...health.records,
    ]);
    toast.success("Saved to Animal Health");
  };

  return (
    <Screen title="Animal Symptom Check">
      <div className="md:grid md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:gap-6">
        <form
          onSubmit={run}
          className="space-y-2 rounded-2xl border bg-card p-4 md:sticky md:top-24 md:self-start"
        >
          <select
            aria-label="Animal"
            className={input}
            value={animalId}
            onChange={(e) => setAnimalId(e.target.value)}
          >
            <option value="">Which animal? (optional)</option>
            {animals.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
          <textarea
            className={`${input} min-h-32`}
            placeholder="Describe what you see: e.g. limping on back left leg since yesterday, not eating, swelling above hoof…"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          {image ? (
            <div className="relative">
              <img
                src={image}
                alt="Animal photo to check"
                className="max-h-48 w-full rounded-xl object-cover"
              />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => setImage(null)}
                className="absolute right-2 top-2 rounded-full bg-card p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm text-muted-foreground"
            >
              <Camera className="h-4 w-4" />
              Add a photo (optional)
            </button>
          )}
          <button
            disabled={busy}
            className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Checking…" : "Get care guidance"}
          </button>
          <p className="text-center text-[11px] text-muted-foreground">
            Guidance only — not a veterinary diagnosis. The photo is used for this check and not
            stored.
          </p>
        </form>
        <section className="mt-4 rounded-2xl border bg-card p-4 md:mt-0">
          {!answer && !busy && (
            <p className="text-sm text-muted-foreground">
              Your guidance will appear here: possible concerns, what to check, care steps, when to
              call a vet, and next steps.
            </p>
          )}
          {busy && !answer && (
            <p className="text-sm text-muted-foreground">Looking at the symptoms…</p>
          )}
          {answer && <div className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</div>}
          {answer && !busy && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={save}
                className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground"
              >
                Save to Animal Health
              </button>
              <Link
                to="/app/$appId"
                params={{ appId: "health" }}
                className="rounded-full bg-secondary px-4 py-1.5 text-sm font-semibold text-secondary-foreground"
              >
                Open Animal Health
              </Link>
            </div>
          )}
        </section>
      </div>
    </Screen>
  );
}
