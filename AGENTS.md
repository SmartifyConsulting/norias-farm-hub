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
- Records are local-first in localStorage; all mini-apps sync to animal_records (app column) and AgriSphere/wallet/settings stores sync as JSON docs to user_data via src/lib/animal-sync.ts (dirty-key tracking, tombstones per app).
- Mini-apps are config-driven (MINI_APPS) and rendered by one route /app/$appId — add apps by config, not new routes.
- PWA is manifest-only (no service worker) — avoids stale caches in preview.
- Responsive: mobile glass dock (<md); md+ uses fixed TopNav header; pages use Screen (md:max-w-5xl lg:max-w-7xl, md:pt-24) — keeps mobile layout untouched.
- Signed-out Home shows Heita-style AuthLanding unless the user picked "continue without an account" (localStorage farmerplus:guest).
- AgriSphere features (capacity, risks, collective, pipeline/outcomes, traceability, role, notifications) are local-first in src/lib/network.ts via useStore (localStorage farmerplus:* keys + farmerplus:change event) — matches the existing offline-first model.
- Farm Copilot streams through the /api/copilot server route; the browser sends its local farm data as context because records live on the device. Do not pass request.signal to the upstream fetch (stalls the stream in dev).
- Shared farms: farms/farm_members/farm_invites with farm_role_of() security-definer for RLS; records carry farm_id from the active farm (localStorage farmerplus:activeFarm) — keeps private and team records in one table.

- Pre-bundle any lazily discovered client deps (radix, router-core, seroval) in vite.config.ts optimizeDeps.include — a mid-session re-optimization loads two React copies and blanks the preview.
