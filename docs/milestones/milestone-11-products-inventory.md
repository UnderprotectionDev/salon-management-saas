# Milestone 11: Products & Inventory

**Status:** ✅ Complete | **User Stories:** US-P01~US-P06

## Summary

Owner-only product catalog and inventory management, plus a public customer-facing catalog page. Digital catalog with category grouping, pricing (cost + selling + margin), stock tracking with full audit log, supplier info, and low stock alerts.

## What Was Built

- **Product Categories:** CRUD with sort reorder, product count display, active/inactive status
- **Products:** CRUD with category assignment, SKU, brand, dual pricing (cost + selling), supplier info, soft-delete via status
- **Inventory Tracking:** Restock, manual adjustment, waste transactions — each logs previous/new stock snapshot
- **Low Stock Alerts:** Per-product threshold, amber icon on list rows, `countLowStock` query for dashboard integration
- **Inventory History Sheet:** Per-product transaction log with staff attribution and notes
- **Public Catalog Page:** Customer-facing `/{slug}/catalog` — no auth required, shows active products grouped by category with price and in-stock status; excludes sensitive internal fields (costPrice, margin, supplierInfo, stockQuantity)

## Navigation Access Points

Customers can reach the catalog from:
1. **Homepage (`/`)** — each salon card shows "Book" + "Products" buttons side by side
2. **Booking page (`/{slug}/book`)** — "Products" button in header (desktop) and icon button (mobile)
3. **Catalog page itself** — "Book appointment" link in header navigates back to booking

## User Stories

| ID | Title | Type |
|----|-------|------|
| US-P01 | Product Category CRUD | Full-Stack |
| US-P02 | Product CRUD | Full-Stack |
| US-P03 | Pricing & Margin Display | Frontend |
| US-P04 | Inventory Adjustments | Full-Stack |
| US-P05 | Low Stock Alerts | Full-Stack |
| US-P06 | Product Search & Filter by Category | Frontend |

## Schema Changes

| Table | Purpose |
|-------|---------|
| `productCategories` | Category grouping per organization |
| `products` | Product catalog with pricing + inventory |
| `inventoryTransactions` | Full audit log for every stock change |

## Key Files

| File | Purpose |
|------|---------|
| `convex/schema.ts` | 3 new tables added |
| `convex/productCategories.ts` | Category CRUD (list, create, update, reorder, remove) — owner-only |
| `convex/products.ts` | Product CRUD + adjustStock + countLowStock + listPublic |
| `convex/inventoryTransactions.ts` | listByProduct, listRecent queries |
| `convex/lib/validators.ts` | New doc + composite validators incl. `productPublicValidator` |
| `src/modules/products/` | 7 UI component files |
| `src/app/[slug]/(authenticated)/products/page.tsx` | Owner management page |
| `src/app/[slug]/(public)/catalog/page.tsx` | Public customer-facing catalog |
| `src/app/[slug]/(authenticated)/layout.tsx` | Products nav item added |
| `src/app/page.tsx` | Salon cards updated: Book + Products buttons |
| `src/modules/booking/components/BookingPageHeader.tsx` | Products link added |

## Key Decisions

- All prices in kuruş integers (same convention as `services`)
- `margin = ((sellingPrice - costPrice) / sellingPrice) * 100` — displayed as percentage, `undefined` when `sellingPrice === 0` (guard on `sellingPrice > 0`, not `costPrice > 0`)
- Soft-delete via `status: "inactive"` (same pattern as services)
- `inventoryTransactions` is append-only — mutations patch product stock and insert transaction
- Initial stock (> 0) on product creation logs a `restock` transaction automatically
- Owner-only access for management — staff redirect to dashboard
- Public catalog uses `publicQuery` (`listPublic`) — no auth required, privacy-safe field set only
- Public URL is `/{slug}/catalog` (not `/products`, which is the owner management route)
- Supplier info embedded on product (no separate table) — aligns with PRD decision
- No barcode, no PO system, no e-commerce / appointment-linked sales

## Post-Launch Fixes

| Fix | File | Details |
|-----|------|---------|
| Reactivity bug | `convex/products.ts` | Replaced IIFE with single `by_org` index read + JS filter so Convex subscription tracking works correctly |
| Margin formula | `convex/products.ts` | Guard changed from `costPrice > 0` to `sellingPrice > 0` — prevented `-Infinity` when selling price is 0 |
| Access control | `convex/productCategories.ts` | `list` changed from `orgQuery` to `ownerQuery` — staff could previously call the query directly despite the UI redirect |
| Restock sign | `src/modules/products/components/AdjustStockDialog.tsx` | `restock` type now forces `Math.abs` — typing a negative number could silently decrement stock |
| Dead code | `src/modules/products/components/EditProductDialog.tsx` | Removed misleading `useEffect` reset + unused imports; form remount via `key` prop already handled this correctly |

## Constraints (Unchanged from PRD)

- **Out of scope:** Online sales, barcode scanning, purchase orders, appointment-linked sales
- Future scope (M12+): AI catalog match for product recommendations (currently general suggestions only)
