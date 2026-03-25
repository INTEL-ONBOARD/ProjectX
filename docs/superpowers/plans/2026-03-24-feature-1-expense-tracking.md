# Feature 1: Expense Tracking (Drawer Pay-Out) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow cashiers to record cash pay-outs from an open drawer (with category, reason, recipient), and let managers approve or reject them asynchronously from the ReportingPage.

**Architecture:** Embed a `payOuts` subdocument array in the existing `CashDrawer` model. Add 3 new IPC handlers to the existing `cash-drawer.handlers.ts`. Update `closeDrawer()` to subtract approved pay-outs from `expectedCash`. Add pay-out UI to `CashDrawerPage` and a Pay-Out Approvals tab to `ReportingPage`.

**Tech Stack:** Mongoose (subdocument array), Electron ipcMain, React + React Query, TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/main/models/cash-drawer.model.ts` | Modify | Add `payOuts` subdocument array + `IPayOutDoc` interface |
| `src/main/services/cash-drawer.service.ts` | Modify | Add `recordPayOut()`, `reviewPayOut()`, `getPayOuts()`; update `closeDrawer()` |
| `src/main/handlers/cash-drawer.handlers.ts` | Modify | Add 3 new IPC handlers |
| `src/shared/types/ipc.types.ts` | Modify | Add `DRAWER_PAY_OUT`, `DRAWER_REVIEW_PAY_OUT`, `DRAWER_GET_PAY_OUTS` |
| `src/shared/types/permissions.ts` | Modify | Add `CAN_APPROVE_PAYOUTS` |
| `src/shared/types/cash-drawer.types.ts` | Modify | Add `payOuts` field to `ICashDrawer` shared type |
| `src/renderer/src/pages/cash-drawer/CashDrawerPage.tsx` | Modify | Add pay-out button, modal, pending list |
| `src/renderer/src/pages/reporting/ReportingPage.tsx` | Modify | Add Pay-Out Approvals tab |

---

## Task 1: Add `payOuts` to the CashDrawer model

**Files:**
- Modify: `src/main/models/cash-drawer.model.ts`

- [ ] **Step 1: Add the `IPayOutDoc` interface and `payOutSchema` subdocument**

Open `src/main/models/cash-drawer.model.ts`. After the existing imports, add:

```typescript
export interface IPayOutDoc {
  _id: Types.ObjectId
  amount: number
  reason: string
  category: 'supplies' | 'cod_delivery' | 'petty_cash' | 'other'
  recipient: string
  recordedBy: Types.ObjectId
  recordedAt: Date
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy: Types.ObjectId | null
  reviewedAt: Date | null
  reviewNote: string | null
}

const payOutSchema = new Schema<IPayOutDoc>({
  amount: { type: Number, required: true, min: 0.01 },
  reason: { type: String, required: true, trim: true },
  category: { type: String, enum: ['supplies', 'cod_delivery', 'petty_cash', 'other'], required: true },
  recipient: { type: String, required: true, trim: true },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recordedAt: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: { type: Schema.Types.ObjectId, default: null },
  reviewedAt: { type: Date, default: null },
  reviewNote: { type: String, default: null },
})
```

- [ ] **Step 2: Add `payOuts` to `ICashDrawerDoc` and `cashDrawerSchema`**

In `ICashDrawerDoc`, add:
```typescript
payOuts: Types.DocumentArray<IPayOutDoc>
```

In `cashDrawerSchema`, add:
```typescript
payOuts: { type: [payOutSchema], default: [] },
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors related to cash-drawer.model.ts

- [ ] **Step 4: Update `ICashDrawer` in the shared types**

Open `src/shared/types/cash-drawer.types.ts`. Add `payOuts` to the `ICashDrawer` interface so the renderer can read it:

```typescript
payOuts?: Array<{
  _id: string
  amount: number
  reason: string
  category: 'supplies' | 'cod_delivery' | 'petty_cash' | 'other'
  recipient: string
  recordedBy: string
  recordedAt: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNote: string | null
}>
```

Also update `toShared()` in `cash-drawer.service.ts` to include `payOuts`:

```typescript
payOuts: (doc.payOuts ?? []).map((p: any) => ({
  _id: p._id?.toString(),
  amount: p.amount,
  reason: p.reason,
  category: p.category,
  recipient: p.recipient,
  recordedBy: p.recordedBy?.toString(),
  recordedAt: p.recordedAt?.toISOString(),
  status: p.status,
  reviewedBy: p.reviewedBy?.toString() ?? null,
  reviewedAt: p.reviewedAt?.toISOString() ?? null,
  reviewNote: p.reviewNote ?? null,
})),
```

- [ ] **Step 5: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/models/cash-drawer.model.ts src/shared/types/cash-drawer.types.ts src/main/services/cash-drawer.service.ts
git commit -m "feat: add payOuts subdocument array to CashDrawer model and shared types"
```

---

## Task 2: Add new IPC channel constants and permission

**Files:**
- Modify: `src/shared/types/ipc.types.ts`
- Modify: `src/shared/types/permissions.ts`

- [ ] **Step 1: Add IPC channels**

In `src/shared/types/ipc.types.ts`, after the `DRAWER_PRINT_Z_REPORT` line, add:

```typescript
  DRAWER_PAY_OUT: 'drawer:payOut',
  DRAWER_REVIEW_PAY_OUT: 'drawer:reviewPayOut',
  DRAWER_GET_PAY_OUTS: 'drawer:getPayOuts',
```

- [ ] **Step 2: Add permission**

In `src/shared/types/permissions.ts`, add after `CAN_RECEIVE_STOCK_TRANSFER`:

```typescript
  CAN_APPROVE_PAYOUTS: 'can_approve_payouts',
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/types/ipc.types.ts src/shared/types/permissions.ts
git commit -m "feat: add drawer pay-out IPC channels and can_approve_payouts permission"
```

---

## Task 3: Add service functions for pay-outs

**Files:**
- Modify: `src/main/services/cash-drawer.service.ts`

- [ ] **Step 1: Add `recordPayOut()` function**

Add after the `getDrawers` function:

```typescript
export async function recordPayOut(
  drawerId: string,
  input: { amount: number; reason: string; category: string; recipient: string },
  userId: string
): Promise<IPayOutDoc> {
  const drawer = await CashDrawer.findOne({ _id: drawerId, status: 'open' })
  if (!drawer) throw new Error('No open drawer found')
  if (input.amount <= 0) throw new Error('Amount must be greater than zero')

  const payOut = {
    amount: input.amount,
    reason: input.reason.trim(),
    category: input.category,
    recipient: input.recipient.trim(),
    recordedBy: userId,
    recordedAt: new Date(),
    status: 'pending' as const,
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
  }
  drawer.payOuts.push(payOut as any)
  await drawer.save()
  const saved = drawer.payOuts[drawer.payOuts.length - 1]
  return saved.toObject()
}
```

- [ ] **Step 2: Add `reviewPayOut()` function**

```typescript
export async function reviewPayOut(
  drawerId: string,
  payOutId: string,
  decision: { status: 'approved' | 'rejected'; reviewNote?: string },
  reviewerId: string
): Promise<IPayOutDoc> {
  const drawer = await CashDrawer.findById(drawerId)
  if (!drawer) throw new Error('Drawer not found')
  const payOut = drawer.payOuts.id(payOutId)
  if (!payOut) throw new Error('Pay-out not found')
  if (payOut.status !== 'pending') throw new Error('Pay-out has already been reviewed')

  payOut.status = decision.status
  payOut.reviewedBy = reviewerId as any
  payOut.reviewedAt = new Date()
  payOut.reviewNote = decision.reviewNote ?? null
  await drawer.save()
  return payOut.toObject()
}
```

- [ ] **Step 3: Add `getPayOuts()` function**

```typescript
export async function getPayOuts(filters: {
  branchId?: string | null
  status?: 'pending' | 'approved' | 'rejected'
  from?: Date
  to?: Date
}): Promise<Array<IPayOutDoc & { drawerId: string; drawerOpenedAt: string; cashierName?: string }>> {
  const drawerMatch: any = {}
  if (filters.branchId) drawerMatch.branchId = filters.branchId
  if (filters.from || filters.to) {
    drawerMatch.openedAt = {}
    if (filters.from) drawerMatch.openedAt.$gte = filters.from
    if (filters.to) drawerMatch.openedAt.$lte = filters.to
  }

  const drawers = await CashDrawer.find(drawerMatch).populate('cashierId', 'name').lean()
  const results: any[] = []
  for (const d of drawers) {
    for (const p of (d.payOuts ?? [])) {
      if (filters.status && p.status !== filters.status) continue
      results.push({
        ...p,
        drawerId: d._id.toString(),
        drawerOpenedAt: d.openedAt.toISOString(),
        cashierName: (d.cashierId as any)?.name ?? null,
      })
    }
  }
  return results
}
```

- [ ] **Step 4: Update `closeDrawer()` to subtract approved pay-outs from `expectedCash`**

In the existing `closeDrawer()` function, find the line:
```typescript
const expectedCash = Math.round(((openDrawer.openingCash as number) + totalCash) * 100) / 100
```

Replace it with:
```typescript
const approvedPayOutsTotal = (openDrawer.payOuts ?? [])
  .filter((p: any) => p.status === 'approved')
  .reduce((sum: number, p: any) => sum + p.amount, 0)
const expectedCash = Math.round(((openDrawer.openingCash as number) + totalCash - approvedPayOutsTotal) * 100) / 100
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add src/main/services/cash-drawer.service.ts
git commit -m "feat: add recordPayOut, reviewPayOut, getPayOuts service functions; update closeDrawer expected cash"
```

---

## Task 4: Register IPC handlers for pay-outs

**Files:**
- Modify: `src/main/handlers/cash-drawer.handlers.ts`

- [ ] **Step 1: Import new service functions**

Add `recordPayOut, reviewPayOut, getPayOuts` to the import from `../services/cash-drawer.service`.

- [ ] **Step 2: Add `DRAWER_PAY_OUT` handler**

Inside `registerCashDrawerHandlers()`, after the last existing handler:

```typescript
ipcMain.handle(IPC.DRAWER_PAY_OUT, async (_e, req: unknown) => {
  try {
    const auth = await requireAuth(store.get('jwt') ?? null)
    if (!auth.role.permissions.includes('can_open_close_drawer')) {
      return { success: false, error: 'Permission denied' }
    }
    const r = req as { drawerId: string; amount: number; reason: string; category: string; recipient: string }
    if (!r?.drawerId) return { success: false, error: 'drawerId required' }
    if (typeof r.amount !== 'number' || r.amount <= 0) return { success: false, error: 'Amount must be greater than zero' }
    if (!r.reason?.trim()) return { success: false, error: 'Reason is required' }
    if (!r.recipient?.trim()) return { success: false, error: 'Recipient is required' }
    const data = await recordPayOut(r.drawerId, r, auth.user._id)
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to record pay-out' }
  }
})
```

- [ ] **Step 3: Add `DRAWER_REVIEW_PAY_OUT` handler**

```typescript
ipcMain.handle(IPC.DRAWER_REVIEW_PAY_OUT, async (_e, req: unknown) => {
  try {
    const auth = await requireAuth(store.get('jwt') ?? null)
    if (!auth.role.permissions.includes('can_approve_payouts')) {
      return { success: false, error: 'Permission denied' }
    }
    const r = req as { drawerId: string; payOutId: string; status: 'approved' | 'rejected'; reviewNote?: string }
    if (!r?.drawerId || !r?.payOutId) return { success: false, error: 'drawerId and payOutId required' }
    if (!['approved', 'rejected'].includes(r.status)) return { success: false, error: 'Invalid status' }
    const data = await reviewPayOut(r.drawerId, r.payOutId, { status: r.status, reviewNote: r.reviewNote }, auth.user._id)
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to review pay-out' }
  }
})
```

- [ ] **Step 4: Add `DRAWER_GET_PAY_OUTS` handler**

```typescript
ipcMain.handle(IPC.DRAWER_GET_PAY_OUTS, async (_e, req: unknown) => {
  try {
    const auth = await requireAuth(store.get('jwt') ?? null)
    const canViewAll = auth.role.permissions.includes('can_view_all_branches')
    const r = (req ?? {}) as { status?: string; from?: string; to?: string }
    const data = await getPayOuts({
      branchId: canViewAll ? null : auth.user.branchId,
      status: r.status as any,
      from: r.from ? new Date(r.from) : undefined,
      to: r.to ? new Date(r.to) : undefined,
    })
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to get pay-outs' }
  }
})
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add src/main/handlers/cash-drawer.handlers.ts
git commit -m "feat: register DRAWER_PAY_OUT, DRAWER_REVIEW_PAY_OUT, DRAWER_GET_PAY_OUTS IPC handlers"
```

---

## Task 5: Add pay-out UI to CashDrawerPage

**Files:**
- Modify: `src/renderer/src/pages/cash-drawer/CashDrawerPage.tsx`

- [ ] **Step 1: Add pay-out state and IPC call at the top of the component**

Add to imports:
```typescript
import { ipc } from '../../lib/ipc'
import { IPC } from '@shared/types/ipc.types'
import { useQueryClient } from '@tanstack/react-query'
```

At the top of the `CashDrawerPage` component function, get the query client:
```typescript
const queryClient = useQueryClient()
```

Add state near the top of `CashDrawerPage`:
```typescript
const [showPayOutModal, setShowPayOutModal] = useState(false)
const [payOutForm, setPayOutForm] = useState({ amount: '', reason: '', category: 'petty_cash', recipient: '' })
const [payOutError, setPayOutError] = useState('')
const [payOutLoading, setPayOutLoading] = useState(false)
```

- [ ] **Step 2: Add `handlePayOut` function**

```typescript
async function handlePayOut(e: React.FormEvent) {
  e.preventDefault()
  setPayOutError('')
  const amount = parseFloat(payOutForm.amount)
  if (!amount || amount <= 0) return setPayOutError('Enter a valid amount')
  if (!payOutForm.reason.trim()) return setPayOutError('Reason is required')
  if (!payOutForm.recipient.trim()) return setPayOutError('Recipient is required')
  if (!openDrawer) return setPayOutError('No open drawer')
  setPayOutLoading(true)
  try {
    const res = await ipc.invoke<{ success: boolean; error?: string }>(IPC.DRAWER_PAY_OUT, {
      drawerId: openDrawer._id,
      amount,
      reason: payOutForm.reason,
      category: payOutForm.category,
      recipient: payOutForm.recipient,
    })
    if (!res.success) throw new Error(res.error)
    setShowPayOutModal(false)
    setPayOutForm({ amount: '', reason: '', category: 'petty_cash', recipient: '' })
    // Refresh the open drawer data
    queryClient.invalidateQueries({ queryKey: ['drawer-open'] })
  } catch (err: any) {
    setPayOutError(err.message)
  } finally {
    setPayOutLoading(false)
  }
}
```

- [ ] **Step 3: Add "Record Pay-Out" button to the open drawer panel**

In the JSX, inside the `CloseDrawerPanel` or adjacent to the close drawer section, when `openDrawer` exists:

```tsx
{openDrawer && (
  <div style={{ marginTop: '12px' }}>
    <button
      onClick={() => setShowPayOutModal(true)}
      className="btn-secondary"
      style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
    >
      <span style={{ fontSize: '16px', lineHeight: 1 }}>↑</span> Record Pay-Out
    </button>
    {/* Pending pay-outs list */}
    {openDrawer.payOuts?.filter((p: any) => p.status === 'pending').length > 0 && (
      <div style={{ marginTop: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
        {openDrawer.payOuts.filter((p: any) => p.status === 'pending').length} pending pay-out(s) awaiting approval
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: Add the pay-out modal**

```tsx
{showPayOutModal && (
  <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="modal-panel w-full max-w-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Record Pay-Out</h2>
        <button onClick={() => setShowPayOutModal(false)} style={{ color: 'var(--text-muted)' }}>✕</button>
      </div>
      <form onSubmit={handlePayOut}>
        <div className="px-6 py-5 space-y-3">
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Amount (₱) *</label>
            <input
              type="number" min="0.01" step="0.01"
              value={payOutForm.amount}
              onChange={e => setPayOutForm(f => ({ ...f, amount: e.target.value }))}
              className="dark-input mt-1" placeholder="0.00"
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Category *</label>
            <select
              value={payOutForm.category}
              onChange={e => setPayOutForm(f => ({ ...f, category: e.target.value }))}
              className="dark-input mt-1"
            >
              <option value="petty_cash">Petty Cash</option>
              <option value="supplies">Supplies</option>
              <option value="cod_delivery">COD Delivery</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Reason *</label>
            <input
              value={payOutForm.reason}
              onChange={e => setPayOutForm(f => ({ ...f, reason: e.target.value }))}
              className="dark-input mt-1" placeholder="e.g. Bought office supplies"
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Recipient *</label>
            <input
              value={payOutForm.recipient}
              onChange={e => setPayOutForm(f => ({ ...f, recipient: e.target.value }))}
              className="dark-input mt-1" placeholder="e.g. Juan Dela Cruz"
            />
          </div>
          {payOutError && (
            <div style={{ fontSize: '13px', color: 'var(--color-danger)', padding: '8px 12px', background: 'var(--color-danger-bg)', borderRadius: '8px', border: '1px solid var(--color-danger-border)' }}>
              {payOutError}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button type="button" onClick={() => setShowPayOutModal(false)} className="btn-secondary px-5 py-2">Cancel</button>
          <button type="submit" disabled={payOutLoading} className="btn-primary px-5 py-2 disabled:opacity-50">
            {payOutLoading ? 'Saving…' : 'Record Pay-Out'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
```

- [ ] **Step 5: Restart dev server and manually test**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npm run dev
```

Open a drawer → click "Record Pay-Out" → fill form → submit. Verify no console errors.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/pages/cash-drawer/CashDrawerPage.tsx
git commit -m "feat: add pay-out modal and pending pay-outs indicator to CashDrawerPage"
```

---

## Task 6: Add Pay-Out Approvals tab to ReportingPage

**Files:**
- Modify: `src/renderer/src/pages/reporting/ReportingPage.tsx`

- [ ] **Step 1: Add pay-out state and data fetching**

Read the current ReportingPage to understand its tab structure, then add:

```typescript
// Add to existing tab type:
type ReportTab = 'sales' | 'products' | 'inventory' | 'cash-drawer' | 'payouts'

// Add query for pay-outs:
const payOutsQuery = useQuery({
  queryKey: ['payouts', payoutsStatusFilter],
  queryFn: async () => {
    const res = await ipc.invoke<{ success: boolean; data?: any[]; error?: string }>(
      IPC.DRAWER_GET_PAY_OUTS,
      { status: payoutsStatusFilter || undefined }
    )
    if (!res.success) throw new Error(res.error)
    return res.data ?? []
  },
  enabled: activeTab === 'payouts',
  retry: false,
})
```

- [ ] **Step 2: Add the Payouts tab button to the tab bar**

In the tab bar JSX, add alongside existing tabs:
```tsx
<button
  onClick={() => setActiveTab('payouts')}
  className={activeTab === 'payouts' ? 'tab-active' : 'tab'}
>
  Pay-Out Approvals
</button>
```

- [ ] **Step 3: Add Pay-Out Approvals tab content**

```tsx
{activeTab === 'payouts' && (
  <div>
    {/* Filter row */}
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      {(['', 'pending', 'approved', 'rejected'] as const).map(s => (
        <button
          key={s}
          onClick={() => setPayoutsStatusFilter(s)}
          className={payoutsStatusFilter === s ? 'badge-active' : 'badge-gray'}
          style={{ cursor: 'pointer', border: 'none', fontSize: '12px', padding: '4px 12px', borderRadius: '20px' }}
        >
          {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
        </button>
      ))}
    </div>

    {/* Table */}
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Date', 'Cashier', 'Amount', 'Category', 'Reason', 'Recipient', 'Status', 'Actions'].map((h, i) => (
              <th key={h} style={{
                background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.28)',
                fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '10px 16px', textAlign: i >= 6 ? 'right' : 'left',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(payOutsQuery.data ?? []).map((p: any, idx: number) => (
            <tr key={p._id} style={{ background: 'transparent' }}>
              <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                {new Date(p.recordedAt).toLocaleDateString()}
              </td>
              <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.88)' }}>
                {p.cashierName ?? '—'}
              </td>
              <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.88)', fontWeight: 600 }}>
                ₱{p.amount.toFixed(2)}
              </td>
              <td style={{ padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                {p.category.replace('_', ' ')}
              </td>
              <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                {p.reason}
              </td>
              <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                {p.recipient}
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                {p.status === 'pending'
                  ? <span className="badge-yellow">Pending</span>
                  : p.status === 'approved'
                  ? <span className="badge-green">Approved</span>
                  : <span className="badge-gray">Rejected</span>
                }
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                {p.status === 'pending' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                    <button
                      onClick={() => handleReviewPayOut(p.drawerId, p._id, 'approved')}
                      style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'rgba(22,163,74,0.12)', color: '#16a34a', fontWeight: 600 }}
                    >Approve</button>
                    <button
                      onClick={() => handleReviewPayOut(p.drawerId, p._id, 'rejected')}
                      style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'rgba(220,38,38,0.08)', color: '#dc2626', fontWeight: 600 }}
                    >Reject</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {payOutsQuery.data?.length === 0 && (
        <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: '13px' }}>
          No pay-outs found
        </div>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 4: Add `handleReviewPayOut` function**

```typescript
async function handleReviewPayOut(drawerId: string, payOutId: string, status: 'approved' | 'rejected') {
  const note = status === 'rejected' ? prompt('Rejection reason (optional):') : undefined
  const res = await ipc.invoke<{ success: boolean; error?: string }>(IPC.DRAWER_REVIEW_PAY_OUT, {
    drawerId, payOutId, status, reviewNote: note ?? undefined
  })
  if (res.success) {
    queryClient.invalidateQueries({ queryKey: ['payouts'] })
  }
}
```

- [ ] **Step 5: Restart and manually test end-to-end**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npm run dev
```

1. Open a drawer, record a pay-out (₱100, petty_cash, "Office snacks", "Juan")
2. Go to Reports → Pay-Out Approvals tab
3. Click Approve → verify status changes to Approved
4. Close drawer → verify `expectedCash` is reduced by ₱100

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/pages/reporting/ReportingPage.tsx
git commit -m "feat: add Pay-Out Approvals tab to ReportingPage"
```

---

## Task 7: Update Z-Report to show pay-out subtotal

**Files:**
- Modify: `src/renderer/src/pages/cash-drawer/CashDrawerPage.tsx`

- [ ] **Step 1: Find the `printZReport` function and add pay-outs section**

Locate the `printZReport` function in `CashDrawerPage.tsx`. After the existing totals table, add a pay-outs section to the HTML template:

```typescript
// Inside the Z-report HTML, after the existing rows:
const approvedPayOuts = (drawer.payOuts ?? []).filter((p: any) => p.status === 'approved')
const payOutTotal = approvedPayOuts.reduce((s: number, p: any) => s + p.amount, 0)

// Add to the HTML table:
`<tr><td colspan="2" style="padding:4px 0;font-weight:bold;border-top:1px dashed #ccc">PAY-OUTS</td></tr>
${approvedPayOuts.map((p: any) => `<tr><td style="padding:2px 0">${p.category} — ${p.recipient}</td><td style="text-align:right">₱${p.amount.toFixed(2)}</td></tr>`).join('')}
<tr><td style="padding:4px 0;font-weight:bold">Total Pay-Outs</td><td style="text-align:right;font-weight:bold">₱${payOutTotal.toFixed(2)}</td></tr>`
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/pages/cash-drawer/CashDrawerPage.tsx
git commit -m "feat: include approved pay-outs in Z-report HTML template"
```

---

## Verification

End-to-end test:
1. Open a cash drawer
2. Record 2 pay-outs: one ₱100 (petty_cash), one ₱50 (supplies)
3. Go to Reports → Pay-Out Approvals → approve the first, reject the second
4. Close the drawer with closing cash amount
5. Verify `expectedCash` = `openingCash + totalCashSales - ₱100` (only approved deducted)
6. Print Z-report → verify pay-outs section shows ₱100 line item
7. Verify a user without `can_approve_payouts` gets "Permission denied" when calling DRAWER_REVIEW_PAY_OUT
