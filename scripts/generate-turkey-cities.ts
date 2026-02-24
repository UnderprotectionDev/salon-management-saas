/**
 * Generates src/lib/data/turkey-cities.ts and src/lib/data/turkey-neighbourhoods.ts
 * from the turkey-neighbourhoods package.
 * Run with: bun scripts/generate-turkey-cities.ts
 *
 * Data source: https://github.com/muratgozel/turkey-neighbourhoods
 * License: MIT
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  getCities,
  getDistrictsByCityCode,
  getNeighbourhoodsByCityCodeAndDistrict,
} from "turkey-neighbourhoods";

const cities = getCities(); // [{code: "01", name: "Adana"}, ...]
const dataDir = join(import.meta.dir, "../src/lib/data");

// =============================================================================
// File 1: turkey-cities.ts (cities + districts + CITY_CODE_MAP)
// =============================================================================

const lines: string[] = [];

lines.push(`// AUTO-GENERATED — do not edit manually.`);
lines.push(`// To regenerate: bun scripts/generate-turkey-cities.ts`);
lines.push(
  `// Source: turkey-neighbourhoods (MIT) — https://github.com/muratgozel/turkey-neighbourhoods`,
);
lines.push(``);
lines.push(`export interface TurkeyDistrict {`);
lines.push(`  name: string;`);
lines.push(`}`);
lines.push(``);
lines.push(`export interface TurkeyCity {`);
lines.push(`  name: string;`);
lines.push(`  districts: TurkeyDistrict[];`);
lines.push(`}`);
lines.push(``);
lines.push(`export const TURKEY_CITIES: TurkeyCity[] = [`);

for (const city of cities) {
  const districts = getDistrictsByCityCode(city.code);
  lines.push(`  {`);
  lines.push(`    name: ${JSON.stringify(city.name)},`);
  lines.push(`    districts: [`);
  for (const district of districts) {
    lines.push(`      { name: ${JSON.stringify(district)} },`);
  }
  lines.push(`    ],`);
  lines.push(`  },`);
}

lines.push(`];`);
lines.push(``);
lines.push(
  `export const CITY_NAMES: string[] = TURKEY_CITIES.map((c) => c.name);`,
);
lines.push(``);
lines.push(`export function getDistricts(cityName: string): string[] {`);
lines.push(`  const city = TURKEY_CITIES.find((c) => c.name === cityName);`);
lines.push(`  return city ? city.districts.map((d) => d.name) : [];`);
lines.push(`}`);
lines.push(``);

// CITY_CODE_MAP: city name → city code
lines.push(
  `/** Map city name → plate code (e.g. "Ankara" → "06") */`,
);
lines.push(`export const CITY_CODE_MAP: Record<string, string> = {`);
for (const city of cities) {
  lines.push(`  ${JSON.stringify(city.name)}: ${JSON.stringify(city.code)},`);
}
lines.push(`};`);
lines.push(``);
lines.push(`export function getCityCode(cityName: string): string | undefined {`);
lines.push(`  return CITY_CODE_MAP[cityName];`);
lines.push(`}`);
lines.push(``);

const citiesOutput = lines.join("\n");
writeFileSync(join(dataDir, "turkey-cities.ts"), citiesOutput, "utf8");

// =============================================================================
// File 2: turkey-neighbourhoods.ts (neighbourhoods by city code + district)
// =============================================================================

const nLines: string[] = [];
let totalNeighbourhoods = 0;

nLines.push(`// AUTO-GENERATED — do not edit manually.`);
nLines.push(`// To regenerate: bun scripts/generate-turkey-cities.ts`);
nLines.push(
  `// Source: turkey-neighbourhoods (MIT) — https://github.com/muratgozel/turkey-neighbourhoods`,
);
nLines.push(``);
nLines.push(
  `/** Neighbourhoods indexed by city plate code, then district name. */`,
);
nLines.push(
  `export const NEIGHBOURHOODS: Record<string, Record<string, string[]>> = {`,
);

for (const city of cities) {
  const districts = getDistrictsByCityCode(city.code);
  nLines.push(`  ${JSON.stringify(city.code)}: {`);
  for (const district of districts) {
    const neighbourhoods = getNeighbourhoodsByCityCodeAndDistrict(
      city.code,
      district,
    );
    totalNeighbourhoods += neighbourhoods.length;
    nLines.push(
      `    ${JSON.stringify(district)}: ${JSON.stringify(neighbourhoods)},`,
    );
  }
  nLines.push(`  },`);
}

nLines.push(`};`);
nLines.push(``);
nLines.push(
  `export function getNeighbourhoods(cityCode: string, district: string): string[] {`,
);
nLines.push(`  return NEIGHBOURHOODS[cityCode]?.[district] ?? [];`);
nLines.push(`}`);
nLines.push(``);

const neighbourhoodsOutput = nLines.join("\n");
writeFileSync(
  join(dataDir, "turkey-neighbourhoods.ts"),
  neighbourhoodsOutput,
  "utf8",
);

// =============================================================================
// Summary
// =============================================================================

console.log(`✓ Generated ${cities.length} cities`);
const totalDistricts = cities.reduce(
  (sum, c) => sum + getDistrictsByCityCode(c.code).length,
  0,
);
console.log(`✓ Total districts: ${totalDistricts}`);
console.log(`✓ Total neighbourhoods: ${totalNeighbourhoods}`);
console.log(`✓ Written to src/lib/data/turkey-cities.ts`);
console.log(`✓ Written to src/lib/data/turkey-neighbourhoods.ts`);
