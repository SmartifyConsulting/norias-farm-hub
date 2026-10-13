import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Megaphone, Eye, MousePointerClick, Pause, Pencil, Play, Trash2, X } from "lucide-react";
import { Screen } from "@/components/Dock";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/errors";
import { useUser } from "@/lib/auth";
import { uploadAdImage } from "@/lib/adImages";
import { ImageCropper } from "@/components/ImageCropper";
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

const GRADIENT_PRESETS: { label: string; from: string; to: string }[] = [
  { label: "Green", from: "#16a34a", to: "#2f7a4f" },
  { label: "Blue", from: "#2563eb", to: "#2c4694" },
  { label: "Red", from: "#c8102e", to: "#8a2238" },
  { label: "Gold", from: "#ffcc00", to: "#8a6d00" },
  { label: "Teal", from: "#0891b2", to: "#1f6478" },
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
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [paying, setPaying] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState<Campaign | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

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
    setDeletingBusy(true);
    const { error } = await supabase.from("ad_campaigns").delete().eq("id", c.id);
    setDeletingBusy(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success("Campaign deleted");
    setDeleting(null);
    load();
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
                className="-mx-4 -mt-4 mb-3 rounded-t-2xl bg-cover bg-center bg-no-repeat p-4 text-white"
                style={{
                  backgroundImage: c.image_url
                    ? `linear-gradient(to top, rgba(0,0,0,.65), rgba(0,0,0,.1)), url(${c.image_url})`
                    : `linear-gradient(to bottom right, ${c.gradient_from}, ${c.gradient_to})`,
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
                  onClick={() => setEditing(c)}
                  className="flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(c)}
                  className="flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {creating && user && (
        <CampaignDialog
          userId={user.id}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      )}
      {editing && user && (
        <CampaignDialog
          userId={user.id}
          campaign={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
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
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">Delete campaign</p>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setDeleting(null)}
                disabled={deletingBusy}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Delete "{deleting.title || "Untitled ad"}"? This can't be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={deletingBusy}
                className="flex-1 rounded-xl bg-secondary py-2 text-sm font-semibold text-secondary-foreground disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => remove(deleting)}
                disabled={deletingBusy}
                className="flex-1 rounded-xl bg-destructive py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
              >
                {deletingBusy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}

function CampaignDialog({
  userId,
  campaign,
  onClose,
  onSaved,
}: {
  userId: string;
  campaign?: Campaign;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!campaign;
  const gradient =
    (campaign &&
      GRADIENT_PRESETS.find(
        (g) => g.from === campaign.gradient_from && g.to === campaign.gradient_to,
      )) ||
    GRADIENT_PRESETS[0]!;
  const today = new Date().toISOString().slice(0, 10);
  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [companyName, setCompanyName] = useState(campaign?.company_name ?? "");
  const [title, setTitle] = useState(campaign?.title ?? "");
  const [blurb, setBlurb] = useState(campaign?.blurb ?? "");
  const [cta, setCta] = useState(campaign?.cta ?? "Learn more");
  const [linkUrl, setLinkUrl] = useState(campaign?.link_url ?? "");
  const [imageShape, setImageShape] = useState<"banner" | "portrait">(
    campaign?.image_shape === "portrait" ? "portrait" : "banner",
  );
  const [imageUrl, setImageUrl] = useState(campaign?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [cropping, setCropping] = useState<File | null>(null);
  const [budget, setBudget] = useState(campaign ? String(campaign.budget_cents / 100) : "500");
  const [startsOn, setStartsOn] = useState(campaign?.starts_on ?? today);
  const [endsOn, setEndsOn] = useState(campaign?.ends_on ?? in30Days);
  const [saving, setSaving] = useState(false);

  const onCropped = async (blob: Blob) => {
    setCropping(null);
    setUploading(true);
    try {
      setImageUrl(await uploadAdImage(userId, blob));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload that image.");
    }
    setUploading(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !title.trim() || saving) return;
    const trimmedLink = linkUrl.trim();
    if (trimmedLink && !/^https?:\/\//i.test(trimmedLink)) {
      toast.error("Website URL must start with http:// or https://");
      return;
    }
    setSaving(true);
    const fields = {
      company_name: companyName.trim(),
      title: title.trim(),
      blurb: blurb.trim(),
      cta: cta.trim() || "Learn more",
      tag: campaign?.tag ?? "Sponsored",
      gradient_from: gradient.from,
      gradient_to: gradient.to,
      image_url: imageUrl,
      image_shape: imageShape,
      link_url: trimmedLink,
      budget_cents: Math.max(0, Math.round(Number(budget || 0) * 100)),
      starts_on: startsOn,
      ends_on: endsOn,
    };
    const { error } = isEditing
      ? await supabase.from("ad_campaigns").update(fields).eq("id", campaign.id)
      : await supabase.from("ad_campaigns").insert({ ...fields, status: "draft" });
    setSaving(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success(isEditing ? "Campaign updated" : "Campaign created as a draft");
    onSaved();
  };

  const preview = (
    <div
      className={`order-first rounded-2xl bg-cover bg-center bg-no-repeat p-4 text-white md:sticky md:top-0 md:order-last ${imageUrl && imageShape === "portrait" ? "aspect-[4/5]" : "min-h-[140px]"}`}
      style={{
        backgroundImage: imageUrl
          ? `linear-gradient(to top, rgba(0,0,0,.65), rgba(0,0,0,.1)), url(${imageUrl})`
          : `linear-gradient(to bottom right, ${gradient.from}, ${gradient.to})`,
      }}
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide opacity-70">Preview</p>
      <p className="font-display text-sm font-bold">{title || "Your ad title"}</p>
      <p className="text-xs opacity-90">{blurb || "Your short description"}</p>
      <span className="mt-3 inline-block rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black">
        {cta || "Learn more"} →
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold">{isEditing ? "Edit ad campaign" : "New ad campaign"}</p>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_22rem]">
          <form onSubmit={save} className="space-y-2">
            <input
              className={input}
              placeholder="Company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <div>
              <div className="mb-2 flex gap-2 rounded-full bg-secondary p-1 text-xs">
                {(["banner", "portrait"] as const).map((shape) => (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => setImageShape(shape)}
                    className={`flex-1 rounded-full py-1 font-semibold capitalize ${imageShape === shape ? "bg-white text-black" : "text-secondary-foreground"}`}
                  >
                    {shape}
                  </button>
                ))}
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                Ad image (optional) — shown instead of the colour above. Recommended size:{" "}
                {imageShape === "banner"
                  ? "1200 × 400px (3:1, landscape)"
                  : "1080 × 1350px (4:5, portrait)"}
                . JPG, PNG or WebP, up to 5 MB.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold">
                  {uploading ? "Uploading…" : imageUrl ? "Replace image" : "Upload image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setCropping(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="text-xs font-semibold text-destructive"
                  >
                    Remove image
                  </button>
                )}
              </div>
            </div>
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
            <input
              className={input}
              type="url"
              placeholder="Website URL (e.g. https://example.co.za) — optional"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
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
                Start date
                <input
                  type="date"
                  className={input}
                  value={startsOn}
                  onChange={(e) => setStartsOn(e.target.value)}
                />
              </label>
              <label className="col-span-2 block text-xs text-muted-foreground">
                End date
                <input
                  type="date"
                  className={input}
                  value={endsOn}
                  min={startsOn}
                  onChange={(e) => setEndsOn(e.target.value)}
                />
              </label>
            </div>
            <button
              disabled={saving || !companyName.trim() || !title.trim()}
              className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving…" : isEditing ? "Save changes" : "Save as draft"}
            </button>
          </form>
          {preview}
        </div>
      </div>
      {cropping && (
        <ImageCropper
          file={cropping}
          shape={imageShape}
          onCancel={() => setCropping(null)}
          onCropped={onCropped}
        />
      )}
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
