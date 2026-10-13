import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Megaphone, Eye, MousePointerClick, Pause, Play, Trash2, X } from "lucide-react";
import { Screen } from "@/components/Dock";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/errors";
import { useUser } from "@/lib/auth";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/advertise")({
  head: () => ({
    meta: [
      { title: "Advertise on FarmerPlus" },
      {
        name: "description",
        content: "Create and pay for a sponsored ad shown to farmers across FarmerPlus.",
      },
      { property: "og:title", content: "Advertise on FarmerPlus" },
      {
        property: "og:description",
        content: "Reach farmers with a sponsored ad on the home screen and Opportunities.",
      },
    ],
  }),
  component: AdvertisePage,
});

type Campaign = Database["public"]["Tables"]["ad_campaigns"]["Row"];

const TAGS = ["Connectivity", "Drones", "IoT", "Vehicles", "Finance", "Inputs", "Services"];
const GRADIENT_PRESETS: { label: string; from: string; to: string }[] = [
  { label: "Green", from: "#16a34a", to: "#052e14" },
  { label: "Blue", from: "#2563eb", to: "#0f172a" },
  { label: "Red", from: "#c8102e", to: "#4a0a12" },
  { label: "Gold", from: "#ffcc00", to: "#1a1a1a" },
  { label: "Teal", from: "#0891b2", to: "#042f3b" },
];

const input =
  "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

const STATUS_LABEL: Record<Campaign["status"], string> = {
  draft: "Draft",
  pending_payment: "Awaiting payment",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};
const STATUS_CLS: Record<Campaign["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  pending_payment: "bg-warning-soft text-warning-foreground",
  active: "bg-success-soft text-success-foreground",
  paused: "bg-muted text-muted-foreground",
  completed: "bg-secondary text-secondary-foreground",
};

function AdvertisePage() {
  const { user, loading } = useUser();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState<Campaign | null>(null);

  const load = async () => {
    if (!user) return;
    setLoadingCampaigns(true);
    const { data, error } = await supabase
      .from("ad_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(friendlyError(error));
    else setCampaigns(data ?? []);
    setLoadingCampaigns(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const updateStatus = async (c: Campaign, status: "paused" | "active") => {
    const { error } = await supabase.from("ad_campaigns").update({ status }).eq("id", c.id);
    if (error) toast.error(friendlyError(error));
    else {
      toast.success(status === "paused" ? "Campaign paused" : "Campaign resumed");
      load();
    }
  };

  const remove = async (c: Campaign) => {
    if (!confirm(`Delete "${c.title}"? This can't be undone.`)) return;
    const { error } = await supabase.from("ad_campaigns").delete().eq("id", c.id);
    if (error) toast.error(friendlyError(error));
    else {
      toast.success("Campaign deleted");
      load();
    }
  };

  if (!loading && !user)
    return (
      <Screen title="Advertise on FarmerPlus" wide={false}>
        <div className="rounded-2xl border bg-card p-6 text-center">
          <Megaphone className="mx-auto mb-3 h-8 w-8 text-primary" />
          <p className="mb-1 font-semibold">Sign in to create and pay for ads</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Ads you create here appear in the sponsored ad slots on the FarmerPlus home screen and
            Opportunities, once paid.
          </p>
          <Link
            to="/auth"
            className="inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Sign in
          </Link>
        </div>
      </Screen>
    );

  return (
    <Screen title="Advertise on FarmerPlus">
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Create a sponsored ad, set a budget and schedule, then pay to launch it. Live ads rotate
        through the sponsored ad slots shown to every farmer on the home screen and Opportunities.
      </p>
      <button
        type="button"
        onClick={() => setCreating(true)}
        className="mb-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        + New campaign
      </button>

      {loadingCampaigns ? (
        <p className="text-sm text-muted-foreground">Loading your campaigns…</p>
      ) : campaigns.length === 0 ? (
        <p className="text-sm text-muted-foreground">No campaigns yet — create your first one.</p>
      ) : (
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 xl:grid-cols-3">
          {campaigns.map((c) => (
            <article key={c.id} className="rounded-2xl border bg-card p-4">
              <div
                className="-mx-4 -mt-4 mb-3 rounded-t-2xl bg-gradient-to-br p-4 text-white"
                style={{
                  backgroundImage: `linear-gradient(to bottom right, ${c.gradient_from}, ${c.gradient_to})`,
                }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                  {c.tag || "Sponsored"}
                </p>
                <h3 className="font-display text-base font-bold">{c.title || "Untitled ad"}</h3>
                <p className="mt-0.5 text-xs opacity-90">{c.blurb}</p>
              </div>
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[c.status]}`}
                >
                  {STATUS_LABEL[c.status]}
                </span>
                <span className="text-xs text-muted-foreground">
                  Budget R{(c.budget_cents / 100).toFixed(0)}
                </span>
              </div>
              <div className="mb-3 flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> {c.impressions} views
                </span>
                <span className="flex items-center gap-1">
                  <MousePointerClick className="h-3.5 w-3.5" /> {c.clicks} clicks
                </span>
                <span>
                  {c.starts_on} → {c.ends_on}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(c.status === "draft" || c.status === "pending_payment") && (
                  <button
                    type="button"
                    onClick={() => setPaying(c)}
                    className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                  >
                    Pay & launch
                  </button>
                )}
                {c.status === "active" && (
                  <button
                    type="button"
                    onClick={() => updateStatus(c, "paused")}
                    className="flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold"
                  >
                    <Pause className="h-3.5 w-3.5" /> Pause
                  </button>
                )}
                {c.status === "paused" && (
                  <button
                    type="button"
                    onClick={() => updateStatus(c, "active")}
                    className="flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold"
                  >
                    <Play className="h-3.5 w-3.5" /> Resume
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(c)}
                  className="flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {creating && (
        <NewCampaignDialog
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}
      {paying && (
        <PaymentDialog
          campaign={paying}
          onClose={() => setPaying(null)}
          onPaid={() => {
            setPaying(null);
            load();
          }}
        />
      )}
    </Screen>
  );
}

function NewCampaignDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [companyName, setCompanyName] = useState("");
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [cta, setCta] = useState("Learn more");
  const [tag, setTag] = useState(TAGS[0]!);
  const [gradient, setGradient] = useState(GRADIENT_PRESETS[0]!);
  const [budget, setBudget] = useState("500");
  const [days, setDays] = useState("30");
  const [saving, setSaving] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !title.trim() || saving) return;
    setSaving(true);
    const startsOn = new Date().toISOString().slice(0, 10);
    const endsOn = new Date(Date.now() + Number(days || 30) * 86400000).toISOString().slice(0, 10);
    const { error } = await supabase.from("ad_campaigns").insert({
      company_name: companyName.trim(),
      title: title.trim(),
      blurb: blurb.trim(),
      cta: cta.trim() || "Learn more",
      tag,
      gradient_from: gradient.from,
      gradient_to: gradient.to,
      budget_cents: Math.max(0, Math.round(Number(budget || 0) * 100)),
      starts_on: startsOn,
      ends_on: endsOn,
      status: "draft",
    });
    setSaving(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success("Campaign created as a draft");
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold">New ad campaign</p>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={create} className="space-y-2">
          <input
            className={input}
            placeholder="Company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <input
            className={input}
            placeholder="Ad title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className={`${input} min-h-16`}
            placeholder="Short description"
            value={blurb}
            onChange={(e) => setBlurb(e.target.value)}
          />
          <input
            className={input}
            placeholder="Button text (e.g. Get a quote)"
            value={cta}
            onChange={(e) => setCta(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Category"
              className={input}
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            >
              {TAGS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select
              aria-label="Colour"
              className={input}
              value={gradient.label}
              onChange={(e) =>
                setGradient(GRADIENT_PRESETS.find((g) => g.label === e.target.value)!)
              }
            >
              {GRADIENT_PRESETS.map((g) => (
                <option key={g.label} value={g.label}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-muted-foreground">
              Budget (R)
              <input
                type="number"
                min="0"
                className={input}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Run for (days)
              <input
                type="number"
                min="1"
                className={input}
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </label>
          </div>
          <div
            className="rounded-2xl p-4 text-white"
            style={{
              backgroundImage: `linear-gradient(to bottom right, ${gradient.from}, ${gradient.to})`,
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{tag}</p>
            <p className="font-display text-sm font-bold">{title || "Your ad title"}</p>
            <p className="text-xs opacity-90">{blurb || "Your short description"}</p>
          </div>
          <button
            disabled={saving || !companyName.trim() || !title.trim()}
            className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save as draft"}
          </button>
        </form>
      </div>
    </div>
  );
}

function PaymentDialog({
  campaign,
  onClose,
  onPaid,
}: {
  campaign: Campaign;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [paying, setPaying] = useState(false);
  const pay = async () => {
    setPaying(true);
    const { error } = await supabase.rpc("launch_ad_campaign", { _campaign: campaign.id });
    setPaying(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success("Payment confirmed — your ad is live");
    onPaid();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold">Pay & launch</p>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <p className="mb-2 text-sm">
          "{campaign.title}" · Budget R{(campaign.budget_cents / 100).toFixed(0)} ·{" "}
          {campaign.starts_on} → {campaign.ends_on}
        </p>
        <p className="mb-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          FarmerPlus doesn't have a live payment processor connected yet, so this is a simulated
          payment — no card is charged and no real money moves. Confirming marks this campaign as
          paid and launches it into the sponsored ad slots.
        </p>
        <button
          onClick={pay}
          disabled={paying}
          className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {paying ? "Confirming…" : "Confirm (simulated) payment & launch"}
        </button>
      </div>
    </div>
  );
}
