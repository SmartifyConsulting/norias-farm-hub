import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SAMPLE_OPPORTUNITIES, type Opportunity } from "./agri";
import { SAMPLE_CAPACITY, SAMPLE_POOLS, type CapacityListing, type Pool } from "./network";

export type Shared = { opportunities: Opportunity[]; capacity: CapacityListing[]; pools: Pool[]; fromCloud: boolean };
const FALLBACK: Shared = { opportunities: SAMPLE_OPPORTUNITIES, capacity: SAMPLE_CAPACITY, pools: SAMPLE_POOLS, fromCloud: false };
let cache: Shared = FALLBACK;
let loading: Promise<void> | null = null;
const subs = new Set<() => void>();

/** Signed-in users see the shared network listings from the cloud; signed-out users see built-in samples. */
export function loadShared(force = false) {
  if (loading && !force) return loading;
  loading = (async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { cache = FALLBACK; subs.forEach((f) => f()); return; }
    const { data, error } = await supabase.from("shared_listings").select("id,kind,data,owner_id").order("created_at", { ascending: false }).limit(1000);
    if (error || !data?.length) { cache = FALLBACK; subs.forEach((f) => f()); return; }
    const withId = <T,>(r: (typeof data)[number]) => ({ ...(r.data as object), id: r.id, own: r.owner_id === u.user!.id }) as T;
    cache = {
      opportunities: data.filter((r) => r.kind === "opportunity").map((r) => withId<Opportunity>(r)),
      capacity: data.filter((r) => r.kind === "capacity").map((r) => withId<CapacityListing>(r)),
      pools: data.filter((r) => r.kind === "pool").map((r) => withId<Pool>(r)),
      fromCloud: true,
    };
    subs.forEach((f) => f());
  })();
  return loading;
}
export const sharedNow = () => cache;

export function useShared(): Shared {
  const [s, setS] = useState<Shared>(FALLBACK);
  useEffect(() => {
    const u = () => setS(cache);
    subs.add(u); u(); loadShared();
    const { data } = supabase.auth.onAuthStateChange((e) => { if (e === "SIGNED_IN" || e === "SIGNED_OUT") loadShared(true); });
    return () => { subs.delete(u); data.subscription.unsubscribe(); };
  }, []);
  return s;
}

/** Post a listing to the shared network (signed in only). */
export async function postShared(kind: "opportunity" | "capacity" | "pool", id: string, data: object) {
  const { error } = await supabase.from("shared_listings").insert({ id, kind, data: data as never });
  if (error) throw error;
  await loadShared(true);
}
export async function deleteShared(id: string) {
  const { error } = await supabase.from("shared_listings").delete().eq("id", id);
  if (error) throw error;
  await loadShared(true);
}
