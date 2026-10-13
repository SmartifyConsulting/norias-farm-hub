import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdPackage = {
  id: string;
  name: string;
  price_cents: number;
  days: number;
  active: boolean;
  sort_order: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const adPackagesTable = () => (supabase as any).from("ad_packages");

export const formatRand = (cents: number) =>
  `R${(cents / 100).toLocaleString("en-ZA", { maximumFractionDigits: 2 })}`;

export const packageLabel = (p: AdPackage) =>
  `${p.name} — ${formatRand(p.price_cents)} (${p.days} days)`;

export function useAdPackages(includeInactive = false) {
  const [packages, setPackages] = useState<AdPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    const { data } = await adPackagesTable().select("*").order("sort_order").order("price_cents");
    const rows = (data ?? []) as AdPackage[];
    setPackages(includeInactive ? rows : rows.filter((p) => p.active));
    setLoading(false);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { packages, loading, reload: load };
}

export function useIsAdmin(userId?: string) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .then(({ data }: { data: unknown[] | null }) => setIsAdmin(!!data?.length));
  }, [userId]);
  return isAdmin;
}
