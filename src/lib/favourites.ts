import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "farmerplus:favourites";
const EVENT = "farmerplus:favourites-change";

function load(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function useFavourites() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const refresh = () => setIds(load());
    refresh();
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, []);
  const toggle = useCallback((appId: string) => {
    const cur = load();
    const next = cur.includes(appId) ? cur.filter((id) => id !== appId) : [...cur, appId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { ids, isFavourite: (id: string) => ids.includes(id), toggle };
}
