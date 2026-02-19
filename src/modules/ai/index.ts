/**
 * AI Module Public API
 *
 * Central export point for all AI-related components, hooks, and utilities.
 * Import from "@/modules/ai" in consuming code.
 */

// Story 12: CreditBalance, CreditPurchaseDialog
export { CreditBalance } from "./components/CreditBalance";
export { CreditPurchaseDialog } from "./components/CreditPurchaseDialog";
// Constants
export { type SalonType, TRYON_ENABLED_TYPES } from "./constants";
// AI Hub components
export { AIFeatureCard } from "./customer/components/AIFeatureCard";
export { AIHubSummaryCards } from "./customer/components/AIHubSummaryCards";
export { AIRecentActivity } from "./customer/components/AIRecentActivity";
// Story 15: CareScheduleView
export { CareScheduleView } from "./customer/components/CareScheduleView";
// Story 13: MoodBoardView
export { MoodBoardView } from "./customer/components/MoodBoardView";
// Story 6: PhotoAnalysisView
export { PhotoAnalysisView } from "./customer/components/PhotoAnalysisView";
// Story 8: QuickQuestionsPanel
export { QuickQuestionsPanel } from "./customer/components/QuickQuestionsPanel";
// Story 11: TryOnComparisonView
export { TryOnComparisonView } from "./customer/components/TryOnComparisonView";
// Story 10: VirtualTryOnView
export { VirtualTryOnView } from "./customer/components/VirtualTryOnView";
// Story 5: DesignCatalogManager + Design Wizard
export { DesignCatalogManager } from "./organization/components/DesignCatalogManager";
export { AddDesignPage } from "./organization/components/design-wizard/AddDesignPage";

// Story 16: AppointmentPrepView
export { AppointmentPrepView } from "./staff/components/AppointmentPrepView";
