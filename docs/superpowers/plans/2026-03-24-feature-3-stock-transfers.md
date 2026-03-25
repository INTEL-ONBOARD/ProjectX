# Feature 3: Stock Transfers Between Branches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a branch to request a stock transfer to another branch, have it approved by a user with the correct permission, and have the receiving branch confirm receipt — atomically updating inventory at both branches.

**Architecture:** New `StockTransfer` Mongoose model. Dedicated `stock-transfer.service.ts` with all status-transition logic. Dedicated `stock-transfer.handlers.ts` registered via `registry.ts`. Re-enable the `stock_transfers` collection in `change-streams.ts`. New `StockTransfersPage` renderer page with a workflow stepper UI.

**Tech Stack:** Mongoose (bulkWrite for atomic inventory update), Electron ipcMain, React + React Query, TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/main/models/stock-transfer.model.ts` | Create | StockTransfer schema + interfaces |
| `src/main/services/stock-transfer.service.ts` | Create | Transfer workflow logic, inventory update |
| `src/main/handlers/stock-transfer.handlers.ts` | Create | IPC handlers for all TRANSFER_* channels |
| `src/main/handlers/registry.ts` | Modify | Register stock transfer handlers |
| `src/main/db/change-streams.ts` | Modify | Re-enable stock_transfers collection watch |
| `src/shared/types/ipc.types.ts` | Modify | Add TRANSFER_* channels |
| `src/renderer/src/hooks/useStockTransfers.ts` | Create | React Query hooks |
| `src/renderer/src/pages/inventory/StockTransfersPage.tsx` | Create | Full transfer UI |
| `src/renderer/src/components/layout/Sidebar.tsx` | Modify | Add nav item under Inventory |
| `src/renderer/src/App.tsx` | Modify | Add route |

---

## Task 1: Create the StockTransfer model

**Files:**
- Create: `src/main/models/stock-transfer.model.ts`

- [ ] **Step 1: Create the model**

```typescript
// src/main/models/stock-transfer.model.ts
import { Schema, model, Document, Types } from 'mongoose'

export interface ITransferItemDoc {
  productId: Types.ObjectId
  productName: string
  quantity: number
  unitCost: number
}

export interface IStockTransferDoc extends Document {
  fromBranchId: Types.ObjectId
  toBranchId: Types.ObjectId
  items: ITransferItemDoc[]
  status: 'draft' | 'pending' | 'approved' | 'in_transit' | 'received' | 'rejected' | 'cancelled'
  requestedBy: Types.ObjectId
  approvedBy: Types.ObjectId | null
  receivedBy: Types.ObjectId | null
  notes: string | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}

const transferItemSchema = new Schema<ITransferItemDoc>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitCost: { type: Number, required: true, min: 0 },
}, { _id: false })

const stockTransferSchema = new Schema<IStockTransferDoc>(
  {
    fromBranchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    toBranchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    items: { type: [transferItemSchema], required: true },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'in_transit', 'received', 'rejected', 'cancelled'],
      default: 'draft',
      required: true,
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, default: null },
    rejectionReason: { type: String, default: null },
  },
  { timestamps: true }
)

stockTransferSchema.index({ fromBranchId: 1, createdAt: -1 })
stockTransferSchema.index({ toBranchId: 1, createdAt: -1 })
stockTransferSchema.index({ status: 1 })

export const StockTransfer = model<IStockTransferDoc>('StockTransfer', stockTransferSchema)
```

- [ ] **Step 2: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/models/stock-transfer.model.ts
git commit -m "feat: create StockTransfer Mongoose model"
```

---

## Task 2: Add TRANSFER_* IPC channels

**Files:**
- Modify: `src/shared/types/ipc.types.ts`

- [ ] **Step 1: Add channels after the BRANCHES block**

```typescript
  // Stock Transfers
  TRANSFER_CREATE: 'transfer:create',
  TRANSFER_GET_ALL: 'transfer:getAll',
  TRANSFER_GET: 'transfer:get',
  TRANSFER_APPROVE: 'transfer:approve',
  TRANSFER_REJECT: 'transfer:reject',
  TRANSFER_RECEIVE: 'transfer:receive',
  TRANSFER_CANCEL: 'transfer:cancel',
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/types/ipc.types.ts
git commit -m "feat: add TRANSFER_* IPC channel constants"
```

---

## Task 3: Create stock transfer service

**Files:**
- Create: `src/main/services/stock-transfer.service.ts`

- [ ] **Step 1: Create the service with all workflow functions**

```typescript
// src/main/services/stock-transfer.service.ts
import { StockTransfer } from '../models/stock-transfer.model'
import { Product } from '../models/product.model'
import { Inventory } from '../models/inventory.model'
import mongoose from 'mongoose'

export interface IPublicTransfer {
  _id: string
  fromBranchId: string
  toBranchId: string
  items: Array<{ productId: string; productName: string; quantity: number; unitCost: number }>
  status: string
  requestedBy: string
  approvedBy: string | null
  receivedBy: string | null
  notes: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
}

function toPublic(doc: any): IPublicTransfer {
  return {
    _id: doc._id?.toString() ?? '',
    fromBranchId: doc.fromBranchId?.toString() ?? '',
    toBranchId: doc.toBranchId?.toString() ?? '',
    items: (doc.items ?? []).map((i: any) => ({
      productId: i.productId?.toString() ?? '',
      productName: i.productName,
      quantity: i.quantity,
      unitCost: i.unitCost,
    })),
    status: doc.status,
    requestedBy: doc.requestedBy?.toString() ?? '',
    approvedBy: doc.approvedBy?.toString() ?? null,
    receivedBy: doc.receivedBy?.toString() ?? null,
    notes: doc.notes ?? null,
    rejectionReason: doc.rejectionReason ?? null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date(0).toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date(0).toISOString(),
  }
}

export async function createTransfer(input: {
  fromBranchId: string
  toBranchId: string
  items: Array<{ productId: string; quantity: number }>
  notes?: string
  submit?: boolean  // true = go to 'pending', false = save as 'draft'
}, userId: string): Promise<IPublicTransfer> {
  if (input.fromBranchId === input.toBranchId) throw new Error('Source and destination branches must be different')
  if (!input.items || input.items.length === 0) throw new Error('At least one item is required')

  // Snapshot product names and cost prices
  const productIds = input.items.map(i => new mongoose.Types.ObjectId(i.productId))
  const products = await Product.find({ _id: { $in: productIds } }).lean()
  const productMap = new Map(products.map(p => [p._id.toString(), p]))

  const items = input.items.map(i => {
    const p = productMap.get(i.productId)
    if (!p) throw new Error(`Product ${i.productId} not found`)
    return {
      productId: i.productId,
      productName: p.name,
      quantity: i.quantity,
      unitCost: p.costPrice ?? 0,
    }
  })

  const doc = await StockTransfer.create({
    fromBranchId: input.fromBranchId,
    toBranchId: input.toBranchId,
    items,
    status: input.submit ? 'pending' : 'draft',
    requestedBy: userId,
    notes: input.notes ?? null,
  })
  return toPublic(doc)
}

export async function getTransfers(filters: {
  branchId?: string | null
  status?: string
  skip?: number
  limit?: number
}): Promise<{ data: IPublicTransfer[]; total: number }> {
  const query: any = {}
  if (filters.branchId) {
    query.$or = [{ fromBranchId: filters.branchId }, { toBranchId: filters.branchId }]
  }
  if (filters.status) query.status = filters.status

  const [data, total] = await Promise.all([
    StockTransfer.find(query).sort({ createdAt: -1 }).skip(filters.skip ?? 0).limit(filters.limit ?? 50).lean(),
    StockTransfer.countDocuments(query),
  ])
  return { data: data.map(toPublic), total }
}

export async function getTransfer(id: string): Promise<IPublicTransfer | null> {
  const doc = await StockTransfer.findById(id).lean()
  return doc ? toPublic(doc) : null
}

export async function approveTransfer(id: string, userId: string): Promise<IPublicTransfer> {
  const doc = await StockTransfer.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { status: 'approved', approvedBy: userId },
    { new: true }
  )
  if (!doc) throw new Error('Transfer not found or not in pending status')
  return toPublic(doc)
}

export async function rejectTransfer(id: string, userId: string, reason: string): Promise<IPublicTransfer> {
  const doc = await StockTransfer.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { status: 'rejected', approvedBy: userId, rejectionReason: reason },
    { new: true }
  )
  if (!doc) throw new Error('Transfer not found or not in pending status')
  return toPublic(doc)
}

export async function receiveTransfer(id: string, userId: string): Promise<IPublicTransfer> {
  const session = await mongoose.startSession()
  let result: IPublicTransfer
  await session.withTransaction(async () => {
    const transfer = await StockTransfer.findOne({ _id: id, status: { $in: ['approved', 'in_transit'] } }).session(session)
    if (!transfer) throw new Error('Transfer not found or not approved')

    // Atomically adjust inventory: decrement source, increment destination
    // IMPORTANT: Use the Inventory Mongoose model (maps to 'inventories' collection), not
    // mongoose.connection.collection('inventory') which targets the wrong collection name.
    for (const item of transfer.items) {
      // Decrement source branch
      await Inventory.updateOne(
        { productId: item.productId, branchId: transfer.fromBranchId },
        { $inc: { quantity: -item.quantity } },
        { session }
      )
      // Increment destination branch (upsert in case inventory doc doesn't exist)
      await Inventory.updateOne(
        { productId: item.productId, branchId: transfer.toBranchId },
        { $inc: { quantity: item.quantity }, $setOnInsert: { productId: item.productId, branchId: transfer.toBranchId } },
        { upsert: true, session } as any
      )
    }

    transfer.status = 'received'
    transfer.receivedBy = userId as any
    await transfer.save({ session })
    result = toPublic(transfer)
  })
  session.endSession()
  return result!
}

export async function cancelTransfer(id: string, userId: string): Promise<IPublicTransfer> {
  const doc = await StockTransfer.findOneAndUpdate(
    { _id: id, status: { $in: ['draft', 'pending'] }, requestedBy: userId },
    { status: 'cancelled' },
    { new: true }
  )
  if (!doc) throw new Error('Transfer not found, already processed, or you are not the requester')
  return toPublic(doc)
}
```

- [ ] **Step 2: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/services/stock-transfer.service.ts
git commit -m "feat: create stock transfer service with full workflow and atomic inventory update"
```

---

## Task 4: Create IPC handlers and register

**Files:**
- Create: `src/main/handlers/stock-transfer.handlers.ts`
- Modify: `src/main/handlers/registry.ts`

- [ ] **Step 1: Create `stock-transfer.handlers.ts`**

```typescript
// src/main/handlers/stock-transfer.handlers.ts
import { ipcMain } from 'electron'
import { IPC } from '@shared/types/ipc.types'
import { requireAuth } from '../services/auth.service'
import store from '../store/electron-store'
import { createTransfer, getTransfers, getTransfer, approveTransfer, rejectTransfer, receiveTransfer, cancelTransfer } from '../services/stock-transfer.service'

export function registerStockTransferHandlers(): void {
  ipcMain.handle(IPC.TRANSFER_CREATE, async (_e, req: unknown) => {
    try {
      const auth = await requireAuth(store.get('jwt') ?? null)
      const r = req as any
      const data = await createTransfer(r, auth.user._id)
      return { success: true, data }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.TRANSFER_GET_ALL, async (_e, req: unknown) => {
    try {
      const auth = await requireAuth(store.get('jwt') ?? null)
      const canViewAll = auth.role.permissions.includes('can_view_all_branches')
      const r = (req ?? {}) as { status?: string; skip?: number; limit?: number }
      const result = await getTransfers({
        branchId: canViewAll ? null : auth.user.branchId,
        ...r,
      })
      return { success: true, ...result }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.TRANSFER_GET, async (_e, req: unknown) => {
    try {
      await requireAuth(store.get('jwt') ?? null)
      const r = req as { id: string }
      const data = await getTransfer(r.id)
      return { success: true, data }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.TRANSFER_APPROVE, async (_e, req: unknown) => {
    try {
      const auth = await requireAuth(store.get('jwt') ?? null)
      if (!auth.role.permissions.includes('can_approve_stock_transfer')) return { success: false, error: 'Permission denied' }
      const r = req as { id: string }
      const data = await approveTransfer(r.id, auth.user._id)
      return { success: true, data }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.TRANSFER_REJECT, async (_e, req: unknown) => {
    try {
      const auth = await requireAuth(store.get('jwt') ?? null)
      if (!auth.role.permissions.includes('can_approve_stock_transfer')) return { success: false, error: 'Permission denied' }
      const r = req as { id: string; reason: string }
      const data = await rejectTransfer(r.id, auth.user._id, r.reason ?? '')
      return { success: true, data }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.TRANSFER_RECEIVE, async (_e, req: unknown) => {
    try {
      const auth = await requireAuth(store.get('jwt') ?? null)
      if (!auth.role.permissions.includes('can_receive_stock_transfer')) return { success: false, error: 'Permission denied' }
      const r = req as { id: string }
      const data = await receiveTransfer(r.id, auth.user._id)
      return { success: true, data }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.TRANSFER_CANCEL, async (_e, req: unknown) => {
    try {
      const auth = await requireAuth(store.get('jwt') ?? null)
      const r = req as { id: string }
      const data = await cancelTransfer(r.id, auth.user._id)
      return { success: true, data }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
```

- [ ] **Step 2: Register in `registry.ts`**

```typescript
import { registerStockTransferHandlers } from './stock-transfer.handlers'
// in registerAllHandlers():
registerStockTransferHandlers()
```

- [ ] **Step 3: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/handlers/stock-transfer.handlers.ts src/main/handlers/registry.ts
git commit -m "feat: create stock transfer IPC handlers and register"
```

---

## Task 5: Re-enable stock_transfers change stream

**Files:**
- Modify: `src/main/db/change-streams.ts`

- [ ] **Step 1: Add stock_transfers to the watched collections**

Find the `WATCHED_COLLECTIONS` array and replace the comment with an actual entry:

```typescript
// Replace:
// stock_transfers: not yet implemented (Phase 6) — add back when StockTransfer model is created

// With:
{ name: 'stock_transfers', channel: IPC.STREAM_STOCK_TRANSFERS },
```

- [ ] **Step 2: Commit**

```bash
git add src/main/db/change-streams.ts
git commit -m "feat: re-enable stock_transfers change stream"
```

---

## Task 6: Create `useStockTransfers` hook

**Files:**
- Create: `src/renderer/src/hooks/useStockTransfers.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/renderer/src/hooks/useStockTransfers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ipc } from '../lib/ipc'
import { IPC } from '@shared/types/ipc.types'

export interface ITransferItem {
  productId: string
  productName: string
  quantity: number
  unitCost: number
}

export interface IStockTransfer {
  _id: string
  fromBranchId: string
  toBranchId: string
  items: ITransferItem[]
  status: 'draft' | 'pending' | 'approved' | 'in_transit' | 'received' | 'rejected' | 'cancelled'
  requestedBy: string
  approvedBy: string | null
  receivedBy: string | null
  notes: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
}

export function useStockTransfers(statusFilter?: string) {
  const queryClient = useQueryClient()

  const transfersQuery = useQuery({
    queryKey: ['stock-transfers', statusFilter],
    queryFn: async () => {
      const res = await ipc.invoke<{ success: boolean; data?: IStockTransfer[]; total?: number; error?: string }>(
        IPC.TRANSFER_GET_ALL, { status: statusFilter || undefined }
      )
      if (!res.success) throw new Error(res.error)
      return { data: res.data ?? [], total: res.total ?? 0 }
    },
    staleTime: 30_000,
    retry: false,
  })

  const createMutation = useMutation({
    mutationFn: async (input: any) => {
      const res = await ipc.invoke<{ success: boolean; data?: IStockTransfer; error?: string }>(IPC.TRANSFER_CREATE, input)
      if (!res.success) throw new Error(res.error)
      return res.data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-transfers'] }),
  })

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await ipc.invoke<{ success: boolean; error?: string }>(IPC.TRANSFER_APPROVE, { id })
      if (!res.success) throw new Error(res.error)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-transfers'] }),
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await ipc.invoke<{ success: boolean; error?: string }>(IPC.TRANSFER_REJECT, { id, reason })
      if (!res.success) throw new Error(res.error)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-transfers'] }),
  })

  const receiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await ipc.invoke<{ success: boolean; error?: string }>(IPC.TRANSFER_RECEIVE, { id })
      if (!res.success) throw new Error(res.error)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-transfers'] }),
  })

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await ipc.invoke<{ success: boolean; error?: string }>(IPC.TRANSFER_CANCEL, { id })
      if (!res.success) throw new Error(res.error)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-transfers'] }),
  })

  return { transfersQuery, createMutation, approveMutation, rejectMutation, receiveMutation, cancelMutation }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/hooks/useStockTransfers.ts
git commit -m "feat: create useStockTransfers React Query hook"
```

---

## Task 7: Create StockTransfersPage

**Files:**
- Create: `src/renderer/src/pages/inventory/StockTransfersPage.tsx`

- [ ] **Step 1: Create the page**

```typescript
// src/renderer/src/pages/inventory/StockTransfersPage.tsx
import { useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { useStockTransfers, IStockTransfer } from '../../hooks/useStockTransfers'
import { useBranches } from '../../hooks/useBranches'
import { useAuth } from '../../hooks/useAuth'
import { PERMISSIONS } from '@shared/types/permissions'

const STATUS_TABS = ['', 'pending', 'approved', 'in_transit', 'received', 'rejected', 'cancelled'] as const
const STATUS_LABELS: Record<string, string> = {
  '': 'All', draft: 'Draft', pending: 'Pending', approved: 'Approved',
  in_transit: 'In Transit', received: 'Received', rejected: 'Rejected', cancelled: 'Cancelled'
}
const STATUS_BADGE: Record<string, string> = {
  draft: 'badge-gray', pending: 'badge-yellow', approved: 'badge-blue',
  in_transit: 'badge-blue', received: 'badge-green', rejected: 'badge-red', cancelled: 'badge-gray'
}

export function StockTransfersPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [error, setError] = useState('')
  const { transfersQuery, approveMutation, rejectMutation, receiveMutation, cancelMutation } = useStockTransfers(statusFilter || undefined)
  const { branchesQuery } = useBranches()
  const { hasPermission } = useAuth()
  const transfers = transfersQuery.data?.data ?? []
  const branches = branchesQuery.data ?? []
  const getBranchName = (id: string) => branches.find(b => b._id === id)?.name ?? id.slice(-6)

  async function handleApprove(id: string) {
    try { await approveMutation.mutateAsync(id) }
    catch (err: any) { setError(err.message) }
  }

  async function handleReject(id: string) {
    const reason = prompt('Rejection reason:') ?? ''
    try { await rejectMutation.mutateAsync({ id, reason }) }
    catch (err: any) { setError(err.message) }
  }

  async function handleReceive(id: string) {
    if (!confirm('Confirm receipt? This will update inventory at both branches.')) return
    try { await receiveMutation.mutateAsync(id) }
    catch (err: any) { setError(err.message) }
  }

  async function handleCancel(id: string) {
    if (!confirm('Cancel this transfer request?')) return
    try { await cancelMutation.mutateAsync(id) }
    catch (err: any) { setError(err.message) }
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>Stock Transfers</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{transfersQuery.data?.total ?? 0} total transfers</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{
              fontSize: '12px', padding: '5px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              background: statusFilter === s ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
              color: statusFilter === s ? '#818cf8' : 'rgba(255,255,255,0.5)',
              fontWeight: statusFilter === s ? 600 : 400,
            }}>
            {STATUS_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      {error && <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: '#dc2626', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Date', 'From', 'To', 'Items', 'Status', 'Actions'].map((h, i) => (
                <th key={h} style={{ background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.28)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '10px 16px', textAlign: i >= 4 ? 'right' : 'left', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transfers.map((t, idx) => (
              <tr key={t._id} style={{ height: '52px' }}>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', borderBottom: idx < transfers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.88)', borderBottom: idx < transfers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  {getBranchName(t.fromBranchId)}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.88)', borderBottom: idx < transfers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  {getBranchName(t.toBranchId)}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', borderBottom: idx < transfers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  {t.items.length} item{t.items.length !== 1 ? 's' : ''}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', borderBottom: idx < transfers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span className={STATUS_BADGE[t.status] ?? 'badge-gray'} style={{ fontSize: '11px' }}>
                    {STATUS_LABELS[t.status] ?? t.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', borderBottom: idx < transfers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                    {t.status === 'pending' && hasPermission(PERMISSIONS.CAN_APPROVE_STOCK_TRANSFER) && (
                      <>
                        <button onClick={() => handleApprove(t._id)} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'rgba(22,163,74,0.12)', color: '#16a34a', fontWeight: 600 }}>Approve</button>
                        <button onClick={() => handleReject(t._id)} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'rgba(220,38,38,0.08)', color: '#dc2626', fontWeight: 600 }}>Reject</button>
                      </>
                    )}
                    {(t.status === 'approved' || t.status === 'in_transit') && hasPermission(PERMISSIONS.CAN_RECEIVE_STOCK_TRANSFER) && (
                      <button onClick={() => handleReceive(t._id)} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'rgba(99,102,241,0.10)', color: '#818cf8', fontWeight: 600 }}>Mark Received</button>
                    )}
                    {(t.status === 'draft' || t.status === 'pending') && (
                      <button onClick={() => handleCancel(t._id)} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}>Cancel</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transfers.length === 0 && !transfersQuery.isLoading && (
          <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: '13px' }}>
            <ArrowLeftRight style={{ width: '32px', height: '32px', margin: '0 auto 12px', opacity: 0.3 }} />
            No transfers found
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/pages/inventory/StockTransfersPage.tsx
git commit -m "feat: create StockTransfersPage with status tabs and action buttons"
```

---

## Task 8: Add to Sidebar and Router

**Files:**
- Modify: `src/renderer/src/components/layout/Sidebar.tsx`
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Add nav item to Sidebar under Inventory section**

```tsx
{(hasPermission(PERMISSIONS.CAN_APPROVE_STOCK_TRANSFER) || hasPermission(PERMISSIONS.CAN_RECEIVE_STOCK_TRANSFER)) && (
  <SidebarItem to="/stock-transfers" icon={ArrowLeftRight} label="Transfers" />
)}
```

- [ ] **Step 2: Add route**

```tsx
import { StockTransfersPage } from './pages/inventory/StockTransfersPage'
<Route path="/stock-transfers" element={<StockTransfersPage />} />
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/layout/Sidebar.tsx src/renderer/src/App.tsx
git commit -m "feat: add Stock Transfers nav item and route"
```

---

## Verification

End-to-end test:
1. Create a transfer: from Branch A → Branch B, item: 10 units of "Bolt M6"
2. Submit (status → pending)
3. Log in as user with `can_approve_stock_transfer` → Approve
4. Log in as user with `can_receive_stock_transfer` → Mark Received
5. Verify Inventory: Branch A decremented by 10, Branch B incremented by 10
6. Verify change stream fires and UI updates in real time
7. Try to approve as a user without permission → verify "Permission denied"
