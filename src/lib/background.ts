import { useEffect, useState } from "react";
import countryside from "@/assets/countryside.jpg";
import meadow from "@/assets/meadow.jpg";

export const BACKGROUNDS = { meadow, countryside } as const;
export type BgKey = keyof typeof BACKGROUNDS;
const KEY = "farmerplus:bg";

export function useBackground(): [BgKey, (k: BgKey) => void] {
  const [bg, setBg] = useState<BgKey>("meadow");
  useEffect(() => {
    const v = localStorage.getItem(KEY);
    if (v === "meadow" || v === "countryside") setBg(v);
  }, []);
  const set = (k: BgKey) => {
    localStorage.setItem(KEY, k);
    setBg(k);
  };
  return [bg, set];
}
