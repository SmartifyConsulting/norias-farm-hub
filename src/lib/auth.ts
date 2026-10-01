import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return { user, loading };
}

const GUEST = "farmerplus:guest";
/** Signed-out users who chose to keep using the app on-device only. */
export function useGuest() {
  const [guest, setGuest] = useState(false);
  useEffect(() => {
    const u = () => setGuest(localStorage.getItem(GUEST) === "1");
    u();
    window.addEventListener("farmerplus:guest", u);
    return () => window.removeEventListener("farmerplus:guest", u);
  }, []);
  const set = (v: boolean) => {
    if (v) localStorage.setItem(GUEST, "1"); else localStorage.removeItem(GUEST);
    window.dispatchEvent(new Event("farmerplus:guest"));
  };
  return [guest, set] as const;
}
