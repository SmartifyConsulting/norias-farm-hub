import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./auth";

export type DemandMatch = {
  item: string;
  unit: string;
  coop_qty: number;
  other_qty: number;
  other_coops: number;
};
export type SupplyMatch = {
  commodity: string;
  unit: string;
  coop_qty: number;
  other_qty: number;
  other_coops: number;
};

/**
 * Cross-co-op matching: every row here is real, currently-open demand/supply (never an estimate),
 * aggregated so no other co-op's identity or member detail is exposed — a recommendation surface,
 * not a shared transaction. Each co-op still negotiates and orders separately.
 */
export function useCoopIntelligence(coopId: string | undefined) {
  const { user } = useUser();
  const [demand, setDemand] = useState<DemandMatch[]>([]);
  const [supply, setSupply] = useState<SupplyMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!coopId || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [d, s] = await Promise.all([
      supabase.rpc("coop_intelligence_demand", { _coop: coopId }),
      supabase.rpc("coop_intelligence_supply", { _coop: coopId }),
    ]);
    setDemand((d.data ?? []) as DemandMatch[]);
    setSupply((s.data ?? []) as SupplyMatch[]);
    setLoading(false);
  }, [coopId, user]);
  useEffect(() => {
    load();
  }, [load]);
  return { user, demand, supply, loading, reload: load };
}
