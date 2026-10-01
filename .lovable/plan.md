# Colourful icons, brand colours and a new home page

## What changes
1. **App Store goes back to icons.** The round photos are removed. Every app's icon sits in a coloured round frame. The frames cycle through green, yellow, orange and red across all apps, including the everyday farm apps and Farm intelligence.
2. **Home page app icons get the same colourful frames.** Each app keeps the same colour on Home and in the App Store.
3. **New colour palette across the app**, used together with black and white:
   - Green #00A754: main buttons ("OPEN", "Sign in", "Create account"), "synced", online dot
   - Yellow #FAB805: highlights, "pending", warnings
   - Orange #FD870A: menu hover, reminders due soon
   - Red #D21018: errors, overdue, delete
   - Black and white stay the base: top menu bar, text, cards and page backgrounds
   - The selected menu item stays white with black text.
4. **Rearranged home page**, built to look clean, professional and engaging:
   - Large greeting at the top, for example "Good afternoon, Georgia", with your farm name, today's date, and online and backup status
   - A row of quick numbers: records, items waiting to sync, tasks due, and active risks
   - Weather card next to a "Today" card with what needs attention
   - "Your apps" grid with the colourful icons
   - Action panels (opportunities, commitments, risks, outcomes) in a tidy two- or three-column grid on wider screens, stacked on phones

Note: #D21018 was listed twice, so red is used once. Tell me if you meant a fifth colour.

## Technical details
- `src/styles.css`: brand tokens `--brand-green/yellow/orange/red` (+ foregrounds; yellow uses black text), map success/warning/hover-accent/destructive/chart to them, primary stays black.
- `src/lib/app-colors.ts`: one shared `appTone(index)` helper so Home and App Store use the same colour per app.
- `src/routes/apps.tsx`: restore `<a.icon>` in `rounded-full` coloured circles; delete `src/lib/app-photos.ts` and `src/assets/apps/*`.
- `src/routes/index.tsx`: new layout (greeting hero, stat strip, weather + today, apps grid, ActionDashboard); keep the existing sync, sign-in and notification behaviour.
- Check at phone and desktop sizes for contrast and errors.
