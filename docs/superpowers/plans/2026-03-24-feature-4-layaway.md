# Feature 4: Layaway / On-Account Sales Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow cashiers to reserve items as layaway (with a deposit) or sell on account (pay later), record partial payments over time, and settle the balance when the customer returns.

**Architecture:** Extend the existing `Transaction` model with new statuses (`layaway`, `on_account`) and new fields (`depositAmount`, `balanceDue`, `customerId`, `partialPayments`, `dueDate`). Add 4 new IPC channels to the existing `pos.handlers.ts`. Add Layaway/On-Account tabs to `PaymentModal`. Add a Layaway filter tab and Settle action to `TransactionsPage`.

**Tech Stack:** Mongoose (schema extension), Electron ipcMain, React + React Query, TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/main/models/transaction.model.ts` | Modify | Add layaway/on_account statuses + fields |
| `src/main/services/transaction.service.ts` | Modify | Add createLayaway, createOnAccount, settleLayaway, getLayaways |
| `src/main/handlers/pos.handlers.ts` | Modify | Add 4 new IPC handlers |
| `src/shared/types/ipc.types.ts` | Modify | Add POS_CREATE_LAYAWAY, POS_CREATE_ON_ACCOUNT, POS_SETTLE_LAYAWAY, POS_GET_LAYAWAYS |
| `src/renderer/src/pages/pos/PaymentModal.tsx` | Modify | Add Layaway + On Account payment tabs |
| `src/renderer/src/pages/transactions/TransactionsPage.tsx` | Modify | Add Layaway filter tab + Settle action |

---

## Task 1: Extend the Transaction model

**Files:**
- Modify: `src/main/models/transaction.model.ts`

- [ ] **Step 1: Add `partialPaymentSchema` subdocument**

After the existing `paymentSchema`, add:

```typescript
const partialPaymentSchema = new Schema({
  amount: { type: Number, required: true, min: 0.01 },
  method: {
    type: String,
    enum: ['cash', 'card', 'gcash', 'paymaya'],  // must mirror payments.method enum — update both if new methods added
    required: true
  },
  paidAt: { type: Date, required: true },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String, default: null },
}, { _id: true })
```

- [ ] **Step 2: Add new fields to `ITransaction` interface**

In `ITransaction`, add:
```typescript
depositAmount: number | null
balanceDue: number | null
customerId: Types.ObjectId | null
partialPayments: Array<{
  _id: Types.ObjectId
  amount: number
  method: 'cash' | 'card' | 'gcash' | 'paymaya'
  paidAt: Date
  recordedBy: Types.ObjectId
  note: string | null
}>
dueDate: Date | null
```

- [ ] **Step 3: Update status enum and add fields to schema**

In `transactionSchema`, change the status field:
```typescript
status: {
  type: String,
  enum: ['completed', 'voided', 'refunded', 'partially_refunded', 'layaway', 'on_account'],
  default: 'completed'
},
```

Add new schema fields:
```typescript
depositAmount: { type: Number, default: null },
balanceDue: { type: Number, default: null },
customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
partialPayments: { type: [partialPaymentSchema], default: [] },
dueDate: { type: Date, default: null },
```

- [ ] **Step 4: Add index for layaway queries**

```typescript
transactionSchema.index({ status: 1, branchId: 1, createdAt: -1 })
```

- [ ] **Step 5: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/models/transaction.model.ts
git commit -m "feat: extend Transaction model with layaway/on_account statuses and partial payments"
```

---

## Task 2: Add IPC channels

**Files:**
- Modify: `src/shared/types/ipc.types.ts`

- [ ] **Step 1: Add layaway channels after the existing POS channels**

```typescript
  POS_CREATE_LAYAWAY: 'pos:createLayaway',
  POS_CREATE_ON_ACCOUNT: 'pos:createOnAccount',
  POS_SETTLE_LAYAWAY: 'pos:settleLayaway',
  POS_GET_LAYAWAYS: 'pos:getLayaways',
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/types/ipc.types.ts
git commit -m "feat: add layaway IPC channel constants"
```

---

## Task 3: Add layaway service functions

**Files:**
- Modify: `src/main/services/transaction.service.ts`

- [ ] **Step 1: Read the current `transaction.service.ts` to understand its structure**

Read `src/main/services/transaction.service.ts`. Note: `pos.service.ts` does **not** exist — all POS/sale logic is in `transaction.service.ts`. Locate `generateReceiptNo()` and `Transaction` imports — they are already there and should be reused, not re-imported.

- [ ] **Step 2: Add `createLayaway` function**

Add after the existing sale functions in `transaction.service.ts`. `generateReceiptNo()` and `Transaction` are already imported in this file — do not re-import them:

```typescript
export async function createLayaway(input: {
  items: any[]
  subtotal: number
  discountAmount?: number
  discountType?: string
  taxRate?: number
  taxAmount?: number
  totalAmount: number
  depositAmount: number
  customerId?: string | null
  dueDate?: string | null
  notes?: string
}, userId: string, branchId: string, terminalId: string): Promise<any> {
  if (input.depositAmount < 0) throw new Error('Deposit amount cannot be negative')
  if (input.depositAmount > input.totalAmount) throw new Error('Deposit cannot exceed total amount')

  const receiptNo = await generateReceiptNo(branchId)
  const balanceDue = Math.round((input.totalAmount - input.depositAmount) * 100) / 100

  const payments = input.depositAmount > 0
    ? [{ method: 'cash', amount: input.depositAmount, reference: null }]
    : []

  const transaction = await Transaction.create({
    receiptNo,
    branchId,
    terminalId,
    cashierId: userId,
    items: input.items,
    subtotal: input.subtotal,
    discountAmount: input.discountAmount ?? 0,
    discountType: input.discountType ?? 'fixed',
    taxRate: input.taxRate ?? 0,
    taxAmount: input.taxAmount ?? 0,
    totalAmount: input.totalAmount,
    payments,
    isSplit: false,
    change: 0,
    status: 'layaway',
    depositAmount: input.depositAmount,
    balanceDue,
    customerId: input.customerId ?? null,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
  })

  return transaction.toObject()
}
```

- [ ] **Step 3: Add `createOnAccount` function**

```typescript
export async function createOnAccount(input: {
  items: any[]
  subtotal: number
  discountAmount?: number
  discountType?: string
  taxRate?: number
  taxAmount?: number
  totalAmount: number
  customerId: string  // required for on-account
  notes?: string
}, userId: string, branchId: string, terminalId: string): Promise<any> {
  // Validate customer exists
  const Customer = (await import('../models/customer.model')).Customer
  const customer = await Customer.findById(input.customerId)
  if (!customer) throw new Error('Customer not found — on-account sales require an existing customer')

  const receiptNo = await generateReceiptNo(branchId)

  const transaction = await Transaction.create({
    receiptNo,
    branchId,
    terminalId,
    cashierId: userId,
    items: input.items,
    subtotal: input.subtotal,
    discountAmount: input.discountAmount ?? 0,
    discountType: input.discountType ?? 'fixed',
    taxRate: input.taxRate ?? 0,
    taxAmount: input.taxAmount ?? 0,
    totalAmount: input.totalAmount,
    payments: [],
    isSplit: false,
    change: 0,
    status: 'on_account',
    depositAmount: 0,
    balanceDue: input.totalAmount,
    customerId: input.customerId,
  })

  return transaction.toObject()
}
```

- [ ] **Step 4: Add `settleLayaway` function**

```typescript
export async function settleLayaway(input: {
  transactionId: string
  amount: number
  method: 'cash' | 'card' | 'gcash' | 'paymaya'
  note?: string
}, userId: string): Promise<any> {
  const transaction = await Transaction.findOne({
    _id: input.transactionId,
    status: { $in: ['layaway', 'on_account'] }
  })
  if (!transaction) throw new Error('Transaction not found or not an open layaway/on-account')
  if (input.amount <= 0) throw new Error('Payment amount must be greater than zero')
  if (input.amount > (transaction.balanceDue ?? 0)) throw new Error('Payment exceeds balance due')

  const newBalance = Math.round(((transaction.balanceDue ?? 0) - input.amount) * 100) / 100

  transaction.partialPayments.push({
    amount: input.amount,
    method: input.method,
    paidAt: new Date(),
    recordedBy: userId as any,
    note: input.note ?? null,
  } as any)

  // Also push to the top-level `payments` array so the amount is counted in cash drawer totals
  transaction.payments.push({
    method: input.method,
    amount: input.amount,
    reference: null,
  } as any)

  transaction.balanceDue = newBalance

  if (newBalance <= 0) {
    transaction.status = 'completed'
    transaction.balanceDue = 0
  }

  await transaction.save()
  return transaction.toObject()
}
```

- [ ] **Step 5: Add `getLayaways` function**

```typescript
export async function getLayaways(branchId: string, opts?: { skip?: number; limit?: number }): Promise<{ data: any[]; total: number }> {
  const query = { branchId, status: { $in: ['layaway', 'on_account'] } }
  const [data, total] = await Promise.all([
    Transaction.find(query).sort({ createdAt: -1 }).skip(opts?.skip ?? 0).limit(opts?.limit ?? 50).lean(),
    Transaction.countDocuments(query),
  ])
  return { data, total }
}
```

- [ ] **Step 6: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/services/transaction.service.ts
git commit -m "feat: add createLayaway, createOnAccount, settleLayaway, getLayaways to transaction.service"
```

---

## Task 4: Register IPC handlers

**Files:**
- Modify: `src/main/handlers/pos.handlers.ts`

- [ ] **Step 1: Read `pos.handlers.ts` to understand existing handler registration pattern**

- [ ] **Step 2: Add 4 new handlers inside the existing `registerPosHandlers()` function**

```typescript
ipcMain.handle(IPC.POS_CREATE_LAYAWAY, async (_e, req: unknown) => {
  try {
    const auth = await requireAuth(store.get('jwt') ?? null)
    if (!auth.role.permissions.includes('can_make_sale')) return { success: false, error: 'Permission denied' }
    const r = req as any
    if (typeof r?.depositAmount !== 'number' || r.depositAmount < 0) return { success: false, error: 'Invalid deposit amount' }
    const terminalId = store.get('terminalId') ?? 'unknown'
    const data = await createLayaway(r, auth.user._id, auth.user.branchId, terminalId)
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle(IPC.POS_CREATE_ON_ACCOUNT, async (_e, req: unknown) => {
  try {
    const auth = await requireAuth(store.get('jwt') ?? null)
    if (!auth.role.permissions.includes('can_make_sale')) return { success: false, error: 'Permission denied' }
    const r = req as any
    if (!r?.customerId) return { success: false, error: 'Customer is required for on-account sales' }
    const terminalId = store.get('terminalId') ?? 'unknown'
    const data = await createOnAccount(r, auth.user._id, auth.user.branchId, terminalId)
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle(IPC.POS_SETTLE_LAYAWAY, async (_e, req: unknown) => {
  try {
    const auth = await requireAuth(store.get('jwt') ?? null)
    if (!auth.role.permissions.includes('can_make_sale')) return { success: false, error: 'Permission denied' }
    const r = req as any
    if (!r?.transactionId) return { success: false, error: 'transactionId required' }
    if (typeof r.amount !== 'number' || r.amount <= 0) return { success: false, error: 'Valid payment amount required' }
    const data = await settleLayaway(r, auth.user._id)
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle(IPC.POS_GET_LAYAWAYS, async (_e, req: unknown) => {
  try {
    const auth = await requireAuth(store.get('jwt') ?? null)
    const r = (req ?? {}) as { skip?: number; limit?: number }
    const result = await getLayaways(auth.user.branchId, r)
    return { success: true, ...result }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})
```

- [ ] **Step 3: Import new service functions at the top of the file**

Add `createLayaway, createOnAccount, settleLayaway, getLayaways` to the import from `../services/transaction.service`. Note: `pos.service.ts` does **not** exist — these functions are in `transaction.service.ts`.

- [ ] **Step 4: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/handlers/pos.handlers.ts
git commit -m "feat: add layaway/on-account IPC handlers to pos.handlers"
```

---

## Task 5: Add Layaway and On-Account tabs to PaymentModal

**Files:**
- Modify: `src/renderer/src/pages/pos/PaymentModal.tsx`

- [ ] **Step 1: Read `PaymentModal.tsx` to understand its current structure**

- [ ] **Step 2: Add payment mode state and layaway fields**

```typescript
type PaymentMode = 'full' | 'layaway' | 'on_account'
const [paymentMode, setPaymentMode] = useState<PaymentMode>('full')
const [depositAmount, setDepositAmount] = useState('')
const [dueDate, setDueDate] = useState('')
```

- [ ] **Step 3: Add mode selector tabs above the payment form**

```tsx
{/* Payment mode tabs */}
<div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px' }}>
  {(['full', 'layaway', 'on_account'] as const).map(mode => (
    <button key={mode} onClick={() => setPaymentMode(mode)}
      style={{
        flex: 1, fontSize: '12px', padding: '6px', borderRadius: '7px', border: 'none', cursor: 'pointer',
        fontWeight: 600,
        background: paymentMode === mode ? 'rgba(99,102,241,0.15)' : 'transparent',
        color: paymentMode === mode ? '#818cf8' : 'rgba(255,255,255,0.4)',
      }}>
      {mode === 'full' ? 'Full Payment' : mode === 'layaway' ? 'Layaway' : 'On Account'}
    </button>
  ))}
</div>
```

- [ ] **Step 4: Show deposit field when mode is layaway**

```tsx
{paymentMode === 'layaway' && (
  <div style={{ marginBottom: '12px' }}>
    <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deposit Amount (₱)</label>
    <input type="number" min="0" step="0.01"
      value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
      className="dark-input mt-1" placeholder="0.00"
      style={{ fontSize: '14px' }}
    />
    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
      Balance due: ₱{Math.max(0, total - (parseFloat(depositAmount) || 0)).toFixed(2)}
    </p>
    <div style={{ marginTop: '8px' }}>
      <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Due Date (optional)</label>
      <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="dark-input mt-1" />
    </div>
  </div>
)}
{paymentMode === 'on_account' && !customer && (
  <div style={{ padding: '12px', background: 'rgba(220,38,38,0.06)', borderRadius: '8px', fontSize: '13px', color: '#dc2626' }}>
    On-account sales require a customer to be selected. Go back and search for the customer first.
  </div>
)}
```

- [ ] **Step 5: Update the confirm/submit handler to dispatch the right IPC call**

In the existing submit handler, branch on `paymentMode`:
```typescript
if (paymentMode === 'layaway') {
  await ipc.invoke(IPC.POS_CREATE_LAYAWAY, {
    ...salePayload,
    depositAmount: parseFloat(depositAmount) || 0,
    customerId: customer?._id ?? null,
    dueDate: dueDate || null,
  })
} else if (paymentMode === 'on_account') {
  if (!customer) return setError('Customer required for on-account')
  await ipc.invoke(IPC.POS_CREATE_ON_ACCOUNT, {
    ...salePayload,
    customerId: customer._id,
  })
} else {
  // existing full payment flow
}
```

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/pages/pos/PaymentModal.tsx
git commit -m "feat: add Layaway and On-Account payment modes to PaymentModal"
```

---

## Task 6: Add Layaway tab to TransactionsPage

**Files:**
- Modify: `src/renderer/src/pages/transactions/TransactionsPage.tsx`

- [ ] **Step 1: Read `TransactionsPage.tsx` to understand current tab/filter structure**

- [ ] **Step 2: Add a Layaway/On-Account filter tab**

Add a new tab button (alongside existing ones like "All", "Voided", "Refunded"):
```tsx
<button onClick={() => setStatusFilter('layaway,on_account')} className={statusFilter === 'layaway,on_account' ? 'tab-active' : 'tab'}>
  Layaway / On Account
</button>
```

- [ ] **Step 3: Show "Balance Due" column and "Settle" button when on layaway tab**

Add `balanceDue` column and Settle button in the row actions when `t.status === 'layaway' || t.status === 'on_account'`:

```tsx
{(t.status === 'layaway' || t.status === 'on_account') && (
  <>
    <td>₱{(t.balanceDue ?? 0).toFixed(2)}</td>
    <td>
      <button onClick={() => openSettleModal(t)} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'rgba(99,102,241,0.10)', color: '#818cf8', fontWeight: 600 }}>
        Settle
      </button>
    </td>
  </>
)}
```

- [ ] **Step 4: Add a Settle modal**

```tsx
{settleTarget && (
  <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="modal-panel w-full max-w-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Record Payment</h2>
        <button onClick={() => setSettleTarget(null)} style={{ color: 'var(--text-muted)' }}>✕</button>
      </div>
      <form onSubmit={handleSettle}>
        <div className="px-6 py-5 space-y-3">
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Balance Due: <strong style={{ color: '#818cf8' }}>₱{(settleTarget.balanceDue ?? 0).toFixed(2)}</strong></p>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Amount (₱) *</label>
            <input type="number" min="0.01" step="0.01" max={settleTarget.balanceDue ?? undefined}
              value={settleAmount} onChange={e => setSettleAmount(e.target.value)}
              className="dark-input mt-1" />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Method *</label>
            <select value={settleMethod} onChange={e => setSettleMethod(e.target.value)} className="dark-input mt-1">
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="gcash">GCash</option>
              <option value="paymaya">PayMaya</option>
            </select>
          </div>
          {settleError && <div style={{ fontSize: '13px', color: 'var(--color-danger)', padding: '8px 12px', background: 'var(--color-danger-bg)', borderRadius: '8px' }}>{settleError}</div>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button type="button" onClick={() => setSettleTarget(null)} className="btn-secondary px-5 py-2">Cancel</button>
          <button type="submit" disabled={settleLoading} className="btn-primary px-5 py-2 disabled:opacity-50">
            {settleLoading ? 'Saving…' : 'Record Payment'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
```

- [ ] **Step 5: Add `handleSettle` function**

```typescript
async function handleSettle(e: React.FormEvent) {
  e.preventDefault()
  setSettleError('')
  const amount = parseFloat(settleAmount)
  if (!amount || amount <= 0) return setSettleError('Enter a valid amount')
  setSettleLoading(true)
  try {
    const res = await ipc.invoke<{ success: boolean; error?: string }>(IPC.POS_SETTLE_LAYAWAY, {
      transactionId: settleTarget!._id,
      amount,
      method: settleMethod,
    })
    if (!res.success) throw new Error(res.error)
    setSettleTarget(null)
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
  } catch (err: any) {
    setSettleError(err.message)
  } finally {
    setSettleLoading(false)
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/pages/transactions/TransactionsPage.tsx
git commit -m "feat: add Layaway/On-Account filter tab and Settle action to TransactionsPage"
```

---

## Verification

End-to-end test:
1. Go to POS → add items to cart → in PaymentModal choose "Layaway" → enter deposit ₱500 → confirm
2. Verify transaction appears in Transactions → Layaway/On-Account tab with balance due
3. Click Settle → enter payment → verify balance decreases
4. Settle the remaining balance → verify status changes to "completed"
5. Test On-Account: requires customer → verify error if no customer selected
6. Test On-Account with a customer attached → confirm → verify in transactions list
