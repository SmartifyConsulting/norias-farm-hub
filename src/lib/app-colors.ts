/** Brand frame tones, cycled so neighbouring icons differ. Same index → same colour on Home and App Store. */
const TONES = [
  "bg-brand-green text-background",
  "bg-brand-yellow text-brand-ink",
  "bg-brand-orange text-background",
  "bg-brand-red text-background",
] as const;
export const appTone = (i: number) => TONES[i % TONES.length];
