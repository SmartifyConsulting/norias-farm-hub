import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Screen } from "@/components/Dock";
import { PasswordInput } from "@/components/PasswordInput";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set new password — FarmerPlus" },
      { name: "description", content: "Choose a new password for your FarmerPlus account." },
      { property: "og:title", content: "Set new password — FarmerPlus" },
      { property: "og:description", content: "Choose a new password for your FarmerPlus account." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((e) => { if (e === "PASSWORD_RECOVERY") setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    nav({ to: "/" });
  };
  return (
    <Screen title="Set new password">
      {!ready ? (
        <p className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">Open this page from the reset link in your email.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3 rounded-2xl border bg-card p-4">
          <PasswordInput required minLength={6} autoComplete="new-password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">Update password</button>
        </form>
      )}
    </Screen>
  );
}
