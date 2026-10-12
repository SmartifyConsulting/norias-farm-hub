import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./auth";

export type RequestStatus = "open" | "ordered" | "cancelled";
export type ListingStatus = "available" | "sold" | "cancelled";
export type OrderStatus = "draft" | "confirmed" | "delivered" | "cancelled";

export type PurchaseRequest = {
  id: string;
  user_id: string;
  item: string;
  category: string;
  qty: number;
  unit: string;
  needed_by: string | null;
  notes: string;
  status: RequestStatus;
  order_id: string | null;
};
export type PurchaseOrder = {
  id: string;
  item: string;
  unit: string;
  supplier_name: string;
  unit_price: number;
  status: OrderStatus;
};
export type PurchaseAllocation = {
  order_id: string;
  user_id: string;
  qty: number;
  cost: number;
  paid: boolean;
  delivered: boolean;
};

export type SaleListing = {
  id: string;
  user_id: string;
  commodity: string;
  qty: number;
  unit: string;
  grade: string;
  available_from: string | null;
  notes: string;
  status: ListingStatus;
  order_id: string | null;
};
export type SaleOrder = {
  id: string;
  commodity: string;
  unit: string;
  buyer_name: string;
  unit_price: number;
  status: OrderStatus;
};
export type SaleAllocation = {
  order_id: string;
  user_id: string;
  qty: number;
  proceeds: number;
  paid: boolean;
  delivered: boolean;
};

export function useCoopPurchasing(coopId: string | undefined, canTrade: boolean) {
  const { user } = useUser();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [allocations, setAllocations] = useState<PurchaseAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!coopId || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: r } = await supabase
      .from("cooperative_purchase_requests")
      .select("id,user_id,item,category,qty,unit,needed_by,notes,status,order_id")
      .eq("cooperative_id", coopId)
      .order("created_at", { ascending: false });
    setRequests((r ?? []) as PurchaseRequest[]);
    const { data: o } = await supabase
      .from("cooperative_purchase_orders")
      .select("id,item,unit,supplier_name,unit_price,status")
      .eq("cooperative_id", coopId)
      .order("created_at", { ascending: false });
    setOrders((o ?? []) as PurchaseOrder[]);
    const orderIds = (o ?? []).map((x) => x.id);
    if (orderIds.length) {
      const q = supabase
        .from("cooperative_purchase_allocations")
        .select("order_id,user_id,qty,cost,paid,delivered")
        .in("order_id", orderIds);
      const { data: a } = canTrade ? await q : await q.eq("user_id", user.id);
      setAllocations((a ?? []) as PurchaseAllocation[]);
    } else setAllocations([]);
    setLoading(false);
  }, [coopId, user, canTrade]);
  useEffect(() => {
    load();
  }, [load]);
  return { user, requests, orders, allocations, loading, reload: load };
}

export function useCoopSales(coopId: string | undefined, canTrade: boolean) {
  const { user } = useUser();
  const [listings, setListings] = useState<SaleListing[]>([]);
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [allocations, setAllocations] = useState<SaleAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!coopId || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: l } = await supabase
      .from("cooperative_sale_listings")
      .select("id,user_id,commodity,qty,unit,grade,available_from,notes,status,order_id")
      .eq("cooperative_id", coopId)
      .order("created_at", { ascending: false });
    setListings((l ?? []) as SaleListing[]);
    const { data: o } = await supabase
      .from("cooperative_sale_orders")
      .select("id,commodity,unit,buyer_name,unit_price,status")
      .eq("cooperative_id", coopId)
      .order("created_at", { ascending: false });
    setOrders((o ?? []) as SaleOrder[]);
    const orderIds = (o ?? []).map((x) => x.id);
    if (orderIds.length) {
      const q = supabase
        .from("cooperative_sale_allocations")
        .select("order_id,user_id,qty,proceeds,paid,delivered")
        .in("order_id", orderIds);
      const { data: a } = canTrade ? await q : await q.eq("user_id", user.id);
      setAllocations((a ?? []) as SaleAllocation[]);
    } else setAllocations([]);
    setLoading(false);
  }, [coopId, user, canTrade]);
  useEffect(() => {
    load();
  }, [load]);
  return { user, listings, orders, allocations, loading, reload: load };
}
