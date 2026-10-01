# Home background, tab styling, animal health, AI symptom check, shared data and seed data

## 1. Home page background (left half only)
- Keep the farmhouse and haystack image (the current countryside photo) on the Home page only.
- From tablet size up, show the image on the left half of the screen only, with a plain background on the right half. On phones the image stays full-screen, because there is no room for a half-and-half split.
- No other page gets a background image.

## 2. Tab colours (top header and mobile dock)
- Selected tab: black text on a white or light pill.
- Hover: a light grey highlight instead of the current see-through white or navy tint.

## 3. Animal health reminders (new "Animal Health" mini-app)
- For each animal, add a vaccination, treatment or checkup with a due date and a repeat: none, weekly, monthly, every 3, 6 or 12 months, or a custom number of days.
- "Mark done" records the completion date. If the item repeats, the next due date is set automatically. The history of past completions stays visible.
- Shows status as Overdue, Due soon or Upcoming, and appears on the calendar and the week overview.
- Reminders appear on the notification bell, as Tasks already do.
- Syncs to your account and to a shared farm, like the other mini-apps.

## 4. AI symptom check ("Animal Symptom Check")
- Pick an animal (optional), describe the symptoms and attach a photo (optional).
- The AI returns practical guidance: likely concerns (labelled as possibilities, not a diagnosis), what to check now, care steps, when to call a vet urgently, and next steps.
- Every answer carries a clear notice that it is not a veterinary diagnosis.
- You can save the result to that animal's health history as a record.
- The photo is sent only for this one check and is not stored.

## 5. Connect the remaining AgriSphere tools to the account
Your own entries in these tools already back up to your account. What still lives only inside the app are the sample listings: opportunities, buyer demand, shared capacity offers, and collective groups. Plan:
- Move opportunities, capacity listings and collective groups into shared database tables that every signed-in user can see.
- Anyone signed in can post a listing. Only the person who posted it can edit or delete it.
- Joining a group and expressing interest are saved to your account.
- Matching, the risk process and the approval safeguards work the same as now.

## 6. Seed data you can follow through the screens
Seed data goes into your account (info@georgiaadams.co.za) and a demo shared farm "Green Acres Co-op", where you are the owner. It forms one connected storyline:
- **Fields:** 4. **Crop cycles:** 4, with planting and harvest dates.
- **Tasks:** about 15 across past, this week and next month.
- **Inputs & sprays, maintenance, costs & sales:** about 10 each, linked to fields and crops.
- **Animals:** 12, each with health schedules. Some are overdue, some due this week, some done.
- **Diary, harvest and stock:** about 8 each.
- **Capability Passport:** filled in. **Pipeline:** items at every stage from Opportunity to Outcome. **Risks:** at different stages. **Traceability:** 2 batches.
- **Shared listings:** about 12 opportunities, 12 capacity offers and requests, and 5 collective groups.

All seeded names are fictional sample data and are labelled as samples.

## Technical details
- Background: in `index.tsx`, wrap the image in `fixed inset-y-0 left-0 w-full md:w-1/2`. Make the right side `bg-background`.
- Dock and TopNav: `activeProps` → `bg-card text-foreground` (black). Hover → `hover:bg-muted` or a lighter grey token (TopNav on navy: `hover:bg-white/20`-equivalent using a semantic muted token, with readable text).
- Health: new MINI_APPS entry `health` with an extra `repeat` (days) and `done` history. Add columns via migration: `repeat_days int`, `completed jsonb default '[]'` on `animal_records`, plus `animal_id text`. Extend the sync mapping.
- AI: new server route `/api/vet-check` (POST, zod-validated, image as data URL capped at about 4 MB). It streams from Lovable AI Gateway `/v1/responses` with `openai/gpt-6-astra`, reasoning low, `store: false`, image passed as `input_image`. 429/402/403 errors are shown in the UI. The UI is a new route `/vet-check` with an App Store card under Farm intelligence.
- Shared listings: new tables `opportunities`, `capacity_listings`, `pools`, `pool_members`. Authenticated SELECT for all. Owner-only INSERT/UPDATE/DELETE via `owner_id = auth.uid()`. GRANTs included. The app reads them instead of SAMPLE_* constants and falls back to the constants only when signed out.
- Seed: a schema migration for the new tables, then data inserts via SQL for the account's user id. These are records in `animal_records` (with `farm_id` of the demo farm), `user_data` documents for passport, pipeline, risks and batches, and rows in the shared listing tables.
