# Feature 2: Customer Management + Loyalty Program Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add customer profiles with phone-number lookup, a points-based loyalty program configurable in Settings, and optional customer attachment + points redemption at POS checkout.

**Architecture:** Two new Mongoose models (`Customer`, `LoyaltyLedger`). Six new IPC channels in a dedicated `customer.handlers.ts`. Loyalty config stored in the existing Settings document. POS checkout gets an optional phone search field; PaymentModal gets a points redemption toggle. A new `/customers` page provides CRUD management.

**Tech Stack:** Mongoose, Electron ipcMain, React + React Query, TypeScript, React Router

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/main/models/customer.model.ts` | Create | Customer schema + interface |
| `src/main/models/loyalty-ledger.model.ts` | Create | Points ledger schema |
| `src/main/services/customer.service.ts` | Create | All customer + loyalty business logic |
| `src/main/handlers/customer.handlers.ts` | Create | IPC handlers for all CUSTOMER_* channels |
| `src/main/handlers/registry.ts` | Modify | Register customer handlers |
| `src/main/models/settings.model.ts` | Modify | Add loyalty config fields |
| `src/main/handlers/pos.handlers.ts` | Modify | Pass customerId + redemption through sale |
| `src/main/services/transaction.service.ts` | Modify | Write loyalty ledger entry on sale completion |
| `src/shared/types/settings.types.ts` | Modify | Add loyalty config fields to ISettings shared type |
| `src/shared/types/ipc.types.ts` | Modify | Add CUSTOMER_* channels |
| `src/shared/types/permissions.ts` | Modify | Add CAN_MANAGE_CUSTOMERS |
| `src/renderer/src/hooks/useCustomers.ts` | Create | React Query hooks for customers |
| `src/renderer/src/pages/customers/CustomersPage.tsx` | Create | Customer list + create/edit UI |
| `src/renderer/src/pages/pos/PosPage.tsx` | Modify | Add customer selector |
| `src/renderer/src/pages/pos/PaymentModal.tsx` | Modify | Add points redemption toggle |
| `src/renderer/src/components/layout/Sidebar.tsx` | Modify | Add Customers nav item |
| `src/renderer/src/pages/settings/SettingsPage.tsx` | Modify | Add loyalty config section |

---

## Task 1: Create Customer and LoyaltyLedger models

**Files:**
- Create: `src/main/models/customer.model.ts`
- Create: `src/main/models/loyalty-ledger.model.ts`

- [ ] **Step 1: Create `customer.model.ts`**

```typescript
// src/main/models/customer.model.ts
import { Schema, model, Document } from 'mongoose'

export interface ICustomerDoc extends Document {
  name: string
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  pointsBalance: number
  lifetimeSpend: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const customerSchema = new Schema<ICustomerDoc>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, default: null, trim: true, lowercase: true },
    address: { type: String, default: null, trim: true },
    notes: { type: String, default: null },
    pointsBalance: { type: Number, default: 0, min: 0 },
    lifetimeSpend: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

customerSchema.index({ phone: 1 })
customerSchema.index({ name: 'text' })
customerSchema.index({ isActive: 1 })

export const Customer = model<ICustomerDoc>('Customer', customerSchema)
```

- [ ] **Step 2: Create `loyalty-ledger.model.ts`**

```typescript
// src/main/models/loyalty-ledger.model.ts
import { Schema, model, Document, Types } from 'mongoose'

export interface ILoyaltyLedgerDoc extends Document {
  customerId: Types.ObjectId
  transactionId: Types.ObjectId | null
  type: 'earn' | 'redeem' | 'adjust'
  points: number
  balanceBefore: number
  balanceAfter: number
  note: string | null
  createdAt: Date
}

const loyaltyLedgerSchema = new Schema<ILoyaltyLedgerDoc>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', default: null },
    type: { type: String, enum: ['earn', 'redeem', 'adjust'], required: true },
    points: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    note: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

loyaltyLedgerSchema.index({ customerId: 1, createdAt: -1 })

export const LoyaltyLedger = model<ILoyaltyLedgerDoc>('LoyaltyLedger', loyaltyLedgerSchema)
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/main/models/customer.model.ts src/main/models/loyalty-ledger.model.ts
git commit -m "feat: add Customer and LoyaltyLedger Mongoose models"
```

---

## Task 2: Add IPC channels and permission

**Files:**
- Modify: `src/shared/types/ipc.types.ts`
- Modify: `src/shared/types/permissions.ts`

- [ ] **Step 1: Add CUSTOMER_* channels to `ipc.types.ts`**

After the `BRANCHES_*` block, add:

```typescript
  // Customers
  CUSTOMER_SEARCH: 'customers:search',
  CUSTOMER_GET_ALL: 'customers:getAll',
  CUSTOMER_GET: 'customers:get',
  CUSTOMER_CREATE: 'customers:create',
  CUSTOMER_UPDATE: 'customers:update',
  CUSTOMER_GET_HISTORY: 'customers:getHistory',
```

- [ ] **Step 2: Add `CAN_MANAGE_CUSTOMERS` to `permissions.ts`**

```typescript
  CAN_MANAGE_CUSTOMERS: 'can_manage_customers',
```

- [ ] **Step 3: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/shared/types/ipc.types.ts src/shared/types/permissions.ts
git commit -m "feat: add CUSTOMER_* IPC channels and can_manage_customers permission"
```

---

## Task 3: Add loyalty config to Settings model

**Files:**
- Modify: `src/main/models/settings.model.ts`

- [ ] **Step 1: Read the current settings model**

Read `src/main/models/settings.model.ts` to understand its current structure.

- [ ] **Step 2: Add loyalty fields**

Add to the Settings schema interface and schema definition:
```typescript
// In interface:
loyaltyPointsPerPeso: number
loyaltyPesoPerPoint: number
loyaltyMinRedemption: number

// In schema:
loyaltyPointsPerPeso: { type: Number, default: 1, min: 0 },
loyaltyPesoPerPoint: { type: Number, default: 1, min: 0 },
loyaltyMinRedemption: { type: Number, default: 100, min: 0 },
```

- [ ] **Step 3: Verify and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/models/settings.model.ts
git commit -m "feat: add loyalty program config fields to Settings model"
```

---

## Task 4: Create customer service

**Files:**
- Create: `src/main/services/customer.service.ts`

- [ ] **Step 1: Create `customer.service.ts` with all functions**

```typescript
// src/main/services/customer.service.ts
import { Customer, ICustomerDoc } from '../models/customer.model'
import { LoyaltyLedger } from '../models/loyalty-ledger.model'
import { Transaction } from '../models/transaction.model'
import { Settings } from '../models/settings.model'
import mongoose from 'mongoose'

export interface IPublicCustomer {
  _id: string
  name: string
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  pointsBalance: number
  lifetimeSpend: number
  isActive: boolean
  createdAt: string
}

function toPublic(doc: any): IPublicCustomer {
  return {
    _id: doc._id?.toString() ?? '',
    name: doc.name ?? '',
    phone: doc.phone ?? '',
    email: doc.email ?? null,
    address: doc.address ?? null,
    notes: doc.notes ?? null,
    pointsBalance: doc.pointsBalance ?? 0,
    lifetimeSpend: doc.lifetimeSpend ?? 0,
    isActive: doc.isActive ?? true,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date(0).toISOString(),
  }
}

export async function searchCustomerByPhone(phone: string): Promise<IPublicCustomer | null> {
  const doc = await Customer.findOne({ phone: phone.trim(), isActive: true }).lean()
  return doc ? toPublic(doc) : null
}

export async function getCustomers(opts?: { skip?: number; limit?: number; search?: string }): Promise<{ data: IPublicCustomer[]; total: number }> {
  const query: any = {}
  if (opts?.search) query.$text = { $search: opts.search }
  const [data, total] = await Promise.all([
    Customer.find(query).sort({ createdAt: -1 }).skip(opts?.skip ?? 0).limit(opts?.limit ?? 50).lean(),
    Customer.countDocuments(query),
  ])
  return { data: data.map(toPublic), total }
}

export async function getCustomer(id: string): Promise<IPublicCustomer | null> {
  const doc = await Customer.findById(id).lean()
  return doc ? toPublic(doc) : null
}

export async function createCustomer(input: { name: string; phone: string; email?: string; address?: string; notes?: string }): Promise<IPublicCustomer> {
  const doc = await Customer.create({
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || null,
    address: input.address?.trim() || null,
    notes: input.notes?.trim() || null,
  })
  return toPublic(doc)
}

export async function updateCustomer(id: string, input: Partial<{ name: string; phone: string; email: string; address: string; notes: string; isActive: boolean }>): Promise<IPublicCustomer> {
  const doc = await Customer.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true }).lean()
  if (!doc) throw new Error('Customer not found')
  return toPublic(doc)
}

export async function getCustomerHistory(customerId: string): Promise<{ transactions: any[]; ledger: any[] }> {
  const [transactions, ledger] = await Promise.all([
    Transaction.find({ customerId: new mongoose.Types.ObjectId(customerId) }).sort({ createdAt: -1 }).limit(50).lean(),
    LoyaltyLedger.find({ customerId }).sort({ createdAt: -1 }).limit(100).lean(),
  ])
  return { transactions, ledger }
}

export async function earnPoints(customerId: string, transactionId: string, pesoAmount: number): Promise<void> {
  const settings = await Settings.findOne().lean()
  const pointsPerPeso = settings?.loyaltyPointsPerPeso ?? 1
  const pointsEarned = Math.floor(pesoAmount * pointsPerPeso)
  if (pointsEarned <= 0) return

  const customer = await Customer.findById(customerId)
  if (!customer) return
  const balanceBefore = customer.pointsBalance
  const balanceAfter = balanceBefore + pointsEarned
  customer.pointsBalance = balanceAfter
  customer.lifetimeSpend += pesoAmount
  await customer.save()
  await LoyaltyLedger.create({
    customerId, transactionId, type: 'earn',
    points: pointsEarned, balanceBefore, balanceAfter,
  })
}

export async function redeemPoints(customerId: string, transactionId: string, pointsToRedeem: number): Promise<number> {
  const settings = await Settings.findOne().lean()
  const pesoPerPoint = settings?.loyaltyPesoPerPoint ?? 1
  const minRedemption = settings?.loyaltyMinRedemption ?? 100

  const customer = await Customer.findById(customerId)
  if (!customer) throw new Error('Customer not found')
  if (customer.pointsBalance < minRedemption) throw new Error(`Minimum ${minRedemption} points required to redeem`)
  if (pointsToRedeem > customer.pointsBalance) throw new Error('Insufficient points')

  const discountAmount = pointsToRedeem * pesoPerPoint
  const balanceBefore = customer.pointsBalance
  const balanceAfter = balanceBefore - pointsToRedeem
  customer.pointsBalance = balanceAfter
  await customer.save()
  await LoyaltyLedger.create({
    customerId, transactionId, type: 'redeem',
    points: -pointsToRedeem, balanceBefore, balanceAfter,
    note: `Redeemed for ₱${discountAmount.toFixed(2)} discount`,
  })
  return discountAmount
}
```

- [ ] **Step 2: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/services/customer.service.ts
git commit -m "feat: create customer service with CRUD, search, and loyalty earn/redeem functions"
```

---

## Task 5: Create customer IPC handlers and register them

**Files:**
- Create: `src/main/handlers/customer.handlers.ts`
- Modify: `src/main/handlers/registry.ts`

- [ ] **Step 1: Create `customer.handlers.ts`**

```typescript
// src/main/handlers/customer.handlers.ts
import { ipcMain } from 'electron'
import { IPC } from '@shared/types/ipc.types'
import { requireAuth } from '../services/auth.service'
import store from '../store/electron-store'
import {
  searchCustomerByPhone, getCustomers, getCustomer,
  createCustomer, updateCustomer, getCustomerHistory
} from '../services/customer.service'

export function registerCustomerHandlers(): void {
  ipcMain.handle(IPC.CUSTOMER_SEARCH, async (_e, req: unknown) => {
    try {
      await requireAuth(store.get('jwt') ?? null)
      const r = req as { phone: string }
      if (!r?.phone?.trim()) return { success: false, error: 'Phone number required' }
      const data = await searchCustomerByPhone(r.phone)
      return { success: true, data }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.CUSTOMER_GET_ALL, async (_e, req: unknown) => {
    try {
      await requireAuth(store.get('jwt') ?? null)
      const r = (req ?? {}) as { skip?: number; limit?: number; search?: string }
      const result = await getCustomers(r)
      return { success: true, ...result }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.CUSTOMER_GET, async (_e, req: unknown) => {
    try {
      await requireAuth(store.get('jwt') ?? null)
      const r = req as { id: string }
      const data = await getCustomer(r.id)
      return { success: true, data }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.CUSTOMER_CREATE, async (_e, req: unknown) => {
    try {
      const auth = await requireAuth(store.get('jwt') ?? null)
      if (!auth.role.permissions.includes('can_manage_customers')) return { success: false, error: 'Permission denied' }
      const r = req as { name: string; phone: string; email?: string; address?: string; notes?: string }
      if (!r?.name?.trim()) return { success: false, error: 'Name is required' }
      if (!r?.phone?.trim()) return { success: false, error: 'Phone is required' }
      const data = await createCustomer(r)
      return { success: true, data }
    } catch (err: any) {
      if (err.code === 11000) return { success: false, error: 'A customer with this phone number already exists' }
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.CUSTOMER_UPDATE, async (_e, req: unknown) => {
    try {
      const auth = await requireAuth(store.get('jwt') ?? null)
      if (!auth.role.permissions.includes('can_manage_customers')) return { success: false, error: 'Permission denied' }
      const r = req as { id: string; input: any }
      const data = await updateCustomer(r.id, r.input)
      return { success: true, data }
    } catch (err: any) {
      if (err.code === 11000) return { success: false, error: 'Phone number already in use' }
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(IPC.CUSTOMER_GET_HISTORY, async (_e, req: unknown) => {
    try {
      await requireAuth(store.get('jwt') ?? null)
      const r = req as { customerId: string }
      const data = await getCustomerHistory(r.customerId)
      return { success: true, data }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
```

- [ ] **Step 2: Register in `registry.ts`**

Add to `src/main/handlers/registry.ts`:
```typescript
import { registerCustomerHandlers } from './customer.handlers'
// ... in registerAllHandlers():
registerCustomerHandlers()
```

- [ ] **Step 3: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/handlers/customer.handlers.ts src/main/handlers/registry.ts
git commit -m "feat: create customer IPC handlers and register them"
```

---

## Task 6: Create `useCustomers` React hook

**Files:**
- Create: `src/renderer/src/hooks/useCustomers.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/renderer/src/hooks/useCustomers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ipc } from '../lib/ipc'
import { IPC } from '@shared/types/ipc.types'

export interface ICustomer {
  _id: string
  name: string
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  pointsBalance: number
  lifetimeSpend: number
  isActive: boolean
  createdAt: string
}

export function useCustomers(search?: string) {
  const queryClient = useQueryClient()

  const customersQuery = useQuery({
    queryKey: ['customers', search],
    queryFn: async () => {
      const res = await ipc.invoke<{ success: boolean; data?: ICustomer[]; total?: number; error?: string }>(
        IPC.CUSTOMER_GET_ALL, { search }
      )
      if (!res.success) throw new Error(res.error)
      return { data: res.data ?? [], total: res.total ?? 0 }
    },
    staleTime: 60_000,
    retry: false,
  })

  const createMutation = useMutation({
    mutationFn: async (input: { name: string; phone: string; email?: string; address?: string; notes?: string }) => {
      const res = await ipc.invoke<{ success: boolean; data?: ICustomer; error?: string }>(IPC.CUSTOMER_CREATE, input)
      if (!res.success) throw new Error(res.error)
      return res.data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<ICustomer> }) => {
      const res = await ipc.invoke<{ success: boolean; data?: ICustomer; error?: string }>(IPC.CUSTOMER_UPDATE, { id, input })
      if (!res.success) throw new Error(res.error)
      return res.data!
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })

  return { customersQuery, createMutation, updateMutation }
}

export async function searchCustomerByPhone(phone: string): Promise<ICustomer | null> {
  const res = await ipc.invoke<{ success: boolean; data?: ICustomer | null; error?: string }>(
    IPC.CUSTOMER_SEARCH, { phone }
  )
  if (!res.success) throw new Error(res.error)
  return res.data ?? null
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/hooks/useCustomers.ts
git commit -m "feat: create useCustomers React Query hook"
```

---

## Task 7: Create CustomersPage

**Files:**
- Create: `src/renderer/src/pages/customers/CustomersPage.tsx`

- [ ] **Step 1: Create the page**

```typescript
// src/renderer/src/pages/customers/CustomersPage.tsx
import { useState } from 'react'
import { Users } from 'lucide-react'
import { useCustomers, ICustomer } from '../../hooks/useCustomers'

function CustomerFormModal({ customer, onConfirm, onClose, isLoading }: {
  customer?: ICustomer | null
  onConfirm: (data: any) => void
  onClose: () => void
  isLoading: boolean
}) {
  const [name, setName] = useState(customer?.name ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')
  const [email, setEmail] = useState(customer?.email ?? '')
  const [address, setAddress] = useState(customer?.address ?? '')
  const [notes, setNotes] = useState(customer?.notes ?? '')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Name is required')
    if (!phone.trim()) return setError('Phone is required')
    onConfirm({ name, phone, email: email || undefined, address: address || undefined, notes: notes || undefined })
  }

  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.04em', color: 'var(--text-muted)' }

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-panel w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {customer ? 'Edit Customer' : 'Add Customer'}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-3">
            <div><label style={labelStyle}>Name *</label><input value={name} onChange={e => setName(e.target.value)} className="dark-input mt-1" placeholder="e.g. Juan Dela Cruz" /></div>
            <div><label style={labelStyle}>Phone *</label><input value={phone} onChange={e => setPhone(e.target.value)} className="dark-input mt-1" placeholder="+63 9XX XXX XXXX" /></div>
            <div><label style={labelStyle}>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="dark-input mt-1" /></div>
            <div><label style={labelStyle}>Address</label><input value={address} onChange={e => setAddress(e.target.value)} className="dark-input mt-1" /></div>
            <div><label style={labelStyle}>Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className="dark-input mt-1" rows={2} /></div>
            {error && <div style={{ fontSize: '13px', color: 'var(--color-danger)', padding: '8px 12px', background: 'var(--color-danger-bg)', borderRadius: '8px' }}>{error}</div>}
          </div>
          <div className="flex justify-end gap-2 px-6 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button type="button" onClick={onClose} className="btn-secondary px-5 py-2">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary px-5 py-2 disabled:opacity-50">
              {isLoading ? 'Saving…' : customer ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function CustomersPage() {
  const [search, setSearch] = useState('')
  const [editCustomer, setEditCustomer] = useState<ICustomer | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState('')
  const { customersQuery, createMutation, updateMutation } = useCustomers(search || undefined)
  const customers = customersQuery.data?.data ?? []
  const isLoading = createMutation.isPending || updateMutation.isPending

  async function handleCreate(data: any) {
    try { await createMutation.mutateAsync(data); setShowCreate(false) }
    catch (err: any) { setError(err.message) }
  }

  async function handleUpdate(data: any) {
    if (!editCustomer) return
    try { await updateMutation.mutateAsync({ id: editCustomer._id, input: data }); setEditCustomer(null) }
    catch (err: any) { setError(err.message) }
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>Customers</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{customersQuery.data?.total ?? 0} total customers</p>
        </div>
        <button onClick={() => { setShowCreate(true); setError('') }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', fontSize: '14px', fontWeight: 600 }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> Add Customer
        </button>
      </div>

      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name…" className="dark-input"
        style={{ marginBottom: '16px', maxWidth: '320px' }}
      />

      {error && <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: '#dc2626', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Name', 'Phone', 'Points', 'Lifetime Spend', 'Status', 'Actions'].map((h, i) => (
                <th key={h} style={{ background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.28)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '10px 16px', textAlign: i >= 4 ? 'right' : 'left', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map((c, idx) => (
              <tr key={c._id} style={{ height: '52px' }}>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.88)', borderBottom: idx < customers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>{c.name}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', borderBottom: idx < customers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>{c.phone}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#818cf8', fontWeight: 600, borderBottom: idx < customers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>{c.pointsBalance.toLocaleString()} pts</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', borderBottom: idx < customers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>₱{c.lifetimeSpend.toFixed(2)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', borderBottom: idx < customers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  {c.isActive ? <span className="badge-green">Active</span> : <span className="badge-gray">Inactive</span>}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', borderBottom: idx < customers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <button onClick={() => { setEditCustomer(c); setError('') }} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'rgba(99,102,241,0.08)', color: '#818cf8' }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && !customersQuery.isLoading && (
          <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: '13px' }}>
            <Users style={{ width: '32px', height: '32px', margin: '0 auto 12px', opacity: 0.3 }} />
            No customers yet
          </div>
        )}
      </div>

      {(showCreate || editCustomer) && (
        <CustomerFormModal
          customer={editCustomer}
          onConfirm={editCustomer ? handleUpdate : handleCreate}
          onClose={() => { setShowCreate(false); setEditCustomer(null) }}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/pages/customers/CustomersPage.tsx
git commit -m "feat: create CustomersPage with list, create, edit functionality"
```

---

## Task 8: Add Customers to Sidebar and Router

**Files:**
- Modify: `src/renderer/src/components/layout/Sidebar.tsx`
- Modify: `src/renderer/src/App.tsx` (or wherever routes are defined)

- [ ] **Step 1: Add Customers nav item to Sidebar**

In `Sidebar.tsx`, import `Users` (already imported from lucide-react). In the Admin section or after Orders, add:

```tsx
{hasPermission(PERMISSIONS.CAN_MANAGE_CUSTOMERS) && (
  <SidebarItem to="/customers" icon={Users} label="Customers" />
)}
```

- [ ] **Step 2: Add route in App.tsx / router**

Read the router file to find where routes are defined, then add:
```tsx
import { CustomersPage } from './pages/customers/CustomersPage'
// In routes:
<Route path="/customers" element={<CustomersPage />} />
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/layout/Sidebar.tsx src/renderer/src/App.tsx
git commit -m "feat: add Customers sidebar nav item and route"
```

---

## Task 9: Add loyalty config to SettingsPage

**Files:**
- Modify: `src/renderer/src/pages/settings/SettingsPage.tsx`

- [ ] **Step 1: Add loyalty fields to the General tab form**

Read `SettingsPage.tsx`, then add three number fields inside the General tab section:

```tsx
{/* Loyalty Program */}
<div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
  <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>Loyalty Program</h3>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
    <div>
      <label style={labelStyle}>Points per ₱1 Spent</label>
      <input type="number" min="0" step="0.1" value={settings.loyaltyPointsPerPeso ?? 1}
        onChange={e => updateLocalSetting('loyaltyPointsPerPeso', parseFloat(e.target.value))}
        className="dark-input mt-1" />
    </div>
    <div>
      <label style={labelStyle}>₱ Value per Point</label>
      <input type="number" min="0" step="0.01" value={settings.loyaltyPesoPerPoint ?? 1}
        onChange={e => updateLocalSetting('loyaltyPesoPerPoint', parseFloat(e.target.value))}
        className="dark-input mt-1" />
    </div>
    <div>
      <label style={labelStyle}>Min Points to Redeem</label>
      <input type="number" min="0" step="1" value={settings.loyaltyMinRedemption ?? 100}
        onChange={e => updateLocalSetting('loyaltyMinRedemption', parseInt(e.target.value))}
        className="dark-input mt-1" />
    </div>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/pages/settings/SettingsPage.tsx
git commit -m "feat: add loyalty program config fields to SettingsPage"
```

---

## Task 10: Add customer selector to POS checkout

**Files:**
- Modify: `src/renderer/src/pages/pos/PosPage.tsx`

- [ ] **Step 1: Read PosPage.tsx to understand its structure**

Read the file to find where the checkout area / cart summary is rendered.

- [ ] **Step 2: Add customer state and phone lookup**

```typescript
const [customerPhone, setCustomerPhone] = useState('')
const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null)
const [customerSearching, setCustomerSearching] = useState(false)

async function handleCustomerSearch() {
  if (!customerPhone.trim()) return
  setCustomerSearching(true)
  try {
    const customer = await searchCustomerByPhone(customerPhone)
    setSelectedCustomer(customer)
    if (!customer) alert('No customer found with this phone number')
  } finally {
    setCustomerSearching(false)
  }
}
```

- [ ] **Step 3: Add customer search field to checkout area JSX**

```tsx
{/* Customer (optional) */}
<div style={{ marginBottom: '12px' }}>
  <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Customer (optional)</label>
  {selectedCustomer ? (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(99,102,241,0.08)', borderRadius: '8px', marginTop: '4px' }}>
      <div>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#818cf8' }}>{selectedCustomer.name}</span>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginLeft: '8px' }}>{selectedCustomer.pointsBalance} pts</span>
      </div>
      <button onClick={() => setSelectedCustomer(null)} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
    </div>
  ) : (
    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
      <input
        value={customerPhone}
        onChange={e => setCustomerPhone(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleCustomerSearch()}
        placeholder="Phone number" className="dark-input" style={{ flex: 1, fontSize: '13px' }}
      />
      <button onClick={handleCustomerSearch} disabled={customerSearching} className="btn-secondary" style={{ fontSize: '12px', padding: '0 12px', whiteSpace: 'nowrap' }}>
        {customerSearching ? '…' : 'Find'}
      </button>
    </div>
  )}
</div>
```

- [ ] **Step 4: Pass `selectedCustomer` to PaymentModal**

Find where `<PaymentModal />` is rendered and pass:
```tsx
<PaymentModal
  ...existingProps
  customer={selectedCustomer}
  onClearCustomer={() => setSelectedCustomer(null)}
/>
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/pages/pos/PosPage.tsx
git commit -m "feat: add optional customer selector to POS checkout"
```

---

## Task 11: Add points redemption to PaymentModal

**Files:**
- Modify: `src/renderer/src/pages/pos/PaymentModal.tsx`

- [ ] **Step 1: Read PaymentModal.tsx to understand its structure**

- [ ] **Step 2: Add redemption state and logic**

```typescript
// Props additions:
customer?: ICustomer | null
onClearCustomer?: () => void

// State:
const [redeemPoints, setRedeemPoints] = useState(false)
const [pointsToRedeem, setPointsToRedeem] = useState(0)
const pesoDiscount = pointsToRedeem * (settings?.loyaltyPesoPerPoint ?? 1)
const effectiveTotal = Math.max(0, total - pesoDiscount)
```

- [ ] **Step 3: Add redemption toggle UI before the payment total**

```tsx
{customer && customer.pointsBalance >= (settings?.loyaltyMinRedemption ?? 100) && (
  <div style={{ padding: '12px 16px', background: 'rgba(99,102,241,0.06)', borderRadius: '10px', marginBottom: '12px', border: '1px solid rgba(99,102,241,0.12)' }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
      <input type="checkbox" checked={redeemPoints} onChange={e => {
        setRedeemPoints(e.target.checked)
        if (!e.target.checked) setPointsToRedeem(0)
      }} />
      <span style={{ fontSize: '13px', color: '#818cf8' }}>Redeem points ({customer.pointsBalance} available)</span>
    </label>
    {redeemPoints && (
      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="number" min="0" max={customer.pointsBalance} step="1"
          value={pointsToRedeem}
          onChange={e => setPointsToRedeem(Math.min(parseInt(e.target.value) || 0, customer.pointsBalance))}
          className="dark-input" style={{ width: '100px', fontSize: '13px' }}
        />
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>= ₱{pesoDiscount.toFixed(2)} discount</span>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: Include `customerId` and `pointsToRedeem` in the sale payload**

When calling `POS_COMPLETE_SALE`, include:
```typescript
customerId: customer?._id ?? null,
pointsToRedeem: redeemPoints ? pointsToRedeem : 0,
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/pages/pos/PaymentModal.tsx
git commit -m "feat: add points redemption toggle to PaymentModal"
```

---

## Task 12: Update transaction service to write loyalty ledger on sale

**Files:**
- Modify: `src/main/services/transaction.service.ts`
- Modify: `src/main/handlers/pos.handlers.ts`
- Modify: `src/shared/types/settings.types.ts`

- [ ] **Step 1: Read the current `completeSale` function in `transaction.service.ts`**

Note: `pos.service.ts` does **not** exist. All POS/sale logic lives in `transaction.service.ts`. Read it to find the `completeSale` function signature and where the transaction is saved.

- [ ] **Step 2: Accept `customerId` and `pointsToRedeem` in the sale input and write ledger entries**

At the top of `transaction.service.ts`, import the loyalty functions:
```typescript
import { earnPoints, redeemPoints as redeemLoyaltyPoints } from './customer.service'
```

Inside `completeSale()`, after the transaction document is saved, add:

```typescript
// After transaction is committed:
if (input.customerId) {
  if (input.pointsToRedeem && input.pointsToRedeem > 0) {
    await redeemLoyaltyPoints(input.customerId, transaction._id.toString(), input.pointsToRedeem).catch(() => {})
  }
  await earnPoints(input.customerId, transaction._id.toString(), transaction.totalAmount).catch(() => {})
}
```

Note: Wrap in `.catch(() => {})` so a loyalty error never fails the transaction.

- [ ] **Step 3: Pass `customerId` and `pointsToRedeem` through `pos.handlers.ts`**

Read `src/main/handlers/pos.handlers.ts`. Find the `POS_COMPLETE_SALE` handler and add the two new fields to the request cast:
```typescript
const r = req as {
  // ... existing fields ...
  customerId?: string | null
  pointsToRedeem?: number
}
```
Then pass them through to the `completeSale()` call:
```typescript
customerId: r.customerId ?? null,
pointsToRedeem: r.pointsToRedeem ?? 0,
```

- [ ] **Step 4: Add loyalty fields to `ISettings` shared type**

Open `src/shared/types/settings.types.ts`. Add the three loyalty fields to the `ISettings` interface so `SettingsPage.tsx` can reference them with type safety:

```typescript
loyaltyPointsPerPeso: number
loyaltyPesoPerPoint: number
loyaltyMinRedemption: number
```

- [ ] **Step 5: Verify TypeScript and commit**

```bash
cd "/Users/kkwenuja/Desktop/Raft 2.0/raft-pos" && npx tsc --noEmit 2>&1 | head -30
git add src/main/services/transaction.service.ts src/main/handlers/pos.handlers.ts src/shared/types/settings.types.ts
git commit -m "feat: write loyalty ledger entries on sale completion"
```

---

## Verification

End-to-end test:
1. Go to Settings → verify loyalty config fields (points per peso, peso per point, min redemption)
2. Go to Customers → Add Customer (name: "Test Customer", phone: "09171234567") → verify it appears in list
3. Go to POS → search phone "09171234567" → verify customer chip appears with 0 pts
4. Complete a ₱500 sale with customer attached → verify customer now shows 500 pts (at 1pt/₱1)
5. Make another sale → check "Redeem points" → redeem 100 pts → verify ₱100 discount applied to total
6. Verify Customers page shows updated `lifetimeSpend` and `pointsBalance`
7. Verify a user without `can_manage_customers` cannot create/update customers
