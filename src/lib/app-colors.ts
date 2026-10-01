/** Earthy frame tones, cycled so neighbouring icons differ. Same index → same colour on Home and App Store. */
const TONES = [
  "bg-earth-1 text-background",
  "bg-earth-2 text-brand-ink",
  "bg-earth-3 text-background",
  "bg-earth-4 text-brand-ink",
  "bg-earth-5 text-background",
  "bg-earth-6 text-brand-ink",
  "bg-earth-7 text-background",
  "bg-earth-8 text-brand-ink",
  "bg-earth-9 text-background",
  "bg-earth-10 text-background",
] as const;
export const appTone = (i: number) => TONES[i % TONES.length];
