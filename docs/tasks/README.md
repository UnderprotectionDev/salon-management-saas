# Sprint PRDs - Ralph TUI Compatible

This directory contains detailed Product Requirements Documents for each sprint, formatted for use with [ralph-tui](https://github.com/ralphwbrown/ralph-tui).

## Sprint Overview

| Sprint | Name | User Stories | Complexity | Status |
|--------|------|-------------|------------|--------|
| 1 | Multi-Tenant Foundation | US-001, US-030, US-001.1-001.13 | High | ✅ Completed |
| 2 | Services, Staff & Customers | US-002, US-003, US-006, US-030 | Medium-High | 📋 Pending |
| 3 | Booking Engine - Core | US-020, US-021, US-022, US-031 | High | 📋 Pending |
| 4 | Booking Operations | US-010-015, US-025 | High | 📋 Pending |
| 5 | Dashboard & Calendar | US-004, US-010 | Medium-High | 📋 Pending |
| 6 | SaaS Billing (Polar.sh) | US-040-045 | Medium | 📋 Pending |
| 7 | Email Notifications (Resend) | US-023, US-024 | Low-Medium | 📋 Pending |
| 8 | Reports & Analytics | US-005, US-032 | Medium | 📋 Pending |
| 9 | Customer Portal | US-026, US-027 | Medium | 📋 Pending |

## Using Sprint PRDs

### Direct Reading

Each PRD is a standalone Markdown file with complete implementation details:

```bash
# View a sprint PRD
cat sprint-02-services-staff-customers.md
```

### With Ralph-TUI

All PRDs are wrapped in `[PRD]...[/PRD]` markers for ralph-tui compatibility:

```bash
# Generate task JSON from PRD
ralph-tui-create-json sprint-02-services-staff-customers.md

# Create issues on GitHub/Linear/etc
ralph-tui-create-beads sprint-02-services-staff-customers.md
```

## PRD Structure

Each sprint PRD follows this format:

- **Overview**: Sprint goals and problem statement
- **Goals**: Specific, measurable objectives
- **Quality Gates**: Backend, Frontend, and Full-Stack testing requirements
- **Dependencies**: Required and blocked sprints
- **User Stories**: Detailed stories with acceptance criteria, complexity, and type
- **Functional Requirements**: System-level specifications
- **Non-Goals**: Explicitly out of scope items
- **Technical Considerations**: Architecture, performance, security notes
- **Success Metrics**: Completion criteria and performance targets
- **Implementation Order**: Suggested phase-by-phase approach
- **Open Questions**: Clarifications and decision points

## Quality Gates by Story Type

### Backend Stories (Convex)
- `bunx convex dev` - Type generation and schema validation
- `bun run lint` - Biome linting (filter out `_generated/` errors)
- All mutations use custom wrappers from `convex/lib/functions.ts`
- All functions have `returns:` validators

### Frontend Stories (React/Next.js)
- `bun run lint` - Biome linting
- `bun run build` - Production build verification
- Manual verification in browser (`bun run dev`)
- All forms use TanStack Form + Zod validation

### Full-Stack Stories
- All backend quality gates
- All frontend quality gates
- End-to-end flow verification

## Next Sprint

**Start with Sprint 2: Services, Staff & Customers**

This sprint establishes the core data entities (services, staff, customers) required for the booking engine.

See: [sprint-02-services-staff-customers.md](./sprint-02-services-staff-customers.md)

## Architecture Notes

All sprint PRDs reference the existing codebase architecture:

- **Custom Function Wrappers**: Always use `orgQuery`, `adminMutation`, etc. from `convex/lib/functions.ts`
- **Return Validators**: All queries/mutations must have `returns:` validators in `convex/lib/validators.ts`
- **Rate Limiting**: Use `convex/lib/rateLimits.ts` for creation operations
- **Multi-Tenancy**: All queries automatically filtered by `organizationId` via RLS

## Complexity Levels

- **Low**: Epic-style, simple CRUD operations (1-2 hours implementation)
- **Low-Medium**: Simple features with minor business logic (2-3 hours implementation)
- **Medium**: Feature-level with moderate logic (2-4 hours implementation)
- **Medium-High**: Complex features with significant logic (4-6 hours implementation)
- **High**: Complex algorithms or multi-step flows (4-8 hours implementation)

## Contributing

When completing a sprint:

1. Mark user stories as complete in the PRD
2. Update the roadmap in `docs/prd/06-implementation-roadmap.md`
3. Update the main README in `docs/prd/README.md`
4. Document any architectural decisions or deviations
