import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Sprout } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useGuest } from "@/lib/auth";
import bg from "@/assets/countryside.jpg";

type Mode = "signin" | "signup";

/** Heita-style split landing: brand + mode toggle on the left, auth card on the right. */
export function AuthLanding({ initial = "signup" }: { initial?: Mode }) {
  const [mode, setMode] = useState<Mode>(initial);
  return (
    <div className="relative flex min-h-screen flex-col bg-primary">
      <img src={bg} alt="" className="pointer-events-none fixed inset-y-0 left-0 hidden h-full w-1/2 object-cover lg:block" />
      <div className="pointer-events-none fixed inset-y-0 left-0 hidden w-1/2 bg-primary/55 lg:block" />
      <div className="pointer-events-none fixed inset-y-0 right-0 hidden w-1/2 bg-foreground lg:block" />
      <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center gap-6 px-6 py-8 lg:max-w-none lg:flex-row lg:items-stretch lg:gap-0 lg:p-0">
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-2 text-primary-foreground lg:w-1/2 lg:px-12">
          <div className="mb-6 flex flex-col items-center gap-3">
            <span className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary-foreground text-primary md:h-32 md:w-32">
              <Sprout className="h-12 w-12 md:h-16 md:w-16" />
            </span>
            <p className="font-display text-4xl font-bold md:text-5xl">FarmerPlus</p>
          </div>
          <p className="text-center text-sm text-primary-foreground/80">Your farm in your pocket — records, weather and sync.</p>
          <div className="mt-2 flex w-full max-w-sm gap-2 rounded-full bg-primary-foreground/10 p-1">
            {(["signup", "signin"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${mode === m ? "bg-primary-foreground text-primary" : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"}`}
              >
                {m === "signup" ? "Get started" : "Sign in"}
              </button>
            ))}
          </div>
          <section className="mt-3 flex w-full max-w-xl items-start gap-2 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 p-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p className="text-xs text-primary-foreground/70">Records save on your device first and work offline. Signing in backs up your animal records privately to your own account.</p>
          </section>
        </div>
        <div className="flex w-full max-w-xl flex-1 flex-col lg:w-1/2 lg:max-w-none lg:items-center lg:justify-center lg:px-12">
          <AuthCard key={mode} mode={mode} setMode={setMode} />
        </div>
      </main>
      <div className="shrink-0 rounded-t-3xl bg-background">
        <footer className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} FarmerPlus</p>
          <p className="text-xs text-muted-foreground">Offline-ready farm management</p>
        </footer>
      </div>
    </div>
  );
}

function AuthCard({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const nav = useNavigate();
  const [, setGuest] = useGuest();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const name = `${first.trim()} ${last.trim()}`.trim();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const input = "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (mode === "signup" && password.length < 8) { setMsg("Password must be at least 8 characters."); return; }
    setBusy(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { const m = /invalid/i.test(error.message) ? "Email or password is incorrect." : error.message; setMsg(m); toast.error(m); return; }
      toast.success("Signed in — syncing your animals");
      nav({ to: "/" });
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { display_name: name, first_name: first.trim(), last_name: last.trim() } } });
      if (!error && name) { try { const v = JSON.parse(localStorage.getItem("farmerplus:settings") || "{}"); localStorage.setItem("farmerplus:settings", JSON.stringify({ ...v, owner: name })); } catch {} }
      setBusy(false);
      if (error) { setMsg(error.message); toast.error(error.message); return; }
      toast.success("Check your email to confirm your account");
      setMode("signin");
    }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) { toast.error(r.error.message ?? "Google sign-in failed"); return; }
    if (r.redirected) return;
    nav({ to: "/" });
  };

  return (
    <div className="soft-card px-6 py-6 sm:px-8">
      <h1 className="font-display text-xl font-bold">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
      <p className="pb-4 text-xs text-muted-foreground">Back up your animal records and sync them across devices.</p>
      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-sm font-medium">First name
              <input className={input} required value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" maxLength={40} />
            </label>
            <label className="block space-y-1 text-sm font-medium">Last name
              <input className={input} required value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" maxLength={40} />
            </label>
          </div>
        )}
        <label className="block space-y-1 text-sm font-medium">Email
          <input className={input} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Password</span>
            {mode === "signin" && <Link to="/forgot-password" tabIndex={-1} className="text-xs text-muted-foreground hover:text-foreground">Forgot password?</Link>}
          </div>
          <PasswordInput required minLength={mode === "signup" ? 8 : 6} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
        </div>
        {msg && <p aria-live="polite" className="text-xs text-destructive">{msg}</p>}
        <button disabled={busy} className="h-10 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <button type="button" onClick={google} className="h-10 w-full rounded-full border bg-background text-sm font-semibold">Continue with Google</button>
      </form>
      <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-4 w-full text-center text-sm text-info">
        {mode === "signin" ? "New here? Create an account" : "Have an account? Sign in"}
      </button>
      <button type="button" onClick={() => { setGuest(true); nav({ to: "/" }); }} className="mt-2 block w-full text-center text-xs text-muted-foreground hover:text-foreground">Continue without an account</button>
    </div>
  );
}
