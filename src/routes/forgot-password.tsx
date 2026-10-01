import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Screen } from "@/components/Dock";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — FarmerPlus" },
      { name: "description", content: "Get a link to reset your FarmerPlus password." },
      { property: "og:title", content: "Reset password — FarmerPlus" },
      { property: "og:description", content: "Get a link to reset your FarmerPlus password." },
    ],
  }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) return toast.error(error.message);
    setSent(true);
  };
  return (
    <Screen title="Forgot password">
      {sent ? (
        <p className="rounded-2xl border bg-card p-4 text-sm">If an account exists for {email}, a reset link is on its way.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3 rounded-2xl border bg-card p-4">
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">Send reset link</button>
        </form>
      )}
      <Link to="/auth" className="mt-4 block text-center text-sm text-primary">Back to sign in</Link>
    </Screen>
  );
}
