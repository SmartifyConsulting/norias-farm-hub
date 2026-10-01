# App Store icons and new brand colours

## What changes
1. **App Store goes back to icons.** The round photos are replaced with the original icons, now inside round coloured circles.
2. **Farm intelligence gets its own colours.** Each tool's icon circle cycles through the new colours (green, yellow, orange, red) so this section looks different from the everyday farm apps, which stay black and white.
3. **New colour palette across the app**, used together with black and white:
   - Green #00A754: main buttons ("OPEN", "Sign in", "Create account"), "synced", online dot
   - Yellow #FAB805: highlights, "pending", warnings
   - Orange #FD870A: menu hover, reminders due soon
   - Red #D21018: errors, overdue, delete
   - Black and white stay the base: top menu bar, text, cards and page backgrounds
   - The selected menu item stays white with black text.

Note: #D21018 was listed twice, so red is used once. Tell me if you meant a fifth colour.

## Technical details
- Update tokens in `src/styles.css` (success, warning, hover-accent, destructive/urgent, chart colours; add `--brand-green/yellow/orange/red`) and set primary to black so buttons and nav follow the palette; use the green token for primary actions.
- `src/routes/apps.tsx`: restore `<a.icon>` in `rounded-full` circles; mini-apps use `bg-foreground text-background`; INTEL uses a rotating class list of the four brand tokens.
- Delete `src/lib/app-photos.ts` and `src/assets/apps/*`.
- Check the main screens at phone and desktop sizes for contrast (yellow uses black text).
