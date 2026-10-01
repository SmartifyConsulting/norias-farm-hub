<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Farm records live in browser localStorage via src/lib/farm.ts (offline-first, simulated sync badges) — no backend yet.
- Mini-apps are config-driven (MINI_APPS) and rendered by one route /app/$appId — add apps by config, not new routes.
- PWA is manifest-only (no service worker) — avoids stale caches in preview.
