# Milestone 10: AI Features

**Status:** Pending | **Sub-milestones:** 10A, 10B, 10C | **Stories:** 17

## Goals

- Salon-type-aware AI infrastructure with `salonType` driving feature availability
- Design Catalog: owners upload and categorize designs (nail art, hair styles, makeup)
- Virtual Try-On: customer photo + catalog design → fal.ai inpainting
- Photo Analysis: face/skin/hair/nail profiling via GPT-4o vision + service recommendations
- Multi-Image Analysis, Quick Questions, Try-On Comparison View
- Before/After Public Gallery with owner moderation
- Staff Appointment Prep View
- Credit-based billing (customer + org pools) via Polar one-time checkout
- Care schedule with smart reminders, mood board

## Story Dependency Graph

```
Story 1 (Schema) ──┬── Story 2 (Credits) ──┬── Story 12 (Credit Purchase)
                   │                       ├── Story 17 (Org Credits)
                   │                       └── Story 15 (Care Schedule)
                   ├── Story 3 (Catalog BE) ── Story 5 (Catalog UI) ── Story 10 (Try-On UI)
                   ├── Story 4 (Onboarding + Nav)                            │
                   └── Story 6 (Photo Analysis) ──┬── Story 7 (Multi-Image)  │
                                                  ├── Story 8 (Quick Q)      │
                                                  ├── Story 13 (Mood Board) ── Story 16 (Staff Prep)
                                                  └── Story 9 (Try-On BE) ──┬── Story 10
                                                                            ├── Story 11 (Comparison)
                                                                            └── Story 14 (Gallery)
```

---

## Milestone 10A: AI Infrastructure + Credit System + Design Catalog

### Story 1: Schema + AI Constants + Dependencies

- 7 new tables: `aiCredits`, `aiCreditTransactions`, `aiAnalyses`, `aiSimulations`, `aiCareSchedules`, `aiMoodBoard`, `designCatalog`
- `salonType` multi-select array (34 types) on `organization`
- `convex/lib/aiConstants.ts`: `TRYON_ENABLED_TYPES`, `CREDIT_COSTS`, `QUICK_QUESTIONS_BY_TYPE`
- `CREDIT_COSTS`: photoAnalysisSingle=5, photoAnalysisMulti=8, quickQuestion=2, virtualTryOn=10, careSchedule=2
- Dependencies: `@convex-dev/agent`, `ai`, `@ai-sdk/openai`, `@fal-ai/client`
- Agent component in `convex.config.ts`, agents in `convex/lib/agents.ts`
- 3 rate limits: `aiPhotoAnalysis`, `aiVirtualTryOn`, `aiCreditPurchase`

### Story 2: Credit System Backend

- `convex/aiCredits.ts`: `deductCredits` (atomic check+deduct+log), `refundCredits`, `getBalance`, `getTransactionHistory`
- `purchaseCredits` via Polar one-time checkout (50/$1.99, 200/$5.99, 500/$11.99)
- Rate limit: `aiCreditPurchase` (5/hr)
- Polar webhook triggers credit addition

### Story 3: Design Catalog Backend

- `convex/designCatalog.ts`: CRUD (create, update, setStatus, delete, reorder) + public list queries
- Thumbnail auto-generation via Convex action
- All management via `ownerMutation`, browsing via `publicQuery`

### Story 4: Onboarding salonType + AI Navigation

- Salon type selection in creation form (34 types in 8 categories)
- AI nav item in sidebar, route shells for `/{slug}/ai` and `/{slug}/gallery`
- Module structure: `src/modules/ai/` (customer, organization, staff, components)

### Story 5: Design Catalog Owner UI

- `DesignCatalogManager.tsx`: upload, categorize, drag-to-reorder, activate/deactivate, edit, delete
- Hidden if salonType not in `TRYON_ENABLED_TYPES`

---

## Milestone 10B: Customer AI Features

### Story 6: Photo Analysis Backend + UI

- `convex/aiAnalysis.ts` + `convex/aiActions.tsx` (`runPhotoAnalysis` internalAction)
- GPT-4o vision via `photoAnalysisAgent.generateObject()`, salon-type-specific prompts
- Status flow: pending → processing → completed/failed. Refund on error.
- UI: photo upload, skeleton during processing, profile card on completion, history list

### Story 7: Multi-Image Analysis

- Max photos by type: Hair 3, Nail 2, Makeup 2 (with angle labels)
- Multi-image mode: 8 credits, single GPT-4o call with all images
- `imageStorageIds` array on `aiAnalyses`

### Story 8: Quick Questions Panel

- `QUICK_QUESTIONS_BY_TYPE` (3 per salon type) in `aiConstants.ts`
- `askQuickQuestion` (2cr) → `quickQuestionAgent.generateText()` with analysis context
- Ephemeral response (not persisted), each question asked once

### Story 9: Virtual Try-On Backend

- `convex/aiSimulations.ts`: `createSimulation` (10cr) → `runVirtualTryOn` action
- fal.ai segmentation (region by salonType) → inpainting with catalog/prompt
- Status flow: pending → processing → completed/failed. Refund on error.
- Two modes: `"catalog"` (design reference) and `"prompt"` (free text)

### Story 10: Virtual Try-On UI

- `VirtualTryOnView.tsx`: catalog browse + design select or free prompt mode
- Photo upload, skeleton during processing, blur-to-sharp reveal, before/after slider
- "Save to Mood Board" and "Add to Gallery" (with consent) buttons

### Story 11: Try-On Comparison View

- `TryOnComparisonView.tsx`: select 2-4 results, side-by-side grid with independent sliders
- No backend work — reads existing `aiSimulations` records

### Story 12: Customer Credit Purchase

- `CreditBalance.tsx` (real-time) + `CreditPurchaseDialog.tsx` (3 packages)
- Polar one-time checkout, auto-update on webhook

### Story 13: Mood Board

- `convex/aiMoodBoard.ts`: add/updateNote/remove/list + `listMoodBoardForStaff` (orgQuery)
- `MoodBoardView.tsx`: grid with inline note editing, free (0 credits)

### Story 14: Before/After Public Gallery

- Consent checkbox → `publicConsent: true`, `galleryApprovedByOrg: false` (pending)
- Owner moderation: `GalleryModerationView.tsx`, public gallery page
- No customer PII exposed, free feature

---

## Milestone 10C: Care Schedule + Staff Prep + Org Credits

### Story 15: Personal Care Schedule

- `convex/aiCareSchedules.ts` + `runCareScheduleGeneration` action (2cr org pool)
- `careScheduleAgent.generateObject()` with salon-type prompts and visit history
- Weekly cron sends email reminders for past-due dates
- `CareScheduleView.tsx`: recommendation cards with regenerate option

### Story 16: Staff Appointment Prep View

- `AppointmentPrepView.tsx`: "AI Insights" tab on appointment detail
- Sections: analysis summary, mood board, recent try-ons, staff notes
- No new AI calls — displays existing data only (0 credits)

### Story 17: Organization Credit Management

- `OrgAICreditManager.tsx`: balance, purchase, last 50 transactions (owner only)

---

## Technical Notes

- **Salon Type Routing:** `salonType` drives feature visibility. `TRYON_ENABLED_TYPES = Set(["hair_women", "hair_men", "nail", "makeup", "multi"])`. Prompts vary by type.
- **AI Stack:** `@convex-dev/agent` wraps AI SDK → Vercel AI Gateway → GPT-4o. fal.ai called directly (not through agent/gateway).
- **Credit Costs:** See Story 1 above. Mood board, gallery, comparison, staff prep are free.
- **Packages (USD):** Starter 50cr/$1.99, Popular 200cr/$5.99, Pro 500cr/$11.99
- **Async Pattern:** Mutation creates pending record → `ctx.scheduler.runAfter(0)` → action calls AI → updates status. Real-time via `useQuery`.
- **Error Recovery:** Action catch block calls `refundCredits`, sets status to `"failed"`.
- **Dependencies:** `@convex-dev/agent`, `ai` (v6+), `@ai-sdk/openai`, `@fal-ai/client`

## Functional Requirements

- FR-1: All AI operations credit-gated; fail if insufficient
- FR-2: Credit deduction is atomic (check + deduct + log in single mutation)
- FR-3: Failed actions auto-refund credits
- FR-4: `salonType` determines feature visibility
- FR-5: Try-on only for types in `TRYON_ENABLED_TYPES`
- FR-6: fal.ai segmentation fully automatic (no manual masking)
- FR-7: External AI calls run in Convex actions (`"use node"`)
- FR-8: Real-time status updates via Convex reactivity
- FR-9: Quick question responses are ephemeral (not persisted)
- FR-10: Mood board and gallery are free features
- FR-11: Gallery requires both customer consent and owner approval
- FR-12: Staff prep view makes no new AI calls
- FR-13: Credits purchased via Polar one-time checkout (USD)
- FR-14: Care schedule cron sends weekly email reminders

## Non-Goals

- Interactive AI chat (streaming with Claude), revenue forecasting, post-visit emails
- Voice/video, AR real-time try-on, multi-language AI, custom model training
- AI scheduling optimization, marketing generation, sentiment analysis
- Collaborative mood board, e-commerce for recommendations
- AI no-show prediction, smart staff matching, seasonal analysis, social sharing

---

## Story Summary

| Sub-milestone | Stories | Description |
| ------------- | ------- | ----------- |
| **10A** | 5 | Schema + constants, credits, design catalog, onboarding + nav, catalog UI |
| **10B** | 9 | Photo analysis, multi-image, quick questions, try-on BE/UI, comparison, credit purchase, mood board, gallery |
| **10C** | 3 | Care schedule, staff prep view, org credit management |
| **Total** | **17** | |
