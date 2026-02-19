/**
 * Generates src/lib/data/turkey-cities.ts from the turkey-neighbourhoods package.
 * Run with: bun scripts/generate-turkey-cities.ts
 *
 * Data source: https://github.com/muratgozel/turkey-neighbourhoods
 * License: MIT
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { getCities, getDistrictsByCityCode } from "turkey-neighbourhoods";

const cities = getCities(); // [{code: "01", name: "Adana"}, ...]

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

const output = lines.join("\n");
const outPath = join(import.meta.dir, "../src/lib/data/turkey-cities.ts");
writeFileSync(outPath, output, "utf8");

console.log(`✓ Generated ${cities.length} cities`);
const totalDistricts = cities.reduce(
  (sum, c) => sum + getDistrictsByCityCode(c.code).length,
  0,
);
console.log(`✓ Total districts: ${totalDistricts}`);
console.log(`✓ Written to src/lib/data/turkey-cities.ts`);
