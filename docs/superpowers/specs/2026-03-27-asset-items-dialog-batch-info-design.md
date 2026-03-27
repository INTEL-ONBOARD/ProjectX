# Asset Items Dialog — Batch Data & Per-Batch Save Design

**Date:** 2026-03-27
**Branch:** bugfix/inventory_and_purchsing_fixes
**Status:** Approved

---

## Problem

The Asset Items dialog (`CapitalizationBatchViewDialogComponent`) shows `-` for Asset Class, Purchase Amount, Location, and Purchase Date because those fields are not included in the `BatchDTO` returned by the `inventory-purchasing/batches/by-grn` endpoint. Additionally, Warranty and ID/EMI No. are user-entered per-batch fields with no backend storage, and there is no Save button in the dialog.

---

## Goals

1. Display real values for Asset Class, Purchase Amount, Location (name), and Purchase Date in the batch table.
2. Make Warranty and ID/EMI No. columns editable inputs per batch row.
3. Add a Save button that persists warranty and ID/EMI No. values per batch.
4. Pre-populate saved warranty/ID values when the dialog is re-opened.

---

## Architecture Overview

Three layers are touched:

```
Frontend (Angular)
  └── Asset Items Dialog
        ├── GET inventory-purchasing/batches/by-grn  → enriched BatchDTO (unitPrice, purchaseDate, locationName)
        └── GET/PUT fixed-assets/capitalization/batch-info  → warrantyDetails, identificationNo

Backend: surecore-inventory-purchasing
  └── BatchDTO  +  findBatchesByGrnDocumentNoAndItemCode query  → add unitPrice, purchaseDate, locationName

Backend: surecore-fixed-assets
  └── New table T_FA_TR_CAPITALIZATION_BATCH_INFO
  └── New endpoints: GET + PUT /fixed-assets/capitalization/batch-info
```

---

## Backend Changes

### 1. `surecore-inventory-purchasing` — Enrich BatchDTO

**File:** `BatchDTO.java`
Add fields:
- `unitPrice` (BigDecimal) — mapped from `INTH_UNIT_COST`
- `purchaseDate` (LocalDate) — mapped from `INTH_DOCUMENT_DATE`
- `locationName` (String) — resolved from `locationId` via `PurchaseDocumentUtility.getLocationCode()`

**File:** `InventoryTransactionHistoryRepository.java`
Update `findBatchesByGrnDocumentNoAndItemCode` JPQL constructor query to also select `i.unitCost` and `i.documentDate`.

Update the BatchDTO constructor used by this query to accept the two new fields.

**File:** `BatchServiceImpl.java` — `findBatchesByApInvoiceAndItemCode()`
After getting the paged batch list, resolve location names:
- Fetch `WarehouseMasterDTO` via gRPC (same pattern as `GRNDetailServiceImpl`)
- For each `BatchDTO` in the result, call `purchaseDocumentUtility.getLocationCode(warehouseMasterDTO, batch.getLocationId())` and set `batch.setLocationName(...)`

> Asset Class is **not** stored in `InventoryTransactionHistory`. It is passed from the frontend via dialog data (already available on the capitalization detail line). No backend change needed for asset class.

---

### 2. `surecore-fixed-assets` — New Table & Endpoints

#### New Entity: `CapitalizationBatchInfo`

**Table:** `T_FA_TR_CAPITALIZATION_BATCH_INFO` (schema: `SURECORE_FA`)

| Column | Type | Constraint |
|---|---|---|
| `CBTI_ID` | BIGINT | PK, sequence |
| `CBTI_HEADER_ID` | BIGINT | NOT NULL — capitalization header ID |
| `CBTI_LINE_ID` | INTEGER | NOT NULL — capitalization detail line ID |
| `CBTI_BATCH_NO` | VARCHAR | NOT NULL — batch number |
| `CBTI_WARRANTY_DETAILS` | VARCHAR | NULLABLE |
| `CBTI_IDENTIFICATION_NO` | VARCHAR | NULLABLE |
| `VERSION` | INTEGER | NOT NULL, optimistic locking |

Unique constraint on `(CBTI_HEADER_ID, CBTI_LINE_ID, CBTI_BATCH_NO)`.

#### New DTO: `CapitalizationBatchInfoDTO`

```java
Long headerId;
Integer lineId;
String batchNo;
String warrantyDetails;
String identificationNo;
```

#### New Repository: `CapitalizationBatchInfoRepository`

- `findByHeaderIdAndLineId(Long headerId, Integer lineId)` → `List<CapitalizationBatchInfo>`

#### New Service Method

```java
List<CapitalizationBatchInfoDTO> getBatchInfo(Long headerId, Integer lineId);
void saveBatchInfo(List<CapitalizationBatchInfoDTO> items);
```

`saveBatchInfo` uses upsert logic: for each item, find existing by `(headerId, lineId, batchNo)` and update, or create new.

#### New Controller: `CapitalizationBatchInfoController`

**Base path:** `/fixed-assets/capitalization/batch-info`

```
GET  /fixed-assets/capitalization/batch-info?headerId={headerId}&lineId={lineId}
     → List<CapitalizationBatchInfoDTO>

PUT  /fixed-assets/capitalization/batch-info
     Body: List<CapitalizationBatchInfoDTO>
     → SuccessResponse
```

> `headerId` is resolved from `documentNo` using the existing `CapitalizationHeaderRepository.findCapitalizationHeaderByDocumentNo()`.

---

## Frontend Changes

### Dialog Data

Update the data passed to the dialog when `openManageBatches(item)` is called in `CapitalizationFormComponent`:

Add to dialog data:
- `assetClass: item.assetClass` — from the capitalization detail FormGroup
- `headerId: Long` — from the loaded capitalization header (already available in the form)
- `lineId: item.lineId` — from the capitalization detail FormGroup

### `CapitalizationBatchViewDialogComponent`

**`ngOnInit`:** Make two parallel API calls:
1. `getCapitalizationBatches(apInvoiceNo, itemCode, page, size)` — existing call
2. `getCapitalizationBatchInfo(headerId, lineId)` — new call via `CapitalizationService`

Merge results: for each batch in the batch list, find matching entry by `batchNo` in the batch-info response and patch `warrantyDetails` and `identificationNo`.

**Template changes:**
- `Asset Class` column: display `data.assetClass` (same value for all rows, from dialog data)
- `Purchase Amount` column: display `item.unitPrice` (now in API response)
- `Location` column: display `item.locationName` (now in API response)
- `Purchase Date` column: display `item.purchaseDate` (now in API response)
- `Warranty` column: replace static text with `<input>` bound to `item.warrantyDetails`
- `ID / EMI No.` column: replace static text with `<input>` bound to `item.identificationNo`
- Add **Save** button next to Close button

**Save logic:**
- On Save click, call `saveCapitalizationBatchInfo(headerId, lineId, batchList)` in the service
- Payload: map `batchList` to `[{ headerId, lineId, batchNo, warrantyDetails, identificationNo }]`
- Show success notification on save; show error notification on failure
- Save button is always enabled (no dirty-tracking complexity needed)

### `CapitalizationService`

Add two new methods:
```typescript
getCapitalizationBatchInfo(headerId, lineId): Observable<HttpResponse<object>>
// GET fixed-assets/capitalization/batch-info?headerId=...&lineId=...

saveCapitalizationBatchInfo(payload): Observable<HttpResponse<object>>
// PUT fixed-assets/capitalization/batch-info
```

---

## Data Flow Summary

```
User clicks "Manage" on an asset row
  → openManageBatches(item) passes { apInvoiceNo, itemCode, assetDescription, quantity, assetClass, headerId, lineId }
  → Dialog opens, ngOnInit fires two parallel calls:
      [1] GET inventory-purchasing/batches/by-grn → batchList (with unitPrice, purchaseDate, locationName)
      [2] GET fixed-assets/capitalization/batch-info?headerId=X&lineId=Y → savedInfo
  → Frontend merges: patches warrantyDetails and identificationNo onto each batch row
  → User edits Warranty / ID/EMI No. inputs inline
  → User clicks Save
      PUT fixed-assets/capitalization/batch-info → upserts per-batch records
  → Success notification shown
```

---

## Out of Scope

- Advanced search filter for Warranty / ID/EMI No. fields (not requested)
- Editing any other batch fields (Purchase Amount, Location, etc. are read-only from inventory)
- Validation rules on Warranty / ID/EMI No. format
