import { getCityCode } from "./turkey-cities";

let mod: typeof import("./turkey-neighbourhoods") | null = null;

/**
 * Lazily loads neighbourhoods for a given city + district.
 * The ~1.7MB neighbourhood data is only loaded on first call via dynamic import.
 */
export async function loadNeighbourhoods(
  city: string,
  district: string,
): Promise<string[]> {
  const code = getCityCode(city);
  if (!code) return [];
  if (!mod) mod = await import("./turkey-neighbourhoods");
  return mod.getNeighbourhoods(code, district);
}
