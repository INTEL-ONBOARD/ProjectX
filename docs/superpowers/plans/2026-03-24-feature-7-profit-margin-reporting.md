# Feature 7: Profit Margin / COGS Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface profitability data throughout the system — margin % column on ProductsPage, cost price field in ProductFormModal (auto-populated from latest received PO), and a Profitability report tab in ReportingPage with revenue/COGS/profit/margin breakdown.

**Architecture:** Change `costPrice` on the existing `Product` model from `required: true` to optional/nullable. Add `costPriceUpdatedAt` and `costPriceSource` fields. Auto-populate on PO receive inside the existing `receivePO()` transaction in `purchase-order.service.ts`. New `REPORTING_GET_PROFITABILITY` IPC channel with a MongoDB aggregation pipeline. Update `getInventoryValuation()` to handle null cost prices.

**Tech Stack:** Mongoose (schema migration), MongoDB aggregation ($ifNull), Electron ipcMain, React + React Query, TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/main/models/product.model.ts` | Modify | Make costPrice optional/nullable; add costPriceUpdatedAt, costPriceSource |
| `src/main/services/product.service.ts` | Modify | Update toShared() to handle nullable costPrice |
| `src/main/services/reporting.service.ts` | Modify | Add getProfitabilityReport(); fix getInventoryValuation() null guard |
| `src/main/services/purchase-order.service.ts` | Modify | Update costPrice in receivePO() transaction |
| `src/main/handlers/reporting.handlers.ts` | Modify | Add REPORTING_GET_PROFITABILITY handler |
| `src/shared/types/ipc.types.ts` | Modify | Add REPORTING_GET_PROFITABILITY |
| `src/renderer/src/pages/products/ProductsPage.tsx` | Modify | Add Margin % column |
| `src/renderer/src/pages/products/ProductFormModal.tsx` | Modify | Add Cost Price field with source indicator |
| `src/renderer/src/pages/reporting/ReportingPage.tsx` | Modify | Add Profitability tab |

---

## Task 1: Update the Product model

**Files:**
- Modify: `src/main/models/product.model.ts`

- [ ] **Step 1: Update `IProduct` interface**

Change `costPrice` from `number` to `number | null` and add new fields:
```typescript
costPrice: number | null  // was: number
costPriceUpdatedAt: Date | null
costPriceSource: 'manual' | 'purchase_order' | null
```

- [ ] **Step 2: Update the schema**

Change:
```typescript
// Before:
costPrice: { type: Number, required: true, min: 0 },

// After:
costPrice: { type: Number, default: null, min: 0 },
costPriceUpdatedAt: { type: Date, default: null },
costPriceSource: { type: String, enum: ['manual', 'purchase_order'], default: null },
```

**Note:** Existing products with `costPrice: 0` will now show `costPriceSource: null` (treated as "not set from PO"). This is intentional — zero cost is a valid but ambiguous value. The ProductFormModal will allow setting `costPriceSource` explicitly.

- [ ] **Step 3: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/models/product.model.ts
git commit -m "feat: make costPrice nullable on Product model; add costPriceUpdatedAt, costPriceSource"
```

---

## Task 2: Add IPC channel

**Files:**
- Modify: `src/shared/types/ipc.types.ts`

- [ ] **Step 1: Add the profitability channel**

After the existing REPORTING_* channels, add:

```typescript
  REPORTING_GET_PROFITABILITY: 'reporting:getProfitability',
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/types/ipc.types.ts
git commit -m "feat: add REPORTING_GET_PROFITABILITY IPC channel"
```

---

## Task 3: Update product service

**Files:**
- Modify: `src/main/services/product.service.ts`

- [ ] **Step 1: Read `product.service.ts` and find the `toShared` function**

- [ ] **Step 2: Update `toShared()` to handle nullable costPrice**

Find all places that use `doc.costPrice` and add null guards:

```typescript
// In toShared():
costPrice: doc.costPrice ?? null,
costPriceUpdatedAt: doc.costPriceUpdatedAt ? new Date(doc.costPriceUpdatedAt).toISOString() : null,
costPriceSource: doc.costPriceSource ?? null,
```

Also update the shared type/interface to reflect `costPrice: number | null`.

- [ ] **Step 3: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/services/product.service.ts
git commit -m "feat: update product service toShared() to handle nullable costPrice"
```

---

## Task 4: Fix `getInventoryValuation()` and add `getProfitabilityReport()`

**Files:**
- Modify: `src/main/services/reporting.service.ts`

- [ ] **Step 1: Read `reporting.service.ts` to find `getInventoryValuation()` and understand the existing aggregation patterns**

- [ ] **Step 2: Fix `getInventoryValuation()` to guard against null `costPrice`**

Find the `$multiply: ['$quantity', '$product.costPrice']` expression and wrap it with `$ifNull`:

```typescript
// Before:
totalValue: { $multiply: ['$quantity', '$product.costPrice'] }

// After:
totalValue: { $multiply: ['$quantity', { $ifNull: ['$product.costPrice', 0] }] }
```

This prevents NaN in the total value column when a product has no cost price set.

- [ ] **Step 3: Add `getProfitabilityReport()` function**

```typescript
export async function getProfitabilityReport(filters: {
  from?: Date
  to?: Date
  categoryId?: string | null
}): Promise<{ byProduct: any[]; byCategory: any[]; unknownMargin: any[] }> {
  const matchStage: any = {
    status: { $in: ['completed', 'partially_refunded'] },
  }
  if (filters.from || filters.to) {
    matchStage.createdAt = {}
    if (filters.from) matchStage.createdAt.$gte = filters.from
    if (filters.to) matchStage.createdAt.$lte = filters.to
  }

  // Aggregate sold quantities and revenue by product
  const salesAgg = await Transaction.aggregate([
    { $match: matchStage },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        revenue: { $sum: '$items.totalPrice' },
        quantitySold: { $sum: '$items.quantity' },
        productName: { $first: '$items.name' },
        unitCost: { $first: '$items.unitCost' }, // snapshot from transaction
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product',
      }
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        productId: '$_id',
        productName: 1,
        categoryId: '$product.categoryId',
        revenue: 1,
        quantitySold: 1,
        // Use current costPrice if available, fall back to transaction unitCost snapshot
        costPrice: { $ifNull: ['$product.costPrice', '$unitCost'] },
        cogs: {
          $multiply: [
            '$quantitySold',
            { $ifNull: ['$product.costPrice', '$unitCost'] }
          ]
        },
      }
    },
    {
      $addFields: {
        grossProfit: { $subtract: ['$revenue', '$cogs'] },
        marginPct: {
          $cond: [
            { $gt: ['$revenue', 0] },
            { $multiply: [{ $divide: [{ $subtract: ['$revenue', '$cogs'] }, '$revenue'] }, 100] },
            0
          ]
        }
      }
    },
    { $sort: { revenue: -1 } },
  ])

  // Split into known-margin and unknown-margin groups
  // unknown = product has no costPrice AND transaction had unitCost = 0
  const byProduct = salesAgg.filter(r => r.costPrice !== null && r.costPrice > 0)
  const unknownMargin = salesAgg.filter(r => !r.costPrice)

  // Aggregate by category
  const byCategory = Object.values(
    byProduct.reduce((acc: any, r) => {
      const key = r.categoryId?.toString() ?? 'uncategorized'
      if (!acc[key]) acc[key] = { categoryId: key, revenue: 0, cogs: 0, grossProfit: 0 }
      acc[key].revenue += r.revenue
      acc[key].cogs += r.cogs
      acc[key].grossProfit += r.grossProfit
      return acc
    }, {})
  ).map((c: any) => ({
    ...c,
    marginPct: c.revenue > 0 ? (c.grossProfit / c.revenue) * 100 : 0
  }))

  return { byProduct, byCategory, unknownMargin }
}
```

- [ ] **Step 4: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/services/reporting.service.ts
git commit -m "feat: fix getInventoryValuation null guard and add getProfitabilityReport()"
```

---

## Task 5: Auto-populate cost price on PO receive

**Files:**
- Modify: `src/main/services/purchase-order.service.ts`

- [ ] **Step 1: Read `purchase-order.service.ts` and find the `receivePO()` function and its `session.withTransaction()` call**

Look carefully at the variable names used for the PO items inside the transaction block. In `receivePO()` the items are typically accessed via `input.items` or a variable set from `po.items`. Use the same variable name that the existing code uses (not `receivedItems`, which does not exist).

- [ ] **Step 2: Add cost price update inside the transaction**

After the inventory update `for` loop inside `session.withTransaction()`, add:

```typescript
// Auto-update product cost prices from PO line items
// Loop mirrors the existing for (const receiveItem of input.items) loop above it.
// po.items is populated before the transaction; poItem.unitCost is the agreed unit cost.
for (const receiveItem of input.items) {
  const poItem = (po.items as any[]).find(
    (it: any) => it.productId.toString() === receiveItem.productId.toString()
  )
  if (!poItem) continue
  await Product.updateOne(
    {
      _id: receiveItem.productId,
      $or: [
        { costPriceSource: { $ne: 'manual' } },
        { costPriceSource: null },
        { costPriceSource: { $exists: false } },
      ]
    },
    {
      $set: {
        costPrice: poItem.unitCost,
        costPriceUpdatedAt: new Date(),
        costPriceSource: 'purchase_order',
      }
    },
    { session }
  )
}
```

- [ ] **Step 3: Import Product model at the top if not already imported**

```typescript
import { Product } from '../models/product.model'
```

- [ ] **Step 4: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/services/purchase-order.service.ts
git commit -m "feat: auto-update product costPrice when PO is received"
```

---

## Task 6: Add reporting handler

**Files:**
- Modify: `src/main/handlers/reporting.handlers.ts`

- [ ] **Step 1: Read `reporting.handlers.ts` to understand the existing pattern**

- [ ] **Step 2: Add `REPORTING_GET_PROFITABILITY` handler**

Import `getProfitabilityReport` and add inside `registerReportingHandlers()`:

```typescript
ipcMain.handle(IPC.REPORTING_GET_PROFITABILITY, async (_e, req: unknown) => {
  try {
    const auth = await requireAuth(store.get('jwt') ?? null)
    if (!auth.role.permissions.includes('can_view_reports')) return { success: false, error: 'Permission denied' }
    const r = (req ?? {}) as { from?: string; to?: string; categoryId?: string }
    const data = await getProfitabilityReport({
      from: r.from ? new Date(r.from) : undefined,
      to: r.to ? new Date(r.to) : undefined,
      categoryId: r.categoryId ?? null,
    })
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})
```

- [ ] **Step 3: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/handlers/reporting.handlers.ts
git commit -m "feat: add REPORTING_GET_PROFITABILITY handler"
```

---

## Task 7: Add Margin column to ProductsPage

**Files:**
- Modify: `src/renderer/src/pages/products/ProductsPage.tsx`

- [ ] **Step 1: Add Margin column header**

Find the table headers array and add `'Margin'` after the price column.

- [ ] **Step 2: Add margin cell to each row**

```tsx
<td style={{ padding: '12px 16px', textAlign: 'right', borderBottom: ... }}>
  {p.costPrice != null && p.costPrice > 0
    ? (() => {
        const margin = ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100
        const color = margin >= 30 ? '#16a34a' : margin >= 10 ? '#d97706' : '#dc2626'
        return <span style={{ fontSize: '12px', fontWeight: 600, color }}>{margin.toFixed(1)}%</span>
      })()
    : <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>—</span>
  }
</td>
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/pages/products/ProductsPage.tsx
git commit -m "feat: add Margin % column to ProductsPage with color-coded display"
```

---

## Task 8: Add Cost Price field to ProductFormModal

**Files:**
- Modify: `src/renderer/src/pages/products/ProductFormModal.tsx`

- [ ] **Step 1: Add cost price state**

```typescript
const [costPrice, setCostPrice] = useState(product?.costPrice?.toString() ?? '')
const [costPriceSource, setCostPriceSource] = useState<string | null>(product?.costPriceSource ?? null)
```

- [ ] **Step 2: Add Cost Price field to the form**

```tsx
<div>
  <label style={labelStyle}>Cost Price</label>
  <input
    type="number" min="0" step="0.01"
    value={costPrice}
    onChange={e => {
      setCostPrice(e.target.value)
      setCostPriceSource('manual')  // mark as manually set when user types
    }}
    className="dark-input mt-1"
    placeholder="e.g. 25.00"
  />
  {costPriceSource && (
    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>
      {costPriceSource === 'purchase_order'
        ? `Set from PO on ${product?.costPriceUpdatedAt ? new Date(product.costPriceUpdatedAt).toLocaleDateString() : '—'}`
        : 'Manual entry'}
    </p>
  )}
</div>
```

- [ ] **Step 3: Include in `onConfirm` payload**

```typescript
costPrice: costPrice ? parseFloat(costPrice) : null,
costPriceSource: costPrice ? 'manual' : null,
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/pages/products/ProductFormModal.tsx
git commit -m "feat: add Cost Price field with source indicator to ProductFormModal"
```

---

## Task 9: Add Profitability tab to ReportingPage

**Files:**
- Modify: `src/renderer/src/pages/reporting/ReportingPage.tsx`

- [ ] **Step 1: Add profitability query state and data fetch**

```typescript
const [profitFrom, setProfitFrom] = useState('')
const [profitTo, setProfitTo] = useState('')

const profitabilityQuery = useQuery({
  queryKey: ['profitability', profitFrom, profitTo],
  queryFn: async () => {
    const res = await ipc.invoke<{ success: boolean; data?: any; error?: string }>(
      IPC.REPORTING_GET_PROFITABILITY,
      { from: profitFrom || undefined, to: profitTo || undefined }
    )
    if (!res.success) throw new Error(res.error)
    return res.data
  },
  enabled: activeTab === 'profitability',
  retry: false,
})
```

- [ ] **Step 2: Add Profitability tab button**

```tsx
<button onClick={() => setActiveTab('profitability')} className={activeTab === 'profitability' ? 'tab-active' : 'tab'}>
  Profitability
</button>
```

- [ ] **Step 3: Add Profitability tab content**

```tsx
{activeTab === 'profitability' && (
  <div>
    {/* Date filters */}
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      <div>
        <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>From</label>
        <input type="date" value={profitFrom} onChange={e => setProfitFrom(e.target.value)} className="dark-input mt-1" />
      </div>
      <div>
        <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>To</label>
        <input type="date" value={profitTo} onChange={e => setProfitTo(e.target.value)} className="dark-input mt-1" />
      </div>
    </div>

    {/* Summary cards */}
    {profitabilityQuery.data && (() => {
      const rows = profitabilityQuery.data.byProduct ?? []
      const totalRevenue = rows.reduce((s: number, r: any) => s + r.revenue, 0)
      const totalCOGS = rows.reduce((s: number, r: any) => s + r.cogs, 0)
      const totalProfit = totalRevenue - totalCOGS
      const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Revenue', value: `₱${totalRevenue.toFixed(2)}`, color: '#818cf8' },
            { label: 'COGS', value: `₱${totalCOGS.toFixed(2)}`, color: '#f87171' },
            { label: 'Gross Profit', value: `₱${totalProfit.toFixed(2)}`, color: '#34d399' },
            { label: 'Avg Margin', value: `${overallMargin.toFixed(1)}%`, color: overallMargin >= 30 ? '#34d399' : overallMargin >= 10 ? '#fbbf24' : '#f87171' },
          ].map(card => (
            <div key={card.label} style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{card.label}</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: card.color }}>{card.value}</p>
            </div>
          ))}
        </div>
      )
    })()}

    {/* By-product table */}
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Product', 'Qty Sold', 'Revenue', 'COGS', 'Gross Profit', 'Margin %'].map((h, i) => (
              <th key={h} style={{ background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.28)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '10px 16px', textAlign: i > 0 ? 'right' : 'left', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(profitabilityQuery.data?.byProduct ?? []).map((r: any, idx: number) => {
            const borderBottom = idx < (profitabilityQuery.data?.byProduct?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
            const marginColor = r.marginPct >= 30 ? '#16a34a' : r.marginPct >= 10 ? '#d97706' : '#dc2626'
            return (
              <tr key={r.productId?.toString()}>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.88)', borderBottom }}>{r.productName}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', textAlign: 'right', borderBottom }}>{r.quantitySold}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.88)', textAlign: 'right', borderBottom }}>₱{r.revenue.toFixed(2)}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', textAlign: 'right', borderBottom }}>₱{r.cogs.toFixed(2)}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#34d399', textAlign: 'right', borderBottom }}>₱{r.grossProfit.toFixed(2)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', borderBottom }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: marginColor }}>{r.marginPct.toFixed(1)}%</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {profitabilityQuery.data?.byProduct?.length === 0 && (
        <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: '13px' }}>No sales data for this period</div>
      )}
    </div>

    {/* Unknown margin section */}
    {(profitabilityQuery.data?.unknownMargin?.length ?? 0) > 0 && (
      <div style={{ marginTop: '20px', padding: '14px 16px', background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)', borderRadius: '10px' }}>
        <p style={{ fontSize: '12px', color: '#d97706', fontWeight: 600 }}>
          {profitabilityQuery.data.unknownMargin.length} product(s) with unknown cost price — set cost price in Products to include them in margin calculations.
        </p>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/pages/reporting/ReportingPage.tsx
git commit -m "feat: add Profitability report tab with revenue/COGS/margin breakdown"
```

---

## Verification

End-to-end test:
1. Go to Products → edit "Bolt M6" → set Cost Price to ₱10 (Manual) → Save
2. Verify Margin column shows correct % based on selling price
3. Receive a Purchase Order with "Bolt M6" at unit cost ₱8 → verify product's costPrice updates to ₱8 and `costPriceSource` = `'purchase_order'`
4. Set Cost Price manually to ₱12 → receive another PO → verify manual price is NOT overwritten
5. Go to Reports → Profitability tab → set date range → verify revenue/COGS/margin for "Bolt M6"
6. Verify "unknown margin" warning appears for products with no cost price
7. Go to Reports → Inventory Valuation → verify no NaN values for zero-cost products
