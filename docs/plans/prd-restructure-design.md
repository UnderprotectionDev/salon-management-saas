# PRD Documentation Restructure Design

**Date:** 2026-02-06
**Status:** ✅ Implemented
**Author:** Claude Code (with user approval)

## Problem Statement

The PRD documentation structure in `docs/prd/` had become overly complex with 19 markdown files across 4 nested folders (03-features/, 04-technical/, 05-ux-ui/, appendix/). This made navigation difficult for both AI assistants (Claude) and human developers.

**Previous structure:**
```
docs/prd/
├── 01-product-overview.md
├── 02-user-stories.md
├── 03-features/           (5 files)
├── 04-technical/          (5 files)
├── 05-ux-ui/              (2 files)
├── 06-implementation-roadmap.md
├── appendix/              (3 files)
└── README.md
```

**Issues:**
- Deep nesting (max 2 levels)
- Fragmented information
- Difficult for AI to load full context
- Hard to maintain cross-references
- Redundant content across files

## Solution: Ultra-Flat Structure (Seçenek B)

Consolidated 19 files into 8 comprehensive files with AI-optimized navigation:

```
docs/prd/
├── README.md                    (~150 lines)  ← Navigation hub
├── product-overview.md          (~1,050 lines) ← Vision + User stories + Edge cases
├── database-schema.md           (~1,800 lines) ← Complete Convex schema
├── api-reference.md             (~3,000 lines) ← API contracts + Security
├── system-architecture.md       (~1,400 lines) ← Architecture + File structure
├── features.md                  (~4,100 lines) ← All 5 feature specs
├── design-system.md             (~1,670 lines) ← UI + User flows
└── glossary.md                  (~360 lines)   ← Terminology
```

## Design Decisions

### 1. Flatten Folder Structure

**Rationale:** Eliminate nested folders for faster AI navigation. All PRD files live directly in `docs/prd/` with no subdirectories.

**Before:** `docs/prd/04-technical/convex-schema.md`
**After:** `docs/prd/database-schema.md`

### 2. Split Technical Docs into 3 Files

Instead of one massive `technical-reference.md` (~5,200 lines), split into:
- `database-schema.md` (~1,800 lines) - Schema + relationships
- `api-reference.md` (~3,000 lines) - Function signatures + validation
- `system-architecture.md` (~1,400 lines) - Architecture + security + file structure

**Rationale:** Balanced file sizes (no file exceeds 4,200 lines), clear separation of concerns, easier to load specific context.

### 3. Consolidate Related Content

- **product-overview.md**: Merged product vision + user stories + edge cases + future roadmap
- **features.md**: All 5 feature specifications in one file
- **design-system.md**: UI design system + user flows + accessibility

**Rationale:** Keep related content together. A developer working on features needs all feature specs in one place.

### 4. Navigation via Anchors

Every large file includes:
- Table of contents with anchor links
- Section anchors (`{#section-name}`)
- Cross-references to related docs

**Example:**
```markdown
## Quick Navigation

- [Core Tables](#core-tables) - Organization, members, staff
- [Services](#services-tables) - Service catalog
- [Schedule Management](#schedule-management-tables) - Overrides, time-off

## See Also

- [API Reference](./api-reference.md) - Function signatures
- [System Architecture](./system-architecture.md) - Multi-tenancy
```

### 5. README as Navigation Hub

`docs/prd/README.md` serves as the entry point with:
- Quick links to all 8 files
- Tech stack summary
- Current sprint status
- Priority map

## Implementation

### Phase 1: Create New Structure ✅

1. Created consolidated files:
   - `README.md` - Navigation hub
   - `product-overview.md` - Vision + stories + edge cases
   - `glossary.md` - Copied from appendix
   - `database-schema.md` - Full schema with examples
   - `system-architecture.md` - Architecture + file hierarchy + security
   - `api-reference.md` - Complete API contracts
   - `features.md` - All 5 feature specs merged
   - `design-system.md` - UI + user flows merged

### Phase 2: Update References ✅

1. Updated `CLAUDE.md` documentation links to new structure
2. Preserved all cross-references and maintained link integrity

### Phase 3: Clean Up ✅

1. Removed old structure:
   - Deleted `01-product-overview.md`, `02-user-stories.md`
   - Deleted `03-features/` folder (5 files)
   - Deleted `04-technical/` folder (5 files)
   - Deleted `05-ux-ui/` folder (2 files)
   - Deleted `06-implementation-roadmap.md` (covered by milestones/)
   - Deleted `appendix/` folder (3 files)

2. Moved `implementation-roadmap.md` content to `docs/milestones/README.md`

## Results

### Before (19 files + 4 folders)
```
Total: ~14,600 lines across 19 files
Max depth: 2 levels (prd/04-technical/file.md)
Largest file: 2,333 lines (api-contracts.md)
```

### After (8 files, flat structure)
```
Total: ~13,530 lines across 8 files
Max depth: 1 level (prd/file.md)
Largest file: 4,100 lines (features.md)
File sizes: Balanced (150-4,100 lines)
```

### Key Improvements

1. **AI Navigation:** ✅ Claude can load full context faster with fewer file reads
2. **Human Readability:** ✅ Clear file names, no deep nesting
3. **Maintainability:** ✅ Fewer cross-file references to maintain
4. **Discoverability:** ✅ README.md as single entry point
5. **File Sizes:** ✅ Balanced (no mega-files, no micro-files)

## Migration Impact

### CLAUDE.md Updates

Changed documentation links from:
```markdown
- [System Architecture](docs/prd/04-technical/architecture.md)
- [Convex Schema](docs/prd/04-technical/convex-schema.md)
- [API Contracts](docs/prd/04-technical/api-contracts.md)
```

To:
```markdown
- [System Architecture](docs/prd/system-architecture.md)
- [Database Schema](docs/prd/database-schema.md)
- [API Reference](docs/prd/api-reference.md)
```

### Git History

Old files deleted but preserved in git history. To access old structure:
```bash
git checkout HEAD~1 docs/prd/
```

## Lessons Learned

### What Worked Well

1. **User consultation first:** Asked user preferences before designing
2. **Iterative approach:** Created files in batches, verified structure
3. **Preserved content:** No information was lost in consolidation
4. **Clear naming:** Descriptive file names (database-schema.md vs convex-schema.md)

### What Could Be Improved

1. **Agent coordination:** Initial agent wrote files to wrong locations (docs/ root instead of docs/prd/)
   - Solution: Explicit file paths in agent prompts
2. **Token management:** Large file creation hit token limits
   - Solution: Used multiple agent invocations

## Future Considerations

### If Documentation Grows Further

If any file exceeds 5,000 lines, consider:
1. Split features.md by priority (features-p0.md, features-p1.md)
2. Split api-reference.md by domain (api-auth.md, api-booking.md, api-staff.md)

### Keep Flat

Don't reintroduce nested folders. If categorization is needed:
- Use filename prefixes: `01-readme.md`, `02-product.md`, `03-database.md`
- OR use emoji/icons in README for visual grouping

## Approval

**User Decision:** Seçenek B (3'e Bölme)
- Main goal: AI/Claude navigation optimization
- Active docs: Technical (schema, API, architecture) + Implementation (milestones)
- Technical specs: Consolidated but split for balance

**User Instruction:** "Tamam bana sormadan tamamla en son ben kontrol ederim"

## Conclusion

Successfully restructured PRD from 19 files/4 folders to 8 flat files. Achieved AI-optimized navigation while maintaining human readability. All content preserved, cross-references updated, old structure cleanly removed.

**Status:** ✅ Complete and ready for review
