# FarmerPlus (AgriSphere) — Platform Feature Audit

Date: 2026-10-12
Status: Phase 1 audit, evidence-based. No code changed as part of this audit.

This document is the source of truth for planning the home page reorganisation
and the Co-operative Management module. It will be exposed as an in-app
"Platform Feature Audit" page in the administration area once that work begins.

---

## 1. App registry — `src/lib/farm.ts`

`MINI_APPS` (12 entries), each `{id, name, emoji, icon, blurb, titleLabel,
detailLabel, qtyLabel?, dates?, links?, recurring?}`. No `category` field exists.

1. `farm` — My Farm (Warehouse) — assets/equipment
2. `animals` — My Animals (PawPrint) — herd records
3. `health` — Animal Health (Syringe) — vaccinations/treatments, recurring, "Next due"
4. `diary` — Farm Diary (NotebookPen)
5. `harvest` — Harvest (Wheat)
6. `fields` — Field Mapping (Map)
7. `stock` — Stock (Package)
8. `tasks` — Tasks (ListTodo), due dates, links field/crop
9. `crops` — Crop Cycles (Sprout), planting/harvest dates, links field
10. `treatments` — Inputs & Sprays (FlaskConical), links field/crop
11. `maintenance` — Maintenance (Wrench), links field/crop
12. `finance` — Costs & Sales (Receipt), links field/crop

Generic CRUD via `useRecords()` against `localStorage["farmerplus:<app>"]`
and synced to Supabase via `lib/animal-sync.ts` into the single
`animal_records` table (discriminated by an `app` column).

## 2. Home page and App Store

- **No categorisation, search, favourites, or recents exist anywhere.**
- `src/routes/index.tsx`: renders `MINI_APPS.slice(0,6)` / `.slice(6,12)` as a
  flat grid. `ActionDashboard` renders Opportunities/Actions/Commitments/
  Capacity/Risks/Outcomes panels (AgriSphere data, not mini-apps).
- `src/routes/apps.tsx`: 3 hard-coded sections in this order — Farm Team card,
  FarmSchool card, `MINI_APPS.map()`, then a separate hard-coded `INTEL` array
  (11 items: passport, opportunities, simulator, capacity, risks, collective,
  outcomes, traceability, funding, vet-check, copilot).
- Three independent lists must be kept in sync to add/reorganise anything:
  `MINI_APPS`, `INTEL` (apps.tsx), `Dock.tsx`'s nav `items`.
- `src/lib/app-colors.ts`: `appTone(i)` assigns icon-frame colors by **array
  index** — reordering apps for categorisation will break this and needs
  updating alongside.

## 3. Dynamic mini-app route — `src/routes/app.$appId.tsx`

Single catch-all route: loader does `MINI_APPS.find(a=>a.id===params.appId)`.
Generic add/edit form driven by the app's config, List/Calendar toggle,
enforces `permissions(current?.role)` from `lib/team.ts` (farm role gating).
Good pattern for simple single-table record types; **not relational enough**
for multi-party structures (supplier quotes, order allocation across members).

## 4. Route-by-route verdicts

| Route | Verdict | Evidence / notes |
|---|---|---|
| team.tsx | IMPLEMENTED | Real Supabase CRUD on `farms`/`farm_members`/`farm_invites` via RPCs `create_farm`/`accept_farm_invite`. Roles: owner/manager/worker/viewer. One user can belong to many farms, switches "active farm". Farm-scoped, not org/co-op scoped — don't repurpose directly. |
| collective.tsx | STUB-ONLY | `Pool` type in `lib/network.ts`. "Pledge" is just `{mine, confirmed}` in localStorage. No supplier quotes, no orders, no settlement. User-created pools never call `postShared` — **not visible to other users at all**. |
| capacity.tsx | PARTIALLY IMPLEMENTED | Real match-reasoning (`needs`, `why[]` from passport gaps). Listings localStorage-only; `postShared` never called here either. "Request to book"/"Offer to help" just `toast.success` — no booking record created anywhere. |
| traceability.tsx | PARTIALLY IMPLEMENTED | 10 fixed `TRACE_STEPS`, auto-generated batch code. `level` supports self-declared/recorded/verified/certified but UI only allows the first two. Stored in localStorage only — no `batches` table exists in schema at all. |
| funding.tsx | STUB-ONLY | Literally a derived checklist (8 items) + cash-flow estimate reusing the simulator. No lender entity, no application submission/tracking, no documents. Explicitly labeled "not a lending decision." |
| outcomes.tsx | IMPLEMENTED | Real stage machine: Opportunity→Assessment→Decision→Commitment→Action→Outcome, expected-vs-actual deltas, full history audit trail. Local-only, no DB table. |
| opportunities.tsx | PARTIALLY IMPLEMENTED | Real scoring/match logic (`score`, `reasons[]`, `gaps[]`). "Express interest"/"Track" are toasts or feed into the outcomes pipeline — no real messaging/negotiation. |
| risks.tsx | IMPLEMENTED | Live Open-Meteo API, real risk derivation, working stage machine. Local-only. |
| passport.tsx | PARTIALLY IMPLEMENTED | `derived()` computes real values from farm records. `farmer_profiles` table exists in schema but is **unused/orphaned** — route stores everything in localStorage instead. |
| vet-check.tsx | IMPLEMENTED | Real streaming AI call to `/api/vet-check`, can save to `health` mini-app. |
| copilot.tsx | IMPLEMENTED | Real streaming AI call to `/api/copilot` with full local context. Read-only, never writes. |
| simulator.tsx | IMPLEMENTED | Real multi-scenario calculation engine. No persistence at all (resets on reload). |
| settings.tsx | IMPLEMENTED | Account, avatar upload, farm name, geolocation, autosync, notification prefs, clear-local-data, and a "Your role" dropdown (see §6). |
| wallet.tsx | STUB-ONLY | Pure localStorage ledger. No Supabase sync, no link to Costs & Sales mini-app. |
| farmschool.tsx | STUB (by design) | Roadmap confirms: "waiting on an access key and a courses feed." |
| auth.tsx | IMPLEMENTED | Real Supabase auth, email/password + Google, forgot/reset password. |

## 5. Database schema (authoritative source: `drizzle/migrations/*.sql` — `drizzle/schema.ts` itself is blank/auto-generated)

**`public.animal_records`** — the single generic table backing all 12 mini-apps
(`app` text column discriminates): `id, user_id, title, detail, qty,
recorded_at, updated_at, app, farm_id→farms, field_id, crop_id, due_on,
ends_on, repeat_days, completed jsonb, animal_id`. RLS via `farm_role_of()`.

**`public.user_data`** — generic per-user JSON-doc KV store (`user_id, key,
value jsonb`). Intended per AGENTS.md for syncing AgriSphere local stores, but
**nothing currently writes to it** — `lib/animal-sync.ts` only touches
`animal_records`.

**`public.farms`** / **`public.farm_members`** / **`public.farm_invites`** —
farm entity + role-based membership (`farm_role` enum: owner/manager/worker/
viewer) + email invites. `farm_role_of()` SECURITY DEFINER function drives all
RLS. **This is the direct template to extend for co-operatives.**

**`public.farmer_profiles`** — `id, name, farm_name, province, role, crops,
hectares, bio`. No FK to `auth.users` or `farms`. Currently unpopulated/unused
by any route.

**`public.shared_listings`** — the only cross-user "network" table: `id, kind
CHECK IN ('opportunity','capacity','pool'), data jsonb, owner_id,
profile_id→farmer_profiles`. No `cooperative` kind exists. No traceability/
outcome/risk kind either — those features have zero cloud persistence.

**Storage**: `avatars` bucket policies only.

### What's reusable vs. missing for a co-op module
- Reusable: the `farm_role`/RLS/SECURITY-DEFINER-function pattern → direct
  template for `coop_role_of()` + `cooperative_members`.
- Reusable but weak: `shared_listings`'s generic `kind`+`jsonb` pattern could
  add a `coop_listing` kind for simple announcements, but is not suitable for
  structured order aggregation, member ledgers, or governance records.
- Missing entirely: `cooperatives`, `cooperative_members`, membership roles/
  fees, order aggregation + per-member allocation, supplier/quote tracking,
  co-op financial ledger, governance (meetings/votes/resolutions).

## 6. Auth / roles

No `profiles` or `user_roles` table. Two unrelated role systems exist:

1. **Enforced**: `farm_role` (owner/manager/worker/viewer) via Postgres RLS
   (`farm_role_of()`), switched via `/team`'s "Working in" picker
   (`setActiveFarm`).
2. **Unenforced**: `lib/network.ts`'s `Role` type — a self-declared persona
   dropdown in Settings (`Farmer, Farm manager, Buyer, Agricultural supplier,
   Agronomist, Equipment owner, Logistics provider, Storage provider, Finance
   provider, **Cooperative**, Agricultural programme`). Purely
   `localStorage["farmerplus:role"]`, used only to bias which opportunities are
   shown. **No backend enforcement, no relationship to farm_role, not a
   membership/org concept.**

These two systems do not talk to each other.

## 7. "Cooperative" — full repo search

Grep for `cooperative|co-operative|coop` across the entire codebase returns
only vocabulary, no feature:
- `lib/agri.ts`: `"Cooperative"` as one of 10 `OppType` labels; a suggestion
  string mentioning "via a cooperative" in match-gap reasoning.
- `lib/network.ts`: `"Cooperative"` as a selectable persona value (see §6);
  sample capacity listing named `"District Co-op"` (flavor text only).

**Confirmed: no table, route, component, or business logic implementing a
cooperative exists anywhere in the codebase today.**

## 8. Reusable UI building blocks

- `src/components/Dock.tsx` — `Dock()` (mobile nav, 3 hard-coded items:
  Home/Apps/Wallet) and `TopNav()` (desktop header, inline search via
  `<datalist>` populated from `MINI_APPS` only — **INTEL/AgriSphere apps are
  not searchable today**).
- `src/components/ActionDashboard.tsx` — `Panel()` helper (title+link+children)
  is a good template to extend with a co-op dashboard panel.
- `src/components/NotificationBell.tsx` — generic `{id, to, type, text}`
  notice list, reusable as-is for co-op notifications.

## 9. Key structural conclusions

1. **No unified app registry.** Categorising the home page requires either
   adding a `category` field to a merged `MiniApp`/`INTEL` registry, or a new
   registry both `index.tsx` and `apps.tsx` consume. Index-based color toning
   (`appTone`) needs updating alongside.
2. **The co-operative module is a genuine net-new build** — nothing to
   "enable," only patterns to extend (farm roles/RLS, config-driven app
   rendering as a loose analogy, `shared_listings` as a loose analogy for
   simple announcements only).
3. **Collective buying (`collective.tsx`) is the closest existing analogue**
   to co-op bulk purchasing but is prototype-level and not even synced
   cross-device — it should likely be *superseded/absorbed* by the real
   co-op collective-purchasing feature rather than duplicated alongside it.
4. **Two unreconciled role systems** need a decision: whether co-op
   roles become a third independent system, or whether this is the moment to
   unify role concepts.
