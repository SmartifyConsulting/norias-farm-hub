import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Screen } from "@/components/Dock";
import { PasswordInput } from "@/components/PasswordInput";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — FarmerPlus" },
      { name: "description", content: "Sign in to FarmerPlus to back up and sync your farm records." },
      { property: "og:title", content: "Sign in — FarmerPlus" },
      { property: "og:description", content: "Back up and sync your farm records." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const input = "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Signed in — syncing your animals");
      nav({ to: "/" });
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Check your email to confirm your account");
      setMode("in");
    }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) return toast.error(r.error.message ?? "Google sign-in failed");
    if (r.redirected) return;
    nav({ to: "/" });
  };

  return (
    <Screen title={mode === "in" ? "Sign in" : "Create account"}>
      <p className="-mt-3 mb-5 text-sm text-muted-foreground">Back up your animal records and sync them across devices.</p>
      <form onSubmit={submit} className="space-y-3 rounded-2xl border bg-card p-4">
        <input className={input} type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordInput required minLength={6} autoComplete={mode === "in" ? "current-password" : "new-password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {mode === "in" && (
          <Link to="/forgot-password" tabIndex={-1} className="block text-right text-xs text-muted-foreground">Forgot password?</Link>
        )}
        <button disabled={busy} className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
        </button>
        <button type="button" onClick={google} className="w-full rounded-xl border bg-background py-2 text-sm font-semibold text-foreground">Continue with Google</button>
      </form>
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-center text-sm text-primary">
        {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
      </button>
    </Screen>
  );
}
