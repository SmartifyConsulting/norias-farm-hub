import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { ChevronLeft } from "lucide-react";
import { Screen } from "@/components/Dock";
import { supabase } from "@/integrations/supabase/client";
import { useCooperative } from "@/lib/coop";
import { useCoopResources } from "@/lib/coop-resources";

export const Route = createFileRoute("/coop/$coopId/resources")({
  head: () => ({ meta: [{ title: "Shared Resources — FarmerPlus" }] }),
  component: Resources,
});

const input =
  "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const btn =
  "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";

function Resources() {
  const { coopId } = Route.useParams();
  const { user, coop, canManageResources, loading: coopLoading } = useCooperative(coopId);
  const { assets, bookings, loading, reload } = useCoopResources(coopId);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [bookingFor, setBookingFor] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  if (!user || coopLoading || loading)
    return (
      <Screen title="Shared Resources">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Screen>
    );
  if (!coop)
    return (
      <Screen title="Shared Resources">
        <p className="text-sm text-muted-foreground">Co-operative not found.</p>
      </Screen>
    );

  const addAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const { error } = await supabase.from("cooperative_assets").insert({
      cooperative_id: coopId,
      name: name.trim(),
      category: category.trim(),
      description: description.trim(),
    });
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    setName("");
    setCategory("");
    setDescription("");
    await reload();
    toast.success("Asset registered");
  };

  const requestBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingFor || !startDate || !endDate) return;
    const { error } = await supabase
      .from("cooperative_asset_bookings")
      .insert({ asset_id: bookingFor, start_date: startDate, end_date: endDate });
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    setBookingFor(null);
    setStartDate("");
    setEndDate("");
    await reload();
    toast.success("Booking requested");
  };

  const reviewBooking = async (id: string, status: "approved" | "rejected" | "completed") => {
    await supabase.from("cooperative_asset_bookings").update({ status }).eq("id", id);
    await reload();
  };

  const bookingsFor = (assetId: string) => bookings.filter((b) => b.asset_id === assetId);

  return (
    <Screen title={`${coop.name} — Shared Resources`}>
      <Link
        to="/coop/$coopId"
        params={{ coopId }}
        className="-mt-3 mb-4 inline-flex items-center text-sm text-muted-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {coop.name}
      </Link>

      {canManageResources && (
        <section className="mb-4 rounded-2xl border bg-card p-4">
          <h2 className="mb-2 font-semibold">Register a shared asset</h2>
          <form onSubmit={addAsset} className="flex flex-wrap gap-2">
            <input
              className={`${input} max-w-xs`}
              placeholder="Name (e.g. Tractor)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className={`${input} max-w-xs`}
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <input
              className={`${input} max-w-xs`}
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button className={btn}>Register</button>
          </form>
        </section>
      )}

      {assets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No shared assets registered yet.</p>
      ) : (
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          {assets.map((a) => (
            <article key={a.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{a.name}</p>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize text-secondary-foreground">
                  {a.status}
                </span>
              </div>
              {a.category && <p className="text-xs text-muted-foreground">{a.category}</p>}
              {a.description && <p className="mt-1 text-sm">{a.description}</p>}
              <ul className="mt-2 space-y-1 text-xs">
                {bookingsFor(a.id).map((b) => (
                  <li key={b.id} className="flex items-center justify-between">
                    <span>
                      {b.start_date} → {b.end_date}
                      {b.user_id === user.id && " (you)"}
                    </span>
                    {canManageResources && b.status === "requested" ? (
                      <span className="flex gap-1">
                        <button
                          onClick={() => reviewBooking(b.id, "approved")}
                          className="rounded-full bg-success-soft px-2 py-0.5 text-success-foreground"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => reviewBooking(b.id, "rejected")}
                          className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive"
                        >
                          Reject
                        </button>
                      </span>
                    ) : (
                      <span className="rounded-full bg-secondary px-2 py-0.5 capitalize text-secondary-foreground">
                        {b.status}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {bookingFor === a.id ? (
                <form onSubmit={requestBooking} className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <input
                      aria-label="Start date"
                      className={input}
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <input
                      aria-label="End date"
                      className={input}
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button className={btn}>Request booking</button>
                    <button
                      type="button"
                      onClick={() => setBookingFor(null)}
                      className="rounded-xl border px-4 py-2 text-sm font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                a.status === "available" && (
                  <button
                    onClick={() => setBookingFor(a.id)}
                    className="mt-2 text-sm font-semibold text-earth-1"
                  >
                    Book this asset
                  </button>
                )
              )}
            </article>
          ))}
        </div>
      )}
    </Screen>
  );
}
