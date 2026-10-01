import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthLanding } from "@/components/AuthLanding";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ mode: z.enum(["signin", "signup"]).optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — FarmerPlus" },
      { name: "description", content: "Sign in or create a FarmerPlus account to back up and sync your farm records." },
      { property: "og:title", content: "Sign in — FarmerPlus" },
      { property: "og:description", content: "Back up and sync your farm records." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  return <AuthLanding key={mode} initial={mode ?? "signin"} />;
}
