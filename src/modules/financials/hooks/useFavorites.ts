import { useEffect, useState } from "react";

const FAVORITES_STORAGE_KEY = "spreadsheet-formula-favorites";
const DEFAULT_FAVORITES = [
  "SUM",
  "AVERAGE",
  "COUNT",
  "IF",
  "VLOOKUP",
  "ROUND",
  "MAX",
  "MIN",
  "CONCATENATE",
  "TODAY",
];

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set(DEFAULT_FAVORITES);
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set(DEFAULT_FAVORITES);
    } catch {
      return new Set(DEFAULT_FAVORITES);
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify([...favorites]),
      );
    } catch {
      // ignore
    }
  }, [favorites]);

  function toggle(name: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return { favorites, toggle };
}
