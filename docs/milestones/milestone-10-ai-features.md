# Milestone 10: AI Features

**Status:** 📋 Pending | **Sub-milestones:** 10A, 10B, 10C, 10D | **User Stories:** 13

## Goals

- Salon-type-aware AI infrastructure with `salonType` field driving which features are enabled
- Design Catalog: salon owners upload and categorize their own designs (nail art, hair styles, makeup looks)
- Virtual Try-On: customer uploads photo, selects design from catalog, fal.ai inpainting overlays it realistically
- AI-powered photo analysis (face shape, skin tone, hair type, nail condition) with salon-type-specific profiling and service recommendations
- Token/credit-based billing system for AI operations (separate customer and org pools)
- Credit purchase integration via Polar one-time checkout (50/200/500 packages)
- Multi-provider AI routing via Vercel AI Gateway (GPT-4o vision, fal.ai image generation)
- AI-powered personal care schedule with smart reminders
- Style history & mood board for saving and sharing favorite looks
- AI-driven product recommendations based on photo analysis results

**Deferred to 10D:** Interactive AI style consultation chat, Revenue forecasting, Post-visit follow-up emails, Full org credit analytics

---

## Milestone 10A: AI Infrastructure + Credit System + Design Catalog Backend

### US-045: Credit System Backend

- `aiCredits` table: balance per customer OR organization (separate pools)
- `aiCreditTransactions` table: full audit trail (purchase/usage/refund)
- `deductCredits` as `internalMutation` (prevents client manipulation)
- Atomic: balance check + deduct + transaction log in single mutation
- Credit costs: Photo Analysis (5), Virtual Try-On (10), Care Schedule (2), [Deferred: Chat (1/msg), Forecast (3), Post-Visit (2)]
- Purchase packages: 50 credits, 200 credits, 500 credits (Polar one-time checkout)
- Rate limits: 5 credit purchases per hour
- Files: `convex/aiCredits.ts`, `convex/lib/aiConstants.ts`

### US-046: AI Infrastructure + Design Catalog

**Schema additions:**

- `organization` table: new `salonType` field — `v.optional(v.union(v.literal("hair"), v.literal("nail"), v.literal("makeup"), v.literal("barber"), v.literal("spa"), v.literal("multi")))`
- 9 new AI tables: `aiCredits`, `aiCreditTransactions`, `aiAnalyses`, `aiSimulations`, `aiChatThreads`, `aiChatMessages`, `aiForecasts`, `aiCareSchedules`, `aiMoodBoard`
- New `designCatalog` table:
  - `organizationId` — tenant scoped
  - `name` — design display name
  - `category` — string (e.g. "French", "Gel Art", "Balayage", "Smoky Eye")
  - `imageStorageId` — full resolution (Convex file storage)
  - `thumbnailStorageId` — compressed preview
  - `description` — optional notes for staff/customers
  - `tags[]` — array of strings for filtering
  - `salonType` — mirrors organization salonType (for future cross-org use)
  - `status` — `active | inactive`
  - `sortOrder` — number for manual reordering
  - `createdAt`, `updatedAt`
  - Indexes: `by_org` on `[organizationId]`, `by_org_category` on `[organizationId, category]`

**AI provider routing via Vercel AI Gateway:**

- **Vision (photo analysis):** `openai/gpt-4o` — best-in-class image understanding, salon-type-aware prompts
- **Image generation (virtual try-on):** `fal.ai` — inpainting mode with reference image + region mask
- **[Deferred] Chat:** `anthropic/claude-sonnet-4-5-20250929` — style consultation
- **[Deferred] Forecast:** `google/gemini-2.0-flash` — revenue prediction, care schedule

**Infrastructure:**

- Convex actions (`"use node"`) for external API calls (AI Gateway, fal.ai)
- 5 rate limits: `aiPhotoAnalysis`, `aiVirtualTryOn`, `aiChat`, `aiForecast`, `aiCreditPurchase`
- `convex/lib/aiConstants.ts`: salonType → tryOnMode mapping, credit costs, model routing config
- Sidebar nav item: "AI Insights" (Sparkles icon) for authenticated org pages (owner only)
- Public route: `/{slug}/ai` for customer-facing AI features
- Env vars: `AI_GATEWAY_API_KEY`, `FAL_KEY`
- Dependencies: `ai` (v6+), `@ai-sdk/react`, `@fal-ai/client`

**Onboarding change:**

- Salon creation form adds "Salon Type" selection step
- Determines which AI features are enabled (try-on mode, photo analysis focus)
- Types: Hair Salon, Nail Salon, Makeup Studio, Barber, Spa, Multi-Service

**Design Catalog management (owner UI):**

- `convex/designCatalog.ts`: CRUD with `ownerMutation/ownerQuery` wrappers
  - `create`, `update`, `setStatus`, `delete`, `reorder`
  - `listByOrg`, `listByCategory` (publicQuery for customer-facing)
- `src/modules/ai/organization/components/DesignCatalogManager.tsx`
  - Upload designs with thumbnail auto-generation
  - Category management, drag-to-reorder, activate/deactivate
  - Only shown if `salonType` supports try-on (`nail`, `hair`, `makeup`)

**Files:** `convex/schema.ts`, `convex/designCatalog.ts`, `convex/aiActions.tsx`, `convex/lib/rateLimits.ts`, `convex/lib/aiConstants.ts`, `src/modules/ai/organization/components/DesignCatalogManager.tsx`

---

## Milestone 10B: Customer AI Features

### US-039: Photo Analysis

- Customer uploads selfie on public AI page (`/{slug}/ai`)
- GPT-4o vision analyzes based on salon type:
  - **Hair salon:** face shape, symmetry, hair type (straight/wavy/curly/coily), hair color, density, condition
  - **Nail salon:** nail shape, nail condition, hand skin tone, nail care recommendations
  - **Makeup studio:** face shape, skin tone (Fitzpatrick scale), undertone (warm/cool/neutral), eye color
  - **All types:** recommended services matched to salon's catalog, care tips
- Profile card returned:
  - Type-specific analysis sections
  - **Recommended Services:** matched to salon's service catalog
  - **Care Tips:** personalized maintenance recommendations
  - **Recommended Products:** general brand/type suggestions (no extra credit — see US-050)
- Real-time status updates: pending → processing → completed (Convex reactivity)
- Costs 5 credits per analysis (customer pool)
- Analysis history saved per customer
- Files: `convex/aiAnalysis.ts`, `convex/aiActions.tsx`, `src/modules/ai/customer/components/PhotoAnalysisView.tsx`

### US-040: Virtual Try-On (replaces Before/After Simulation)

**Concept:** Customer selects a design from salon's Design Catalog, uploads a photo, AI overlays the design realistically using fal.ai inpainting.

**Salon-type modes:**

| salonType | Try-On Mode | Region | Notes |
|-----------|------------|--------|-------|
| `nail` | Nail art overlay | Nail/fingertip region | Reference design + inpaint nails |
| `hair` | Hair style/color change | Hair region | Prompt-based or catalog ref image |
| `makeup` | Makeup look overlay | Face region | Lip color, eye shadow, blush etc. |
| `barber`, `spa` | Disabled | — | Feature hidden in UI |

**UX flow:**

1. Customer opens "Try On" tab
2. Browses Design Catalog (category filter, thumbnail grid)
3. Selects a design from catalog — OR switches to "Free prompt" mode and types description
4. Uploads photo (hand/face/hair as appropriate for salon type)
5. Mutation creates simulation record (status: `pending`)
6. Convex action scheduled → calls fal.ai API (status: `processing`)
7. While processing: skeleton placeholder with pulse animation
8. On complete: blur-to-sharp reveal animation (CSS transition, 1s)
9. Side-by-side before/after comparison view
10. "Save to Mood Board" button on result

**Technical:**

- fal.ai inpainting: `reference_image` (catalog design), `image` (customer photo), auto-generated `mask` (region detection via fal.ai's own segmentation or simple crop)
- Result images stored in Convex file storage
- Costs 10 credits per try-on (customer pool)

**Files:** `convex/aiSimulations.ts`, `convex/aiActions.tsx`, `src/modules/ai/customer/components/VirtualTryOnView.tsx`

### US-042: Customer Credit Purchase

- Credit balance display on AI page header
- Purchase dialog with credit packages (50/200/500 credits)
- Polar one-time checkout integration (no subscription)
- Transaction history (purchases, usage, refunds)
- Files: `src/modules/ai/components/CreditBalance.tsx`, `src/modules/ai/components/CreditPurchaseDialog.tsx`

### US-049: Style History & Mood Board

- Customer's past photo analyses + virtual try-ons automatically build a style profile
- "Save to Mood Board" button on analysis results and try-on outputs
- `aiMoodBoard` table: `customerId`, `organizationId`, `items[]` (`imageStorageId`, `note`, `source: "analysis" | "tryon"`, `designCatalogId?`, `savedAt`)
- Mood board features:
  - Grid view of saved styles with notes
  - Add personal notes to each saved item
  - Share mood board with staff (visible during appointment for reference)
  - Remove items from mood board
- Customer AI page tab: "My Styles"
- Free feature (no credit cost — saving only)
- Files: `convex/aiMoodBoard.ts`, `src/modules/ai/customer/components/MoodBoardView.tsx`

### US-050: Product Recommendations

- Photo analysis result card includes "Recommended Products" section
- AI matches analysis results (hair type, skin tone, nail condition) to general product recommendations
- Salon-type-specific output:
  - Hair: shampoo/conditioner type, treatment products
  - Nail: cuticle oil, nail strengthener, top coat recommendations
  - Makeup: foundation type, SPF moisturizer, skincare recommendations
- No additional credit cost — included in photo analysis (5 credits)
- Recommendations stored as part of `aiAnalyses.result.productRecommendations[]`
- Future scope (M11 Products module): match against salon's actual product catalog
- Files: `convex/aiActions.tsx` (analysis prompt includes product recs), `src/modules/ai/customer/components/PhotoAnalysisView.tsx`

---

## Milestone 10C: Care Schedule + Minimal Org Credits

### US-048: Personal Care Schedule

- AI generates personalized care calendar based on customer data:
  - Past appointment frequency and patterns
  - Hair/skin/nail type (from photo analysis, if available)
  - Services received and their recommended maintenance intervals
- Salon-type-aware recommendations:
  - Hair: "Time for a haircut" (based on average visit interval), "Root touch-up ideal date"
  - Nail: "Gel fill recommended" (2-3 week intervals), "Full set replacement" (6-8 weeks)
  - Makeup: "Seasonal color refresh" suggestions
- `aiCareSchedules` table: `customerId`, `organizationId`, `recommendations[]`, `nextCheckDate`
- Cron: weekly check (`aiCareSchedules.checkAndNotify`) → optional email reminder
- Customer AI page tab: "My Care Schedule"
- Costs 2 credits per schedule generation (org pool)
- Files: `convex/aiCareSchedules.ts`, `convex/aiActions.tsx`, `src/modules/ai/customer/components/CareScheduleView.tsx`

### US-044 (Minimal): Organization Credit Management

- Org credit balance display (owner only)
- Credit purchase: Polar one-time checkout, same 50/200/500 packages
- Basic transaction history (last 50 transactions, no filtering)
- **Deferred to 10D:** Feature-breakdown analytics, usage trends, advanced filtering
- Files: `convex/aiCredits.ts`, `src/modules/ai/organization/components/OrgAICreditManager.tsx`

---

## Milestone 10D: Deferred Features

These were deliberately moved out of MVP scope. Build after 10A–10C are stable.

### US-041: Style Chat

- Interactive AI consultation combining photo upload with chat
- Streaming responses via Next.js API route + AI SDK `streamText` (Claude provider)
- Thread-based conversation persistence (create, archive)
- Salon context in system prompt (services, pricing, staff specialties, salonType)
- Costs 1 credit per message (customer pool)
- Files: `convex/aiChat.ts`, `src/app/api/ai/chat/route.ts`, `src/modules/ai/customer/components/StyleChatView.tsx`

### US-043: Revenue Forecasting

- Admin/owner can request weekly or monthly revenue forecast
- Aggregates last 90 days of appointment data (revenue, count, patterns)
- AI generates structured predictions + actionable insights via Gemini Flash
- Forecast chart (recharts AreaChart) + insights list
- Cached for 24 hours (expired forecasts cleaned up by cron every 6 hours)
- Costs 3 credits per forecast (org pool)
- Files: `convex/aiForecasts.ts`, `convex/aiActions.tsx`, `src/modules/ai/organization/components/RevenueForecastView.tsx`

### US-044 (Full): Organization Credit Analytics

- Extension of minimal US-044 from 10C
- Usage analytics: credits spent by feature type (bar chart breakdown)
- Transaction history with reference type filtering
- Export transaction history as CSV
- Files: Extends `src/modules/ai/organization/components/OrgAICreditManager.tsx`

### US-047: Post-Visit Follow-up Email

- When appointment status changes to `completed`, schedule AI-generated follow-up email
- Trigger: `ctx.scheduler.runAfter(3600000)` (1 hour delay)
- AI analyzes appointment context to generate personalized content:
  - **Services summary:** what was done during the visit
  - **Home care tips:** personalized maintenance advice based on services received
  - **Product recommendations:** suggested products for the customer's type
  - **Next visit suggestion:** recommended return date based on service type
- Input to AI: appointment services + customer history + staff notes
- `convex/email.tsx` → `sendPostVisitFollowup` internalAction
- `src/emails/PostVisitFollowup.tsx` React Email template
- Costs 2 credits per email (org pool)
- Only sends if org has sufficient credits (graceful skip if not)
- Files: `convex/email.tsx`, `convex/email_helpers.ts`, `convex/aiActions.tsx`, `src/emails/PostVisitFollowup.tsx`

---

## Technical Notes

- **Salon Type Routing:**
  - `salonType` on `organization` drives which AI features are shown/enabled
  - `convex/lib/aiConstants.ts` exports `TRYON_ENABLED_TYPES = ["hair", "nail", "makeup", "multi"]`
  - Try-on hidden entirely for `barber` and `spa`
  - Photo analysis prompt varies by salonType (different focus areas)

- **AI Provider Routing (Vercel AI Gateway):**
  - Vision/Analysis: `openai/gpt-4o`
  - Image generation: `fal.ai` (inpainting endpoint)
  - [10D] Chat: `anthropic/claude-sonnet-4-5-20250929`
  - [10D] Forecast: `google/gemini-2.0-flash`

- **Dependencies:** `ai` (v6+), `@ai-sdk/react`, `@fal-ai/client`

- **Virtual Try-On vs old Simulation:** `aiSimulations` table is reused. `simulationType` field added: `"catalog" | "prompt"`. `designCatalogId` field added (nullable — null for free-prompt mode).

- **Chat streaming [10D]:** Next.js API route with `streamText` + `useChat` hook (`DefaultChatTransport`)

- **Analysis/Try-On:** Convex action scheduled via `ctx.scheduler.runAfter(0)`, real-time status via `useQuery`

- **Structured output:** `generateText` + `Output.object()` for typed AI responses

- **Credit costs:** Photo analysis (5), Virtual try-on (10), Care schedule (2), [10D] Chat message (1), [10D] Forecast (3), [10D] Post-visit email (2)

- **Env vars:** `AI_GATEWAY_API_KEY`, `FAL_KEY`

- **Reuse:** Date range picker from M8 (US-035), recharts from M5 dashboard, email infrastructure from M7

- **Skills used during build:**
  - `ai-sdk` — Vercel AI SDK patterns (generateText, streamText, useChat)
  - `convex-agents` — Convex thread management, tool integration
  - `convex-file-storage` — Design catalog image upload/serve
  - `convex-http-actions` — fal.ai + AI Gateway external API calls
  - `convex-cron-jobs` — Care schedule weekly check, forecast cache cleanup
  - `convex-helpers-patterns` — Rate limiting
  - `react-email` — Post-visit email template [10D]
  - `fal-ai-community/skills@fal-image-edit` — fal.ai inpainting integration

## Non-Goals

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

---

## User Story Summary

| Sub-milestone | User Stories | Description |
|---------------|-------------|-------------|
| **10A** | US-045, US-046 | Credit system + AI infra + Design Catalog backend + salonType |
| **10B** | US-039, US-040, US-042, US-049, US-050 | Customer AI features (analysis, try-on, purchase, mood board, products) |
| **10C** | US-048, US-044-lite | Care schedule + minimal org credit management |
| **10D** | US-041, US-043, US-044-full, US-047 | Deferred: chat, forecasting, full credit analytics, post-visit email |
| **Total** | **13** | |
