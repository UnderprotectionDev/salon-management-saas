#!/usr/bin/env node
/**
 * code-quality-expert - Consolidated Expert Skill
 * Consolidates 1 individual skills
 */

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(`
code-quality-expert - Expert Skill

Usage:
  node main.cjs --list     List consolidated skills
  node main.cjs --help     Show this help

Description:
  Code quality expert including clean code, style guides, and refactoring

Consolidated from: 1 skills
`);
  process.exit(0);
}

if (args.includes("--list")) {
  console.log("Consolidated skills:");
  for (const s of ["code-quality-expert"]) console.log(`  - ${s}`);
  process.exit(0);
}

console.log(
  "code-quality-expert skill loaded. Use with Claude for expert guidance.",
);
