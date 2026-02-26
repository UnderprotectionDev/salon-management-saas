# Development Workflow

## Starting Development

```bash
# Terminal 1: Next.js dev server
bun run dev

# Terminal 2: Convex backend (REQUIRED for type generation)
bunx convex dev
```

## Adding a New Feature

1. Update schema: `convex/schema.ts`
2. Wait for type regeneration (Convex dev server must be running)
3. Create Convex functions using custom wrappers + return validators + rate limiting
4. Create frontend module: `src/modules/[feature]/`
5. Export public API: `src/modules/[feature]/index.ts`

## Critical Gotchas

### Better Auth
- Schema auto-generated: `npx @better-auth/cli generate --output ./convex/betterAuth/schema.ts -y`
- Auth routes in `convex/http.ts` via `authComponent.registerRoutes()`
- Client: `authClient` from `@/lib/auth-client` — Server: helpers from `@/lib/auth-server`

### React Compiler
- Don't use `useMemo`, `useCallback`, `React.memo` — Compiler handles optimization

### Tailwind v4
- No `tailwind.config.js` — all config in CSS (`@theme`, `@utility`)

### Biome Linting
- `_generated/` files have pre-existing errors (auto-generated, ignore them)
- Filter by filename when checking `bun run lint` output

### TanStack Form
- `form.state.values` is NOT reactive — use `form.Subscribe` for reactive UI
- Don't call `form.reset()` during render — use `key={id}` prop to force remount
- Fetch full doc via `useQuery(api.xxx.get)` inside edit dialogs
