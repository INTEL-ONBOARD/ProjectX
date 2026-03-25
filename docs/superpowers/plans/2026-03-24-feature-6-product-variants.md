# Feature 6: Product Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a product to have variants (e.g., a bolt in M6/M8/M10 sizes). Each variant is a Product document linked to a parent via `variantGroupId`. Variants inherit parent price/cost if their own override fields are null. POS shows a variant picker when a parent product is selected.

**Architecture:** Extend the existing `Product` model with 5 new optional fields. No new collections. Product service updated to handle variant grouping. ProductFormModal gets variant management UI. POS ProductSearchPanel gets a variant picker popup. ProductsPage groups variants under their parent.

**Tech Stack:** Mongoose (new optional fields + index), Electron ipcMain, React + React Query, TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/main/models/product.model.ts` | Modify | Add hasVariants, variantGroupId, variantLabel, variantPrice, variantCostPrice + index |
| `src/main/services/product.service.ts` | Modify | Update toShared() for variant fields; add getVariants() |
| `src/main/handlers/product.handlers.ts` | Modify | Pass variant fields through create/update; add PRODUCTS_GET_VARIANTS handler |
| `src/shared/types/ipc.types.ts` | Modify | Add PRODUCTS_GET_VARIANTS channel |
| `src/shared/types/product.types.ts` | Modify | Add variant fields to IProduct shared type |
| `src/renderer/src/pages/products/ProductFormModal.tsx` | Modify | Add variant toggle + variant management section |
| `src/renderer/src/pages/products/ProductsPage.tsx` | Modify | Group variants under parent with expand/collapse |
| `src/renderer/src/pages/pos/ProductSearchPanel.tsx` | Modify | Show variant picker popup when parent selected |

---

## Task 1: Extend the Product model

**Files:**
- Modify: `src/main/models/product.model.ts`

- [ ] **Step 1: Add variant fields to the `IProduct` interface**

Add to `IProduct`:
```typescript
hasVariants: boolean
variantGroupId: Types.ObjectId | null
variantLabel: string | null
variantPrice: number | null
variantCostPrice: number | null
```

- [ ] **Step 2: Add variant fields to the schema**

In `productSchema`, add:
```typescript
hasVariants: { type: Boolean, default: false },
variantGroupId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
variantLabel: { type: String, default: null, trim: true },
variantPrice: { type: Number, default: null, min: 0 },
variantCostPrice: { type: Number, default: null, min: 0 },
```

- [ ] **Step 3: Add index on `variantGroupId`**

```typescript
productSchema.index({ variantGroupId: 1 })
```

- [ ] **Step 4: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/models/product.model.ts
git commit -m "feat: add variant fields to Product model with variantGroupId index"
```

---

## Task 2: Update product service

**Files:**
- Modify: `src/main/services/product.service.ts`

- [ ] **Step 1: Read `product.service.ts` to understand its `toShared` function and return types**

- [ ] **Step 2: Add variant fields to `toShared()`**

Find the `toShared` function and add:
```typescript
hasVariants: doc.hasVariants ?? false,
variantGroupId: doc.variantGroupId?.toString() ?? null,
variantLabel: doc.variantLabel ?? null,
variantPrice: doc.variantPrice ?? null,
variantCostPrice: doc.variantCostPrice ?? null,
// Effective values (used at POS)
effectivePrice: doc.variantPrice ?? doc.sellingPrice,
effectiveCostPrice: doc.variantCostPrice ?? doc.costPrice ?? null,
```

- [ ] **Step 3: Add `getVariants()` function**

```typescript
export async function getVariants(parentId: string): Promise<any[]> {
  const variants = await Product.find({ variantGroupId: parentId, isActive: true }).lean()
  return variants.map(toShared)
}
```

- [ ] **Step 4: Verify create/update functions pass variant fields through**

In the create and update functions, ensure `hasVariants`, `variantGroupId`, `variantLabel`, `variantPrice`, `variantCostPrice` are included in the accepted input fields (not stripped out).

- [ ] **Step 5: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/services/product.service.ts
git commit -m "feat: update product service toShared() with variant fields and add getVariants()"
```

---

## Task 3: Update product handlers and add IPC channel

**Files:**
- Modify: `src/main/handlers/product.handlers.ts`
- Modify: `src/shared/types/ipc.types.ts`
- Modify: `src/shared/types/product.types.ts`

- [ ] **Step 1: Add `PRODUCTS_GET_VARIANTS` channel to `ipc.types.ts`**

After the `PRODUCTS_*` block, add:
```typescript
  PRODUCTS_GET_VARIANTS: 'products:getVariants',
```

- [ ] **Step 2: Update `IProduct` shared type in `product.types.ts`**

Open `src/shared/types/product.types.ts`. Add the variant fields to the `IProduct` interface:
```typescript
hasVariants: boolean
variantGroupId: string | null
variantLabel: string | null
variantPrice: number | null
variantCostPrice: number | null
effectivePrice: number
effectiveCostPrice: number | null
```

- [ ] **Step 3: Read `product.handlers.ts` to find the create/update handlers**

- [ ] **Step 4: Ensure variant fields are passed through in PRODUCTS_CREATE and PRODUCTS_UPDATE**

The handlers likely cast `req` to a typed object — ensure the type includes variant fields:
```typescript
const r = req as {
  // ... existing fields
  hasVariants?: boolean
  variantGroupId?: string | null
  variantLabel?: string | null
  variantPrice?: number | null
  variantCostPrice?: number | null
}
```

Then pass these through to the service call.

- [ ] **Step 5: Add `PRODUCTS_GET_VARIANTS` handler**

Inside the existing `registerProductHandlers()` function, add:
```typescript
ipcMain.handle(IPC.PRODUCTS_GET_VARIANTS, async (_e, req: unknown) => {
  try {
    await requireAuth(store.get('jwt') ?? null)
    const r = req as { parentId: string }
    if (!r?.parentId) return { success: false, error: 'parentId required' }
    const data = await getVariants(r.parentId)
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})
```

Also add `getVariants` to the import from `../services/product.service`.

- [ ] **Step 6: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/handlers/product.handlers.ts src/shared/types/ipc.types.ts src/shared/types/product.types.ts
git commit -m "feat: add PRODUCTS_GET_VARIANTS channel and handler; update IProduct shared type"
```

---

## Task 4: Add variant management to ProductFormModal

**Files:**
- Modify: `src/renderer/src/pages/products/ProductFormModal.tsx`

- [ ] **Step 1: Read `ProductFormModal.tsx` to understand its current form structure**

- [ ] **Step 2: Add variant state fields**

```typescript
const [hasVariants, setHasVariants] = useState(product?.hasVariants ?? false)
const [variantLabel, setVariantLabel] = useState(product?.variantLabel ?? '')
const [variantPrice, setVariantPrice] = useState(product?.variantPrice?.toString() ?? '')
const [variantCostPrice, setVariantCostPrice] = useState(product?.variantCostPrice?.toString() ?? '')
```

- [ ] **Step 3: Add "This product has variants" toggle** (only show for new products or existing parents)

```tsx
{/* Variant toggle — show when not editing a variant child */}
{!product?.variantGroupId && (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0', borderTop: '1px solid var(--border-subtle)' }}>
    <input type="checkbox" id="hasVariants" checked={hasVariants} onChange={e => setHasVariants(e.target.checked)} />
    <label htmlFor="hasVariants" style={{ fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
      This product has variants (e.g. sizes, colors)
    </label>
  </div>
)}
```

- [ ] **Step 4: Show variant label/price/cost fields when editing a variant product (`variantGroupId` is set)**

Note: `isCreatingVariant` does **not** exist as a prop or state — variant child products are created by opening a new ProductFormModal with a pre-set `variantGroupId` prop passed from the ProductsPage. So the condition only needs to check `product?.variantGroupId`:

For editing a child variant, show override fields:
```tsx
{product?.variantGroupId && (
  <div style={{ padding: '12px', background: 'rgba(99,102,241,0.05)', borderRadius: '10px', marginTop: '8px' }}>
    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Variant Details</p>
    <div>
      <label style={labelStyle}>Variant Label *</label>
      <input value={variantLabel} onChange={e => setVariantLabel(e.target.value)} className="dark-input mt-1" placeholder="e.g. M6 × 30mm" />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
      <div>
        <label style={labelStyle}>Price Override (leave blank to inherit)</label>
        <input type="number" min="0" step="0.01" value={variantPrice} onChange={e => setVariantPrice(e.target.value)} className="dark-input mt-1" placeholder={`Default: ₱${product?.sellingPrice ?? '—'}`} />
      </div>
      <div>
        <label style={labelStyle}>Cost Price Override</label>
        <input type="number" min="0" step="0.01" value={variantCostPrice} onChange={e => setVariantCostPrice(e.target.value)} className="dark-input mt-1" />
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 5: Include variant fields in `onConfirm` data**

```typescript
onConfirm({
  ...existingFields,
  hasVariants,
  variantLabel: variantLabel || null,
  variantPrice: variantPrice ? parseFloat(variantPrice) : null,
  variantCostPrice: variantCostPrice ? parseFloat(variantCostPrice) : null,
})
```

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/pages/products/ProductFormModal.tsx
git commit -m "feat: add variant toggle and override fields to ProductFormModal"
```

---

## Task 5: Group variants in ProductsPage

**Files:**
- Modify: `src/renderer/src/pages/products/ProductsPage.tsx`

- [ ] **Step 1: Read `ProductsPage.tsx` to understand how products are listed**

- [ ] **Step 2: Add variant grouping logic**

```typescript
const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())

// Group products: parents first, then variants attached to their parent
const parentProducts = products.filter(p => !p.variantGroupId)
const variantsByParent = products.reduce((acc: Record<string, any[]>, p) => {
  if (p.variantGroupId) {
    acc[p.variantGroupId] = [...(acc[p.variantGroupId] ?? []), p]
  }
  return acc
}, {})
```

- [ ] **Step 3: Update the table rows to show expand arrow for parents with variants**

```tsx
{parentProducts.map((p, idx) => (
  <>
    <tr key={p._id}>
      <td>
        {p.hasVariants && (
          <button onClick={() => setExpandedParents(prev => {
            const next = new Set(prev)
            if (next.has(p._id)) next.delete(p._id); else next.add(p._id)
            return next
          })} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '6px', color: 'rgba(255,255,255,0.4)' }}>
            {expandedParents.has(p._id) ? '▼' : '▶'}
          </button>
        )}
        {p.name}
      </td>
      {/* ... rest of existing columns */}
    </tr>
    {/* Variant rows */}
    {p.hasVariants && expandedParents.has(p._id) && (variantsByParent[p._id] ?? []).map((v: any) => (
      <tr key={v._id} style={{ background: 'rgba(99,102,241,0.03)' }}>
        <td style={{ paddingLeft: '40px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
          ↳ {v.variantLabel ?? v.name}
        </td>
        <td>{v.sku}</td>
        <td>₱{(v.variantPrice ?? v.sellingPrice).toFixed(2)}</td>
        <td>{/* stock */}</td>
        <td>{/* status badge */}</td>
        <td>{/* edit button */}</td>
      </tr>
    ))}
  </>
))}
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/pages/products/ProductsPage.tsx
git commit -m "feat: group variants under parent products in ProductsPage"
```

---

## Task 6: Add variant picker to POS ProductSearchPanel

**Files:**
- Modify: `src/renderer/src/pages/pos/ProductSearchPanel.tsx`

- [ ] **Step 1: Read `ProductSearchPanel.tsx` to understand how product selection works**

- [ ] **Step 2: Add variant picker state**

```typescript
const [variantPickerProduct, setVariantPickerProduct] = useState<any | null>(null)
const [variants, setVariants] = useState<any[]>([])
const [loadingVariants, setLoadingVariants] = useState(false)
```

- [ ] **Step 3: Intercept selection of parent products with variants**

In the existing `onProductSelect` or click handler, add:

```typescript
async function handleProductClick(product: any) {
  if (product.hasVariants) {
    setLoadingVariants(true)
    try {
      // Use the dedicated PRODUCTS_GET_VARIANTS channel — do NOT use PRODUCTS_GET_ALL with a variantGroupId
      // filter, as getAllProducts() does not support that filter and it would be silently ignored.
      const res = await ipc.invoke<{ success: boolean; data?: any[]; error?: string }>(
        IPC.PRODUCTS_GET_VARIANTS, { parentId: product._id }
      )
      if (res.success && res.data) {
        setVariants(res.data)
        setVariantPickerProduct(product)
      }
    } finally {
      setLoadingVariants(false)
    }
    return  // don't add parent directly
  }
  onProductSelect(product)  // existing behavior for non-variant products
}
```

- [ ] **Step 4: Add variant picker popup**

```tsx
{variantPickerProduct && (
  <div style={{
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    background: 'var(--bg-surface)', zIndex: 10,
    display: 'flex', flexDirection: 'column',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
      <button onClick={() => setVariantPickerProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '18px' }}>←</button>
      <div>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{variantPickerProduct.name}</p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Select a variant</p>
      </div>
    </div>
    <div style={{ overflowY: 'auto', flex: 1, padding: '12px' }}>
      {variants.map(v => (
        <button key={v._id}
          onClick={() => {
            // Pass variant to cart with parent name + variant label
            onProductSelect({ ...v, name: `${variantPickerProduct.name} — ${v.variantLabel}`, sellingPrice: v.variantPrice ?? variantPickerProduct.sellingPrice })
            setVariantPickerProduct(null)
          }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', marginBottom: '6px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            cursor: 'pointer', color: 'var(--text-primary)', textAlign: 'left',
          }}
        >
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.88)' }}>{v.variantLabel}</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>SKU: {v.sku}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#818cf8' }}>₱{(v.variantPrice ?? variantPickerProduct.sellingPrice).toFixed(2)}</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Stock: {v.stock ?? '—'}</p>
          </div>
        </button>
      ))}
      {variants.length === 0 && (
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '24px' }}>No variants found</p>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/pages/pos/ProductSearchPanel.tsx
git commit -m "feat: add variant picker popup to POS ProductSearchPanel"
```

---

## Verification

End-to-end test:
1. Go to Products → create a new product "Hex Bolt" with "This product has variants" checked
2. Create three variant products with `variantGroupId = Hex Bolt._id`, labels "M6", "M8", "M10", each with different prices
3. In ProductsPage → click expand arrow on "Hex Bolt" → verify variants appear indented
4. Go to POS → search "Hex Bolt" → click it → verify variant picker appears with M6/M8/M10
5. Select M8 → verify it's added to cart with name "Hex Bolt — M8" and correct price
6. Test price inheritance: create a variant without `variantPrice` → verify it uses parent's `sellingPrice`
