# Feature 5: Shift Management / Clock In-Out Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let cashiers clock in and out independently of the cash drawer. On clock-out, automatically calculate total sales, transactions, discounts, and voids for that shift. Managers can view all shifts in a new Shifts tab in the ReportingPage.

**Architecture:** New `Shift` Mongoose model. Dedicated `shift.service.ts` and `shift.handlers.ts`. Clock in/out button added to the Sidebar footer. New Shifts tab in ReportingPage.

**Tech Stack:** Mongoose (timestamps: true), Electron ipcMain, React + React Query, TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/main/models/shift.model.ts` | Create | Shift schema + interface |
| `src/main/services/shift.service.ts` | Create | clockIn, clockOut, getOpenShift, getShifts |
| `src/main/handlers/shift.handlers.ts` | Create | IPC handlers for all SHIFT_* channels |
| `src/main/handlers/registry.ts` | Modify | Register shift handlers |
| `src/shared/types/ipc.types.ts` | Modify | Add SHIFT_* channels |
| `src/shared/types/permissions.ts` | Modify | Add CAN_MANAGE_SHIFTS |
| `src/renderer/src/hooks/useShift.ts` | Create | React Query hook for current shift |
| `src/renderer/src/components/layout/Sidebar.tsx` | Modify | Add clock in/out button to footer |
| `src/renderer/src/pages/reporting/ReportingPage.tsx` | Modify | Add Shifts report tab |

---

## Task 1: Create the Shift model

**Files:**
- Create: `src/main/models/shift.model.ts`

- [ ] **Step 1: Create the model**

```typescript
// src/main/models/shift.model.ts
import { Schema, model, Document, Types } from 'mongoose'

export interface IShiftDoc extends Document {
  userId: Types.ObjectId
  branchId: Types.ObjectId
  terminalId: string
  clockIn: Date
  clockOut: Date | null
  totalSales: number
  totalTransactions: number
  totalDiscounts: number
  totalVoids: number
  status: 'open' | 'closed'
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

const shiftSchema = new Schema<IShiftDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    terminalId: { type: String, required: true },
    clockIn: { type: Date, required: true },
    clockOut: { type: Date, default: null },
    totalSales: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
    totalDiscounts: { type: Number, default: 0 },
    totalVoids: { type: Number, default: 0 },
    status: { type: String, enum: ['open', 'closed'], default: 'open', required: true },
    notes: { type: String, default: null },
  },
  { timestamps: true }
)

// Only one open shift per user per terminal at a time
shiftSchema.index(
  { userId: 1, terminalId: 1 },
  { unique: true, partialFilterExpression: { status: 'open' } }
)
shiftSchema.index({ branchId: 1, clockIn: -1 })
shiftSchema.index({ userId: 1, clockIn: -1 })

export const Shift = model<IShiftDoc>('Shift', shiftSchema)
```

- [ ] **Step 2: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/models/shift.model.ts
git commit -m "feat: create Shift Mongoose model"
```

---

## Task 2: Add IPC channels and permission

**Files:**
- Modify: `src/shared/types/ipc.types.ts`
- Modify: `src/shared/types/permissions.ts`

- [ ] **Step 1: Add SHIFT_* channels**

After the SETTINGS block, add:

```typescript
  // Shifts
  SHIFT_CLOCK_IN: 'shift:clockIn',
  SHIFT_CLOCK_OUT: 'shift:clockOut',
  SHIFT_GET_OPEN: 'shift:getOpen',
  SHIFT_GET_ALL: 'shift:getAll',
```

- [ ] **Step 2: Add permission**

```typescript
  CAN_MANAGE_SHIFTS: 'can_manage_shifts',
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/types/ipc.types.ts src/shared/types/permissions.ts
git commit -m "feat: add SHIFT_* IPC channels and can_manage_shifts permission"
```

---

## Task 3: Create shift service

**Files:**
- Create: `src/main/services/shift.service.ts`

- [ ] **Step 1: Create the service**

```typescript
// src/main/services/shift.service.ts
import { Shift } from '../models/shift.model'
import { Transaction } from '../models/transaction.model'

export interface IPublicShift {
  _id: string
  userId: string
  userName: string | null   // populated from User.name; null when getOpenShift returns a lean doc without populate
  branchId: string
  terminalId: string
  clockIn: string
  clockOut: string | null
  totalSales: number
  totalTransactions: number
  totalDiscounts: number
  totalVoids: number
  status: 'open' | 'closed'
  notes: string | null
  createdAt: string
  updatedAt: string
}

function toPublic(doc: any): IPublicShift {
  // doc.userId may be an ObjectId (lean without populate) or { _id, name } (lean with populate)
  const isPopulated = doc.userId && typeof doc.userId === 'object' && doc.userId.name !== undefined
  return {
    _id: doc._id?.toString() ?? '',
    userId: isPopulated ? doc.userId._id?.toString() ?? '' : doc.userId?.toString() ?? '',
    userName: isPopulated ? (doc.userId.name ?? null) : null,
    branchId: doc.branchId?.toString() ?? '',
    terminalId: doc.terminalId,
    clockIn: doc.clockIn ? new Date(doc.clockIn).toISOString() : new Date(0).toISOString(),
    clockOut: doc.clockOut ? new Date(doc.clockOut).toISOString() : null,
    totalSales: doc.totalSales ?? 0,
    totalTransactions: doc.totalTransactions ?? 0,
    totalDiscounts: doc.totalDiscounts ?? 0,
    totalVoids: doc.totalVoids ?? 0,
    status: doc.status,
    notes: doc.notes ?? null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date(0).toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date(0).toISOString(),
  }
}

export async function clockIn(userId: string, branchId: string, terminalId: string): Promise<IPublicShift> {
  const shift = await Shift.create({
    userId,
    branchId,
    terminalId,
    clockIn: new Date(),
    status: 'open',
  })
  return toPublic(shift)
}

export async function clockOut(userId: string, terminalId: string, notes?: string): Promise<IPublicShift> {
  const shift = await Shift.findOne({ userId, terminalId, status: 'open' })
  if (!shift) throw new Error('No open shift found for this user on this terminal')

  // Aggregate transactions during this shift
  const [agg] = await Transaction.aggregate([
    {
      $match: {
        cashierId: shift.userId,
        branchId: shift.branchId,
        terminalId,
        createdAt: { $gte: shift.clockIn },
      }
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalAmount', 0] } },
        totalTransactions: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        totalDiscounts: { $sum: '$discountAmount' },
        totalVoids: { $sum: { $cond: [{ $eq: ['$status', 'voided'] }, 1, 0] } },
      }
    }
  ])

  const updated = await Shift.findOneAndUpdate(
    { _id: shift._id, status: 'open' },
    {
      status: 'closed',
      clockOut: new Date(),
      totalSales: agg?.totalSales ?? 0,
      totalTransactions: agg?.totalTransactions ?? 0,
      totalDiscounts: agg?.totalDiscounts ?? 0,
      totalVoids: agg?.totalVoids ?? 0,
      notes: notes ?? null,
    },
    { new: true }
  )
  if (!updated) throw new Error('Failed to clock out')
  return toPublic(updated)
}

export async function getOpenShift(userId: string, terminalId: string): Promise<IPublicShift | null> {
  const shift = await Shift.findOne({ userId, terminalId, status: 'open' }).lean()
  return shift ? toPublic(shift) : null
}

export async function getShifts(filters: {
  branchId?: string | null
  userId?: string
  from?: Date
  to?: Date
  skip?: number
  limit?: number
}): Promise<{ data: IPublicShift[]; total: number }> {
  const query: any = {}
  if (filters.branchId) query.branchId = filters.branchId
  if (filters.userId) query.userId = filters.userId
  if (filters.from || filters.to) {
    query.clockIn = {}
    if (filters.from) query.clockIn.$gte = filters.from
    if (filters.to) query.clockIn.$lte = filters.to
  }

  const [data, total] = await Promise.all([
    Shift.find(query).sort({ clockIn: -1 }).skip(filters.skip ?? 0).limit(filters.limit ?? 50).populate('userId', 'name').lean(),
    Shift.countDocuments(query),
  ])
  return { data: data.map(toPublic), total }
}
```

- [ ] **Step 2: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/services/shift.service.ts
git commit -m "feat: create shift service with clockIn, clockOut, getOpenShift, getShifts"
```

---

## Task 4: Create IPC handlers and register

**Files:**
- Create: `src/main/handlers/shift.handlers.ts`
- Modify: `src/main/handlers/registry.ts`

- [ ] **Step 1: Create `shift.handlers.ts`**

```typescript
// src/main/handlers/shift.handlers.ts
import { ipcMain } from 'electron'
import { IPC } from '@shared/types/ipc.types'
import { requireAuth } from '../services/auth.service'
import store from '../store/electron-store'
import { clockIn, clockOut, getOpenShift, getShifts } from '../services/shift.service'

export function registerShiftHandlers(): void {
  ipcMain.handle(IPC.SHIFT_CLOCK_IN, async () => {
    try {
      const auth = await requireAuth(store.get('jwt') ?? null)
      const terminalId = store.get('terminalId') ?? 'unknown'
      const data = await clockIn(auth.user._id, auth.user.branchId, terminalId)
      return { success: true, data }
    } catch (err: any) {
      if (err.code === 11000) return { success: false, error: 'You already have an open shift on this terminal' }
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.SHIFT_CLOCK_OUT, async (_e, req: unknown) => {
    try {
      const auth = await requireAuth(store.get('jwt') ?? null)
      const terminalId = store.get('terminalId') ?? 'unknown'
      const r = (req ?? {}) as { notes?: string }
      const data = await clockOut(auth.user._id, terminalId, r.notes)
      return { success: true, data }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.SHIFT_GET_OPEN, async () => {
    try {
      const auth = await requireAuth(store.get('jwt') ?? null)
      const terminalId = store.get('terminalId') ?? 'unknown'
      const data = await getOpenShift(auth.user._id, terminalId)
      return { success: true, data }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.SHIFT_GET_ALL, async (_e, req: unknown) => {
    try {
      const auth = await requireAuth(store.get('jwt') ?? null)
      const canManage = auth.role.permissions.includes('can_manage_shifts')
      const canViewAll = auth.role.permissions.includes('can_view_all_branches')
      const r = (req ?? {}) as { userId?: string; from?: string; to?: string; skip?: number; limit?: number }
      const result = await getShifts({
        branchId: canViewAll ? null : auth.user.branchId,
        userId: canManage ? r.userId : auth.user._id,  // non-managers can only see their own
        from: r.from ? new Date(r.from) : undefined,
        to: r.to ? new Date(r.to) : undefined,
        skip: r.skip,
        limit: r.limit,
      })
      return { success: true, ...result }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
```

- [ ] **Step 2: Register in `registry.ts`**

```typescript
import { registerShiftHandlers } from './shift.handlers'
// in registerAllHandlers():
registerShiftHandlers()
```

- [ ] **Step 3: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/handlers/shift.handlers.ts src/main/handlers/registry.ts
git commit -m "feat: create shift IPC handlers and register"
```

---

## Task 5: Create `useShift` hook

**Files:**
- Create: `src/renderer/src/hooks/useShift.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/renderer/src/hooks/useShift.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ipc } from '../lib/ipc'
import { IPC } from '@shared/types/ipc.types'

export interface IShift {
  _id: string
  userId: string
  userName: string | null
  branchId: string
  terminalId: string
  clockIn: string
  clockOut: string | null
  totalSales: number
  totalTransactions: number
  totalDiscounts: number
  totalVoids: number
  status: 'open' | 'closed'
  notes: string | null
  createdAt: string
  updatedAt: string
}

export function useShift() {
  const queryClient = useQueryClient()

  const openShiftQuery = useQuery({
    queryKey: ['shift-open'],
    queryFn: async () => {
      const res = await ipc.invoke<{ success: boolean; data?: IShift | null; error?: string }>(IPC.SHIFT_GET_OPEN)
      if (!res.success) throw new Error(res.error)
      return res.data ?? null
    },
    staleTime: 60_000,
    retry: false,
  })

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const res = await ipc.invoke<{ success: boolean; data?: IShift; error?: string }>(IPC.SHIFT_CLOCK_IN)
      if (!res.success) throw new Error(res.error)
      return res.data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shift-open'] }),
  })

  const clockOutMutation = useMutation({
    mutationFn: async (notes?: string) => {
      const res = await ipc.invoke<{ success: boolean; data?: IShift; error?: string }>(IPC.SHIFT_CLOCK_OUT, { notes })
      if (!res.success) throw new Error(res.error)
      return res.data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shift-open'] }),
  })

  return { openShiftQuery, clockInMutation, clockOutMutation }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/hooks/useShift.ts
git commit -m "feat: create useShift React Query hook"
```

---

## Task 6: Add Clock In/Out button to Sidebar footer

**Files:**
- Modify: `src/renderer/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Import useShift and add clock in/out state**

```typescript
import { useShift } from '../../hooks/useShift'
import { Clock } from 'lucide-react'

// Inside Sidebar component:
const { openShiftQuery, clockInMutation, clockOutMutation } = useShift()
const openShift = openShiftQuery.data
const [showClockOut, setShowClockOut] = useState(false)
const [clockOutNotes, setClockOutNotes] = useState('')
const [shiftError, setShiftError] = useState('')

function getShiftDuration(clockIn: string) {
  const mins = Math.floor((Date.now() - new Date(clockIn).getTime()) / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
```

- [ ] **Step 2: Add Clock In/Out UI above the user footer**

Insert before the user footer `<div>`:

```tsx
{/* Shift status */}
<div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-subtle)' }}>
  {openShift ? (
    <button
      onClick={() => setShowClockOut(true)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
        padding: '7px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
        background: 'rgba(22,163,74,0.08)', color: '#16a34a', fontSize: '12px', fontWeight: 600,
      }}
    >
      <Clock style={{ width: '13px', height: '13px', flexShrink: 0 }} />
      <span style={{ flex: 1, textAlign: 'left' }}>On Shift · {getShiftDuration(openShift.clockIn)}</span>
      <span style={{ fontSize: '10px', opacity: 0.7 }}>Clock Out</span>
    </button>
  ) : (
    <button
      onClick={async () => {
        try { await clockInMutation.mutateAsync() }
        catch (err: any) { setShiftError(err.message) }
      }}
      disabled={clockInMutation.isPending}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        padding: '7px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
        background: 'rgba(99,102,241,0.08)', color: '#818cf8', fontSize: '12px', fontWeight: 600,
      }}
    >
      <Clock style={{ width: '13px', height: '13px' }} />
      {clockInMutation.isPending ? 'Clocking in…' : 'Clock In'}
    </button>
  )}
  {shiftError && <p style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px', padding: '0 2px' }}>{shiftError}</p>}
</div>

{/* Clock-out modal */}
{showClockOut && openShift && (
  <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="modal-panel w-full max-w-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Clock Out</h2>
        <button onClick={() => setShowClockOut(false)} style={{ color: 'var(--text-muted)' }}>✕</button>
      </div>
      <div className="px-6 py-5">
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
          Shift duration: <strong style={{ color: 'var(--text-primary)' }}>{getShiftDuration(openShift.clockIn)}</strong>
        </p>
        <label style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase' as const, color: 'var(--text-muted)' }}>Notes (optional)</label>
        <textarea value={clockOutNotes} onChange={e => setClockOutNotes(e.target.value)}
          className="dark-input mt-1" rows={2} placeholder="Any handover notes…" />
      </div>
      <div className="flex justify-end gap-2 px-6 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button onClick={() => setShowClockOut(false)} className="btn-secondary px-5 py-2">Cancel</button>
        <button
          onClick={async () => {
            try {
              await clockOutMutation.mutateAsync(clockOutNotes || undefined)
              setShowClockOut(false)
              setClockOutNotes('')
            } catch (err: any) { setShiftError(err.message) }
          }}
          disabled={clockOutMutation.isPending}
          className="btn-primary px-5 py-2 disabled:opacity-50"
        >
          {clockOutMutation.isPending ? 'Clocking out…' : 'Clock Out'}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/layout/Sidebar.tsx
git commit -m "feat: add clock in/out button and modal to Sidebar footer"
```

---

## Task 7: Add Shifts tab to ReportingPage

**Files:**
- Modify: `src/renderer/src/pages/reporting/ReportingPage.tsx`

- [ ] **Step 1: Add shifts query**

```typescript
const shiftsQuery = useQuery({
  queryKey: ['shifts-report', shiftsFrom, shiftsTo],
  queryFn: async () => {
    const res = await ipc.invoke<{ success: boolean; data?: any[]; total?: number; error?: string }>(
      IPC.SHIFT_GET_ALL,
      { from: shiftsFrom || undefined, to: shiftsTo || undefined }
    )
    if (!res.success) throw new Error(res.error)
    return res.data ?? []
  },
  enabled: activeTab === 'shifts',
  retry: false,
})
```

- [ ] **Step 2: Add Shifts tab button to the tab bar**

```tsx
<button onClick={() => setActiveTab('shifts')} className={activeTab === 'shifts' ? 'tab-active' : 'tab'}>
  Shifts
</button>
```

- [ ] **Step 3: Add Shifts tab content**

```tsx
{activeTab === 'shifts' && (
  <div>
    {/* Date filters */}
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      <div>
        <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>From</label>
        <input type="date" value={shiftsFrom} onChange={e => setShiftsFrom(e.target.value)} className="dark-input mt-1" />
      </div>
      <div>
        <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>To</label>
        <input type="date" value={shiftsTo} onChange={e => setShiftsTo(e.target.value)} className="dark-input mt-1" />
      </div>
    </div>

    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Cashier', 'Clock In', 'Clock Out', 'Duration', 'Sales', 'Transactions', 'Discounts', 'Voids', 'Status'].map((h, i) => (
              <th key={h} style={{ background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.28)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '10px 16px', textAlign: i >= 4 ? 'right' : 'left', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(shiftsQuery.data ?? []).map((s: any, idx: number) => {
            const duration = s.clockOut
              ? Math.floor((new Date(s.clockOut).getTime() - new Date(s.clockIn).getTime()) / 60000)
              : Math.floor((Date.now() - new Date(s.clockIn).getTime()) / 60000)
            const durationStr = `${Math.floor(duration / 60)}h ${duration % 60}m`
            return (
              <tr key={s._id}>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.88)', borderBottom: idx < (shiftsQuery.data?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>{s.userName ?? s.userId?.slice(-6)}</td>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', borderBottom: idx < (shiftsQuery.data?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>{new Date(s.clockIn).toLocaleString()}</td>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', borderBottom: idx < (shiftsQuery.data?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>{s.clockOut ? new Date(s.clockOut).toLocaleString() : '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', borderBottom: idx < (shiftsQuery.data?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>{durationStr}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.88)', textAlign: 'right', borderBottom: idx < (shiftsQuery.data?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>₱{s.totalSales.toFixed(2)}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', textAlign: 'right', borderBottom: idx < (shiftsQuery.data?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>{s.totalTransactions}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', textAlign: 'right', borderBottom: idx < (shiftsQuery.data?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>₱{s.totalDiscounts.toFixed(2)}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', textAlign: 'right', borderBottom: idx < (shiftsQuery.data?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>{s.totalVoids}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', borderBottom: idx < (shiftsQuery.data?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  {s.status === 'open' ? <span className="badge-green">Active</span> : <span className="badge-gray">Closed</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {shiftsQuery.data?.length === 0 && (
        <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: '13px' }}>No shifts found</div>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/pages/reporting/ReportingPage.tsx
git commit -m "feat: add Shifts report tab to ReportingPage"
```

---

## Verification

End-to-end test:
1. In Sidebar footer → click "Clock In" → verify button changes to "On Shift · 0m"
2. Process a sale → void a transaction
3. Click "Clock Out" → verify summary modal shows correct transaction count and sales total
4. Go to Reports → Shifts tab → verify the closed shift appears with correct metrics
5. Try clocking in again → verify "You already have an open shift on this terminal" error
6. Verify a user without `can_manage_shifts` can only see their own shifts (not all users)
