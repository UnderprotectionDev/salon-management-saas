# Milestone 10: AI Features

**Status:** Pending | **User Stories:** 8

## Goals

- AI-powered photo analysis (face shape, skin tone, hair type) with personalized service recommendations
- Before/after style simulation via fal.ai image generation
- Interactive AI style consultation chat with photo support
- Revenue forecasting for organizations based on historical appointment data
- Token/credit-based billing system for AI operations (separate customer and org pools)
- Credit purchase integration via Polar one-time checkout

## User Stories

### Customer AI

#### US-039: Photo Analysis
- Customer uploads selfie on public AI page (`/{slug}/ai`)
- AI analyzes face shape, skin tone, hair type, hair color via vision model
- Returns personalized service/style recommendations matched to salon's service catalog
- Real-time status updates: pending → processing → completed (Convex reactivity)
- Costs 5 credits per analysis
- Analysis history saved per customer
- Files: `convex/aiAnalysis.ts`, `convex/aiActions.ts`, `src/modules/ai/customer/components/PhotoAnalysisView.tsx`

#### US-040: Before/After Simulation
- Customer uploads photo + enters style prompt (e.g., "short bob with highlights")
- fal.ai generates simulated hairstyle/color change image
- Side-by-side before/after comparison view
- Costs 10 credits per simulation
- Result images stored in Convex file storage
- Files: `convex/aiSimulations.ts`, `src/modules/ai/customer/components/SimulationView.tsx`

#### US-041: Style Chat
- Interactive AI consultation combining photo upload with chat
- Streaming responses via Next.js API route + AI SDK `streamText`
- Thread-based conversation persistence (create, archive)
- Salon context in system prompt (services, pricing, staff specialties)
- Costs 1 credit per message
- Files: `convex/aiChat.ts`, `src/app/api/ai/chat/route.ts`, `src/modules/ai/customer/components/StyleChatView.tsx`

#### US-042: Customer Credit Purchase
- Credit balance display on AI page
- Purchase dialog with credit packages (50/200/500 credits)
- Polar one-time checkout integration
- Transaction history (purchases, usage, refunds)
- Files: `src/modules/ai/components/CreditBalance.tsx`, `src/modules/ai/components/CreditPurchaseDialog.tsx`

### Organization AI

#### US-043: Revenue Forecasting
- Admin/owner can request weekly or monthly revenue forecast
- Aggregates last 90 days of appointment data (revenue, count, patterns)
- AI generates structured predictions + actionable insights
- Forecast chart (recharts AreaChart) + insights list
- Cached for 24 hours (expired forecasts cleaned up by cron every 6 hours)
- Costs 3 credits per forecast
- Files: `convex/aiForecasts.ts`, `src/modules/ai/organization/components/RevenueForecastView.tsx`

#### US-044: Organization Credit Management
- Org credit balance display + purchase (owner only)
- Credit transaction history with reference type filtering
- Usage analytics (credits spent by feature type)
- Files: `convex/aiCredits.ts`, `src/modules/ai/organization/components/OrgAICreditManager.tsx`

### Shared

#### US-045: Credit System Backend
- `aiCredits` table: balance per customer OR organization (separate pools)
- `aiCreditTransactions` table: full audit trail (purchase/usage/refund)
- `deductCredits` as `internalMutation` (prevents client manipulation)
- Atomic: balance check + deduct + transaction log in single mutation
- Rate limits: 5 credit purchases per hour
- Files: `convex/aiCredits.ts`, `convex/lib/aiConstants.ts`

#### US-046: AI Infrastructure
- 7 new schema tables: `aiCredits`, `aiCreditTransactions`, `aiAnalyses`, `aiSimulations`, `aiChatThreads`, `aiChatMessages`, `aiForecasts`
- Convex actions (`"use node"`) for external API calls (AI Gateway, fal.ai)
- 5 new rate limits: `aiPhotoAnalysis`, `aiSimulation`, `aiChat`, `aiForecast`, `aiCreditPurchase`
- Sidebar nav item: "AI Insights" (Sparkles icon) for authenticated org page
- Public route: `/{slug}/ai` for customer-facing features
- Files: `convex/schema.ts`, `convex/aiActions.ts`, `convex/lib/rateLimits.ts`

## Technical Notes

- **AI Provider:** Vercel AI Gateway (multi-provider routing) + fal.ai (image generation)
- **Dependencies:** `ai` (v6+), `@ai-sdk/react`, `@fal-ai/client`
- **Chat streaming:** Next.js API route with `streamText` + `useChat` hook (`DefaultChatTransport`)
- **Analysis/Simulation:** Convex action scheduled via `ctx.scheduler.runAfter(0)`, real-time status via `useQuery`
- **Structured output:** `generateText` + `Output.object()` for typed AI responses
- **Credit costs:** Photo analysis (5), Simulation (10), Chat message (1), Forecast (3)
- **Env vars:** `AI_GATEWAY_API_KEY`, `FAL_KEY`
- **Reuse:** Date range picker from M8 (US-035), recharts from M5 dashboard

## Non-Goals

- Voice/video consultation, AR try-on, multi-language AI, custom model training, AI-powered scheduling optimization, automated marketing, sentiment analysis on reviews
