import { useCallback, useEffect, useState } from "react";

export type LatLng = [number, number];
export type AnnotationIcon = "farmhouse" | "shed" | "water" | "gate" | "crop";
/**
 * A single pin on the farm map. Either linked to an existing record in another mini-app
 * (kind "record"), or a freeform annotation dropped from the icon palette (kind "annotation").
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
    }
  | {
      id: string;
      lat: number;
      lon: number;
      label: string;
      kind: "annotation";
      icon: AnnotationIcon;
    };

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
