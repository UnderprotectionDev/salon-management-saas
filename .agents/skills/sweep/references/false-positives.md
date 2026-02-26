# Sweep False Positives Catalog Reference

Patterns commonly misdetected as "unused" - prevent accidental deletion.

---

## Dynamic Import / Lazy Loading

**Commonly misdetected patterns:**
```typescript
// Dynamic imports - difficult to detect via static analysis
const module = await import(`./plugins/${name}`);

// React lazy loading
const LazyComponent = React.lazy(() => import('./HeavyComponent'));

// Webpack magic comments
import(/* webpackChunkName: "feature" */ './feature');

// Conditional imports
if (process.env.NODE_ENV === 'development') {
  require('./devTools');
}
```

**Verification methods:**
- Search for `import(` / `require(` patterns for dynamic imports
- Check Webpack/Vite config for `splitChunks` / `manualChunks`
- Search for module name references in string literals

---

## Framework Convention Files

**Files auto-recognized by frameworks:**

| Framework | Convention Files | Why Detection Fails |
|-----------|-----------------|---------------------|
| Next.js | `pages/**/*`, `app/**/*` | Filename = route |
| Nuxt | `pages/**/*`, `components/**/*` | Auto-import feature |
| Remix | `routes/**/*`, `root.tsx` | File-based routing |
| Gatsby | `src/pages/*`, `gatsby-*.js` | Config file conventions |
| Jest | `**/*.test.ts`, `**/*.spec.ts` | Test runner auto-detection |
| Storybook | `**/*.stories.tsx` | Storybook auto-detection |

**Verification methods:**
- Check framework documentation for convention files
- Check config files (next.config.js, etc.) for custom paths

---

## Build-time Only Dependencies

**Files used only at build time:**
```
- babel.config.js      → Referenced by Babel plugins
- webpack.config.js    → Referenced by loaders/plugins
- postcss.config.js    → Referenced by PostCSS
- tailwind.config.js   → Referenced by Tailwind
- vite.config.ts       → Referenced by Vite plugins
```

**Verification methods:**
- Check `require()` / `import` inside config files
- Review `devDependencies` package configurations

---

## Magic String References

**Files referenced as strings:**
```typescript
// Class name references
const icon = `icon-${name}`;          // e.g., icon-home.svg

// Data-driven imports
const themes = ['light', 'dark'];
themes.forEach(t => import(`./themes/${t}`));

// Config file references
// package.json: "main": "./dist/index.js"
// tsconfig.json: "paths": { "@/*": ["./src/*"] }
```

**Verification methods:**
- Search for template literal reference patterns
- Check path references in config files

---

## Verification Checklist

Confirm the following for each deletion candidate:

```
□ Searched with grep -r "filename (no extension)" .
□ Confirmed no dynamic import patterns
□ Confirmed not a framework convention file
□ Confirmed no build config references
□ Confirmed not in package.json main/exports/bin
□ Confirmed not in tsconfig.json paths
□ Confirmed not referenced in .storybook/main.js
□ Confirmed not referenced in jest.config.js
```

---

## False Positive Risk Matrix

| Pattern | False Positive Risk | Countermeasure |
|---------|---------------------|----------------|
| Files in `pages/` | Very High | Framework check required |
| `*.config.*` | High | Build tool verification |
| `*.stories.*` | High | Storybook verification |
| `*.test.*` / `*.spec.*` | High | Test runner verification |
| `hooks/use*.ts` | Medium | Check React hooks usage |
| `utils/*.ts` | Medium | Check dynamic imports |
| `assets/*` | Medium | Check CSS/HTML references |
| `types/*.d.ts` | Low | Type definitions may not need references |
