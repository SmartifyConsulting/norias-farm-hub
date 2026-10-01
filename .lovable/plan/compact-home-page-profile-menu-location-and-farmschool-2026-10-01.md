# Compact home page, profile menu, location and FarmSchool

## 1. Home page fits on one screen (laptop/desktop)
Phones keep scrolling as normal. On wider screens:

```text
| Greeting + status                                   |
| Records | Waiting | Due soon | Active risks | Weather |
| App icons 1-6 (2 rows of 3)  | Today (half width)   |
| App icons 7-12               | Opportunities for you|
```
- Weather becomes a small card the same size as the four number cards, placed top right: icon, temperature, condition, rain chance.
- "Today" is half its current width, on the right.
- The first six app icons move into the space where the large weather box was. The next six sit underneath.
- "Opportunities for you" moves under "Today". The other action boxes move below, outside the first screen.
- Spacing and padding get tighter so the main content fits without scrolling at about 1280x800.

## 2. Why your name wasn't saved
When you signed up, your name was saved to your account, but Settings only reads the name stored on the device, which starts as "Farmer". The fix:
- When you sign in, your account name fills in "Your name" in Settings and the greeting (if it still says "Farmer").
- Sign-up asks for First name and Last name. The greeting uses your first name.
- Editing "Your name" in Settings also updates your account.

## 3. Avatar menu with profile photo
- In the top menu, your email is replaced by a round avatar: your photo, or your initials on an earthy colour.
- Clicking it opens a dropdown with your name and email, Profile & photo, Settings, and Log out.
- Phones get the same avatar at the top of Home.
- In Settings, a Profile photo section lets you upload a photo (JPG/PNG, up to 5 MB), change it or remove it. It's stored in your account, so it shows on every device.

## 4. "Use my location" works
- The button asks for location permission, shows "Finding you…", then saves your position, shows the place name (e.g. "Stellenbosch") and refreshes the weather.
- If permission is denied or not available, you see a clear message. You can also type a town name and pick from a list instead.
- The real cause is not confirmed yet. One likely cause is that the button gives no feedback and fails silently in the preview window. I'll test this first.

## 5. FarmSchool sign-in integration
- New FarmSchool card in the App Store and a FarmSchool section in Settings with a "Connect FarmSchool" button.
- Once connected, FarmerPlus shows your FarmSchool courses and progress, plus a "Continue learning" card on Home.
- **What's needed from FarmSchool:** I can't see a ready-made way to connect FarmSchool (https://farmschool.lovable.app) to FarmerPlus. FarmSchool needs to give out course and progress information, plus an access key. The FarmerPlus side and the connect screen will be built ready for it. Live courses will show once FarmSchool provides the key. Until then, the card links straight to FarmSchool.

## Technical details
- index.tsx: `lg:grid-cols-12` layout; stats strip becomes 5 cards with a new `WeatherMini` variant; apps split into 2 groups of 6; ActionDashboard gets `only`/`exclude` props so "Opportunities for you" renders beside the apps.
- Name: read `user.user_metadata.display_name` (or first_name/last_name) in a small `useProfileSync` hook that seeds settings.owner; Settings owner edits call `supabase.auth.updateUser({ data })`.
- Avatar: create an `avatars` storage bucket (public read; uploads limited to the user's own `<uid>/` folder by policies); store the URL in user metadata `avatar_url`; shadcn DropdownMenu + Avatar in TopNav and mobile Home.
- Location: geolocation with error handling and a timeout; reverse lookup and town search through the Open-Meteo geocoding API; store `placeName` in settings.
- FarmSchool: server function proxy `farmschool.functions.ts` that reads `FARMSCHOOL_API_KEY` server-side; requested with add_secret only after FarmSchool gives out the key; the FarmSchool card falls back to a link.
- Update roadmap.md, memory (avatar menu, compact home layout).
