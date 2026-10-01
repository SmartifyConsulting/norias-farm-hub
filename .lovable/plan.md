# Sign in by default, and TAG's look with FarmerPlus colours

## 1. Sign in is the default
When you're signed out, the home page opens on "Sign in" ("Welcome back") instead of "Create account". The /auth page already opens on Sign in. "Get started" and "New here? Create an account" still switch to sign-up.

## 2. TAG's look (fonts, shapes, shadows)
- **Fonts:** headings use Sora with slightly tighter letter spacing, and body text uses Manrope. Both fonts are already loaded. Headings get TAG's tighter spacing and smoother text rendering everywhere.
- **Corners:** the base corner rounding goes from 1.25rem to TAG's 1rem. Cards, buttons and inputs follow it, so they all look consistent.
- **Shadows:** cards get TAG's soft, layered card shadow.

## 3. Colours stay FarmerPlus
FarmerPlus keeps its green, yellow, orange and red, the black and white base, and the colourful app icons. None of TAG's navy, coral or tangerine colours are copied.

## Technical details
- `src/routes/index.tsx`: `<AuthLanding initial="signin" />`.
- Look up the TAG project (cross-project search) to copy its exact heading tracking, soft-card shadow values and font-smoothing rules. If they can't be found, use: tracking -0.02em, radius 1rem, and a two-layer soft shadow.
- `src/styles.css`: `--radius: 1rem`; `h1,h2,h3` letter-spacing; `body` `-moz-osx-font-smoothing: grayscale` plus `text-rendering: optimizeLegibility`; replace the `soft-card` box-shadow with TAG's. No colour tokens change.
- Check the sign-in and home pages at phone and desktop sizes.
