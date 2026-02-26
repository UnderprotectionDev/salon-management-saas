# Sweep Cleanup Target Catalog Reference

Systematic identification guide for cleanup candidates.

---

## Dead Code Files

**Indicators:**
- Source files with no imports/requires from other files
- Exported functions/classes with zero external usage
- Test files for deleted source files
- Storybook/documentation for removed components

**Detection Approach:**
1. Build dependency graph from imports/requires
2. Identify nodes with no incoming edges (except entry points)
3. Verify against entry points (main, index, configs)
4. Cross-check with git history (recently removed references?)

**Common Patterns:**
- `*.backup.ts`, `*.old.js` - Explicitly marked old files
- `*.deprecated.*` - Deprecated implementations
- Files in `unused/`, `archive/`, `legacy/` folders
- Components with `// TODO: remove` comments

---

## Orphan Assets

**Indicators:**
- Images/icons not referenced in code or CSS
- Fonts not used in stylesheets
- Static files not served or imported

**Detection Approach:**
1. Scan all asset directories (public/, assets/, static/)
2. Search codebase for references to each filename
3. Check CSS/SCSS for url() references
4. Verify build config includes (webpack, vite, etc.)

**Common Patterns:**
- Duplicate images with different resolutions
- Unused logo variants
- Test/placeholder images left behind
- Downloaded assets never integrated

---

## Unused Dependencies

**Indicators:**
- Packages in package.json not imported anywhere
- devDependencies for removed tooling
- Peer dependencies no longer needed

**Detection Approach:**
1. Parse package.json dependencies
2. Search for import/require of each package
3. Check config files (babel, eslint, etc.) for plugin usage
4. Verify scripts in package.json

**Common Patterns:**
- Old testing libraries after migration
- Build tools from previous setup
- Polyfills for dropped browser support
- Experimental packages never adopted

---

## Build Artifacts & Temp Files

**Indicators:**
- Files matching .gitignore patterns but committed
- Build output in source tree
- Cache files that should be transient

**Detection Approach:**
1. Compare committed files against .gitignore patterns
2. Look for common build output directories
3. Identify cache/temp file patterns

**Common Patterns:**
- `dist/`, `build/`, `out/` accidentally committed
- `.cache/`, `node_modules/` (partial commits)
- `*.log`, `*.tmp`, `*.bak` files
- IDE-specific files (`.idea/`, `.vscode/` settings)

---

## Duplicate Files

**Indicators:**
- Files with identical content but different names
- Copy-pasted utilities across directories
- Multiple versions of same library

**Detection Approach:**
1. Calculate file hashes for content comparison
2. Compare file sizes first (optimization)
3. Group files by hash
4. Analyze which copy to keep

**Common Patterns:**
- `utils.ts` duplicated in multiple features
- Vendor files copied instead of npm installed
- Assets with renamed copies

---

## Configuration Remnants

**Indicators:**
- Config files for tools no longer in use
- Environment files for deprecated services
- CI/CD configs for removed workflows

**Detection Approach:**
1. Map config files to their tools
2. Verify tool is still in use (scripts, devDependencies)
3. Check for orphan environment variables

**Common Patterns:**
- `.babelrc` after moving to `babel.config.js`
- Old ESLint configs after migration
- Heroku/Vercel configs for changed platforms
- Docker files for deprecated services
