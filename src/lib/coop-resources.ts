import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./auth";

export type AssetStatus = "available" | "maintenance" | "retired";
export type BookingStatus = "requested" | "approved" | "rejected" | "completed";
export type OppType = "funding" | "grant" | "training" | "mentorship" | "other";
export type OppStatus = "open" | "applied" | "awarded" | "rejected" | "closed";

export type Asset = {
  id: string;
  name: string;
  category: string;
  description: string;
  responsible_user_id: string | null;
  status: AssetStatus;
};
export type Booking = {
  id: string;
  asset_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  notes: string;
  status: BookingStatus;
  operating_cost: number | null;
};
export type Opportunity = {
  id: string;
  title: string;
  opp_type: OppType;
  provider: string;
  description: string;
  deadline: string | null;
  status: OppStatus;
  notes: string;
};

export function useCoopResources(coopId: string | undefined) {
  const { user } = useUser();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!coopId || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: a } = await supabase
      .from("cooperative_assets")
      .select("id,name,category,description,responsible_user_id,status")
      .eq("cooperative_id", coopId)
      .order("name");
    setAssets((a ?? []) as Asset[]);
    const assetIds = (a ?? []).map((x) => x.id);
    if (assetIds.length) {
      const { data: b } = await supabase
        .from("cooperative_asset_bookings")
        .select("id,asset_id,user_id,start_date,end_date,notes,status,operating_cost")
        .in("asset_id", assetIds)
        .order("start_date", { ascending: true });
      setBookings((b ?? []) as Booking[]);
    } else setBookings([]);
    setLoading(false);
  }, [coopId, user]);
  useEffect(() => {
    load();
  }, [load]);
  return { user, assets, bookings, loading, reload: load };
}

export function useCoopOpportunities(coopId: string | undefined) {
  const { user } = useUser();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!coopId || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("cooperative_opportunities")
      .select("id,title,opp_type,provider,description,deadline,status,notes")
      .eq("cooperative_id", coopId)
      .order("deadline", { ascending: true });
    setOpportunities((data ?? []) as Opportunity[]);
    setLoading(false);
  }, [coopId, user]);
  useEffect(() => {
    load();
  }, [load]);
  return { user, opportunities, loading, reload: load };
}
