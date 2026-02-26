# CLAUDE.md

## Project Overview

Multi-tenant salon management platform with real-time booking, staff scheduling, client management, product inventory, billing, email notifications, analytics reporting, and AI-powered features (photo analysis, virtual try-on, care schedules, design catalog).

## Commands

| Command                              | Description                               |
| ------------------------------------ | ----------------------------------------- |
| `bun install`                        | Install dependencies                      |
| `bun run dev`                        | Start Next.js dev server (localhost:3000) |
| `bunx convex dev`                    | Start Convex backend + type generation    |
| `bun run lint`                       | Run Biome check (linter + formatter)      |
| `bun run format`                     | Format code with Biome                    |
| `bun run build`                      | Production build                          |
| `bun run email:dev`                  | React Email preview server (port 3001)    |
| `bunx shadcn@latest add <component>` | Add shadcn/ui component                   |

> **Note:** Always run `bunx convex dev` in a separate terminal when working with Convex. Schema changes require Convex dev server to be running to regenerate types.

## Tech Stack

- **Frontend:** Next.js 16, React 19, React Compiler, Tailwind CSS v4, shadcn/ui (New York)
- **Backend:** Convex (database, functions, real-time), convex-helpers (triggers, custom functions)
- **Auth:** Better Auth (@convex-dev/better-auth) with Convex adapter
- **Payments:** Polar (@convex-dev/polar for subscriptions + one-time AI credit purchases)
- **Email:** Resend + React Email (transactional emails with JSX templates)
- **AI:** `@convex-dev/agent` (LLM threads), Vercel AI SDK gateway (GPT-4o), `@ai-sdk/fal` (fal.ai image generation)
- **Charts:** recharts (via shadcn ChartContainer)
- **Forms:** TanStack Form + Zod validation
- **Avatars:** `react-nice-avatar@1.5.0` (client-side, no external API). Config stored as `avatarConfig: v.optional(v.any())` in `userProfile`.
- **Tools:** Bun (package manager), Biome (linter/formatter)

## Code Style

- **Bun** over npm/yarn for all commands
- **Biome** for linting/formatting (no ESLint/Prettier)
- **Path alias:** `@/*` → `./src/*`
- **Indentation:** 2 spaces
- **Terminology:** Code uses `organization`, UI uses `salon`, architecture uses `tenant`

## Critical Rules

- Always use custom wrappers from `convex/lib/functions.ts` — never raw `query()`/`mutation()`
- All queries/mutations must have `returns:` validators
- `orgQuery`/`orgMutation` auto-inject `organizationId` — don't redeclare in handler args
- Don't use `useMemo`/`useCallback`/`React.memo` — React Compiler handles it
- No `tailwind.config.js` — all config in CSS (`@theme`, `@utility`)
- Actions can't access `ctx.db` — use `ctx.runQuery`/`ctx.runMutation` with `internal.*`
- `_generated/` lint errors are expected — ignore them
- Triggers auto-fire on appointment changes — don't manually schedule notification side-effects

## Detailed References

- [Architecture & Key Files](.claude/docs/architecture.md) — directory structure, routes, org context, PRD links
- [Convex Patterns](.claude/docs/convex-patterns.md) — function wrappers, validators, rate limits, error handling
- [Domain Conventions](.claude/docs/domain-conventions.md) — data formats, crons, email, AI module
- [Development Workflow](.claude/docs/development-workflow.md) — setup, new feature checklist, gotchas
