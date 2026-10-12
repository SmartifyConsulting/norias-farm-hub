import { useCallback, useEffect, useState } from "react";

export type LatLng = [number, number];

/** Every icon selectable on the map — for the object picker, and for auto-matching an asset's name. */
export const ICONS: Record<string, string> = {
  home: "🏠",
  warehouse: "🏚️",
  droplet: "💧",
  fence: "🚧",
  sprout: "🌱",
  "tree-pine": "🌲",
  package: "📦",
  flame: "🔥",
  sun: "☀️",
  tractor: "🚜",
  container: "🛢️",
  wheat: "🌾",
  wrench: "🔧",
  fuel: "⛽",
  zap: "⚡",
  trees: "🌳",
};
export type IconKey = keyof typeof ICONS;
export const ICON_KEYS = Object.keys(ICONS) as IconKey[];
/** Icon keys rendered as a light-coloured pill (crop/growing-related) rather than the default dark pill. */
const LIGHT_ICONS = new Set<IconKey>(["sprout", "wheat", "trees", "tree-pine"]);
export const isLightIcon = (icon: string) => LIGHT_ICONS.has(icon as IconKey);

/** Guess a sensible icon from an asset/record's name, so it can be auto-listed as a drag-to-map item. */
export function guessIcon(title: string): IconKey {
  const t = title.toLowerCase();
  if (/tractor|bakkie|truck|vehicle|trailer/.test(t)) return "tractor";
  if (/water|borehole|dam|tank|pump|irrigat|trough/.test(t)) return "droplet";
  if (/barn|shed|store|storage|warehouse/.test(t)) return "warehouse";
  if (/fence|wire|gate/.test(t)) return "fence";
  if (/silo|container/.test(t)) return "container";
  if (/wheat|grain|maize|crop/.test(t)) return "wheat";
  if (/tree|wood|forest|orchard/.test(t)) return "tree-pine";
  if (/fuel|diesel|petrol|generator/.test(t)) return "fuel";
  if (/solar|electri|power/.test(t)) return "zap";
  if (/house|home|cottage|office/.test(t)) return "home";
  if (/tool|equipment|implement|plough|planter/.test(t)) return "wrench";
  if (/field|planting|garden/.test(t)) return "sprout";
  return "package";
}

/**
 * A single pin on the farm map. Either linked to an existing record in another mini-app
 * (kind "record"), or a freeform annotation dropped from the icon palette (kind "annotation").
 * `lat`/`lon` place the icon marker; `area`, when present, is a drawn polygon outline (3+ nodes)
 * showing the object's extent — any object can be dropped as a point or drawn as an area.
 */
export type MapPin =
  | {
      id: string;
      lat: number;
      lon: number;
      label: string;
      kind: "record";
      objectApp: string;
      objectId: string;
      icon?: IconKey | undefined;
      area?: LatLng[] | undefined;
    }
  | {
      id: string;
      lat: number;
      lon: number;
      label: string;
      kind: "annotation";
      icon: IconKey;
      area?: LatLng[] | undefined;
    };

/** Distributive Omit — plain `Omit` over a union collapses to only the common keys, which drops each variant's own fields. */
export type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

const key = (prefix: string, farmId: string | null) =>
  `farmerplus:${prefix}:${farmId ?? "personal"}`;

function read<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useBoundary(farmId: string | null) {
  const k = key("boundary", farmId);
  const [boundary, setBoundaryState] = useState<LatLng[]>([]);
  useEffect(() => {
    const load = () => setBoundaryState(read<LatLng[]>(k, []));
    load();
    window.addEventListener("farmerplus:change", load);
    return () => window.removeEventListener("farmerplus:change", load);
  }, [k]);
  const setBoundary = useCallback(
    (next: LatLng[]) => {
      localStorage.setItem(k, JSON.stringify(next));
      setBoundaryState(next);
      window.dispatchEvent(new Event("farmerplus:change"));
    },
    [k],
  );
  return [boundary, setBoundary] as const;
}

/** A user-defined object (e.g. "Powerlines") saved from the map's "+ Add object" picker, so it
 * stays on the palette for reuse across farms instead of being a one-off drag. */
export type CustomObject = { id: string; icon: IconKey; label: string };
const CUSTOM_OBJECTS_KEY = "farmerplus:custom-objects";

export function useCustomObjects() {
  const [items, setItems] = useState<CustomObject[]>([]);
  useEffect(() => {
    const load = () => setItems(read<CustomObject[]>(CUSTOM_OBJECTS_KEY, []));
    load();
    window.addEventListener("farmerplus:change", load);
    return () => window.removeEventListener("farmerplus:change", load);
  }, []);
  const add = useCallback((icon: IconKey, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const current = read<CustomObject[]>(CUSTOM_OBJECTS_KEY, []);
    if (current.some((c) => c.label.toLowerCase() === trimmed.toLowerCase())) return;
    const next = [...current, { id: crypto.randomUUID(), icon, label: trimmed }];
    localStorage.setItem(CUSTOM_OBJECTS_KEY, JSON.stringify(next));
    setItems(next);
    window.dispatchEvent(new Event("farmerplus:change"));
  }, []);
  const remove = useCallback((id: string) => {
    const next = read<CustomObject[]>(CUSTOM_OBJECTS_KEY, []).filter((c) => c.id !== id);
    localStorage.setItem(CUSTOM_OBJECTS_KEY, JSON.stringify(next));
    setItems(next);
    window.dispatchEvent(new Event("farmerplus:change"));
  }, []);
  return { items, add, remove };
}

export function usePins(farmId: string | null) {
  const k = key("pins", farmId);
  const [pins, setPinsState] = useState<MapPin[]>([]);
  useEffect(() => {
    const load = () => setPinsState(read<MapPin[]>(k, []));
    load();
    window.addEventListener("farmerplus:change", load);
    return () => window.removeEventListener("farmerplus:change", load);
  }, [k]);
  const setPins = useCallback(
    (next: MapPin[]) => {
      localStorage.setItem(k, JSON.stringify(next));
      setPinsState(next);
      window.dispatchEvent(new Event("farmerplus:change"));
    },
    [k],
  );
  return [pins, setPins] as const;
}
