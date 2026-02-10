# Milestone 10: AI Features

**Status:** 📋 Pending | **Sub-milestones:** 10A, 10B, 10C | **User Stories:** 12

## Goals

- AI-powered photo analysis (face shape, skin tone, hair type) with detailed profile card and personalized service recommendations
- Before/after style simulation via fal.ai image generation with skeleton + blur-to-sharp reveal animation
- Interactive AI style consultation chat with photo support and salon context
- Revenue forecasting for organizations based on historical appointment data
- Token/credit-based billing system for AI operations (separate customer and org pools)
- Credit purchase integration via Polar one-time checkout (50/200/500 packages)
- Multi-provider AI routing via Vercel AI Gateway (GPT-4o vision, Claude chat, Gemini Flash forecast)
- Post-visit AI-generated follow-up emails with personalized care tips
- AI-powered personal care schedule with smart reminders
- Style history & mood board for saving and sharing favorite looks
- AI-driven product recommendations based on photo analysis results

---

## Milestone 10A: AI Infrastructure + Credit System

### US-045: Credit System Backend

- `aiCredits` table: balance per customer OR organization (separate pools)
- `aiCreditTransactions` table: full audit trail (purchase/usage/refund)
- `deductCredits` as `internalMutation` (prevents client manipulation)
- Atomic: balance check + deduct + transaction log in single mutation
- Credit costs: Photo Analysis (5), Simulation (10), Chat (1/msg), Forecast (3), Post-Visit (2), Care Schedule (2)
- Purchase packages: 50 credits, 200 credits, 500 credits (Polar one-time checkout)
- Rate limits: 5 credit purchases per hour
- Files: `convex/aiCredits.ts`, `convex/lib/aiConstants.ts`

### US-046: AI Infrastructure

- 9 new schema tables: `aiCredits`, `aiCreditTransactions`, `aiAnalyses`, `aiSimulations`, `aiChatThreads`, `aiChatMessages`, `aiForecasts`, `aiCareSchedules`, `aiMoodBoard`
- Multi-provider AI routing via Vercel AI Gateway:
  - **Vision (photo analysis):** GPT-4o — best-in-class image understanding
  - **Chat (style consultation):** Claude — nuanced conversation, salon context handling
  - **Forecast (revenue prediction):** Gemini Flash — fast structured output, cost-effective
- Convex actions (`"use node"`) for external API calls (AI Gateway, fal.ai)
- 5 new rate limits: `aiPhotoAnalysis`, `aiSimulation`, `aiChat`, `aiForecast`, `aiCreditPurchase`
- Sidebar nav item: "AI Insights" (Sparkles icon) for authenticated org page (admin/owner)
- Public route: `/{slug}/ai` for customer-facing AI features
- Env vars: `AI_GATEWAY_API_KEY`, `FAL_KEY`
- Dependencies: `ai` (v6+), `@ai-sdk/react`, `@fal-ai/client`
- Files: `convex/schema.ts`, `convex/aiActions.tsx`, `convex/lib/rateLimits.ts`, `convex/lib/aiConstants.ts`

---

## Milestone 10B: Customer AI Features

### US-039: Photo Analysis

- Customer uploads selfie on public AI page (`/{slug}/ai`)
- AI analyzes face shape, skin tone, hair type, hair color via GPT-4o vision model
- Returns detailed profile card:
  - **Face Analysis:** face shape, symmetry notes, proportions
  - **Skin Analysis:** skin tone (Fitzpatrick scale), undertone (warm/cool/neutral)
  - **Hair Analysis:** hair type (straight/wavy/curly/coily), hair color, density, condition
  - **Recommended Styles:** 3-5 personalized style suggestions with explanations
  - **Salon Services:** matched to salon's service catalog (e.g., "Balayage would complement your warm undertone")
  - **Care Tips:** personalized maintenance recommendations
- Real-time status updates: pending → processing → completed (Convex reactivity)
- Costs 5 credits per analysis (customer pool)
- Analysis history saved per customer
- Files: `convex/aiAnalysis.ts`, `convex/aiActions.tsx`, `src/modules/ai/customer/components/PhotoAnalysisView.tsx`

### US-040: Before/After Simulation

- Customer uploads photo + enters style prompt (e.g., "short bob with highlights")
- fal.ai generates simulated hairstyle/color change image
- UX flow:
  1. Upload photo + enter prompt → mutation creates record (status: pending)
  2. Convex action scheduled → calls fal.ai API (status: processing)
  3. While processing: skeleton placeholder with pulse animation
  4. On complete: blur-to-sharp reveal animation (CSS transition, 1s duration)
  5. Side-by-side before/after comparison view
- Costs 10 credits per simulation (customer pool)
- Result images stored in Convex file storage
- Files: `convex/aiSimulations.ts`, `convex/aiActions.tsx`, `src/modules/ai/customer/components/SimulationView.tsx`

### US-041: Style Chat

- Interactive AI consultation combining photo upload with chat
- Streaming responses via Next.js API route + AI SDK `streamText` (Claude provider)
- Thread-based conversation persistence (create, archive)
- Salon context in system prompt (services, pricing, staff specialties)
- Costs 1 credit per message (customer pool)
- Files: `convex/aiChat.ts`, `src/app/api/ai/chat/route.ts`, `src/modules/ai/customer/components/StyleChatView.tsx`

### US-042: Customer Credit Purchase

- Credit balance display on AI page header
- Purchase dialog with credit packages (50/200/500 credits)
- Polar one-time checkout integration (no subscription)
- Transaction history (purchases, usage, refunds)
- Files: `src/modules/ai/components/CreditBalance.tsx`, `src/modules/ai/components/CreditPurchaseDialog.tsx`

### US-049: Style History & Mood Board (NEW)

- Customer's past photo analyses + simulations automatically build a style profile
- "Save to Mood Board" button on analysis results and simulation outputs
- `aiMoodBoard` table: customerId, organizationId, items[] (imageStorageId, note, source, savedAt)
- Mood board features:
  - Grid view of saved styles with notes
  - Add personal notes to each saved item
  - Share mood board with staff (visible during appointment for reference)
  - Remove items from mood board
- Customer AI page tab: "My Styles"
- Free feature (no credit cost — saving only)
- Files: `convex/aiMoodBoard.ts`, `src/modules/ai/customer/components/MoodBoardView.tsx`

---

## Milestone 10C: Organization AI + Additional Features

### US-043: Revenue Forecasting

- Admin/owner can request weekly or monthly revenue forecast
- Aggregates last 90 days of appointment data (revenue, count, patterns)
- AI generates structured predictions + actionable insights via Gemini Flash
- Forecast chart (recharts AreaChart) + insights list
- Cached for 24 hours (expired forecasts cleaned up by cron every 6 hours)
- Costs 3 credits per forecast (org pool)
- Files: `convex/aiForecasts.ts`, `convex/aiActions.tsx`, `src/modules/ai/organization/components/RevenueForecastView.tsx`

### US-044: Organization Credit Management

- Org credit balance display + purchase (owner only)
- Credit transaction history with reference type filtering
- Usage analytics (credits spent by feature type)
- Files: `convex/aiCredits.ts`, `src/modules/ai/organization/components/OrgAICreditManager.tsx`

### US-047: Post-Visit Follow-up Email (NEW)

- When appointment status changes to `completed`, schedule AI-generated follow-up email
- Trigger: `ctx.scheduler.runAfter(3600000)` (1 hour delay — not while customer is still at salon)
- AI analyzes appointment context to generate personalized content:
  - **Services summary:** what was done during the visit
  - **Home care tips:** personalized maintenance advice based on services received
  - **Product recommendations:** suggested products for the customer's hair/skin type
  - **Next visit suggestion:** recommended return date based on service type (e.g., "roots touch-up in 4-6 weeks")
- Input to AI: appointment services + customer history + staff notes
- `convex/email.tsx` → `sendPostVisitFollowup` internalAction
- `src/emails/PostVisitFollowup.tsx` React Email template
- Costs 2 credits per email (org pool)
- Only sends if org has sufficient credits (graceful skip if not)
- Files: `convex/email.tsx`, `convex/email_helpers.ts`, `convex/aiActions.tsx`, `src/emails/PostVisitFollowup.tsx`

### US-048: Personal Care Schedule (NEW)

- AI generates personalized care calendar based on customer data:
  - Past appointment frequency and patterns
  - Hair/skin type (from photo analysis, if available)
  - Services received and their recommended maintenance intervals
- Generates recommendations like:
  - "Time for a haircut" (based on average visit interval)
  - "Root touch-up ideal date" (4-6 weeks after coloring)
  - "Deep conditioning treatment recommended" (seasonal/condition-based)
- `aiCareSchedules` table: customerId, organizationId, recommendations[], nextCheckDate
- Cron: weekly check (`aiCareSchedules.checkAndNotify`) → optional email reminder
- Customer AI page tab: "My Care Schedule"
- Costs 2 credits per schedule generation (org pool)
- Files: `convex/aiCareSchedules.ts`, `convex/aiActions.tsx`, `src/modules/ai/customer/components/CareScheduleView.tsx`

### US-050: Product Recommendations (NEW)

- Photo analysis result card includes "Recommended Products" section
- AI matches analysis results (hair type, skin tone, condition) to product recommendations
- Current scope: general product recommendations (brand/type-based)
  - e.g., "Sulfate-free shampoo for your curly hair type"
  - e.g., "SPF moisturizer for your fair skin tone"
- Future scope (M11 Products module): match against salon's actual product catalog
- No additional credit cost — included in photo analysis (5 credits)
- Recommendations stored as part of `aiAnalyses.result.productRecommendations[]`
- Files: `convex/aiActions.tsx` (analysis prompt includes product recs), `src/modules/ai/customer/components/PhotoAnalysisView.tsx`

---

## Technical Notes

- **AI Provider Routing (Vercel AI Gateway):**
  - Vision: `openai/gpt-4o` — photo analysis, product recommendations
  - Chat: `anthropic/claude-sonnet-4-5-20250929` — style consultation
  - Forecast: `google/gemini-2.0-flash` — revenue prediction, care schedule
- **Dependencies:** `ai` (v6+), `@ai-sdk/react`, `@fal-ai/client`
- **Chat streaming:** Next.js API route with `streamText` + `useChat` hook (`DefaultChatTransport`)
- **Analysis/Simulation:** Convex action scheduled via `ctx.scheduler.runAfter(0)`, real-time status via `useQuery`
- **Structured output:** `generateText` + `Output.object()` for typed AI responses
- **Credit costs:** Photo analysis (5), Simulation (10), Chat message (1), Forecast (3), Post-visit email (2), Care schedule (2)
- **Env vars:** `AI_GATEWAY_API_KEY`, `FAL_KEY`
- **Reuse:** Date range picker from M8 (US-035), recharts from M5 dashboard, email infrastructure from M7

## Non-Goals

- Voice/video consultation
- AR try-on (real-time camera overlay)
- Multi-language AI responses (English only for MVP)
- Custom model training or fine-tuning
- AI-powered scheduling optimization (automated slot suggestions)
- Automated marketing content generation
- Sentiment analysis on reviews
- Real-time collaborative mood board editing
- E-commerce integration for product recommendations (deferred to M11)
