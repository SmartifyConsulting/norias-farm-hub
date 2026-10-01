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
- Records are local-first in localStorage (src/lib/farm.ts); animals also sync to the cloud table animal_records via src/lib/animal-sync.ts (push unsynced + tombstones, then pull) — other apps still simulated.
- Mini-apps are config-driven (MINI_APPS) and rendered by one route /app/$appId — add apps by config, not new routes.
- PWA is manifest-only (no service worker) — avoids stale caches in preview.
- Responsive: mobile glass dock (<md); md+ uses fixed TopNav header; pages use Screen (md:max-w-5xl lg:max-w-7xl, md:pt-24) — keeps mobile layout untouched.
- Signed-out Home shows Heita-style AuthLanding unless the user picked "continue without an account" (localStorage farmerplus:guest).
