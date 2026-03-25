# Raft POS — 7 Feature Expansion Design Spec

**Date:** 2026-03-24
**Project:** Raft POS (Electron + React + MongoDB)
**Scope:** 7 new features to be built sequentially, each with its own implementation cycle.

---

## Build Order

| # | Feature | Effort | Dependencies |
|---|---------|--------|--------------|
| 1 | Expense Tracking (Drawer Pay-Out) | Small | Cash Drawer |
| 2 | Customer Management + Loyalty | Large | Settings, POS |
| 3 | Stock Transfers Between Branches | Medium | Branches, Inventory |
| 4 | Layaway / On-Account Sales | Medium | POS, Customers |
| 5 | Shift Management / Clock In-Out | Medium | Users, Reporting |
| 6 | Product Variants | Large | Products, POS |
| 7 | Profit Margin / COGS Reporting | Medium | Products, POs, Reporting |

---

## Feature 1 — Expense Tracking (Drawer Pay-Out)

### Context
Cash pay-outs from the drawer (petty cash, COD deliveries, supplies) are currently untracked. This creates reconciliation gaps in the Z-report. Cashiers need to record pay-outs; managers review and approve/reject them asynchronously.

### Data Model
Embed `payOuts` array in the existing `CashDrawer` document (no new collection — pay-outs belong to their drawer session):

```typescript
payOuts: [{
  _id: ObjectId           // auto-generated
  amount: number          // positive number, in pesos
  reason: string          // free text description
  category: 'supplies' | 'cod_delivery' | 'petty_cash' | 'other'
  recipient: string       // person/vendor who received the cash
  recordedBy: ObjectId    // ref: User
  recordedAt: Date
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy: ObjectId | null
  reviewedAt: Date | null
  reviewNote: string | null
}]
```

`expectedCash` calculation updated: `openingCash + totalCash - sum(approvedPayOuts.amount)`

### Permissions
- New permission: `can_approve_payouts` — added to `permissions.ts` and default Admin role

### IPC Channels
| Channel constant | String value | Auth | Description |
|---------|------|------|-------------|
| `DRAWER_PAY_OUT` | `'drawer:payOut'` | `can_open_close_drawer` + open drawer required | Cashier records a pay-out |
| `DRAWER_REVIEW_PAY_OUT` | `'drawer:reviewPayOut'` | `can_approve_payouts` | Manager approves or rejects |
| `DRAWER_GET_PAY_OUTS` | `'drawer:getPayOuts'` | any authenticated | List pay-outs for a drawer |

### UI Changes
1. **CashDrawerPage** — "Record Pay-Out" button visible only when drawer is open. Opens modal: Amount (₱), Category (dropdown), Reason (text), Recipient (text). Shows pending pay-outs list below drawer status.
2. **ReportingPage** — New "Pay-Out Approvals" tab. Table of all pay-outs filterable by status/date/branch. Approve/Reject buttons with optional note. Shows approver name and timestamp after review.
3. **Z-Report** — Updated HTML template to include pay-out subtotal line and adjusted expected cash.

### Files to Create/Modify
- `src/main/models/cash-drawer.model.ts` — add `payOuts` subdocument array
- `src/main/services/cash-drawer.service.ts` — add `recordPayOut()`, `reviewPayOut()`, `getPayOuts()`; update `closeDrawer()` to subtract approved pay-outs
- `src/main/handlers/cash-drawer.handlers.ts` — add 3 new IPC handlers
- `src/shared/types/ipc.types.ts` — add `DRAWER_PAY_OUT`, `DRAWER_REVIEW_PAY_OUT`, `DRAWER_GET_PAY_OUTS`
- `src/shared/types/permissions.ts` — add `CAN_APPROVE_PAYOUTS`
- `src/renderer/src/pages/cash-drawer/CashDrawerPage.tsx` — add pay-out button + modal + pending list
- `src/renderer/src/pages/reporting/ReportingPage.tsx` — add Pay-Out Approvals tab

---

## Feature 2 — Customer Management + Loyalty Program

### Context
No customer tracking exists. Square, Shopify POS, Clover all treat this as core. Stores cannot identify repeat customers or reward loyalty. Primary lookup at POS is phone number.

### Data Models

**Customer collection:**
```typescript
{
  _id: ObjectId
  name: string
  phone: string           // unique, primary lookup key
  email?: string
  address?: string
  notes?: string
  pointsBalance: number   // current redeemable points
  lifetimeSpend: number   // total pesos spent (all time)
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

**LoyaltyLedger collection:**
```typescript
{
  _id: ObjectId
  customerId: ObjectId    // ref: Customer
  transactionId: ObjectId | null  // ref: Transaction (null for manual adjustments)
  type: 'earn' | 'redeem' | 'adjust'
  points: number          // positive for earn/adjust, negative for redeem
  balanceBefore: number
  balanceAfter: number
  note?: string
  createdAt: Date
}
```

**Settings document** — add loyalty config fields:
```typescript
loyaltyPointsPerPeso: number    // default: 1
loyaltyPesoPerPoint: number     // default: 1
loyaltyMinRedemption: number    // minimum points before redeeming, default: 100
```

### Permissions
- New permission: `can_manage_customers`

### IPC Channels
| Channel constant | String value | Description |
|---------|------|-------------|
| `CUSTOMER_SEARCH` | `'customers:search'` | Search by phone number (for POS lookup) |
| `CUSTOMER_GET_ALL` | `'customers:getAll'` | Paginated list for management page |
| `CUSTOMER_GET` | `'customers:get'` | Get single customer with loyalty summary |
| `CUSTOMER_CREATE` | `'customers:create'` | Create new customer |
| `CUSTOMER_UPDATE` | `'customers:update'` | Update customer details |
| `CUSTOMER_GET_HISTORY` | `'customers:getHistory'` | Get transaction + loyalty ledger history |

### POS Integration
- Phone number search field added to checkout area (optional — cashier can skip)
- Selected customer shown as chip with name + points balance
- PaymentModal: "Redeem Points" toggle (visible only when customer selected and balance ≥ minimum). Shows discount applied, remaining points after redemption.
- On transaction completion: points earned calculated and ledger entry written atomically with transaction save.

### UI
- New `/customers` sidebar route with `CustomersPage` — table with search, create, edit
- Customer detail slide-over panel: profile fields, points balance, lifetime spend, transaction history, loyalty ledger
- Settings > General tab: new Loyalty Program section with ratio config fields

### Files to Create/Modify
- `src/main/models/customer.model.ts` — new
- `src/main/models/loyalty-ledger.model.ts` — new (imported inside `customer.service.ts`; Mongoose registers it automatically on first import)
- `src/main/services/customer.service.ts` — new (imports both Customer and LoyaltyLedger models)
- `src/main/handlers/customer.handlers.ts` — new
- `src/main/handlers/registry.ts` — add `registerCustomerHandlers()` import + call
- `src/shared/types/ipc.types.ts` — add CUSTOMER_* channels
- `src/shared/types/permissions.ts` — add `CAN_MANAGE_CUSTOMERS`
- `src/renderer/src/pages/customers/CustomersPage.tsx` — new
- `src/renderer/src/hooks/useCustomers.ts` — new
- `src/renderer/src/pages/pos/PosPage.tsx` — add customer selector
- `src/renderer/src/pages/pos/PaymentModal.tsx` — add points redemption
- `src/renderer/src/components/layout/Sidebar.tsx` — add Customers nav item
- `src/renderer/src/pages/settings/SettingsPage.tsx` — add loyalty config section

---

## Feature 3 — Stock Transfers Between Branches

### Context
Permissions `can_approve_stock_transfer` and `can_receive_stock_transfer` already exist — this feature was planned but never built. Essential for multi-branch operations. The `STREAM_STOCK_TRANSFERS` push channel is also already defined.

### Data Model

**StockTransfer collection:**
```typescript
{
  _id: ObjectId
  fromBranchId: ObjectId    // ref: Branch
  toBranchId: ObjectId      // ref: Branch
  items: [{
    productId: ObjectId     // ref: Product
    productName: string     // snapshot at time of transfer
    quantity: number
    unitCost: number        // snapshot of cost price at transfer time
  }]
  status: 'draft' | 'pending' | 'approved' | 'in_transit' | 'received' | 'rejected' | 'cancelled'
  requestedBy: ObjectId     // ref: User
  approvedBy: ObjectId | null
  receivedBy: ObjectId | null
  notes?: string
  rejectionReason?: string
  createdAt: Date
  updatedAt: Date
}
```

**Inventory update on receive:** Atomic `bulkWrite` — decrement source branch stock, increment destination branch stock per item.

### IPC Channels
| Channel constant | String value | Permission | Description |
|---------|------|-----------|-------------|
| `TRANSFER_CREATE` | `'transfer:create'` | any auth | Create draft or submit transfer request |
| `TRANSFER_GET_ALL` | `'transfer:getAll'` | any auth | List transfers (filtered by branch/status) |
| `TRANSFER_GET` | `'transfer:get'` | any auth | Get single transfer with product details |
| `TRANSFER_APPROVE` | `'transfer:approve'` | `can_approve_stock_transfer` | Approve pending transfer |
| `TRANSFER_REJECT` | `'transfer:reject'` | `can_approve_stock_transfer` | Reject with reason |
| `TRANSFER_RECEIVE` | `'transfer:receive'` | `can_receive_stock_transfer` | Confirm receipt, update inventory |
| `TRANSFER_CANCEL` | `'transfer:cancel'` | requestedBy user or manager | Cancel draft/pending transfer |

### UI
- New "Stock Transfers" page under Inventory section in sidebar
- Transfer list with status filter tabs (All / Pending / In Transit / Received)
- Create transfer form: select source branch, destination branch, add products with quantities
- Transfer detail view: status stepper (Draft → Pending → Approved → In Transit → Received), item list, action buttons based on current status and user permissions

### Files to Create/Modify
- `src/main/models/stock-transfer.model.ts` — new
- `src/main/services/stock-transfer.service.ts` — new
- `src/main/handlers/stock-transfer.handlers.ts` — new
- `src/main/handlers/registry.ts` — add `registerStockTransferHandlers()` import + call
- `src/main/db/change-streams.ts` — re-enable `stock_transfers` collection entry (was commented out pending this feature)
- `src/shared/types/ipc.types.ts` — add TRANSFER_* channels
- `src/renderer/src/pages/inventory/StockTransfersPage.tsx` — new
- `src/renderer/src/hooks/useStockTransfers.ts` — new
- `src/renderer/src/components/layout/Sidebar.tsx` — add nav item under Inventory

---

## Feature 4 — Layaway / On-Account Sales

### Context
Hardware stores frequently deal with contractors who reserve large items or buy on account. Currently all sales must be paid in full at checkout.

### Data Model
Extend existing `Transaction` model:
```typescript
// New statuses added to existing status union:
status: 'completed' | 'voided' | 'refunded' | 'partially_refunded' | 'layaway' | 'on_account'

// New fields added to Transaction:
depositAmount?: number          // initial deposit for layaway
balanceDue?: number             // remaining balance
customerId?: ObjectId           // optional customer link (ref: Customer)
partialPayments?: [{
  amount: number
  method: 'cash' | 'card' | 'gcash' | 'paymaya'  // must mirror payments.method enum in transaction.model.ts — update both in lockstep if new methods are added
  paidAt: Date
  recordedBy: ObjectId          // ref: User
  note?: string
}]
dueDate?: Date                  // optional target completion date for layaway
```

### IPC Channels
| Channel constant | String value | Description |
|---------|------|-------------|
| `POS_CREATE_LAYAWAY` | `'pos:createLayaway'` | Create layaway transaction with deposit |
| `POS_CREATE_ON_ACCOUNT` | `'pos:createOnAccount'` | Create on-account transaction |
| `POS_SETTLE_LAYAWAY` | `'pos:settleLayaway'` | Record partial or full payment against layaway/on-account |
| `POS_GET_LAYAWAYS` | `'pos:getLayaways'` | List open layaway/on-account transactions |

### UI
- **PaymentModal** — New payment type tabs: "Full Payment" (existing), "Layaway", "On Account". Layaway shows deposit amount field. On Account requires customer to be selected (customer must exist — `pos.service.ts` must validate the `customerId` exists in the Customer collection before saving the transaction).
- **TransactionsPage** — New "Layaway / On Account" filter tab. Shows balance due column. "Settle" button opens payment modal for remaining balance.
- Receipt updated to show "LAYAWAY — Balance Due: ₱X,XXX"

### Files to Create/Modify
- `src/main/models/transaction.model.ts` — add new statuses + fields
- `src/main/handlers/pos.handlers.ts` — add 4 new IPC handlers
- `src/main/services/pos.service.ts` — add layaway/on-account logic
- `src/shared/types/ipc.types.ts` — add POS_CREATE_LAYAWAY, POS_CREATE_ON_ACCOUNT, POS_SETTLE_LAYAWAY, POS_GET_LAYAWAYS
- `src/renderer/src/pages/pos/PaymentModal.tsx` — add layaway/on-account tabs
- `src/renderer/src/pages/transactions/TransactionsPage.tsx` — add layaway filter + settle action

---

## Feature 5 — Shift Management / Clock In-Out

### Context
No way to track who worked when or correlate cashier performance to sales. Independent from cash drawer (clock in/out is a separate action).

### Data Model

**Shift collection:**
```typescript
{
  _id: ObjectId
  userId: ObjectId          // ref: User
  branchId: ObjectId        // ref: Branch
  terminalId: string
  clockIn: Date
  clockOut: Date | null
  totalSales: number        // calculated on clock-out
  totalTransactions: number
  totalDiscounts: number
  totalVoids: number
  status: 'open' | 'closed'
  notes?: string
  createdAt: Date
  updatedAt: Date           // updated on clock-out (use Mongoose { timestamps: true })
}
```

### IPC Channels
| Channel constant | String value | Description |
|---------|------|-------------|
| `SHIFT_CLOCK_IN` | `'shift:clockIn'` | Start a shift for current user |
| `SHIFT_CLOCK_OUT` | `'shift:clockOut'` | End current user's open shift (calculates totals) |
| `SHIFT_GET_OPEN` | `'shift:getOpen'` | Get current user's open shift |
| `SHIFT_GET_ALL` | `'shift:getAll'` | List shifts (manager view, filterable by user/date/branch) |

### Permissions
- New permission: `can_manage_shifts` — view all shifts across users/branches

### UI
- **App header or sidebar footer** — Clock In/Out button showing current shift status (duration if clocked in)
- **Clock-out modal** — Shows shift summary: duration, transactions processed, total sales, discounts given, voids
- **ReportingPage** — New "Shifts" report tab. Table filterable by user, date range, branch. Shows per-shift and aggregate metrics. Export to CSV/PDF like existing reports.

### Files to Create/Modify
- `src/main/models/shift.model.ts` — new
- `src/main/services/shift.service.ts` — new
- `src/main/handlers/shift.handlers.ts` — new
- `src/main/handlers/registry.ts` — add `registerShiftHandlers()` import + call
- `src/shared/types/ipc.types.ts` — add SHIFT_* channels
- `src/shared/types/permissions.ts` — add `CAN_MANAGE_SHIFTS`
- `src/renderer/src/hooks/useShift.ts` — new
- `src/renderer/src/components/layout/Sidebar.tsx` or AppHeader — add clock in/out UI
- `src/renderer/src/pages/reporting/ReportingPage.tsx` — add Shifts tab

---

## Feature 6 — Product Variants (Size / Color / Unit)

### Context
A hardware store sells the same bolt in M6/M8/M10 sizes — currently stored as separate products with separate SKUs. Variants group them under one parent with shared attributes, while inheriting price/cost from parent when not explicitly set.

### Data Model
Extend existing `Product` model:
```typescript
// New fields on Product:
hasVariants: boolean          // true on parent products
variantGroupId?: ObjectId     // ref: Product (parent) — set on variant products
variantLabel?: string         // e.g. "M6 × 30mm", "Red", "500ml"
variantPrice?: number | null  // overrides parent price if set
variantCostPrice?: number | null  // overrides parent costPrice if set
```

Effective price resolution: `variantPrice ?? parent.price`
Effective cost price: `variantCostPrice ?? parent.costPrice ?? null` (null = unknown margin, handled gracefully — no margin % shown)

### UI
- **ProductFormModal** — "This product has variants" toggle. When enabled, shows variant management section: list of existing variants, add variant button (opens sub-form with label, price override, cost price override, SKU, stock).
- **ProductsPage** — Parent products show expand arrow. Expanded row shows variants indented below with their own stock/price. Variant rows have edit/deactivate actions.
- **POS ProductSearchPanel** — When a parent product (hasVariants=true) is selected, show variant picker popup before adding to cart. Displays variant label, price, and stock for each variant.
- **POS CartItem** — Shows variant label as subtitle under product name.

### Files to Create/Modify
- `src/main/models/product.model.ts` — add variant fields; add index on `variantGroupId` for efficient "get all variants of parent" queries
- `src/main/services/product.service.ts` — update `toShared()`, queries to handle variant grouping
- `src/main/handlers/product.handlers.ts` — ensure create/update handles variant fields
- `src/renderer/src/pages/products/ProductsPage.tsx` — grouped variant display
- `src/renderer/src/pages/products/ProductFormModal.tsx` — variant management UI
- `src/renderer/src/pages/pos/ProductSearchPanel.tsx` — variant picker popup
- `src/renderer/src/pages/pos/PosPage.tsx` or cart logic — variant label in cart items

---

## Feature 7 — Profit Margin / COGS Reporting

### Context
The system tracks selling price and purchase price in POs but never surfaces profitability. Owners cannot make pricing decisions without seeing margins. Cost price is auto-populated from the latest received PO line item and can be manually overridden.

### Data Model
The existing `Product` model already has `costPrice: number` as `required: true, min: 0`. This field must be changed to optional/nullable to support "unknown margin" products.

**Migration note:** `required: true` is removed and the field becomes `costPrice?: number | null`. Existing products with `costPrice: 0` will be treated as "set to zero" not "unknown" — set `costPriceSource` to distinguish. New products without a cost price will have `costPrice: null`.

New fields added to `Product`:
```typescript
costPrice?: number | null         // was required:true — now optional; null = unknown margin
costPriceUpdatedAt?: Date | null
costPriceSource?: 'manual' | 'purchase_order' | null
```

**Downstream impact of nullable `costPrice`:** All callers of `product.costPrice` must guard against null:
- `product.service.ts` — `toShared()` must handle null
- `reporting.service.ts` — `getProfitabilityReport()` (new) excludes null-cost products from COGS totals and shows them in a separate "unknown margin" section
- `reporting.service.ts` — `getInventoryValuation()` (existing) uses `$multiply: ['$quantity', '$product.costPrice']`; must add `$ifNull: ['$product.costPrice', 0]` to prevent null/NaN in the total value column
- POS receipt template — any cost price display must handle null gracefully

**Auto-populate trigger:** When a Purchase Order is marked as received, `purchase-order.service.ts` inside the existing `receivePO()` function's `session.withTransaction()` call updates each line item's product: sets `costPrice` to the PO unit cost, `costPriceUpdatedAt` to now, `costPriceSource` to `'purchase_order'` — **only if `costPriceSource !== 'manual'`** to preserve manual overrides.

### IPC Channels
| Channel constant | String value | Description |
|---------|------|-------------|
| `REPORTING_GET_PROFITABILITY` | `'reporting:getProfitability'` | Get profitability report by product/category/date range |

### Profitability Report Query
Aggregates completed transactions within date range, joins with product cost prices, calculates per-product and per-category:
- Revenue (selling price × quantity sold)
- COGS (cost price × quantity sold)
- Gross Profit (Revenue - COGS)
- Margin % ((Gross Profit / Revenue) × 100)

Products with null `costPrice` shown separately as "unknown margin."

### UI
- **ProductsPage** — New "Margin" column: shows `(price - costPrice) / price * 100` as percentage with color coding (green > 30%, yellow 10–30%, red < 10%). "—" if no cost price.
- **ProductFormModal** — "Cost Price" field with source indicator ("Set from PO on [date]" or "Manual").
- **ReportingPage** — New "Profitability" tab. Filterable by date range, category, product. Sortable by margin %. Shows revenue/COGS/profit/margin columns. Export to CSV/PDF.

### Files to Create/Modify
- `src/main/models/product.model.ts` — change `costPrice` from required to optional/nullable; add `costPriceUpdatedAt`, `costPriceSource`
- `src/main/services/product.service.ts` — update `toShared()` and any callers that assumed costPrice is non-null
- `src/main/services/reporting.service.ts` — add `getProfitabilityReport()`
- `src/main/handlers/reporting.handlers.ts` — add REPORTING_GET_PROFITABILITY handler
- `src/main/services/purchase-order.service.ts` — inside `receivePO()` `session.withTransaction()`, add product cost price update per line item (not in the handler — must be atomic with the PO receive operation)
- `src/shared/types/ipc.types.ts` — add REPORTING_GET_PROFITABILITY
- `src/renderer/src/pages/products/ProductsPage.tsx` — add Margin column
- `src/renderer/src/pages/products/ProductFormModal.tsx` — add Cost Price field
- `src/renderer/src/pages/reporting/ReportingPage.tsx` — add Profitability tab

---

## Verification (Per Feature)

Each feature should be verified by:
1. **Main process:** Restart `npm run dev` after any handler/model/service changes
2. **Renderer:** Hot reload covers UI changes
3. **Manual test flow** specific to each feature (detailed in implementation plans)
4. **Permission test:** Verify restricted actions are blocked for roles without the new permission
