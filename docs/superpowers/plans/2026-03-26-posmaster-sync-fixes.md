# POSMasterV3 Cloud Sync Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 12 confirmed cloud sync bugs across CloudSyncService, RealTimeSyncService, SalesRepository, ActiveSessionRepository, and OffersDiscountsRepository.

**Architecture:** The system uses SQLite (local, better-sqlite3) synced to MySQL (cloud) via CloudSyncService. Repositories call `notifyDataChange()` after writes, which calls `queueChange()` on CloudSyncService. RealTimeSyncService polls cloud every 1s via `performFastSync()` and polls `active_sessions` every 1s via its own dedicated interval. Both services share the same SQLite handle.

**Tech Stack:** Node.js CJS, Electron, better-sqlite3, mysql2/promise. No automated test framework — verification is via cloud_audit.cjs and application logs.

---

## Files Modified

| File | What Changes |
|------|-------------|
| `src/backend/repositories/SalesRepository.cjs` | Bug 2: add `sync_status`+`updated_at` to `sales_items` INSERT |
| `src/backend/repositories/ActiveSessionRepository.cjs` | Bug 1: change `UPSERT`→`INSERT`; Bug 6: remove `notifyDataChange` from `updateLastActivity` |
| `src/backend/repositories/OffersDiscountsRepository.cjs` | Bug 8: override `create()` to set sync columns |
| `src/backend/services/CloudSyncService.cjs` | Bug 3: fix stale `createMySQLSchema` DDL; Bug 7: fix timezone in `sinceTs`; Bug 10+12: `addMissingIndexes()`; Bug 11: cloud_id warning comment |
| `src/backend/services/RealTimeSyncService.cjs` | Bug 4: delegate offline queue to CloudSync; Bug 5: serialize FK pragma; Bug 9: remove double broadcast |
| Cloud MySQL (direct one-time query) | Bug 12: clear ghost pending `active_sessions` record |

---

## Task 1: Fix `sales_items` INSERT to include `sync_status` and `updated_at` (Bug 2)

**Files:**
- Modify: `src/backend/repositories/SalesRepository.cjs` ~line 257

**Root cause:** The `INSERT INTO sales_items` omits `sync_status` and `updated_at`. After migration 039 added those columns, rows inserted without them have NULL values — invisible to incremental sync (`WHERE updated_at > ?`) and to pending-record queries (`WHERE sync_status = 'pending'`).

- [ ] **Step 1: Replace the `addItemStmt` INSERT statement**

In `src/backend/repositories/SalesRepository.cjs`, find:

```javascript
            const addItemStmt = this.db.prepare(`
                INSERT INTO sales_items (sale_id, item_id, stock_id, batch_code, quantity, unit_price, discount, total_price)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
```

Replace with:

```javascript
            const addItemStmt = this.db.prepare(`
                INSERT INTO sales_items (sale_id, item_id, stock_id, batch_code, quantity, unit_price, discount, total_price, sync_status, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            `);
```

- [ ] **Step 2: Update the `.run()` call to pass `nowISO()` for `updated_at`**

In the same file, find:

```javascript
                addItemStmt.run(
                    saleId,
                    item.item_id,
                    item.stock_id,
                    item.batch_code,
                    item.quantity,
                    item.unit_price,
                    item.discount || 0,
                    item.total_price
                );
```

Replace with:

```javascript
                addItemStmt.run(
                    saleId,
                    item.item_id,
                    item.stock_id,
                    item.batch_code,
                    item.quantity,
                    item.unit_price,
                    item.discount || 0,
                    item.total_price,
                    nowISO()
                );
```

- [ ] **Step 3: Verify `nowISO` is already imported**

```bash
grep -n "nowISO" src/backend/repositories/SalesRepository.cjs | head -3
```
Expected: import line already present near top of file.

- [ ] **Step 4: Commit**

```bash
cd /Users/kkwenuja/development/Revo-infosurv/posMasterV3/posMasterV3
git add src/backend/repositories/SalesRepository.cjs
git commit -m "$(cat <<'EOF'
fix: include sync_status and updated_at in sales_items INSERT

sales_items rows were inserted without sync_status or updated_at,
making them invisible to incremental cloud sync (WHERE updated_at > ?)
and to pending-record queries (WHERE sync_status = 'pending').

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Fix `UPSERT` operation in `ActiveSessionRepository` (Bug 1)

**Files:**
- Modify: `src/backend/repositories/ActiveSessionRepository.cjs` line 63

**Root cause:** `notifyDataChange(this.tableName, 'UPSERT', ...)` uses the non-standard string `'UPSERT'`. CloudSyncService deduplication key is `tableName:operation:recordId`. A previous `'INSERT'` for the same session has a different key than `'UPSERT'`, so both are queued and race to MySQL creating a duplicate write.

- [ ] **Step 1: Change `'UPSERT'` to `'INSERT'`**

In `src/backend/repositories/ActiveSessionRepository.cjs`, find:

```javascript
            notifyDataChange(this.tableName, 'UPSERT', session, session.id);
```

Replace with:

```javascript
            notifyDataChange(this.tableName, 'INSERT', session, session.id);
```

- [ ] **Step 2: Commit**

```bash
git add src/backend/repositories/ActiveSessionRepository.cjs
git commit -m "$(cat <<'EOF'
fix: change UPSERT to INSERT in ActiveSessionRepository notifyDataChange

UPSERT is not a recognised operation in CloudSyncService deduplication.
Using it alongside INSERT for the same session caused two queue entries
with different keys, racing to MySQL. INSERT is correct — the upsert
SQL handles conflict resolution internally.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Remove `notifyDataChange` from `updateLastActivity` (Bug 6)

**Files:**
- Modify: `src/backend/repositories/ActiveSessionRepository.cjs` lines 151–165

**Root cause:** `updateLastActivity()` is the heartbeat — runs every ~30s per device. Each call queues `active_sessions:UPDATE:<session_id>`. While that dedup key is held, a real session event (logout) that queues the same key gets deduplicated away and **never syncs to cloud**.

- [ ] **Step 1: Replace the `updateLastActivity` method**

In `src/backend/repositories/ActiveSessionRepository.cjs`, find the entire `updateLastActivity` method:

```javascript
    updateLastActivity(userId, deviceId) {
        const stmt = this.db.prepare(`
            UPDATE ${this.tableName}
            SET last_activity_at = ?, updated_at = ?, sync_status = 'pending'
            WHERE user_id = ? AND device_id = ?
        `);

        const now = nowISO();
        const result = stmt.run(now, now, userId, deviceId);

        const session = this.findOneWhere({ user_id: userId, device_id: deviceId });
        if (result.changes > 0 && session) {
            notifyDataChange(this.tableName, 'UPDATE', session, session.id);
        }
        return session;
    }
```

Replace with:

```javascript
    updateLastActivity(userId, deviceId) {
        // NOTE: Intentionally does NOT call notifyDataChange.
        // Heartbeat-only update — sync_status intentionally not set to 'pending'.
        // RealTimeSyncService polls active_sessions every 1s; pushing every heartbeat
        // would hold the dedup key and block real session events (logout) from syncing.
        const stmt = this.db.prepare(`
            UPDATE ${this.tableName}
            SET last_activity_at = ?, updated_at = ?
            WHERE user_id = ? AND device_id = ?
        `);

        const now = nowISO();
        stmt.run(now, now, userId, deviceId);

        return this.findOneWhere({ user_id: userId, device_id: deviceId });
    }
```

- [ ] **Step 2: Commit**

```bash
git add src/backend/repositories/ActiveSessionRepository.cjs
git commit -m "$(cat <<'EOF'
fix: remove notifyDataChange from updateLastActivity heartbeat

Heartbeat calls every ~30s queued active_sessions:UPDATE:<id> which
blocked real session changes (logout) from syncing via the same dedup
key. last_activity_at is local-only tracking; RealTimeSyncService
polls active_sessions every 1s anyway.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Fix `OffersDiscountsRepository` — ensure `create()` sets sync columns (Bug 8)

**Files:**
- Modify: `src/backend/repositories/OffersDiscountsRepository.cjs`

**Root cause:** `BaseRepository.create()` is called for new offers but does not inject `sync_status` or `updated_at` into the data (it relies on the caller to pass them or the DB default). SQLite does not auto-update `updated_at` on INSERT unless the value is explicitly in the SQL. So new offers get `updated_at = NULL`, breaking incremental sync.

- [ ] **Step 1: Add a `create()` override to `OffersDiscountsRepository`**

In `src/backend/repositories/OffersDiscountsRepository.cjs`, add the following method between the constructor and `findActive()`:

```javascript
    /**
     * Create a new offer/discount, ensuring sync columns are populated.
     * @param {Object} data
     * @returns {Object} The created record
     */
    create(data) {
        const now = nowISO();
        return super.create({
            ...data,
            sync_status: data.sync_status || 'pending',
            updated_at: data.updated_at || now,
            created_at: data.created_at || now,
        });
    }
```

- [ ] **Step 2: Commit**

```bash
git add src/backend/repositories/OffersDiscountsRepository.cjs
git commit -m "$(cat <<'EOF'
fix: ensure offers_discounts create() sets sync_status and updated_at

BaseRepository.create() relies on caller to pass sync columns. Without
them, new offers had NULL updated_at breaking incremental cloud sync
(WHERE updated_at > ?). Override create() to inject defaults before
delegating to super.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Fix stale `createMySQLSchema` DDL for three tables (Bug 3)

**Files:**
- Modify: `src/backend/services/CloudSyncService.cjs` — `return_items`, `disposed_items`, `tea_coop_payments` schema blocks

**Root cause:** On a fresh MySQL deploy, `createMySQLSchema()` creates these tables with missing columns. `addMissingColumns()` patches live tables but `createMySQLSchema` is the wrong source of truth. Cloud audit confirmed the real cloud schemas have the columns; the code definition was never updated.

- [ ] **Step 1: Fix `return_items` schema**

In `src/backend/services/CloudSyncService.cjs`, find the `return_items` block inside `createMySQLSchema`:

```javascript
            return_items: `
                CREATE TABLE IF NOT EXISTS return_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    restock_id INT NOT NULL,
                    item_id INT NOT NULL,
                    batch_code VARCHAR(255) NOT NULL,
                    quantity DECIMAL(15,2) NOT NULL,
                    description TEXT,
                    INDEX idx_restock (restock_id),
                    INDEX idx_item (item_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
```

Replace with:

```javascript
            return_items: `
                CREATE TABLE IF NOT EXISTS return_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255) DEFAULT NULL,
                    restock_id INT NOT NULL,
                    item_id INT NOT NULL,
                    batch_code VARCHAR(255) NOT NULL,
                    quantity DECIMAL(15,2) NOT NULL,
                    description TEXT,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_restock (restock_id),
                    INDEX idx_item (item_id),
                    INDEX idx_sync_status (sync_status),
                    INDEX idx_updated_at (updated_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
```

- [ ] **Step 2: Fix `disposed_items` schema**

Find the `disposed_items` block:

```javascript
            disposed_items: `
                CREATE TABLE IF NOT EXISTS disposed_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255),
                    item_id INT NOT NULL,
                    stock_id INT NOT NULL,
                    batch_code VARCHAR(255) NOT NULL,
                    quantity DECIMAL(15,2) NOT NULL,
                    reason TEXT,
                    disposed_by VARCHAR(255),
                    disposed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    INDEX idx_item (item_id),
                    INDEX idx_stock (stock_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
```

Replace with:

```javascript
            disposed_items: `
                CREATE TABLE IF NOT EXISTS disposed_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255) DEFAULT NULL,
                    item_id INT NOT NULL,
                    stock_id INT NOT NULL,
                    batch_code VARCHAR(255) NOT NULL,
                    quantity DECIMAL(15,2) NOT NULL,
                    reason TEXT,
                    disposed_by VARCHAR(255) DEFAULT NULL,
                    disposed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_item (item_id),
                    INDEX idx_stock (stock_id),
                    INDEX idx_updated_at (updated_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
```

- [ ] **Step 3: Fix `tea_coop_payments` schema**

Find the `tea_coop_payments` block:

```javascript
            tea_coop_payments: `
                CREATE TABLE IF NOT EXISTS tea_coop_payments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255),
                    member_id VARCHAR(255) NOT NULL,
                    year INT NOT NULL,
                    month INT NOT NULL,
                    green_leaf_value DECIMAL(15,2) DEFAULT 0,
                    loans DECIMAL(15,2) DEFAULT 0,
                    net_amount DECIMAL(15,2) DEFAULT 0,
                    payment_date DATE,
                    factory_id INT DEFAULT 1,
                    last_fetched_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    UNIQUE INDEX idx_member_year_month (member_id, year, month),
                    INDEX idx_member_id (member_id),
                    INDEX idx_year_month (year, month)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
```

Replace with:

```javascript
            tea_coop_payments: `
                CREATE TABLE IF NOT EXISTS tea_coop_payments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cloud_id VARCHAR(255) DEFAULT NULL,
                    member_id VARCHAR(255) NOT NULL,
                    year INT NOT NULL,
                    month INT NOT NULL,
                    green_leaf_value DECIMAL(15,2) DEFAULT 0,
                    loans DECIMAL(15,2) DEFAULT 0,
                    net_amount DECIMAL(15,2) DEFAULT 0,
                    additions DECIMAL(15,2) DEFAULT 0,
                    deductions DECIMAL(15,2) DEFAULT 0,
                    payment_date DATE,
                    factory_id INT DEFAULT 1,
                    last_fetched_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    sync_status VARCHAR(50) DEFAULT 'pending',
                    UNIQUE INDEX idx_member_year_month (member_id, year, month),
                    INDEX idx_member_id (member_id),
                    INDEX idx_year_month (year, month)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `,
```

- [ ] **Step 4: Commit**

```bash
git add src/backend/services/CloudSyncService.cjs
git commit -m "$(cat <<'EOF'
fix: update createMySQLSchema to match actual cloud table definitions

Three tables had stale DDL missing columns added by later migrations:
- return_items: missing cloud_id, sync_status, created_at, updated_at
- disposed_items: missing updated_at
- tea_coop_payments: missing additions, deductions (migration 035)

addMissingColumns() patches live tables but createMySQLSchema is the
source of truth for fresh deploys. DDL now matches the real cloud schema
confirmed by cloud audit.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Fix incremental sync timezone mismatch (Bug 7)

**Files:**
- Modify: `src/backend/services/CloudSyncService.cjs` — `pullFromCloud` method (~line 1562)

**Root cause:** `sinceTs` is built as SL local time (`Asia/Colombo`) for the MySQL query `WHERE updated_at > ?`. MySQL `DATETIME` columns store values without timezone — on most servers (UTC default), `'2026-03-26 15:30:00'` is interpreted as UTC. A SL local time string sent to a UTC server is off by 5.5 hours, causing a window of missed or double-pulled records.

Fix: compute and store all timestamps in UTC so both the app and MySQL agree on the reference frame.

- [ ] **Step 1: Find the `pullStart` and `sinceTs` block in `pullFromCloud`**

Locate these lines (~1562):

```javascript
            const pullStart = nowISO().replace('T', ' ').replace(/\.\d+Z$/, '');
            // lastPull is stored as SL local time (YYYY-MM-DD HH:mm:ss) with no TZ suffix.
            // Appending SL_UTC_OFFSET makes new Date() parse it unambiguously as SL local time,
            // so the INCREMENTAL_SYNC_SKEW_MS subtraction produces the correct SL-local sinceTs string.
            const sinceTs = (hasUpdatedAt && lastPull)
                ? new Date(new Date(lastPull + SL_UTC_OFFSET).getTime() - INCREMENTAL_SYNC_SKEW_MS)
                    .toLocaleString('sv-SE', { timeZone: 'Asia/Colombo' })
                    .replace('T', ' ')
                : null;
```

- [ ] **Step 2: Replace with UTC-based timestamps**

```javascript
            // Store pullStart as UTC 'YYYY-MM-DD HH:mm:ss' for MySQL DATETIME comparison.
            // MySQL DATETIME has no timezone; on UTC servers the values are in UTC.
            // Using UTC consistently prevents a 5.5-hour window of missed/duplicate records.
            const nowMs = Date.now();
            const pullStart = new Date(nowMs).toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');

            // sinceTs: subtract skew buffer from last pull time (now stored as UTC string).
            // Append 'Z' so new Date() parses the stored UTC string unambiguously.
            const sinceTs = (hasUpdatedAt && lastPull)
                ? new Date(new Date(lastPull + 'Z').getTime() - INCREMENTAL_SYNC_SKEW_MS)
                    .toISOString()
                    .replace('T', ' ')
                    .replace(/\.\d+Z$/, '')
                : null;
```

- [ ] **Step 3: Commit**

```bash
git add src/backend/services/CloudSyncService.cjs
git commit -m "$(cat <<'EOF'
fix: use UTC for incremental sync sinceTs instead of SL local time

pullFromCloud was building sinceTs in Asia/Colombo local time but
MySQL DATETIME stores UTC on most servers. This created a 5.5-hour
window where records could be missed or double-pulled. Both pullStart
and sinceTs are now plain UTC strings throughout.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Make `RealTimeSyncService` offline queue persistent (Bug 4)

**Files:**
- Modify: `src/backend/services/RealTimeSyncService.cjs` — `syncChangeNow` and `syncPendingChanges`

**Root cause:** `RealTimeSyncService` has its own `this.pendingChanges = []`. When offline, `syncChangeNow()` pushes there without writing to the `sync_queue` DB table. App crash loses all queued changes. `CloudSyncService.queueChange()` already handles DB persistence and crash recovery. Fix: delegate everything to CloudSync.

- [ ] **Step 1: Find and replace `syncChangeNow` in RealTimeSyncService**

Find the entire `syncChangeNow` method and replace it with:

```javascript
    async syncChangeNow(tableName, operation, record, recordId) {
        // Delegate to CloudSyncService.queueChange() which handles both:
        // - immediate sync when online
        // - persistent DB queue (sync_queue table) when offline/failed
        // This eliminates the duplicate in-memory-only queue in RealTimeSyncService.
        try {
            const cloudSync = this.getCloudSync();
            await cloudSync.queueChange(tableName, operation, record, recordId);
            console.log(`[RealTimeSync] Delegated to CloudSync: ${operation} on ${tableName}`);
            return { success: true };
        } catch (error) {
            console.error(`[RealTimeSync] syncChangeNow failed:`, error.message);
            return { success: false, error: error.message };
        }
    }
```

- [ ] **Step 2: Find and replace `syncPendingChanges` in RealTimeSyncService**

Find the entire `syncPendingChanges` method and replace it with:

```javascript
    async syncPendingChanges() {
        // RealTimeSyncService no longer maintains its own pending queue.
        // CloudSyncService.syncPendingChanges() handles all persistence and retry.
        const cloudSync = this.getCloudSync();
        if (cloudSync.pendingChanges.length === 0) return { synced: 0 };
        if (!this.isOnline) return { synced: 0, reason: 'offline' };

        console.log(`[RealTimeSync] Delegating ${cloudSync.pendingChanges.length} pending changes to CloudSync...`);
        return cloudSync.syncPendingChanges();
    }
```

- [ ] **Step 3: Commit**

```bash
git add src/backend/services/RealTimeSyncService.cjs
git commit -m "$(cat <<'EOF'
fix: delegate RealTimeSyncService offline queue to CloudSyncService

RealTimeSyncService had its own in-memory pendingChanges[] not persisted
to sync_queue DB. App crash while offline lost all queued changes.
syncChangeNow() and syncPendingChanges() now delegate to CloudSyncService
which persists to DB and recovers pending changes on restart.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Fix FK pragma race between `fastSyncInterval` and `activeSessionsInterval` (Bug 5)

**Files:**
- Modify: `src/backend/services/RealTimeSyncService.cjs` — constructor, `performFastSync`, `checkActiveSessionsFromCloud`

**Root cause:** Both intervals fire every 1s. `performFastSync` sets `FK = OFF` globally for parallel pulls. `checkActiveSessionsFromCloud` calls `pullFromCloud('active_sessions', {skipFkPragma: false})` which sets its own `FK = ON` when done — while `performFastSync` parallel pulls are still running. This re-enables FK mid-batch causing constraint failures.

- [ ] **Step 1: Add `_fkPragmaActive` flag to the constructor**

In the constructor block of `RealTimeSyncService`, after `this.syncDebounce = new Map();`, add:

```javascript
        // Mutex flag: true while performFastSync holds the FK pragma lock globally.
        // checkActiveSessionsFromCloud reads this to skip its own FK toggle.
        this._fkPragmaActive = false;
```

- [ ] **Step 2: Update `performFastSync` to set/clear the flag around FK pragma**

In `performFastSync`, find:

```javascript
        if (db) db.pragma('foreign_keys = OFF');
```

Replace that line with:

```javascript
        this._fkPragmaActive = true;
        if (db) db.pragma('foreign_keys = OFF');
```

In the `finally` block of `performFastSync`, find:

```javascript
            if (db) db.pragma('foreign_keys = ON');
```

Replace with:

```javascript
            if (db) db.pragma('foreign_keys = ON');
            this._fkPragmaActive = false;
```

- [ ] **Step 3: Update `checkActiveSessionsFromCloud` to respect the flag**

In `checkActiveSessionsFromCloud`, find the `pullFromCloud` call. It will look like:

```javascript
            await cloudSync.pullFromCloud('active_sessions', { skipFkPragma: ... });
```

or without the option. Change it to pass the flag:

```javascript
            // If performFastSync currently holds the FK pragma globally, skip our own toggle
            await cloudSync.pullFromCloud('active_sessions', { skipFkPragma: this._fkPragmaActive });
```

- [ ] **Step 4: Commit**

```bash
git add src/backend/services/RealTimeSyncService.cjs
git commit -m "$(cat <<'EOF'
fix: prevent FK pragma race between fastSyncInterval and activeSessionsInterval

Both intervals fire every 1s. performFastSync disables FK globally for
parallel pulls. checkActiveSessionsFromCloud was re-enabling FK before
the parallel batch completed, causing constraint failures mid-sync.
Added _fkPragmaActive flag so checkActiveSessionsFromCloud skips its
own FK toggle when performFastSync holds the pragma.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Verify double broadcast is eliminated (Bug 9)

**Root cause:** The old `syncChangeNow` called `broadcastDataChange()` after `cloudSync.queueChange()`. CloudSync already broadcasts internally. Task 7 replaced `syncChangeNow` — verify no broadcast remains there.

- [ ] **Step 1: Verify no stray `broadcastDataChange` in the new `syncChangeNow`**

```bash
grep -n "broadcastDataChange" /Users/kkwenuja/development/Revo-infosurv/posMasterV3/posMasterV3/src/backend/services/RealTimeSyncService.cjs
```

Expected: `broadcastDataChange` does NOT appear inside `syncChangeNow`. It may appear in import lines or other methods — those are fine.

- [ ] **Step 2: If a stray call exists, remove it**

If you see `broadcastDataChange(tableName, operation, recordId, record)` inside the new `syncChangeNow` body, delete that line.

- [ ] **Step 3: Commit only if a removal was needed**

```bash
git add src/backend/services/RealTimeSyncService.cjs
git commit -m "$(cat <<'EOF'
fix: remove duplicate broadcastDataChange in syncChangeNow

CloudSyncService.queueChange() already broadcasts via pullRecordToLocal.
The extra broadcastDataChange in syncChangeNow fired two UI update
events per change, causing double re-renders.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Add `addMissingIndexes()` and self-heal missing cloud indexes (Bug 10)

**Files:**
- Modify: `src/backend/services/CloudSyncService.cjs` — add `addMissingIndexes()` method

**Root cause:** `login_history` and `restock_items` are missing their `sync_status` indexes in cloud MySQL. `addMissingColumns()` handles columns; nothing handles indexes. With 165+ login_history rows growing daily, full table scans on sync queries become increasingly slow.

- [ ] **Step 1: Add `addMissingIndexes()` call inside `createMySQLSchema`**

In `createMySQLSchema`, find:

```javascript
        await this.addMissingColumns();
```

Replace with:

```javascript
        await this.addMissingColumns();
        await this.addMissingIndexes();
```

- [ ] **Step 2: Add the `addMissingIndexes` method after `addMissingColumns`**

After the closing brace of `addMissingColumns`, add:

```javascript
    /**
     * Add missing indexes to existing MySQL tables.
     * Idempotent — safe to run on every startup.
     */
    async addMissingIndexes() {
        const indexes = [
            { table: 'login_history', keyName: 'idx_login_history_sync_status', column: 'sync_status' },
            { table: 'restock_items', keyName: 'idx_sync_status',               column: 'sync_status' },
        ];

        for (const idx of indexes) {
            try {
                const existing = await executeQuery(
                    `SHOW INDEX FROM \`${idx.table}\` WHERE Key_name = ?`,
                    [idx.keyName]
                );
                if (!existing || existing.length === 0) {
                    await executeQuery(
                        `ALTER TABLE \`${idx.table}\` ADD INDEX \`${idx.keyName}\` (\`${idx.column}\`)`
                    );
                    console.log(`[CloudSync] Added index ${idx.keyName} to ${idx.table}`);
                }
            } catch (err) {
                console.warn(`[CloudSync] Could not add index ${idx.keyName} to ${idx.table}:`, err.message);
            }
        }
    }
```

- [ ] **Step 3: Apply the indexes to the live cloud DB immediately**

```bash
node -e "
const mysql = require('mysql2/promise');
async function fix() {
  const conn = await mysql.createConnection({
    host: '162.241.24.242', user: 'toursurv_posdbuser',
    password: 'Abc@1234#tea', database: 'toursurv_posdb'
  });
  for (const [table, key, col] of [
    ['login_history', 'idx_login_history_sync_status', 'sync_status'],
    ['restock_items', 'idx_sync_status', 'sync_status'],
  ]) {
    try {
      await conn.execute('ALTER TABLE \`' + table + '\` ADD INDEX \`' + key + '\` (\`' + col + '\`)');
      console.log('Added index', key, 'to', table);
    } catch (e) {
      if (e.message.includes('Duplicate key name')) console.log('Already exists:', key);
      else console.error('Error:', e.message);
    }
  }
  await conn.end();
}
fix().catch(console.error);
"
```

- [ ] **Step 4: Commit**

```bash
git add src/backend/services/CloudSyncService.cjs
git commit -m "$(cat <<'EOF'
fix: add addMissingIndexes() for self-healing cloud MySQL indexes

login_history and restock_items were missing sync_status indexes in
cloud MySQL causing full table scans. New addMissingIndexes() method
is called from createMySQLSchema() on every startup. Also applied
indexes to live cloud DB directly.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Fix ghost `active_sessions` pending record in cloud MySQL (Bug 12)

**Root cause:** Cloud audit found 1 `active_sessions` row with `sync_status = 'pending'`. Root cause (heartbeat blocking logout sync) is fixed in Task 3. This task clears the stale data.

- [ ] **Step 1: Inspect the stuck record**

```bash
node -e "
const mysql = require('mysql2/promise');
async function fix() {
  const conn = await mysql.createConnection({
    host: '162.241.24.242', user: 'toursurv_posdbuser',
    password: 'Abc@1234#tea', database: 'toursurv_posdb'
  });
  const [rows] = await conn.execute(\"SELECT id, user_id, device_id, is_active, sync_status, updated_at FROM active_sessions WHERE sync_status = 'pending'\");
  console.log('Pending sessions:', JSON.stringify(rows, null, 2));
  await conn.end();
}
fix().catch(console.error);
"
```

- [ ] **Step 2: Mark the stuck record as synced**

```bash
node -e "
const mysql = require('mysql2/promise');
async function fix() {
  const conn = await mysql.createConnection({
    host: '162.241.24.242', user: 'toursurv_posdbuser',
    password: 'Abc@1234#tea', database: 'toursurv_posdb'
  });
  const [result] = await conn.execute(\"UPDATE active_sessions SET sync_status = 'synced' WHERE sync_status = 'pending'\");
  console.log('Rows updated:', result.affectedRows);
  await conn.end();
}
fix().catch(console.error);
"
```

Expected: `Rows updated: 1`

- [ ] **Step 3: Verify clean state**

```bash
node cloud_audit.cjs 2>&1 | grep -E "PENDING|pending|SYNC STATUS"
```

Expected: `All sync_status values look clean` with no pending/failed rows.

---

## Task 12: Document `cloud_id` collision risk (Bug 11)

**Files:**
- Modify: `src/backend/services/CloudSyncService.cjs` — add warning comment near `LOCAL_ONLY_COLUMNS`

**Root cause:** `cloud_id` is defined in all 22 synced tables but never set by any code path. The system uses local integer `id` directly as MySQL PK. With two branches having independent SQLite databases (auto-increment starts at 1 per device), Branch A and Branch B can create overlapping IDs — Branch B's sync silently overwrites Branch A's records in MySQL.

Short-term: document. Long-term fix (UUIDs) is a separate architectural change.

- [ ] **Step 1: Add a warning comment before `LOCAL_ONLY_COLUMNS` in CloudSyncService**

In `src/backend/services/CloudSyncService.cjs`, find the line:

```javascript
const LOCAL_ONLY_COLUMNS = [
```

Insert before it:

```javascript
// ⚠️  KNOWN ISSUE: cloud_id is defined in every synced table but is NEVER populated.
// The system uses local SQLite auto-increment `id` directly as the MySQL primary key.
// This works only if each POS device has unique IDs across all branches — which is NOT
// guaranteed because SQLite auto-increment restarts at 1 for each fresh database.
//
// MULTI-BRANCH COLLISION RISK: if Branch A creates items.id=5 and Branch B independently
// creates a different items.id=5, Branch B's sync will silently overwrite Branch A's
// record in MySQL with no error or warning.
//
// Current mitigation: this system operates with one SQLite DB per deployment, seeded
// from cloud on first run. Collisions only occur if a new branch device creates records
// before completing an initial full sync.
//
// Long-term fix: migrate primary keys to UUIDs (or server-allocated sequences) so local
// and cloud IDs are always unique across all devices. cloud_id was intended for this
// purpose but was never implemented.
```

- [ ] **Step 2: Commit**

```bash
git add src/backend/services/CloudSyncService.cjs
git commit -m "$(cat <<'EOF'
docs: document cloud_id as intentionally unused with collision risk warning

cloud_id is defined in all 22 synced tables but never set. The system
uses local SQLite auto-increment id as cloud PK. Two branches with
overlapping local IDs would cause silent overwrites in MySQL.
Added warning comment for future engineers. Full fix requires UUID PKs.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Final Verification

- [ ] **Run the full cloud audit**

```bash
cd /Users/kkwenuja/development/Revo-infosurv/posMasterV3/posMasterV3
node cloud_audit.cjs 2>&1 | grep -E "SYNC STATUS ISSUES|All sync_status|PENDING|MISSING TABLE|ISSUE"
```

Expected: `All sync_status values look clean (no pending/failed/null issues).`

- [ ] **Smoke test: create a sale, verify sales_items sync**

1. Launch app, create a sale with 2 items
2. In logs, confirm: `[CloudSync] Pushed record to cloud: sales_items`
3. Run:
```bash
node -e "
const mysql = require('mysql2/promise');
async function c(){
  const conn = await mysql.createConnection({host:'162.241.24.242',user:'toursurv_posdbuser',password:'Abc@1234#tea',database:'toursurv_posdb'});
  const [r] = await conn.execute('SELECT id, sync_status, updated_at FROM sales_items ORDER BY id DESC LIMIT 5');
  console.table(r);
  await conn.end();
}
c().catch(console.error);
"
```
Expected: most recent rows have `sync_status = 'synced'` and non-null `updated_at`.

- [ ] **Smoke test: verify incremental sync timestamps are UTC**

After startup, check logs for lines like:
```
[CloudSync] No records in cloud categories since 2026-03-26 14:30:00
```
The timestamp should be in UTC format (no `+05:30` suffix), and near the current UTC time.

- [ ] **Smoke test: session heartbeat does not block logout sync**

1. Log in on Device A
2. Wait 35s (heartbeat fires)
3. Log in on Device B (should kick Device A)
4. Device A should detect kicked session within 1–3s via RealTimeSyncService polling

