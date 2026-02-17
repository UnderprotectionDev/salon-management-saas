# Milestone 10: AI Features

**Status:** Pending | **Sub-milestones:** 10A, 10B, 10C | **Stories:** 17

## Goals

- Salon-type-aware AI infrastructure with `salonType` field driving which features are enabled
- Design Catalog: salon owners upload and categorize their own designs (nail art, hair styles, makeup looks)
- Virtual Try-On: customer uploads photo, selects design from catalog, fal.ai inpainting overlays it realistically
- AI-powered photo analysis (face shape, skin tone, hair type, nail condition) with salon-type-specific profiling and service recommendations
- Multi-Image Analysis: 2-3 photos from different angles for more accurate results
- Quick Questions: predefined question buttons after analysis, single-turn Q&A without a chat thread
- Try-On Comparison View: side-by-side grid of multiple try-on results, zero extra API cost
- Before/After Public Gallery: customer-consented try-on showcase with owner moderation
- Staff Appointment Prep View: AI summary tab on appointment detail for staff reference
- Token/credit-based billing system for AI operations (separate customer and org pools)
- Credit purchase via Polar one-time checkout — Starter $1.99 / Popular $5.99 / Pro $11.99 (USD)
- Multi-provider AI routing via Vercel AI Gateway (GPT-4o vision, fal.ai image generation)
- AI-powered personal care schedule with smart reminders
- Style history & mood board for saving and sharing favorite looks
- AI-driven product recommendations based on photo analysis results

## Quality Gates

These commands must pass for every story:

- `bun run lint` — Biome lint check
- `bun run build` — TypeScript type check + Next.js production build

For UI stories, additionally:

- Visual verification on dev server (`bun run dev`)

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

## Milestone 10A: AI Infrastructure + Credit System + Design Catalog Backend

### Story 1: Schema + AI Constants + Dependencies Setup

As a developer, I want to set up the database tables, constants, and package dependencies that all AI features will build on, so that subsequent stories have a solid foundation.

**Dependencies:** None (first story)

**Acceptance Criteria:**

- [ ] 7 new tables added to `convex/schema.ts`: `aiCredits`, `aiCreditTransactions`, `aiAnalyses`, `aiSimulations`, `aiCareSchedules`, `aiMoodBoard`, `designCatalog`
- [ ] `salonType` field added to `organization` table: `v.optional(v.union(v.literal("hair"), v.literal("nail"), v.literal("makeup"), v.literal("barber"), v.literal("spa"), v.literal("multi")))`
- [ ] `designCatalog` table includes all fields: `organizationId`, `name`, `category`, `imageStorageId`, `thumbnailStorageId`, `description`, `tags[]`, `salonType`, `status`, `sortOrder`, `createdAt`, `updatedAt`
- [ ] `designCatalog` indexes defined: `by_org` and `by_org_category`
- [ ] `aiSimulations` table includes `simulationType` (`"catalog" | "prompt"`), `designCatalogId` (nullable), `publicConsent`, `galleryApprovedByOrg` fields
- [ ] `convex/lib/aiConstants.ts` created with exports: `TRYON_ENABLED_TYPES`, `CREDIT_COSTS`, `SALON_TYPE_TRYON_MODE_MAP`, `QUICK_QUESTIONS_BY_TYPE`
- [ ] `CREDIT_COSTS` constants: `{ photoAnalysisSingle: 5, photoAnalysisMulti: 8, quickQuestion: 2, virtualTryOn: 10, careSchedule: 2 }`
- [ ] Dependencies installed: `bun add @convex-dev/agent ai @ai-sdk/openai @fal-ai/client`
- [ ] Agent component registered in `convex/convex.config.ts` via `app.use(agent)` alongside existing betterAuth, polar, rateLimiter
- [ ] `bunx convex dev` runs successfully to generate types for the agent component
- [ ] `convex/lib/agents.ts` created with specialized agent definitions: `photoAnalysisAgent`, `quickQuestionAgent`, `careScheduleAgent`
- [ ] Each agent defined as `new Agent(components.agent, { name, languageModel: openai.chat("gpt-4o"), instructions, usageHandler })`
- [ ] `usageHandler` callback logs token usage per LLM call and integrates with the credit transaction system
- [ ] `AI_GATEWAY_API_KEY` and `FAL_KEY` env vars documented in `.env.local.example`
- [ ] 3 new rate limits added to `convex/lib/rateLimits.ts`: `aiPhotoAnalysis`, `aiVirtualTryOn`, `aiCreditPurchase`
- [ ] Return type validators added to `convex/lib/validators.ts` for new tables

### Story 2: Credit System Backend

As a salon owner and customer, I want to purchase, spend, and automatically receive refunds for AI credits, so that there is a fair and reliable billing system.

**Dependencies:** Story 1

**Acceptance Criteria:**

- [ ] `convex/aiCredits.ts` created
- [ ] `deductCredits` internalMutation: atomic balance check + deduct + transaction log in a single mutation
- [ ] Throws `ConvexError` with `ErrorCode.VALIDATION_ERROR` if balance is insufficient, message: "Insufficient credits"
- [ ] `purchaseCredits` orgMutation: initiates Polar one-time checkout (50/$1.99, 200/$5.99, 500/$11.99 packages)
- [ ] `refundCredits` internalMutation: restores balance + records `type: "refund"` transaction
- [ ] `getBalance` orgQuery: returns current balance for customer or org
- [ ] `getTransactionHistory` orgQuery: returns last N transactions with purchase/usage/refund filtering
- [ ] `aiCreditTransactions` records include `type`, `amount`, `featureType`, `referenceId`, `createdAt`
- [ ] Rate limit applied: `aiCreditPurchase` — 5 per hour
- [ ] Polar webhook handler: triggers `purchaseCredits` internalMutation on successful payment
- [ ] All mutations include `returns:` validator
- [ ] All mutations use appropriate wrappers (`orgMutation` or `internalMutation`)

### Story 3: Design Catalog Backend

As a salon owner, I want to upload, categorize, and manage designs in my catalog, so that customers can browse and select designs for virtual try-on.

**Dependencies:** Story 1

**Acceptance Criteria:**

- [ ] `convex/designCatalog.ts` created
- [ ] `create` ownerMutation: accepts name, category, imageStorageId, thumbnailStorageId, description, tags, salonType
- [ ] `update` ownerMutation: updates existing record
- [ ] `setStatus` ownerMutation: toggles between `active`/`inactive`
- [ ] `delete` ownerMutation: hard deletes record
- [ ] `reorder` ownerMutation: batch updates `sortOrder` values
- [ ] `listByOrg` publicQuery: returns active records sorted by `sortOrder` (customer-facing)
- [ ] `listByCategory` publicQuery: returns active records for a given category
- [ ] `listAllByOrg` ownerQuery: returns all records including inactive (owner management)
- [ ] Thumbnail auto-generation on upload via Convex action
- [ ] All functions include `returns:` validator
- [ ] All mutations use `ownerMutation` wrapper

### Story 4: Onboarding salonType + AI Navigation Scaffolding

As a salon owner, I want to select my salon type during creation, so that AI features activate correctly for my salon type. Route scaffolding for AI pages must also be established.

**Dependencies:** Story 1

**Acceptance Criteria:**

- [ ] "Salon Type" selection step added to salon creation form
- [ ] 6 options: Hair Salon, Nail Salon, Makeup Studio, Barber, Spa, Multi-Service
- [ ] Selection saved to `organization.salonType`
- [ ] Existing salons keep `salonType` as optional (backward compatible)
- [ ] salonType editable in Settings page (ownerMutation)
- [ ] "AI Insights" nav item added to sidebar (Sparkles icon), visible only in authenticated org pages
- [ ] `src/app/[slug]/(public)/ai/page.tsx` route shell created (empty page with tabs placeholder)
- [ ] `src/app/[slug]/(public)/gallery/page.tsx` route shell created (empty page)
- [ ] `src/modules/ai/` module directory structure created: `customer/`, `organization/`, `staff/`, `components/`
- [ ] `src/modules/ai/index.ts` public API file created
- [ ] AI Insights sidebar link hidden or shows "Set salon type" warning for orgs without salonType

### Story 5: Design Catalog Owner UI

As a salon owner, I want to manage my design catalog through a visual interface, so that I can upload, categorize, reorder, and toggle designs.

**Dependencies:** Story 3, Story 4

**Acceptance Criteria:**

- [ ] `src/modules/ai/organization/components/DesignCatalogManager.tsx` created
- [ ] Image upload via file selection or drag-drop (Convex file storage)
- [ ] Upload form includes name, category, description, tags fields
- [ ] Category-based filter tabs
- [ ] Thumbnail grid view: each card shows name, category, status
- [ ] Drag-to-reorder changes sort order (triggers reorder mutation)
- [ ] Activate/deactivate toggle on each card
- [ ] Edit and delete buttons on each card
- [ ] Delete shows confirmation dialog
- [ ] UI entirely hidden if `salonType` doesn't support try-on (`barber`, `spa`)
- [ ] Empty state: "Add your first design" message with upload button
- [ ] Accessible as "Design Catalog" tab within AI Insights page

---

## Milestone 10B: Customer AI Features

### Story 6: Photo Analysis Backend + UI

As a customer, I want to upload a selfie and receive a salon-type-specific professional analysis, so that I can learn about my face shape, skin tone, or hair type and see matching service recommendations.

**Dependencies:** Story 1, Story 2

**Acceptance Criteria:**

- [ ] `convex/aiAnalysis.ts` created
- [ ] `createAnalysis` publicMutation: accepts customerId, organizationId, imageStorageId; creates record with status `"pending"`; calls `deductCredits` (5 cr)
- [ ] `convex/aiActions.tsx` contains `runPhotoAnalysis` internalAction (`"use node"`)
- [ ] Action uses `photoAnalysisAgent.generateObject()` to call GPT-4o vision via AI Gateway
- [ ] Prompt branches by salonType:
  - Hair: face shape, symmetry, hair type, color, density, condition
  - Nail: nail shape, condition, hand skin tone
  - Makeup: face shape, skin tone (Fitzpatrick), undertone, eye color
- [ ] Structured output defined via zod schema: `analysisResult` object (type-specific sections + recommendedServices[] + careTips[] + productRecommendations[])
- [ ] `recommendedServices` matched against salon's active service catalog
- [ ] `productRecommendations` includes salon-type-specific general product suggestions (no extra credit)
- [ ] Status updates: `"pending"` → `"processing"` → `"completed"` or `"failed"`
- [ ] On error: catch block calls `refundCredits` internalMutation, status set to `"failed"`
- [ ] Rate limit applied: `aiPhotoAnalysis`
- [ ] `getAnalysis` publicQuery: returns single record (for real-time status)
- [ ] `listAnalysesByCustomer` publicQuery: returns customer's past analyses
- [ ] `src/modules/ai/customer/components/PhotoAnalysisView.tsx` created
- [ ] UI: photo upload area (file input + preview)
- [ ] UI: "Analyze" button — triggers mutation; shows error toast if credits insufficient
- [ ] UI: skeleton + pulse animation during pending/processing
- [ ] UI: profile card on completion showing analysis results, recommended services, care tips, product recommendations
- [ ] UI: error message + "Try again" button on failure
- [ ] Analysis history list for accessing previous analyses

### Story 7: Multi-Image Analysis

As a customer, I want to upload photos from multiple angles for a more accurate analysis, so that details a single selfie can't capture are also evaluated.

**Dependencies:** Story 6

**Acceptance Criteria:**

- [ ] "Add another angle" button appears after first photo upload in PhotoAnalysisView
- [ ] Max photo count by salon type: Hair 3 (front+side+back), Nail 2 (both hands), Makeup 2 (front+profile)
- [ ] Angle label shown for each photo (e.g. "Front", "Side", "Back")
- [ ] Credit cost auto-updates when multiple photos selected: Hair 8 cr, Nail 7 cr, Makeup 7 cr
- [ ] All images sent in a single GPT-4o multi-image API call (multiple `image` parts in `messages[].content`)
- [ ] Prompt includes additional instructions in multi-image mode: "Analyze all provided angles for comprehensive assessment"
- [ ] Single-image mode continues to work at 5 credits
- [ ] `aiAnalyses` record uses `imageStorageIds: Id<"_storage">[]` (array instead of single)
- [ ] All photo previews shown in UI when multi-image is selected

### Story 8: Quick Questions Panel

As a customer, I want to ask predefined follow-up questions after seeing my analysis, so that I can get specific advice without starting a full chat.

**Dependencies:** Story 6

**Acceptance Criteria:**

- [ ] `QUICK_QUESTIONS_BY_TYPE` defined in `convex/lib/aiConstants.ts`:
  - Hair: "Best cut for my face shape?", "Color recommendations?", "Home care routine?"
  - Nail: "Best nail shape for my hands?", "Strengthening tips?", "Polish color suggestions?"
  - Makeup: "Foundation match advice?", "Eye shape-based looks?", "Skincare suggestions?"
- [ ] `askQuickQuestion` publicMutation in `convex/aiAnalysis.ts`: accepts analysisId + questionKey; calls `deductCredits` (2 cr)
- [ ] `runQuickQuestion` internalAction: uses `quickQuestionAgent.generateText()` with stored `aiAnalyses.result` as context + selected question
- [ ] Response is not persisted — ephemeral display only; disappears if user leaves page
- [ ] Credits refunded on error
- [ ] `src/modules/ai/customer/components/QuickQuestionsPanel.tsx` created
- [ ] Salon-type-specific question buttons displayed below analysis result card
- [ ] Loading state on button tap; answer shown as text below the button when ready
- [ ] Each question can only be asked once (button disabled after answer is shown)
- [ ] All buttons disabled with "Buy credits" link if credits are insufficient

### Story 9: Virtual Try-On Backend

As a developer, I want to build the backend pipeline that overlays a catalog design onto a customer's photo using fal.ai segmentation + inpainting, so that virtual try-on works end to end.

**Dependencies:** Story 1, Story 2, Story 3

**Acceptance Criteria:**

- [ ] `convex/aiSimulations.ts` created
- [ ] `createSimulation` publicMutation: accepts customerId, organizationId, imageStorageId, simulationType (`"catalog"` | `"prompt"`), designCatalogId (nullable), promptText (nullable)
- [ ] Mutation calls `deductCredits` (10 cr), creates record with status `"pending"`
- [ ] `runVirtualTryOn` action in `convex/aiActions.tsx`
- [ ] Action reads region mode from `aiConstants.ts` based on salonType (nail → fingertip, hair → hair, makeup → face)
- [ ] Step 1: fal.ai segmentation endpoint receives photo, produces region mask based on salon type
- [ ] Step 2: mask + original photo + catalog reference image (or prompt) sent to fal.ai inpainting endpoint
- [ ] Result image stored in Convex file storage; `resultImageStorageId` updated
- [ ] Status flow: `"pending"` → `"processing"` → `"completed"` or `"failed"`
- [ ] On error: catch block calls `refundCredits`, status set to `"failed"` with error message
- [ ] `getSimulation` publicQuery: returns single record (for real-time status)
- [ ] `listSimulationsByCustomer` publicQuery: returns customer's past try-ons
- [ ] Rate limit applied: `aiVirtualTryOn`
- [ ] `simulationType: "prompt"` mode: designCatalogId is null, `promptText` used as inpainting prompt
- [ ] `simulationType: "catalog"` mode: image fetched from designCatalogId, used as reference image

### Story 10: Virtual Try-On UI

As a customer, I want to browse the salon's design catalog, select a design, and see how it would look on me, so that I can try styles before booking.

**Dependencies:** Story 5, Story 9

**Acceptance Criteria:**

- [ ] `src/modules/ai/customer/components/VirtualTryOnView.tsx` created
- [ ] "Try On" tab visible on `/{slug}/ai` page (only if salonType supports try-on: hair, nail, makeup, multi)
- [ ] Tab entirely hidden for barber and spa salon types
- [ ] Catalog browse: category filter tabs + thumbnail grid
- [ ] Design selection: tapping a card highlights it as selected
- [ ] "Free prompt" mode: toggle switches to free text input
- [ ] Photo upload area with salon-type-appropriate hint ("Upload a photo of your hand" / "face" / "hair")
- [ ] "Try On" button: triggers mutation; error toast if credits insufficient
- [ ] Skeleton placeholder with pulse animation during processing
- [ ] Blur-to-sharp reveal animation on completion (CSS transition, 1s), then before/after slider
- [ ] Before/after slider: original photo left, result right, draggable divider
- [ ] "Save to Mood Board" button on result
- [ ] "Add to Gallery" button on result (with consent checkbox)
- [ ] Error message + "Try again" button on failure
- [ ] Try-on history: list of previous results

### Story 11: Try-On Comparison View

As a customer, I want to compare multiple try-on results side by side, so that I can more easily decide which style I prefer.

**Dependencies:** Story 10

**Acceptance Criteria:**

- [ ] `src/modules/ai/customer/components/TryOnComparisonView.tsx` created
- [ ] "Compare" button visible in try-on history (requires at least 2 completed results)
- [ ] User selects 2-4 results via checkboxes
- [ ] Grid layout: side-by-side for 2, 2x2 grid for 3-4
- [ ] Each cell has an independent before/after slider
- [ ] "Set as Favorite" button in each cell — saves to Mood Board
- [ ] Exit button to leave comparison view
- [ ] No additional backend work — reads existing `aiSimulations` records
- [ ] Responsive: vertical stack on mobile, grid on desktop

### Story 12: Customer Credit Purchase

As a customer, I want to buy AI credits and see my balance, so that I can use photo analysis and try-on features.

**Dependencies:** Story 2

**Acceptance Criteria:**

- [ ] `src/modules/ai/components/CreditBalance.tsx` created
- [ ] Current credit balance shown in AI page header (real-time via `useQuery`)
- [ ] "No credits" warning + highlighted purchase button when balance is 0
- [ ] `src/modules/ai/components/CreditPurchaseDialog.tsx` created
- [ ] 3 package cards: Starter (50 cr / $1.99), Popular (200 cr / $5.99), Pro (500 cr / $11.99)
- [ ] Popular package highlighted with "Best Value" badge
- [ ] Clicking "Purchase" initiates Polar one-time checkout
- [ ] Balance auto-updates after Polar checkout completes (webhook → purchaseCredits)
- [ ] Transaction history tab: purchases, usage, refunds list (date, type, amount, feature name)
- [ ] Informative error message on rate limit exceeded

### Story 13: Mood Board

As a customer, I want to save analysis results and try-on looks with notes, so that I can show my preferences to staff during appointments.

**Dependencies:** Story 1, Story 6

**Acceptance Criteria:**

- [ ] `convex/aiMoodBoard.ts` created
- [ ] `addToMoodBoard` publicMutation: accepts customerId, organizationId, imageStorageId, source (`"analysis"` | `"tryon"`), designCatalogId (nullable), note (optional)
- [ ] `updateNote` publicMutation: updates an existing mood board item's note
- [ ] `removeFromMoodBoard` publicMutation: deletes item
- [ ] `listMoodBoard` publicQuery: returns all saved items for a customer (newest first)
- [ ] `listMoodBoardForStaff` orgQuery: returns a specific customer's mood board for staff
- [ ] `src/modules/ai/customer/components/MoodBoardView.tsx` created
- [ ] "My Styles" tab visible on `/{slug}/ai` page
- [ ] Grid view: each card shows image + note + source label ("From Analysis" / "From Try-On")
- [ ] Inline note editing on each card
- [ ] Delete button + confirmation dialog on each card
- [ ] Empty state: "Save your first style from an analysis or try-on"
- [ ] Zero credit cost — saving is free
- [ ] Mood board viewable by staff (detailed in Story 16)

### Story 14: Before/After Public Gallery

As a customer, I want to share my try-on result on the salon's public gallery; as a salon owner, I want to moderate these submissions, so that a salon portfolio is built.

**Dependencies:** Story 9, Story 10

**Acceptance Criteria:**

- [ ] "Add to Gallery" button on try-on result screen
- [ ] Explicit consent checkbox: "I consent to share this look publicly on the salon's gallery"
- [ ] Button disabled until checkbox is checked
- [ ] Clicking sets `publicConsent: true` on `aiSimulations` record, `galleryApprovedByOrg: false` (pending moderation)
- [ ] `submitToGallery` publicMutation added to `convex/aiSimulations.ts`
- [ ] `approveGalleryItem` / `rejectGalleryItem` ownerMutations added
- [ ] `listGalleryPending` ownerQuery: returns submissions awaiting approval
- [ ] `listGalleryApproved` publicQuery: returns approved submissions (newest first)
- [ ] `src/modules/ai/organization/components/GalleryModerationView.tsx` created
- [ ] Owner moderation panel: list of pending try-ons with before/after preview + Approve/Reject buttons
- [ ] `src/app/[slug]/(public)/gallery/page.tsx` gallery page created
- [ ] Public gallery: grid of approved try-ons, each card showing design name + salon type label
- [ ] No customer PII exposed (no names or contact info)
- [ ] Zero credit cost — submitting and viewing is free
- [ ] Empty gallery state: "No styles to show yet"

---

## Milestone 10C: Care Schedule + Staff Prep + Minimal Org Credits

### Story 15: Personal Care Schedule

As a customer, I want a personalized care calendar based on my visit history and analysis data, so that I know when to come back.

**Dependencies:** Story 1, Story 2, Story 6

**Acceptance Criteria:**

- [ ] `convex/aiCareSchedules.ts` created
- [ ] `generateSchedule` orgMutation: accepts customerId, organizationId; calls `deductCredits` (2 cr, org pool)
- [ ] `runCareScheduleGeneration` internalAction in `convex/aiActions.tsx`
- [ ] Action gathers: customer's past appointments (frequency, service types), photo analysis result (if any), service maintenance intervals
- [ ] Uses `careScheduleAgent.generateObject()` to call GPT-4o via AI Gateway with salon-type-specific prompt:
  - Hair: cut interval, root touch-up date, care advice
  - Nail: gel fill (2-3 weeks), full set replacement (6-8 weeks)
  - Makeup: seasonal color refresh suggestions
- [ ] Structured output via zod schema: `recommendations[]` (each: `title`, `description`, `recommendedDate`, `serviceId?`)
- [ ] `aiCareSchedules` record stores `recommendations[]` and `nextCheckDate`
- [ ] Credits refunded on error
- [ ] `getSchedule` publicQuery: returns customer's active care schedule
- [ ] Cron job: weekly check (`aiCareSchedules.checkAndNotify`) — sends email reminder for past-due `nextCheckDate` entries (uses existing email infrastructure)
- [ ] `src/modules/ai/customer/components/CareScheduleView.tsx` created
- [ ] "My Care Schedule" tab on `/{slug}/ai` page
- [ ] UI: recommendation cards (title, description, recommended date, matched service if any)
- [ ] "Regenerate" button (costs 2 additional credits)
- [ ] Empty state: "Get your first care schedule" + "Generate" button

### Story 16: Staff Appointment Prep View

As a staff member, I want to see a customer's AI data (analysis summary, mood board, try-on results) before an appointment, so that I can prepare the right products and reference their preferred styles.

**Dependencies:** Story 6, Story 13

**Acceptance Criteria:**

- [ ] `src/modules/ai/staff/components/AppointmentPrepView.tsx` created
- [ ] Integrated as "AI Insights" tab on the existing appointment detail page
- [ ] Tab contains 4 sections:
  - **Analysis Summary:** customer's latest photo analysis (face shape, hair type, skin tone, etc. by salon type)
  - **Mood Board:** customer's saved styles (thumbnail grid)
  - **Recent Try-Ons:** last 5 try-on results (small before/after previews, selected design name)
  - **Staff Notes:** free-text field, saved per appointment
- [ ] `staffAiNotes` field added to `appointments` table (or separate record)
- [ ] Staff notes saved via `orgMutation`
- [ ] "No AI data available for this customer" message if customer has no analyses/try-ons
- [ ] Only accessible by staff of the same organization (`orgQuery` enforcement)
- [ ] No new AI calls — displays existing data only; zero credit cost
- [ ] Tab only visible in organizations with salonType defined

### Story 17: Organization Credit Management (Minimal)

As a salon owner, I want to see my org's AI credit balance, purchase credits, and review recent transactions, so that I can track AI costs.

**Dependencies:** Story 2

**Acceptance Criteria:**

- [ ] `src/modules/ai/organization/components/OrgAICreditManager.tsx` created
- [ ] Appears as "Credits" tab in AI Insights page (owner only)
- [ ] Org credit balance displayed prominently (real-time via `useQuery`)
- [ ] Credit purchase button — same Polar packages: 50/$1.99, 200/$5.99, 500/$11.99
- [ ] Purchase dialog reuses `CreditPurchaseDialog` component (with org context)
- [ ] Last 50 transactions table: date, type (purchase/usage/refund), amount, feature name
- [ ] No filtering or CSV export (minimal version)
- [ ] Only visible to owners (`ownerQuery` wrapper)

---

## Technical Notes

- **Salon Type Routing:**
  - `salonType` on `organization` drives which AI features are shown/enabled
  - `convex/lib/aiConstants.ts` exports `TRYON_ENABLED_TYPES = ["hair", "nail", "makeup", "multi"]`
  - Try-on hidden entirely for `barber` and `spa`
  - Photo analysis prompt varies by salonType (different focus areas)
  - Quick question definitions are also keyed by salonType in `aiConstants.ts`

- **AI Stack:**
  - **`@convex-dev/agent`** — Convex component registered in `convex.config.ts`. Wraps AI SDK. Provides thread management, `agent.generateText()` / `agent.generateObject()`, `usageHandler` for token tracking. Agent definitions per feature.
  - **Vercel AI SDK** (`ai` package) — underlying model interface, structured output via zod. Not called directly — agent component wraps it.
  - **Vercel AI Gateway** — provider routing layer for OpenAI calls. Caching, rate limiting, fallback, observability.
  - **fal.ai** — direct API calls for image segmentation + inpainting. Not routed through agent or gateway.

- **Credit Costs Summary:**

  | Feature                      | Credits | Pool     |
  | ---------------------------- | ------- | -------- |
  | Photo Analysis (1 image)     | 5       | Customer |
  | Photo Analysis (multi-image) | 7-8     | Customer |
  | Quick Question               | 2       | Customer |
  | Virtual Try-On               | 10      | Customer |
  | Care Schedule                | 2       | Org      |
  | Mood Board save              | 0       | —        |
  | Gallery submission           | 0       | —        |
  | Try-On Comparison View       | 0       | —        |
  | Staff Prep View              | 0       | —        |

- **Credit Packages (USD, Polar one-time checkout):**
  - Starter: 50 credits / $1.99
  - Popular: 200 credits / $5.99
  - Pro: 500 credits / $11.99

- **Async Pattern:** Mutation saves message via `saveMessage(ctx, components.agent, {...})` + creates pending record → `ctx.scheduler.runAfter(0)` schedules action → action calls `agent.generateText()` / `agent.generateObject()` → updates record status. Real-time status via `useQuery`.

- **Structured Output:** `agent.generateObject({ schema })` with zod schema for typed AI responses.

- **Segmentation Strategy:** Fully automatic via fal.ai segmentation model — no manual crop or mask drawing. Region detected based on salonType. Segmentation call happens before inpainting in the same Convex action.

- **Error Recovery:** If a Convex action throws after credits are deducted, the action's catch block calls `refundCredits` internalMutation. The record status is set to `"failed"` with an error message. Action retry via `convex-helpers/server/retries` is attempted before refunding (see `docs/prd/convex-helpers-additions.md`).

- **Dependencies:** `@convex-dev/agent`, `ai` (v6+), `@ai-sdk/openai`, `@fal-ai/client`

- **Env vars:** `AI_GATEWAY_API_KEY`, `FAL_KEY`

- **Reuse:** Date range picker from M8, recharts from M5 dashboard, email infrastructure from M7

- **Skills used during build:**
  - `convex-agents` — @convex-dev/agent setup, thread management, agent definitions, usageHandler
  - `ai-sdk` — Vercel AI SDK model interface, structured output schemas
  - `convex-file-storage` — Design catalog image upload/serve
  - `convex-http-actions` — fal.ai external API calls
  - `convex-cron-jobs` — Care schedule weekly check
  - `convex-helpers-patterns` — Rate limiting, action retry
  - `fal-ai-community/skills@fal-image-edit` — fal.ai inpainting integration

## Functional Requirements

- FR-1: All AI operations are credit-gated; operations do not start if credits are insufficient
- FR-2: Credit deduction is atomic — balance check + deduct + transaction log in a single mutation
- FR-3: Failed AI actions automatically refund credits and set record status to `"failed"`
- FR-4: `salonType` field determines which AI features are visible/active
- FR-5: Virtual try-on is only available for `hair`, `nail`, `makeup`, `multi` salon types
- FR-6: fal.ai segmentation is fully automatic — no mask drawing or cropping required from customers
- FR-7: All external AI API calls run inside Convex actions (`"use node"`)
- FR-8: Photo analysis and virtual try-on status changes update in real-time on the customer UI (Convex reactivity)
- FR-9: Quick question responses are not persisted — ephemeral display only
- FR-10: Mood board saves and gallery submissions are free (0 credits)
- FR-11: Public gallery only shows try-ons with both customer consent and owner approval
- FR-12: Staff appointment prep view makes no new AI calls — displays existing data only
- FR-13: Credit purchases use Polar one-time checkout (USD, not subscription)
- FR-14: Care schedule cron runs weekly and sends email reminders for approaching maintenance dates
- FR-15: All LLM calls go through `@convex-dev/agent` (`agent.generateText()`, `agent.generateObject()`). The agent component wraps AI SDK.
- FR-16: AI SDK provider calls (OpenAI GPT-4o) are routed through Vercel AI Gateway for caching, rate limiting, fallback, and observability
- FR-17: fal.ai API calls are made directly (not through agent component or AI Gateway)
- FR-18: Each agent's `usageHandler` logs token usage and integrates with the credit transaction system

## Non-Goals

- Interactive AI style consultation chat (streaming chat with Claude)
- Revenue forecasting (AI-generated predictions + charts)
- Post-visit AI follow-up emails
- Full org credit analytics with CSV export
- Voice/video consultation
- AR try-on (real-time camera overlay — too complex for MVP)
- Multi-language AI responses (English only for MVP)
- Custom model training or fine-tuning
- AI-powered scheduling optimization (automated slot suggestions)
- Automated marketing content generation
- Sentiment analysis on customer reviews
- Real-time collaborative mood board editing
- E-commerce integration for product recommendations (deferred to M11)
- AI no-show prediction / smart overbooking
- Smart staff matching via AI
- Seasonal trend / pricing analysis
- Social sharing / referral loop for try-on results

## Open Questions

- fal.ai segmentation model selection: which specific endpoint/model to use? (Investigate fal.ai docs during implementation)
- Polar webhook URL configuration: how to add AI credit purchase events to the existing Polar webhook handler?
- Multi-image analysis credit pricing (7 vs 8 per salon type) — finalize or unify to 8?
- Design catalog thumbnail dimensions: 200x200 or 300x300?
- Care schedule cron: does the existing customer table have an email field for sending reminders?

---

## Story Summary

| Sub-milestone | Stories | Description                                                                                                                           |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **10A**       | 5       | Schema + constants, credit system, design catalog backend, onboarding + nav, design catalog UI                                        |
| **10B**       | 9       | Photo analysis, multi-image, quick questions, try-on backend, try-on UI, comparison view, credit purchase, mood board, public gallery |
| **10C**       | 3       | Care schedule, staff appointment prep view, minimal org credit management                                                             |
| **Total**     | **17**  |                                                                                                                                       |
