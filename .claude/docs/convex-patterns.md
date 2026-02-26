# Convex Patterns

## Custom Function Wrappers

**Critical:** Always use custom wrappers from `convex/lib/functions.ts` instead of base `query()`/`mutation()`:

| Wrapper                | Auth                   | Context Added                                               | Use Case                              |
| ---------------------- | ---------------------- | ----------------------------------------------------------- | ------------------------------------- |
| `publicQuery`          | None                   | —                                                           | Public data (org info by slug)        |
| `publicMutation`       | None                   | —                                                           | Public operations (booking, slot locks) |
| `authedQuery/Mutation` | Required               | `ctx.user`                                                  | User-scoped data (profile, orgs list) |
| `orgQuery/Mutation`    | Required + membership  | `ctx.user`, `ctx.organizationId`, `ctx.member`, `ctx.staff` | All org-scoped operations             |
| `ownerQuery/Mutation`  | Required + owner       | Same as org + owner role check + `ctx.role`                 | Staff mgmt, settings, billing, reports |
| `superAdminQuery/Mutation` | Required + env email | `ctx.user`, `ctx.isSuperAdmin`                            | Platform admin panel                  |

**Key behavior:**

- `orgQuery`/`orgMutation` **auto-inject** `organizationId` from args — don't redeclare it in handler args
- Membership and role checks are automatic
- All throw structured `ConvexError` with `ErrorCode` on failure
- **Role system:** 2-tier (owner/staff). `ownerQuery`/`ownerMutation` enforce owner role.

**Example:**

```typescript
export const list = orgQuery({
  args: { status: v.optional(staffStatusValidator) },
  returns: v.array(staffDocValidator),
  handler: async (ctx, args) => {
    return ctx.db.query("staff")
      .withIndex("organizationId", (q) => q.eq("organizationId", ctx.organizationId))
      .collect();
  },
});
```

## Return Validators

**All queries/mutations must have `returns:` validators.** Shared validators in `convex/lib/validators.ts`, AI-specific in `convex/lib/aiValidators.ts`. Document validators include `_id` and `_creationTime` system fields.

## Rate Limiting

Rate limits configured in `convex/lib/rateLimits.ts` using `@convex-dev/rate-limiter`. Usage: `await rateLimiter.limit(ctx, "limitName", { key })`.

**Available:** `createInvitation`, `resendInvitation`, `createOrganization`, `addMember`, `createService`, `createCustomer`, `createScheduleOverride`, `createTimeOffRequest`, `createOvertime`, `createBooking`, `cancelBooking`, `rescheduleBooking`, `cancelSubscription`, `suspendOrganization`, `deleteOrganization`, `banUser`, `aiPhotoAnalysis` (5/hr), `aiCareSchedule` (3/hr), `aiVirtualTryOn` (3/hr), `aiCreditPurchase` (5/hr), `aiClaimTestCredits` (3/day)

## Convex Components

Registered in `convex/convex.config.ts`: `@convex-dev/better-auth`, `@convex-dev/polar`, `@convex-dev/rate-limiter`, `@convex-dev/agent`

## Error Handling

Functions throw `ConvexError` with `ErrorCode` enum from `convex/lib/functions.ts`:
`UNAUTHENTICATED`, `FORBIDDEN`, `OWNER_REQUIRED`, `SUPER_ADMIN_REQUIRED`, `NOT_FOUND`, `ALREADY_EXISTS`, `VALIDATION_ERROR`, `INVALID_INPUT`, `RATE_LIMITED`, `INTERNAL_ERROR`

## Convex Gotchas

- Run `bunx convex dev` after schema changes (types won't update otherwise)
- Use `ctx.db` in queries/mutations only, not in actions
- Actions can't access `ctx.db` — use `ctx.runQuery(internal.xxx)` / `ctx.runMutation(internal.xxx)`
- Import `internalQuery` from `"./_generated/server"` directly (not from `./lib/functions`)
- Avoid N+1 queries: use `getAll()` from `convex-helpers/server/relationships` for batch fetches, or index range queries with pre-fetch lookups into Maps
- **Triggers:** `convex/lib/triggers.ts` auto-fires side effects on appointment changes. All mutations use `triggerMutation` base.
