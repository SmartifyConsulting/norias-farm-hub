import { Link } from "@tanstack/react-router";
import type { RegistryApp } from "@/lib/app-registry";

/**
 * Routes to a registry app. Mini-apps resolve to /app/$appId, everything else to its own
 * fixed route — the registry's `to`/`params` are necessarily loosely typed to cover both,
 * so the route cast lives here once instead of being repeated at every call site.
 */
export function AppLink({
  app,
  className,
  children,
  onClickCapture,
}: {
  app: RegistryApp;
  className?: string;
  children: React.ReactNode;
  onClickCapture?: (e: React.MouseEvent) => void;
}) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link
      to={app.to as any}
      params={(app.params ?? {}) as any}
      className={className}
      onClickCapture={onClickCapture}
    >
      {children}
    </Link>
  );
}
