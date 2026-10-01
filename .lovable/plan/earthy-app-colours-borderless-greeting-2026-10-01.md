# Earthy app colours + borderless greeting

## What changes
- **Greeting on Home:** remove the black box behind the greeting. It sits on the plain page background with dark text; the date, farm name and sync status stay.
- **App icon frames (App Store and Home):** replace the green/yellow/orange/red cycle with earthy tones from your two swatches, cycled so neighbouring apps differ and each app keeps the same colour on both pages:
  - Forest green #45573E
  - Sage #848F65
  - Olive #575A0C
  - Wheat #C4BB75
  - Butter #EEE08A
  - Mustard #D0A346
  - Amber #F5A50A
  - Bronze #A57400
  - Rust brown #8A5422
  - Deep pine #1F3D2C
- Icons are white on dark tones and near-black on light tones (wheat, butter, amber, mustard) so they stay readable.
- Buttons, warnings and errors elsewhere stay unchanged.

## Technical details
- Add `--earth-1..10` tokens in src/styles.css plus `@theme inline` colour mappings.
- Update TONES in src/lib/app-colors.ts to the earth tokens with matching text colours; Farm Team card uses deep pine.
- index.tsx hero section: drop `bg-brand-ink text-background` and the colour stripe; use `text-foreground` / `text-muted-foreground`.
- Update the design memory with the earthy icon palette.
