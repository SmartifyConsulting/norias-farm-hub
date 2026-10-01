import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncAnimals } from "@/lib/animal-sync";

/** Syncs animal records on sign-in, on load, and when the device comes back online. */
export function AutoSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const run = () => {
      try {
        const s = JSON.parse(localStorage.getItem("farmerplus:settings") || "{}");
        if (s.autoSync === false) return;
      } catch {}
      syncAnimals();
    };
    run();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") run();
      if (event === "SIGNED_OUT") qc.clear();
    });
    window.addEventListener("online", run);
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("online", run);
    };
  }, [qc]);
  return null;
}
