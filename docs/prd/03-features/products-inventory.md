# Products & Inventory (Showcase Model)

> **Priority:** P1 (MVP Nice-to-Have)
> **Owner:** Backend Team
> **Dependencies:** Multi-tenancy, Admin Dashboard
> **Last Updated:** 2026-02-06

## Overview

The products module enables salons to **showcase retail products** they offer (shampoos, styling products, skincare, etc.) as a digital catalog/vitrine. The system does **NOT** process sales transactions - actual product sales happen in-store through the salon's own payment methods.

**Key Concept:** Think of this as a "digital showroom" where customers can browse products before or after their appointment, encouraging purchases during their visit.

---

## Business Model

### What This Module Does

| Feature | Description |
|---------|-------------|
| **Product Catalog** | Display products with images, descriptions, prices |
| **Customer Discovery** | Customers browse products on salon's page |
| **Inventory Tracking** | Full inventory management for salon's internal use |
| **Staff Awareness** | Staff knows what products are available to recommend |
| **Low Stock Alerts** | Notifications when products need reordering |

### What This Module Does NOT Do

| Excluded Feature | Reason |
|------------------|--------|
| ❌ Online Sales | Salons sell products in-store, not online |
| ❌ Payment Processing | Transactions happen at salon's POS |
| ❌ Checkout Integration | Products are not added to appointment invoices |
| ❌ E-commerce | No shopping cart, no online orders |

---

## MVP Scope

### In Scope (P1)

- Product catalog display for customers (public showcase)
- Product management for admins (CRUD operations)
- **Full inventory tracking** with:
  - Purchase/cost price
  - Supplier information
  - Batch/lot tracking
  - Profit margin calculation
- Low stock alerts
- Product categorization
- Search and filtering

### Out of Scope (P2+)

- Online product sales / e-commerce
- Purchase order management
- Barcode scanning
- Supplier portal integration
- Automatic reorder

---

## Product Data Model

```typescript
// convex/schema.ts
products: defineTable({
  organizationId: v.id("organization"),

  // Basic Info
  name: v.string(),
  description: v.optional(v.string()),
  brand: v.optional(v.string()),
  sku: v.optional(v.string()), // Stock keeping unit
  barcode: v.optional(v.string()),

  // Categorization
  categoryId: v.optional(v.id("productCategories")),
  tags: v.array(v.string()),

  // Pricing (Full Inventory)
  sellingPrice: v.number(), // Display price in TRY
  costPrice: v.number(), // Purchase/cost price
  profitMargin: v.optional(v.number()), // Calculated: (selling - cost) / cost * 100

  // Supplier Information
  supplier: v.optional(v.object({
    name: v.string(),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    notes: v.optional(v.string()),
  })),

  // Batch/Lot Tracking
  batchNumber: v.optional(v.string()),
  expirationDate: v.optional(v.string()), // ISO date for perishable products

  // Inventory
  stockQuantity: v.number(),
  lowStockThreshold: v.number(),
  reorderQuantity: v.optional(v.number()), // Suggested reorder amount

  // Media
  imageUrl: v.optional(v.string()),
  images: v.array(v.string()), // Additional images

  // Display Settings
  status: v.union(
    v.literal("active"),      // Visible on showcase
    v.literal("inactive"),    // Hidden from showcase
    v.literal("out_of_stock") // Auto-set when stock = 0
  ),
  showOnShowcase: v.boolean(), // Show on customer-facing catalog
  featured: v.boolean(), // Highlight on showcase

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_organization", ["organizationId"])
.index("by_org_status", ["organizationId", "status"])
.index("by_org_category", ["organizationId", "categoryId"])
.index("by_org_featured", ["organizationId", "featured"])
.searchIndex("search_products", {
  searchField: "name",
  filterFields: ["organizationId", "status"],
})

productCategories: defineTable({
  organizationId: v.id("organization"),
  name: v.string(),
  description: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  sortOrder: v.number(),
  showOnShowcase: v.boolean(),
  createdAt: v.number(),
})
.index("by_organization", ["organizationId"])

// Inventory tracking for internal management
inventoryTransactions: defineTable({
  organizationId: v.id("organization"),
  productId: v.id("products"),

  // Transaction details
  type: v.union(
    v.literal("purchase"),     // Received from supplier
    v.literal("adjustment"),   // Manual correction
    v.literal("damaged"),      // Damaged/expired items
    v.literal("used"),         // Used in-salon (e.g., for services)
    v.literal("sold"),         // Sold in-store (manual record)
    v.literal("returned")      // Returned to supplier
  ),
  quantity: v.number(), // Positive for additions, negative for reductions
  previousStock: v.number(),
  newStock: v.number(),

  // Cost tracking
  unitCost: v.optional(v.number()), // Cost per unit for this transaction
  totalCost: v.optional(v.number()), // Total cost of transaction

  // Reference
  batchNumber: v.optional(v.string()),
  supplierInvoice: v.optional(v.string()),
  notes: v.optional(v.string()),

  // Who
  staffId: v.id("staff"),
  createdAt: v.number(),
})
.index("by_product", ["productId"])
.index("by_org_date", ["organizationId", "createdAt"])
.index("by_org_type", ["organizationId", "type"])
```

---

## Customer-Facing Showcase

### Showcase Page (`/[slug]/products`)

**Purpose:** Digital vitrine for customers to browse available products

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🛍️ Our Products                                                     │
│                                                                     │
│ Discover premium hair care and beauty products available at our    │
│ salon. Ask our staff during your next visit!                       │
├─────────────────────────────────────────────────────────────────────┤
│ [Search products...]                     [All Categories ▼]        │
├─────────────────────────────────────────────────────────────────────┤
│ ⭐ Featured Products                                                │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐              │
│ │     [📷]      │ │     [📷]      │ │     [📷]      │              │
│ │ Kerastase     │ │ Olaplex No.3  │ │ Moroccan Oil  │              │
│ │ Nutritive     │ │ Hair Perfector│ │ Treatment     │              │
│ │ ₺450          │ │ ₺380          │ │ ₺520          │              │
│ │ [View Details]│ │ [View Details]│ │ [View Details]│              │
│ └───────────────┘ └───────────────┘ └───────────────┘              │
├─────────────────────────────────────────────────────────────────────┤
│ Hair Care                                              [View All →] │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐              │
│ │ Shampoo       │ │ Conditioner   │ │ Hair Mask     │              │
│ │ ₺180          │ │ ₺200          │ │ ₺350          │              │
│ └───────────────┘ └───────────────┘ └───────────────┘              │
├─────────────────────────────────────────────────────────────────────┤
│ Styling Products                                       [View All →] │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐              │
│ │ Hair Spray    │ │ Styling Gel   │ │ Wax           │              │
│ │ ₺120          │ │ ₺95           │ │ ₺85           │              │
│ └───────────────┘ └───────────────┘ └───────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

### Product Detail Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                           [Close]   │
│  ┌─────────────────────┐                                           │
│  │                     │  Kerastase Nutritive Bain Satin 1         │
│  │   [Product Image]   │                                           │
│  │                     │  Brand: Kerastase                         │
│  │                     │  Category: Hair Care > Shampoo            │
│  │    [◀] 1/3 [▶]     │                                           │
│  └─────────────────────┘  ₺450                                     │
│                                                                     │
│  Description:                                                       │
│  Premium nourishing shampoo for dry to very dry hair. Enriched     │
│  with Irisome Complex and iris root for exceptional nutrition.     │
│                                                                     │
│  • Deeply nourishes dry hair                                       │
│  • Provides instant softness                                       │
│  • Prepares hair for further treatments                            │
│                                                                     │
│  ────────────────────────────────────────────────────────────────  │
│                                                                     │
│  💬 Interested in this product?                                    │
│                                                                     │
│  Ask our staff during your next visit or mention it when           │
│  booking your appointment!                                         │
│                                                                     │
│  [Book an Appointment]                                             │
└─────────────────────────────────────────────────────────────────────┘
```

**Key UX Points:**

- No "Add to Cart" button - this is a showcase, not e-commerce
- Clear CTA to book appointment or ask staff
- Stock status NOT shown to customers (internal data)
- Clean, aspirational product presentation

---

## Admin Product Management

### Product List (`/[slug]/products`)

**Features:**

- Table view with all products
- Stock quantity, cost price, margin columns
- Low stock indicators (red/yellow badges)
- Quick filters: Low Stock, Out of Stock, By Category
- Bulk actions: Activate, Deactivate, Update Category
- Export to CSV (for accounting)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Products                                    [+ Add Product] [Export]│
├─────────────────────────────────────────────────────────────────────┤
│ [Search...] [Category: All ▼] [Status: All ▼] [🔴 Low Stock Only]  │
├─────────────────────────────────────────────────────────────────────┤
│ □ │ Product         │ Category  │ Stock │ Cost  │ Price │ Margin │  │
│───┼─────────────────┼───────────┼───────┼───────┼───────┼────────┼  │
│ □ │ Kerastase Shamp │ Hair Care │ 🔴 3  │ ₺280  │ ₺450  │ 60.7%  │⋮ │
│ □ │ Olaplex No.3    │ Treatment │ 🟡 8  │ ₺250  │ ₺380  │ 52.0%  │⋮ │
│ □ │ Moroccan Oil    │ Treatment │ 🟢 25 │ ₺320  │ ₺520  │ 62.5%  │⋮ │
│ □ │ Hair Spray Pro  │ Styling   │ 🟢 42 │ ₺65   │ ₺120  │ 84.6%  │⋮ │
├─────────────────────────────────────────────────────────────────────┤
│ Showing 1-20 of 156 products           [◀ Prev] [1] [2] [3] [Next ▶]│
└─────────────────────────────────────────────────────────────────────┘

Legend: 🔴 Below threshold  🟡 Near threshold  🟢 In stock
```

### Product Form

**Tabs:**

1. **Basic Info**
   - Name, description
   - Brand
   - Category selection
   - Tags

2. **Pricing & Cost**
   - Selling price (₺)
   - Cost/purchase price (₺)
   - Profit margin (auto-calculated)

3. **Supplier**
   - Supplier name
   - Contact info
   - Notes

4. **Inventory**
   - Current stock quantity
   - Low stock threshold
   - Reorder quantity (suggested)
   - Batch/lot number
   - Expiration date (if applicable)

5. **Media**
   - Primary image
   - Additional images (gallery)
   - Drag & drop upload

6. **Visibility**
   - Active/Inactive status
   - Show on showcase toggle
   - Featured product toggle

### Inventory Management

#### Stock Adjustment Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│ Stock Adjustment: Kerastase Shampoo                       [Close]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Current Stock: 3 units                                             │
│                                                                     │
│ Transaction Type:                                                   │
│ ○ Purchase (received from supplier)                                │
│ ○ Sold (recorded in-store sale)                                    │
│ ○ Used (used for salon services)                                   │
│ ● Adjustment (inventory correction)                                │
│ ○ Damaged (expired/broken items)                                   │
│ ○ Returned (to supplier)                                           │
│                                                                     │
│ Quantity Change: [+__10__] units                                   │
│ New Stock Will Be: 13 units                                        │
│                                                                     │
│ ┌─ For Purchase Transactions ─────────────────────────────────────┐│
│ │ Unit Cost: [₺__280__]                                           ││
│ │ Supplier Invoice #: [__INV-2024-001__]                          ││
│ │ Batch Number: [__LOT-2024-03__]                                 ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ Notes: [__Monthly restock from supplier______________]             │
│                                                                     │
│ [Cancel]                                    [Save Transaction]      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Inventory History

```
┌─────────────────────────────────────────────────────────────────────┐
│ Inventory History: Kerastase Shampoo                               │
├─────────────────────────────────────────────────────────────────────┤
│ Date       │ Type      │ Qty  │ Stock │ Cost    │ By      │ Notes  │
│────────────┼───────────┼──────┼───────┼─────────┼─────────┼────────│
│ 2024-03-15 │ Purchase  │ +20  │ 23    │ ₺5,600  │ Ahmet   │ March  │
│ 2024-03-12 │ Sold      │ -5   │ 3     │ -       │ Ayşe    │ -      │
│ 2024-03-10 │ Used      │ -2   │ 8     │ -       │ Zeynep  │ Service│
│ 2024-03-08 │ Damaged   │ -1   │ 10    │ -       │ Ahmet   │ Leaked │
│ 2024-03-01 │ Purchase  │ +15  │ 11    │ ₺4,200  │ Ahmet   │ Feb    │
├─────────────────────────────────────────────────────────────────────┤
│ Total Purchased (YTD): 35 units │ Total Cost: ₺9,800              │
│ Total Sold (YTD): 28 units      │ Est. Revenue: ₺12,600           │
└─────────────────────────────────────────────────────────────────────┘
```

### Low Stock Alerts

**Dashboard Widget:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠️ Low Stock Alert                                       [View All] │
├─────────────────────────────────────────────────────────────────────┤
│ 🔴 Kerastase Shampoo         │ 3 left  │ Min: 5  │ [Record Stock]  │
│ 🔴 Olaplex No.3              │ 2 left  │ Min: 5  │ [Record Stock]  │
│ 🟡 Hair Spray Pro            │ 8 left  │ Min: 10 │ [Record Stock]  │
└─────────────────────────────────────────────────────────────────────┘
```

**Email Alert (to Owner/Admin):**

```
Subject: Low Stock Alert - 3 Products Need Attention

Hi Ahmet,

The following products at [Salon Name] are running low:

🔴 Critical (Below Threshold):
• Kerastase Shampoo - 3 units (threshold: 5)
• Olaplex No.3 - 2 units (threshold: 5)

🟡 Warning (Near Threshold):
• Hair Spray Pro - 8 units (threshold: 10)

Log in to record new stock purchases: [Dashboard Link]

Best,
Salon Management System
```

---

## Profit Margin Calculation

### Formula

```
Profit Margin (%) = ((Selling Price - Cost Price) / Cost Price) × 100
```

### Display in Admin

| Product | Cost | Selling | Margin | Health |
|---------|------|---------|--------|--------|
| Kerastase Shampoo | ₺280 | ₺450 | 60.7% | 🟢 Good |
| Generic Shampoo | ₺50 | ₺80 | 60.0% | 🟢 Good |
| Premium Serum | ₺400 | ₺500 | 25.0% | 🟡 Low |
| Discount Item | ₺100 | ₺90 | -10.0% | 🔴 Loss |

**Margin Health Indicators:**

- 🟢 Good: ≥40% margin
- 🟡 Low: 20-39% margin
- 🔴 Loss: <20% margin or negative

---

## API Contracts

### Query: List Products (Admin)

```typescript
export const listProducts = query({
  args: {
    organizationId: v.id("organization"),
    categoryId: v.optional(v.id("productCategories")),
    status: v.optional(v.string()),
    lowStockOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    products: v.array(v.object({
      _id: v.id("products"),
      name: v.string(),
      brand: v.optional(v.string()),
      categoryName: v.optional(v.string()),
      sellingPrice: v.number(),
      costPrice: v.number(),
      profitMargin: v.number(),
      stockQuantity: v.number(),
      lowStockThreshold: v.number(),
      imageUrl: v.optional(v.string()),
      status: v.string(),
      showOnShowcase: v.boolean(),
      featured: v.boolean(),
    })),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => { /* ... */ },
});
```

### Query: Get Showcase Products (Public)

```typescript
export const getShowcaseProducts = query({
  args: {
    organizationId: v.id("organization"),
    categoryId: v.optional(v.id("productCategories")),
    featuredOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("products"),
    name: v.string(),
    description: v.optional(v.string()),
    brand: v.optional(v.string()),
    sellingPrice: v.number(), // Only selling price, not cost
    imageUrl: v.optional(v.string()),
    images: v.array(v.string()),
    categoryName: v.optional(v.string()),
    featured: v.boolean(),
    // Note: No stock info exposed to customers
  })),
  handler: async (ctx, args) => {
    // Only return products with showOnShowcase = true and status = "active"
  },
});
```

### Query: Get Low Stock Products

```typescript
export const getLowStockProducts = query({
  args: {
    organizationId: v.id("organization"),
  },
  returns: v.array(v.object({
    _id: v.id("products"),
    name: v.string(),
    stockQuantity: v.number(),
    lowStockThreshold: v.number(),
    reorderQuantity: v.optional(v.number()),
    supplier: v.optional(v.object({
      name: v.string(),
      contactEmail: v.optional(v.string()),
    })),
  })),
  handler: async (ctx, args) => {
    return ctx.db
      .query("products")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) =>
        q.lte(q.field("stockQuantity"), q.field("lowStockThreshold"))
      )
      .collect();
  },
});
```

### Mutation: Create Product

```typescript
export const createProduct = mutation({
  args: {
    organizationId: v.id("organization"),
    name: v.string(),
    description: v.optional(v.string()),
    brand: v.optional(v.string()),
    categoryId: v.optional(v.id("productCategories")),
    sellingPrice: v.number(),
    costPrice: v.number(),
    supplier: v.optional(v.object({
      name: v.string(),
      contactEmail: v.optional(v.string()),
      contactPhone: v.optional(v.string()),
      notes: v.optional(v.string()),
    })),
    stockQuantity: v.number(),
    lowStockThreshold: v.number(),
    reorderQuantity: v.optional(v.number()),
    batchNumber: v.optional(v.string()),
    expirationDate: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    showOnShowcase: v.boolean(),
    featured: v.optional(v.boolean()),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    // Calculate profit margin
    const profitMargin = ((args.sellingPrice - args.costPrice) / args.costPrice) * 100;

    return ctx.db.insert("products", {
      ...args,
      profitMargin,
      tags: [],
      images: [],
      status: args.stockQuantity > 0 ? "active" : "out_of_stock",
      featured: args.featured ?? false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
```

### Mutation: Record Inventory Transaction

```typescript
export const recordInventoryTransaction = mutation({
  args: {
    productId: v.id("products"),
    type: v.union(
      v.literal("purchase"),
      v.literal("sold"),
      v.literal("used"),
      v.literal("adjustment"),
      v.literal("damaged"),
      v.literal("returned")
    ),
    quantity: v.number(), // Positive for additions, negative for reductions
    unitCost: v.optional(v.number()),
    batchNumber: v.optional(v.string()),
    supplierInvoice: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    newStock: v.number(),
    isLowStock: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    const previousStock = product.stockQuantity;
    const newStock = previousStock + args.quantity;

    if (newStock < 0) {
      throw new ConvexError("Cannot reduce stock below zero");
    }

    // Update product
    await ctx.db.patch(args.productId, {
      stockQuantity: newStock,
      status: newStock <= 0 ? "out_of_stock" : "active",
      ...(args.batchNumber && { batchNumber: args.batchNumber }),
      updatedAt: Date.now(),
    });

    // Record transaction
    await ctx.db.insert("inventoryTransactions", {
      organizationId: product.organizationId,
      productId: args.productId,
      type: args.type,
      quantity: args.quantity,
      previousStock,
      newStock,
      unitCost: args.unitCost,
      totalCost: args.unitCost ? Math.abs(args.quantity) * args.unitCost : undefined,
      batchNumber: args.batchNumber,
      supplierInvoice: args.supplierInvoice,
      notes: args.notes,
      staffId: /* from auth context */,
      createdAt: Date.now(),
    });

    // Check for low stock alert
    const isLowStock = newStock <= product.lowStockThreshold;
    if (isLowStock && previousStock > product.lowStockThreshold) {
      // Trigger low stock notification (newly crossed threshold)
      await createLowStockNotification(ctx, product);
    }

    return { success: true, newStock, isLowStock };
  },
});
```

### Query: Get Inventory History

```typescript
export const getInventoryHistory = query({
  args: {
    productId: v.id("products"),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("inventoryTransactions"),
    type: v.string(),
    quantity: v.number(),
    previousStock: v.number(),
    newStock: v.number(),
    unitCost: v.optional(v.number()),
    totalCost: v.optional(v.number()),
    batchNumber: v.optional(v.string()),
    supplierInvoice: v.optional(v.string()),
    notes: v.optional(v.string()),
    staffName: v.string(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => { /* ... */ },
});
```

---

## Implementation Checklist

### Backend (Convex)

- [ ] Schema: `products` table with full inventory fields
- [ ] Schema: `productCategories` table
- [ ] Schema: `inventoryTransactions` table
- [ ] Query: `listProducts` (admin with cost/margin)
- [ ] Query: `getShowcaseProducts` (public, no cost info)
- [ ] Query: `searchProducts`
- [ ] Query: `getProductById`
- [ ] Query: `getLowStockProducts`
- [ ] Query: `getInventoryHistory`
- [ ] Query: `getInventorySummary` (YTD totals)
- [ ] Mutation: `createProduct`
- [ ] Mutation: `updateProduct`
- [ ] Mutation: `deleteProduct` (soft delete)
- [ ] Mutation: `recordInventoryTransaction`
- [ ] Mutation: `createCategory`
- [ ] Mutation: `updateCategory`
- [ ] Mutation: `deleteCategory`
- [ ] Action: `sendLowStockAlert`

### Frontend (Next.js)

- [ ] Page: `/[slug]/products` (admin list & public showcase - role-based rendering)
- [ ] Page: `/[slug]/products/new`
- [ ] Page: `/[slug]/products/[id]`
- [ ] Page: `/[slug]/products/categories`
- [ ] Page: `/[slug]/products/[id]/history`
- [ ] Component: `ShowcaseGrid`
- [ ] Component: `ShowcaseProductCard`
- [ ] Component: `ProductDetailModal` (public)
- [ ] Component: `AdminProductTable`
- [ ] Component: `ProductForm`
- [ ] Component: `InventoryTransactionModal`
- [ ] Component: `InventoryHistoryTable`
- [ ] Component: `LowStockAlert`
- [ ] Component: `ProfitMarginBadge`
- [ ] Hook: `useShowcaseProducts`
- [ ] Hook: `useAdminProducts`
- [ ] Hook: `useLowStockProducts`
- [ ] Hook: `useInventoryHistory`

### Tests

- [ ] Unit: Profit margin calculation
- [ ] Unit: Stock level validation
- [ ] Integration: Inventory transaction flow
- [ ] Integration: Low stock alert trigger
- [ ] E2E: Product CRUD
- [ ] E2E: Inventory management
- [ ] E2E: Public showcase view

---

## Future Enhancements (P2+)

| Feature | Priority | Description |
|---------|----------|-------------|
| Purchase orders | P2 | Create POs to suppliers |
| Barcode scanning | P2 | Scan products for quick lookup |
| Supplier portal | P3 | Suppliers view orders, update status |
| Automatic reorder | P3 | Auto-generate POs at threshold |
| Expiration alerts | P2 | Notify before products expire |
| Product bundles | P3 | Create kits with multiple products |
| Cost history | P2 | Track cost price changes over time |
