import { useEffect, useState } from "react";
import type { Role } from "@/lib/network";

export type FarmDetails = {
  address: string;
  sizeHa: string;
  mainProduction: string;
  subCategory: string;
  /** Geocoded from the address, so the farm map can open locked onto this location every time. */
  lat?: number | undefined;
  lon?: number | undefined;
  /** Your role on this farm — set per farm instead of once globally in Settings. */
  role?: Role | undefined;
};

const EMPTY: FarmDetails = { address: "", sizeHa: "", mainProduction: "", subCategory: "" };

/** Looks up an address via the same free geocoder the farm map's search box uses. */
export async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lon: number } | null> {
  const q = address.trim();
  if (!q) return null;
  try {
    const r = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=${encodeURIComponent(q)}`,
    );
    const data = await r.json();
    const hit = data?.results?.[0];
    if (!hit) return null;
    return { lat: hit.latitude, lon: hit.longitude };
  } catch {
    return null;
  }
}

/** Main production categories, each with its own production subcategories (cascading select). */
export const PRODUCTION_CATEGORIES: Record<string, string[]> = {
  "Field crops": [
    "Maize",
    "Wheat",
    "Soybeans",
    "Sunflower",
    "Sorghum",
    "Barley",
    "Other field crop",
  ],
  Horticulture: [
    "Vegetables",
    "Deciduous fruit",
    "Citrus",
    "Subtropical fruit",
    "Viticulture (grapes)",
    "Other horticulture",
  ],
  "Industrial and plantation crops": [
    "Sugarcane",
    "Cotton",
    "Tobacco",
    "Tea",
    "Coffee",
    "Other industrial crop",
  ],
  Livestock: [
    "Cattle (beef)",
    "Cattle (dairy)",
    "Sheep",
    "Goats",
    "Pigs",
    "Game farming",
    "Other livestock",
  ],
  Poultry: ["Broilers", "Layers", "Other poultry"],
  Aquaculture: ["Fish farming", "Shellfish", "Other aquaculture"],
  Beekeeping: ["Honey production", "Pollination services", "Other beekeeping"],
  "Forestry and nurseries": ["Timber", "Nursery / seedlings", "Other forestry"],
  "Pasture and fodder": ["Grazing", "Hay / silage", "Other pasture"],
  Other: ["Mixed farming", "Agri-tourism", "Other"],
};
export const MAIN_PRODUCTIONS = Object.keys(PRODUCTION_CATEGORIES);

const key = (farmId: string | null) => `farmerplus:farm-details:${farmId ?? "personal"}`;

function read(farmId: string | null): FarmDetails {
  try {
    const raw = localStorage.getItem(key(farmId));
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<FarmDetails>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Writes details for a given farm — a plain function (not tied to a hook's own farmId) so a form
 * can save details for a farm it just created, before switching the active farm over to it. */
export function saveFarmDetails(farmId: string | null, details: FarmDetails) {
  localStorage.setItem(key(farmId), JSON.stringify(details));
  window.dispatchEvent(new Event("farmerplus:change"));
}

export function useFarmDetails(farmId: string | null): FarmDetails {
  const [details, setDetails] = useState<FarmDetails>(() => read(farmId));
  useEffect(() => {
    const load = () => setDetails(read(farmId));
    load();
    window.addEventListener("farmerplus:change", load);
    return () => window.removeEventListener("farmerplus:change", load);
  }, [farmId]);
  return details;
}
