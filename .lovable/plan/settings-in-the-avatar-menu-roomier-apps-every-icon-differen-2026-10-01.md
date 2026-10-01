# Settings in the avatar menu, roomier apps, every icon different and colourful

## 1. Settings moves to the avatar
- Settings comes out of the top menu bar (laptop/desktop) and out of the bottom dock (phone).
- It stays in the avatar dropdown: Profile & photo, Settings, Log out.
- Phones: the avatar at the top of Home opens the same menu. When you're signed out (guest), a small gear button stays next to the avatar spot, so you can still reach Settings.

## 2. Apps spread nicely on the home page
- "Your apps" fills the full width of its column with even spacing. There are 4 per row on tablets, 6 per row on laptops, and 3 per row on phones.
- The app boxes get bigger: larger icons and frames (about 56px), more space inside, and names that don't get cut off.
- The two rows line up neatly with the "Today" and "Opportunities" boxes on the right, so there is no empty gap underneath.

## 3. Every icon different and colourful
- **No icon is used twice.** Inputs & Sprays and Animal Symptom Check currently share the same stethoscope icon. Inputs & Sprays gets a spray/flask icon instead. The rest are checked for duplicates too.
- **Every frame gets its own colour.** There's a bigger palette of about 24 colours. It mixes the earthy tones with brighter ones based on your brand green, yellow, orange and red, plus teal, sky blue, plum and terracotta, for example.
  - The 12 farm apps, the 11 Farm intelligence tools, Farm Team and FarmSchool each get a unique colour.
  - Neighbouring icons never share a colour.
  - Each app keeps the same colour on Home and in the App Store.
- The four number cards on Home (Records, Waiting to sync, Due soon, Active risks) also get their own distinct colours.
- White or black icons are picked for each colour so they always stay easy to read.

## Technical details
- `Dock.tsx`: remove `/settings` from the nav arrays (TopNav and mobile dock); add a guest-only gear link.
- `styles.css`: add tokens `--tone-1..24` (earthy plus brighter brand-based hues) with `@theme` mappings.
- `app-colors.ts`: `appTone(key)` keyed by a stable app id/route, mapped to a unique tone with a matching foreground. Home, App Store, Team and FarmSchool cards use it.
- `farm.ts`: Inputs & Sprays icon becomes `FlaskConical`; check uniqueness across MINI_APPS + INTEL.
- `index.tsx`: app grid `grid-cols-3 md:grid-cols-4 lg:grid-cols-6` in one grid with larger tiles and frames; stats use distinct tones.
- Update the memory rule for app icon colours (earthy-only becomes unique colourful per app). Check pages at phone and desktop sizes.
