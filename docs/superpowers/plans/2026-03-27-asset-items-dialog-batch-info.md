# Asset Items Dialog — Batch Data & Per-Batch Save Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show real data (Purchase Amount, Location, Purchase Date, Asset Class) in the Asset Items dialog and allow per-batch editing and saving of Warranty and ID/EMI No. fields.

**Architecture:** Enrich `BatchDTO` in the inventory-purchasing service with `unitPrice`, `purchaseDate`, and `locationName`. Add a new `T_FA_TR_CAPITALIZATION_BATCH_INFO` table in fixed-assets to persist per-batch warranty/ID data, with GET+PUT endpoints. The frontend dialog makes two parallel calls and merges results, with inline editable inputs and a Save button.

**Tech Stack:** Java 11 / Spring Boot / JPA / PostgreSQL (backend), Angular 8 / TypeScript / Angular Material (frontend)

---

## File Map

### surecore-inventory-purchasing (enrich batch query)
- **Modify:** `common/surecore-inventory-purchasing-adpater-base/src/main/java/co/surecore/inventory/purchasing/dto/inventory/transaction/history/BatchDTO.java`
- **Modify:** `adapters/surecore/core-inventory-purchasing-adapter/src/main/java/co/surecore/inventory/purchasing/repository/inventory/transaction/history/InventoryTransactionHistoryRepository.java`
- **Modify:** `adapters/surecore/core-inventory-purchasing-adapter/src/main/java/co/surecore/inventory/purchasing/service/inventory/transaction/history/BatchServiceImpl.java`

### surecore-fixed-assets (new table + endpoints)
- **Create:** `adapters/surecore/surecore-fixed-assets-adapter/src/main/java/co/surecore/fixed/assets/service/entity/capitalization/CapitalizationBatchInfo.java`
- **Create:** `adapters/surecore/surecore-fixed-assets-adapter/src/main/java/co/surecore/fixed/assets/service/repository/capitalization/CapitalizationBatchInfoRepository.java`
- **Create:** `common/surecore-fixed-assets-adpater-base/src/main/java/co/surecore/fixed/assets/dto/capitalization/CapitalizationBatchInfoDTO.java`
- **Create:** `common/surecore-fixed-assets-adpater-base/src/main/java/co/surecore/fixed/assets/service/capitalization/CapitalizationBatchInfoService.java`
- **Create:** `adapters/surecore/surecore-fixed-assets-adapter/src/main/java/co/surecore/fixed/assets/service/service/capitalization/CapitalizationBatchInfoServiceImpl.java`
- **Create:** `surecore-fixed-assets-service-wrapper/src/main/java/co/surecore/fixed/assets/controller/capitalization/CapitalizationBatchInfoController.java`

### surecore-frontend (dialog + service)
- **Modify:** `src/app/modules/finance/module/fixed-assets/module/capitalization/services/capitalization.service.ts`
- **Modify:** `src/app/modules/finance/module/fixed-assets/module/capitalization/feature/capitalization-form/capitalization-form.component.ts`
- **Modify:** `src/app/modules/finance/module/fixed-assets/module/capitalization/feature/dialog/capitalization-batch-view-dialog/capitalization-batch-view-dialog.component.ts`
- **Modify:** `src/app/modules/finance/module/fixed-assets/module/capitalization/feature/dialog/capitalization-batch-view-dialog/capitalization-batch-view-dialog.component.html`

---

## Task 1: Enrich BatchDTO with unitPrice, purchaseDate, locationName

**Files:**
- Modify: `services/common/surecore-inventory-purchasing/common/surecore-inventory-purchasing-adpater-base/src/main/java/co/surecore/inventory/purchasing/dto/inventory/transaction/history/BatchDTO.java`

- [ ] **Step 1: Add three new fields to BatchDTO**

Open `BatchDTO.java`. After the existing `batchIsDeleted` field, add:

```java
private BigDecimal unitPrice;
private java.time.LocalDate purchaseDate;
private String locationName;
```

Add a new constructor for the capitalization batch query (used in Task 2). This constructor takes all fields needed by `findBatchesByGrnDocumentNoAndItemCode`:

```java
public BatchDTO(String batchNo, String lotNo, Long warehouseId, Long locationId, BigDecimal quantity, BigDecimal unitPrice, java.time.LocalDate purchaseDate) {
    this.batchNo = batchNo;
    this.lotNo = lotNo;
    this.warehouseId = warehouseId;
    this.locationId = locationId;
    this.quantity = quantity;
    this.unitPrice = unitPrice;
    this.purchaseDate = purchaseDate;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/kkwenuja/development/Surecore/surecore-platform
git add services/common/surecore-inventory-purchasing/common/surecore-inventory-purchasing-adpater-base/src/main/java/co/surecore/inventory/purchasing/dto/inventory/transaction/history/BatchDTO.java
git commit -m "feat: add unitPrice, purchaseDate, locationName fields to BatchDTO"
```

---

## Task 2: Update JPQL query to select unitCost and documentDate

**Files:**
- Modify: `services/common/surecore-inventory-purchasing/adapters/surecore/core-inventory-purchasing-adapter/src/main/java/co/surecore/inventory/purchasing/repository/inventory/transaction/history/InventoryTransactionHistoryRepository.java`

- [ ] **Step 1: Update findBatchesByGrnDocumentNoAndItemCode query**

Find the existing `findBatchesByGrnDocumentNoAndItemCode` method. Replace the `@Query` annotation and method signature with:

```java
@Query(
        "SELECT new co.surecore.inventory.purchasing.dto.inventory.transaction.history.BatchDTO(i.batchNo, i.lotNo, i.warehouseId, i.locationId, i.transQuantity, i.unitCost, i.documentDate) " +
                "FROM InventoryTransactionHistory i " +
                "WHERE i.documentNo = :grnDocumentNo " +
                "AND i.documentLineId = :grnLineId " +
                "AND i.itemCode = :itemCode"
)
Page<BatchDTO> findBatchesByGrnDocumentNoAndItemCode(
        Pageable pageRequest,
        @Param("grnDocumentNo") String grnDocumentNo,
        @Param("grnLineId") Integer grnLineId,
        @Param("itemCode") String itemCode
);
```

Note: `i.unitCost` maps to `INTH_UNIT_COST` and `i.documentDate` maps to `INTH_DOCUMENT_DATE` in `InventoryTransactionHistory`. These fields already exist on the entity.

- [ ] **Step 2: Commit**

```bash
git add services/common/surecore-inventory-purchasing/adapters/surecore/core-inventory-purchasing-adapter/src/main/java/co/surecore/inventory/purchasing/repository/inventory/transaction/history/InventoryTransactionHistoryRepository.java
git commit -m "feat: include unitCost and documentDate in findBatchesByGrnDocumentNoAndItemCode query"
```

---

## Task 3: Resolve location name in BatchServiceImpl

**Files:**
- Modify: `services/common/surecore-inventory-purchasing/adapters/surecore/core-inventory-purchasing-adapter/src/main/java/co/surecore/inventory/purchasing/service/inventory/transaction/history/BatchServiceImpl.java`

- [ ] **Step 1: Inject PurchaseDocumentUtility into BatchServiceImpl**

`BatchServiceImpl` currently uses `@AllArgsConstructor` from Lombok with three final fields. Add `PurchaseDocumentUtility` as a fourth injected dependency:

```java
private final PurchaseDocumentUtility purchaseDocumentUtility;
```

The import to add:
```java
import co.surecore.inventory.purchasing.service.purchasedocumentutility.PurchaseDocumentUtility;
```

- [ ] **Step 2: Update findBatchesByApInvoiceAndItemCode to resolve location names**

Find the `findBatchesByApInvoiceAndItemCode` method. After the existing block that builds the `PaginatedBatchDTOResponse`, add location name resolution. Replace the section from the `Page<BatchDTO> result = ...` call through to building the response with:

```java
Page<BatchDTO> result = inventoryTransactionHistoryRepository.findBatchesByGrnDocumentNoAndItemCode(
        PageRequest.of(page - 1, size),
        grnDocumentNo,
        grnLineId,
        itemCode
);

List<BatchDTO> enrichedList = result.getContent();

// Resolve location names — fetch warehouse master once, then map per batch
if (!enrichedList.isEmpty()) {
    Long warehouseId = enrichedList.get(0).getWarehouseId();
    if (warehouseId != null) {
        try {
            co.surecore.inventory.purchasing.dto.WarehouseMasterDTO warehouseMasterDTO =
                    purchaseDocumentUtility.findWarehouseMasterById(warehouseId);
            enrichedList.forEach(batch -> {
                if (batch.getLocationId() != null) {
                    try {
                        batch.setLocationName(purchaseDocumentUtility.getLocationCode(warehouseMasterDTO, batch.getLocationId()));
                    } catch (Exception ignored) {}
                }
            });
        } catch (Exception ignored) {}
    }
}

PaginatedBatchDTOResponse response = new PaginatedBatchDTOResponse();
response.setBatchDTOList(enrichedList);
response.setTotalNumberOfRecords(result.getTotalElements());
response.setTotalNumberOfPages(result.getTotalPages());
return response;
```

Import needed:
```java
import java.util.List;
```
(already present via existing imports)

- [ ] **Step 3: Commit**

```bash
git add services/common/surecore-inventory-purchasing/adapters/surecore/core-inventory-purchasing-adapter/src/main/java/co/surecore/inventory/purchasing/service/inventory/transaction/history/BatchServiceImpl.java
git commit -m "feat: resolve location name in findBatchesByApInvoiceAndItemCode"
```

---

## Task 4: Create CapitalizationBatchInfo entity

**Files:**
- Create: `services/common/surecore-fixed-assets/adapters/surecore/surecore-fixed-assets-adapter/src/main/java/co/surecore/fixed/assets/service/entity/capitalization/CapitalizationBatchInfo.java`

- [ ] **Step 1: Create the entity file**

Create the file at the path above with this content:

```java
package co.surecore.fixed.assets.service.entity.capitalization;

import lombok.*;

import javax.persistence.*;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Table(
    name = "T_FA_TR_CAPITALIZATION_BATCH_INFO",
    schema = "SURECORE_FA",
    uniqueConstraints = @UniqueConstraint(columnNames = {"CBTI_HEADER_ID", "CBTI_LINE_ID", "CBTI_BATCH_NO"})
)
public class CapitalizationBatchInfo {

    @Id
    @SequenceGenerator(
        name = "CapitalizationBatchInfoSequence",
        sequenceName = "\"SURECORE_FA\".\"S_FA_TR_CAPITALIZATION_BATCH_INFO_CBTI_ID_seq\"",
        allocationSize = 1
    )
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "CapitalizationBatchInfoSequence")
    @Column(name = "CBTI_ID", nullable = false)
    private Long id;

    @Column(name = "CBTI_HEADER_ID", nullable = false)
    private Long headerId;

    @Column(name = "CBTI_LINE_ID", nullable = false)
    private Integer lineId;

    @Column(name = "CBTI_BATCH_NO", nullable = false)
    private String batchNo;

    @Column(name = "CBTI_WARRANTY_DETAILS")
    private String warrantyDetails;

    @Column(name = "CBTI_IDENTIFICATION_NO")
    private String identificationNo;

    @Version
    @Column(name = "VERSION", nullable = false)
    private Integer version;
}
```

- [ ] **Step 2: Create the database table and sequence**

Connect to the database (SSH tunnel must be active) and run:

```sql
CREATE SEQUENCE "SURECORE_FA"."S_FA_TR_CAPITALIZATION_BATCH_INFO_CBTI_ID_seq"
    INCREMENT 1 START 1 MINVALUE 1;

CREATE TABLE "SURECORE_FA"."T_FA_TR_CAPITALIZATION_BATCH_INFO" (
    "CBTI_ID"               BIGINT      NOT NULL DEFAULT nextval('"SURECORE_FA"."S_FA_TR_CAPITALIZATION_BATCH_INFO_CBTI_ID_seq"'),
    "CBTI_HEADER_ID"        BIGINT      NOT NULL,
    "CBTI_LINE_ID"          INTEGER     NOT NULL,
    "CBTI_BATCH_NO"         VARCHAR(50) NOT NULL,
    "CBTI_WARRANTY_DETAILS" VARCHAR(255),
    "CBTI_IDENTIFICATION_NO" VARCHAR(100),
    "VERSION"               INTEGER     NOT NULL DEFAULT 0,
    CONSTRAINT "PK_T_FA_TR_CAPITALIZATION_BATCH_INFO" PRIMARY KEY ("CBTI_ID"),
    CONSTRAINT "UQ_CBTI_HEADER_LINE_BATCH" UNIQUE ("CBTI_HEADER_ID", "CBTI_LINE_ID", "CBTI_BATCH_NO")
);
```

Run via the tunnel:
```bash
psql "postgresql://postgres:password@localhost:5432/SureCoreCAS" -c "
CREATE SEQUENCE \"SURECORE_FA\".\"S_FA_TR_CAPITALIZATION_BATCH_INFO_CBTI_ID_seq\" INCREMENT 1 START 1 MINVALUE 1;
CREATE TABLE \"SURECORE_FA\".\"T_FA_TR_CAPITALIZATION_BATCH_INFO\" (
    \"CBTI_ID\" BIGINT NOT NULL DEFAULT nextval('\"SURECORE_FA\".\"S_FA_TR_CAPITALIZATION_BATCH_INFO_CBTI_ID_seq\"'),
    \"CBTI_HEADER_ID\" BIGINT NOT NULL,
    \"CBTI_LINE_ID\" INTEGER NOT NULL,
    \"CBTI_BATCH_NO\" VARCHAR(50) NOT NULL,
    \"CBTI_WARRANTY_DETAILS\" VARCHAR(255),
    \"CBTI_IDENTIFICATION_NO\" VARCHAR(100),
    \"VERSION\" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT \"PK_T_FA_TR_CAPITALIZATION_BATCH_INFO\" PRIMARY KEY (\"CBTI_ID\"),
    CONSTRAINT \"UQ_CBTI_HEADER_LINE_BATCH\" UNIQUE (\"CBTI_HEADER_ID\", \"CBTI_LINE_ID\", \"CBTI_BATCH_NO\")
);"
```

Expected output: `CREATE SEQUENCE` and `CREATE TABLE`

- [ ] **Step 3: Commit**

```bash
git add services/common/surecore-fixed-assets/adapters/surecore/surecore-fixed-assets-adapter/src/main/java/co/surecore/fixed/assets/service/entity/capitalization/CapitalizationBatchInfo.java
git commit -m "feat: add CapitalizationBatchInfo entity and create DB table"
```

---

## Task 5: Create CapitalizationBatchInfoDTO and Repository

**Files:**
- Create: `services/common/surecore-fixed-assets/common/surecore-fixed-assets-adpater-base/src/main/java/co/surecore/fixed/assets/dto/capitalization/CapitalizationBatchInfoDTO.java`
- Create: `services/common/surecore-fixed-assets/adapters/surecore/surecore-fixed-assets-adapter/src/main/java/co/surecore/fixed/assets/service/repository/capitalization/CapitalizationBatchInfoRepository.java`

- [ ] **Step 1: Create CapitalizationBatchInfoDTO**

```java
package co.surecore.fixed.assets.dto.capitalization;

import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CapitalizationBatchInfoDTO {
    private Long headerId;
    private Integer lineId;
    private String batchNo;
    private String warrantyDetails;
    private String identificationNo;
}
```

- [ ] **Step 2: Create CapitalizationBatchInfoRepository**

```java
package co.surecore.fixed.assets.service.repository.capitalization;

import co.surecore.fixed.assets.service.entity.capitalization.CapitalizationBatchInfo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CapitalizationBatchInfoRepository extends JpaRepository<CapitalizationBatchInfo, Long> {

    List<CapitalizationBatchInfo> findByHeaderIdAndLineId(Long headerId, Integer lineId);

    Optional<CapitalizationBatchInfo> findByHeaderIdAndLineIdAndBatchNo(Long headerId, Integer lineId, String batchNo);
}
```

- [ ] **Step 3: Commit**

```bash
git add \
  services/common/surecore-fixed-assets/common/surecore-fixed-assets-adpater-base/src/main/java/co/surecore/fixed/assets/dto/capitalization/CapitalizationBatchInfoDTO.java \
  services/common/surecore-fixed-assets/adapters/surecore/surecore-fixed-assets-adapter/src/main/java/co/surecore/fixed/assets/service/repository/capitalization/CapitalizationBatchInfoRepository.java
git commit -m "feat: add CapitalizationBatchInfoDTO and repository"
```

---

## Task 6: Create CapitalizationBatchInfoService and implementation

**Files:**
- Create: `services/common/surecore-fixed-assets/common/surecore-fixed-assets-adpater-base/src/main/java/co/surecore/fixed/assets/service/capitalization/CapitalizationBatchInfoService.java`
- Create: `services/common/surecore-fixed-assets/adapters/surecore/surecore-fixed-assets-adapter/src/main/java/co/surecore/fixed/assets/service/service/capitalization/CapitalizationBatchInfoServiceImpl.java`

- [ ] **Step 1: Create service interface**

```java
package co.surecore.fixed.assets.service.capitalization;

import co.surecore.fixed.assets.dto.capitalization.CapitalizationBatchInfoDTO;

import java.util.List;

public interface CapitalizationBatchInfoService {
    List<CapitalizationBatchInfoDTO> getBatchInfo(Long headerId, Integer lineId);
    void saveBatchInfo(List<CapitalizationBatchInfoDTO> items);
}
```

- [ ] **Step 2: Create service implementation**

```java
package co.surecore.fixed.assets.service.service.capitalization;

import co.surecore.fixed.assets.dto.capitalization.CapitalizationBatchInfoDTO;
import co.surecore.fixed.assets.service.capitalization.CapitalizationBatchInfoService;
import co.surecore.fixed.assets.service.entity.capitalization.CapitalizationBatchInfo;
import co.surecore.fixed.assets.service.repository.capitalization.CapitalizationBatchInfoRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class CapitalizationBatchInfoServiceImpl implements CapitalizationBatchInfoService {

    private final CapitalizationBatchInfoRepository repository;

    @Override
    public List<CapitalizationBatchInfoDTO> getBatchInfo(Long headerId, Integer lineId) {
        return repository.findByHeaderIdAndLineId(headerId, lineId)
                .stream()
                .map(e -> CapitalizationBatchInfoDTO.builder()
                        .headerId(e.getHeaderId())
                        .lineId(e.getLineId())
                        .batchNo(e.getBatchNo())
                        .warrantyDetails(e.getWarrantyDetails())
                        .identificationNo(e.getIdentificationNo())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void saveBatchInfo(List<CapitalizationBatchInfoDTO> items) {
        for (CapitalizationBatchInfoDTO dto : items) {
            Optional<CapitalizationBatchInfo> existing =
                    repository.findByHeaderIdAndLineIdAndBatchNo(dto.getHeaderId(), dto.getLineId(), dto.getBatchNo());

            if (existing.isPresent()) {
                CapitalizationBatchInfo entity = existing.get();
                entity.setWarrantyDetails(dto.getWarrantyDetails());
                entity.setIdentificationNo(dto.getIdentificationNo());
                repository.save(entity);
            } else {
                repository.save(CapitalizationBatchInfo.builder()
                        .headerId(dto.getHeaderId())
                        .lineId(dto.getLineId())
                        .batchNo(dto.getBatchNo())
                        .warrantyDetails(dto.getWarrantyDetails())
                        .identificationNo(dto.getIdentificationNo())
                        .version(0)
                        .build());
            }
        }
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add \
  services/common/surecore-fixed-assets/common/surecore-fixed-assets-adpater-base/src/main/java/co/surecore/fixed/assets/service/capitalization/CapitalizationBatchInfoService.java \
  services/common/surecore-fixed-assets/adapters/surecore/surecore-fixed-assets-adapter/src/main/java/co/surecore/fixed/assets/service/service/capitalization/CapitalizationBatchInfoServiceImpl.java
git commit -m "feat: add CapitalizationBatchInfoService with get and upsert logic"
```

---

## Task 7: Create CapitalizationBatchInfoController

**Files:**
- Create: `services/common/surecore-fixed-assets/surecore-fixed-assets-service-wrapper/src/main/java/co/surecore/fixed/assets/controller/capitalization/CapitalizationBatchInfoController.java`

The GET endpoint accepts `documentNo` + `lineId`, resolves headerId internally using `CapitalizationHeaderRepository`. The PUT endpoint accepts a list of DTOs with explicit `headerId`.

- [ ] **Step 1: Create the controller**

```java
package co.surecore.fixed.assets.controller.capitalization;

import co.surecore.fixed.assets.dto.capitalization.CapitalizationBatchInfoDTO;
import co.surecore.fixed.assets.exception.DataNotFoundException;
import co.surecore.fixed.assets.response.SuccessResponse;
import co.surecore.fixed.assets.response.SuccessResponseHandler;
import co.surecore.fixed.assets.service.capitalization.CapitalizationBatchInfoService;
import co.surecore.fixed.assets.service.entity.capitalization.CapitalizationHeader;
import co.surecore.fixed.assets.service.repository.capitalization.CapitalizationHeaderRepository;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/fixed-assets/capitalization/batch-info")
@AllArgsConstructor
public class CapitalizationBatchInfoController {

    private final CapitalizationBatchInfoService batchInfoService;
    private final CapitalizationHeaderRepository capitalizationHeaderRepository;

    @GetMapping
    public ResponseEntity<SuccessResponse> getBatchInfo(
            @RequestParam(name = "documentNo") String documentNo,
            @RequestParam(name = "lineId") Integer lineId
    ) {
        CapitalizationHeader header = capitalizationHeaderRepository.findCapitalizationHeaderByDocumentNo(documentNo);
        if (header == null) {
            throw new DataNotFoundException("Capitalization not found: " + documentNo);
        }
        List<CapitalizationBatchInfoDTO> result = batchInfoService.getBatchInfo(header.getId(), lineId);
        return SuccessResponseHandler.generateResponse(result, "Batch info for capitalization line");
    }

    @PutMapping
    public ResponseEntity<SuccessResponse> saveBatchInfo(
            @RequestBody List<CapitalizationBatchInfoDTO> items
    ) {
        batchInfoService.saveBatchInfo(items);
        return SuccessResponseHandler.generateResponse(null, "Batch info saved successfully");
    }
}
```

Note: Check that `DataNotFoundException` import path matches the one already used in `CapitalizationHeaderServiceImpl`. It is typically `co.surecore.fixed.assets.exception.DataNotFoundException` — verify in the existing service.

- [ ] **Step 2: Verify CapitalizationHeaderRepository is accessible from the wrapper module**

Check that `CapitalizationHeaderRepository` is in the same module as the adapter (it is — it's in `surecore-fixed-assets-adapter`). The wrapper depends on the adapter, so this import is valid. If there's a compile error, inject `CapitalizationHeaderService` instead and add a `findByDocumentNo(String documentNo)` method to the service interface that returns the header ID.

- [ ] **Step 3: Commit**

```bash
git add services/common/surecore-fixed-assets/surecore-fixed-assets-service-wrapper/src/main/java/co/surecore/fixed/assets/controller/capitalization/CapitalizationBatchInfoController.java
git commit -m "feat: add CapitalizationBatchInfoController with GET and PUT endpoints"
```

---

## Task 8: Add service methods to CapitalizationService (frontend)

**Files:**
- Modify: `src/app/modules/finance/module/fixed-assets/module/capitalization/services/capitalization.service.ts`

- [ ] **Step 1: Add two new methods to CapitalizationService**

Open the file. After the existing `getCapitalizationBatches` method, add:

```typescript
getCapitalizationBatchInfo(documentNo: string, lineId: number): Observable<HttpResponse<object>> {
  const path = `fixed-assets/capitalization/batch-info?documentNo=${documentNo}&lineId=${lineId}`;
  return this.http.getResource(path);
}

saveCapitalizationBatchInfo(payload: any[]): Observable<HttpResponse<object>> {
  const path = `fixed-assets/capitalization/batch-info`;
  return this.http.putResource(path, payload);
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/kkwenuja/development/Surecore/Surecore/surecore-frontend
git add src/app/modules/finance/module/fixed-assets/module/capitalization/services/capitalization.service.ts
git commit -m "feat: add getCapitalizationBatchInfo and saveCapitalizationBatchInfo to CapitalizationService"
```

---

## Task 9: Update openManageBatches to pass assetClass, documentNo, lineId

**Files:**
- Modify: `src/app/modules/finance/module/fixed-assets/module/capitalization/feature/capitalization-form/capitalization-form.component.ts`

- [ ] **Step 1: Update openManageBatches method**

Find the `openManageBatches` method (lines 201-212). Replace it with:

```typescript
openManageBatches(item: any): void {
  const apInvoiceNo = this.capitalizationForm.get('referenceNo').value;
  this.dialog.open(CapitalizationBatchViewDialogComponent, {
    width: '60vw',
    data: {
      apInvoiceNo: apInvoiceNo,
      itemCode: item.assetCode,
      assetDescription: item.assetDescription,
      quantity: item.quantity,
      assetClass: item.assetClass,
      documentNo: this.documentNo,
      lineId: item.lineId
    }
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/modules/finance/module/fixed-assets/module/capitalization/feature/capitalization-form/capitalization-form.component.ts
git commit -m "feat: pass assetClass, documentNo, lineId to Asset Items dialog"
```

---

## Task 10: Update CapitalizationBatchViewDialogComponent TypeScript

**Files:**
- Modify: `src/app/modules/finance/module/fixed-assets/module/capitalization/feature/dialog/capitalization-batch-view-dialog/capitalization-batch-view-dialog.component.ts`

- [ ] **Step 1: Update dialog data type, add savedBatchInfo, add parallel loading, add save method**

Replace the entire component file with:

```typescript
import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PAGINATION_ITEM_PER_PAGE } from 'src/app/config/enums';
import { NotificationDataTransferService } from 'src/app/services/notification-data-transfer.service';
import { CapitalizationService } from '../../../services/capitalization.service';
import { CapitalizationBatchAdvSearchDialogComponent, BatchAdvSearchParams } from '../capitalization-batch-adv-search-dialog/capitalization-batch-adv-search-dialog.component';

@Component({
  selector: 'app-capitalization-batch-view-dialog',
  templateUrl: './capitalization-batch-view-dialog.component.html',
  styleUrls: ['./capitalization-batch-view-dialog.component.scss']
})
export class CapitalizationBatchViewDialogComponent implements OnInit {

  batchList: any[] = [];
  isDataLoaded = false;
  isSaving = false;
  totalRecords = 0;
  pageSize = 5;
  pageIndex = 0;
  pageSizeOptions = PAGINATION_ITEM_PER_PAGE;
  advSearchParams: BatchAdvSearchParams = null;
  isAdvSearchActive = false;

  @ViewChild('paginator', { static: false }) paginator: MatPaginator;

  constructor(
    public dialogRef: MatDialogRef<CapitalizationBatchViewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      apInvoiceNo: string;
      itemCode: string;
      assetDescription: string;
      quantity: number;
      assetClass: string;
      documentNo: string;
      lineId: number;
    },
    private capitalizationService: CapitalizationService,
    private notify: NotificationDataTransferService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadBatches();
  }

  loadBatches() {
    this.isDataLoaded = false;

    const batches$ = this.capitalizationService.getCapitalizationBatches(
      this.data.apInvoiceNo,
      this.data.itemCode,
      this.pageIndex + 1,
      this.pageSize
    );

    const batchInfo$ = (this.data.documentNo && this.data.lineId != null)
      ? this.capitalizationService.getCapitalizationBatchInfo(this.data.documentNo, this.data.lineId).pipe(catchError(() => of(null)))
      : of(null);

    forkJoin([batches$, batchInfo$]).subscribe(([batchResp, infoResp]: any[]) => {
      this.isDataLoaded = true;

      let list: any[] = [];
      if (batchResp && batchResp.body && batchResp.body.data) {
        list = batchResp.body.data.batchDTOList || [];
        this.totalRecords = batchResp.body.data.totalNumberOfRecords || 0;
      }

      // Merge saved warranty/ID info onto each batch row
      const savedInfo: any[] = (infoResp && infoResp.body && infoResp.body.data) ? infoResp.body.data : [];
      list = list.map(batch => {
        const saved = savedInfo.find(s => s.batchNo === batch.batchNo);
        return {
          ...batch,
          warrantyDetails: saved ? saved.warrantyDetails : (batch.warrantyDetails || ''),
          identificationNo: saved ? saved.identificationNo : (batch.identificationNo || '')
        };
      });

      if (this.advSearchParams) {
        list = this.applyAdvSearch(list);
      }

      this.batchList = list;
    }, error => {
      this.isDataLoaded = true;
      this.notify.error(error.message);
    });
  }

  applyAdvSearch(list: any[]): any[] {
    const p = this.advSearchParams;
    return list.filter(item => {
      if (p.assetClass && !String(item.assetClass || '').toLowerCase().includes(p.assetClass.toLowerCase())) { return false; }
      if (p.priceMin && Number(item.unitPrice || 0) < Number(p.priceMin)) { return false; }
      if (p.priceMax && Number(item.unitPrice || 0) > Number(p.priceMax)) { return false; }
      if (p.warehouse && String(item.warehouseId || '') !== String(p.warehouse)) { return false; }
      if (p.location && item.locationName !== p.location) { return false; }
      if (p.department && item.department !== p.department) { return false; }
      if (p.purchaseDate && item.purchaseDate && item.purchaseDate !== p.purchaseDate) { return false; }
      return true;
    });
  }

  openAdvancedSearch() {
    const ref = this.dialog.open(CapitalizationBatchAdvSearchDialogComponent, {
      width: '50vw',
      data: this.advSearchParams || {}
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.advSearchParams = result;
        this.isAdvSearchActive = Object.values(result).some(v => !!v);
        this.pageIndex = 0;
        if (this.paginator) { this.paginator.firstPage(); }
        this.loadBatches();
      }
    });
  }

  resetAdvSearch() {
    this.advSearchParams = null;
    this.isAdvSearchActive = false;
    this.pageIndex = 0;
    if (this.paginator) { this.paginator.firstPage(); }
    this.loadBatches();
  }

  onChangePaginator(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadBatches();
  }

  saveBatchInfo() {
    if (!this.data.documentNo || this.data.lineId == null) {
      this.notify.error('Cannot save: missing document reference.');
      return;
    }

    // Find headerId from the loaded capitalization — backend resolves it from documentNo
    const payload = this.batchList.map(batch => ({
      documentNo: this.data.documentNo,
      lineId: this.data.lineId,
      batchNo: batch.batchNo,
      warrantyDetails: batch.warrantyDetails || null,
      identificationNo: batch.identificationNo || null
    }));

    this.isSaving = true;
    this.capitalizationService.saveCapitalizationBatchInfo(payload).subscribe((resp: any) => {
      this.isSaving = false;
      this.notify.success('Batch information saved successfully.');
    }, error => {
      this.isSaving = false;
      this.notify.error(error.message);
    });
  }
}
```

Note: `forkJoin` requires both observables to complete. The `catchError(() => of(null))` on `batchInfo$` ensures a failure to load saved info doesn't block the batch list from showing.

- [ ] **Step 2: Commit**

```bash
git add src/app/modules/finance/module/fixed-assets/module/capitalization/feature/dialog/capitalization-batch-view-dialog/capitalization-batch-view-dialog.component.ts
git commit -m "feat: update batch view dialog to load and merge saved batch info, add saveBatchInfo"
```

---

## Task 11: Update the dialog template

**Files:**
- Modify: `src/app/modules/finance/module/fixed-assets/module/capitalization/feature/dialog/capitalization-batch-view-dialog/capitalization-batch-view-dialog.component.html`

- [ ] **Step 1: Replace the full template**

Replace the entire file content with:

```html
<div class="th-white">
  <div class="pop-head d-flex justify-content-between align-items-center">
    <div>
      <h6>Asset Items</h6>
      <label>{{ data.assetDescription }}</label>
    </div>
    <div class="bvd-badges">
      <div class="bvd-badge">
        <span class="bvd-badge-label">Total Quantity</span>
        <span class="bvd-badge-value">{{ data.quantity }}</span>
      </div>
      <div class="bvd-badge">
        <span class="bvd-badge-label">Listed</span>
        <span class="bvd-badge-value">{{ totalRecords }}</span>
      </div>
    </div>
  </div>

  <div class="d-flex justify-content-end mb-3">
    <button *ngIf="isAdvSearchActive" (click)="resetAdvSearch()" class="btn-white-b mr-3">Reset</button>
    <button (click)="openAdvancedSearch()" class="bt-primary-white">
      <i class="material-icons fs-16 mr-1">tune</i>
      Advanced Search<span *ngIf="isAdvSearchActive" class="adv-active-dot"></span>
    </button>
  </div>

  <div class="table-white-th">
    <div class="twt-header gap-20">
      <div class="flex-half">#</div>
      <div class="flex-2">Batch No.</div>
      <div class="flex-1">Lot No.</div>
      <div class="flex-1">Quantity</div>
      <div class="flex-1">Asset Class</div>
      <div class="flex-1">Purchase Amount</div>
      <div class="flex-1">Location</div>
      <div class="flex-1">Purchase Date</div>
      <div class="flex-1">Warranty</div>
      <div class="flex-1">ID / EMI No.</div>
    </div>
    <div class="bb-light b-fluid"></div>

    <div class="twt-body">
      <mat-spinner *ngIf="!isDataLoaded; else batchesList"></mat-spinner>
      <ng-template #batchesList>
        <div *ngIf="batchList.length === 0 && isDataLoaded">
          <h2 class="s-found-hh mb-4">No items found</h2>
        </div>
        <div class="twtb-row gap-20" *ngFor="let item of batchList; let i = index">
          <div class="flex-half">{{ (pageIndex * pageSize) + i + 1 }}</div>
          <div class="flex-2">{{ item.batchNo }}</div>
          <div class="flex-1">{{ item.lotNumber || '-' }}</div>
          <div class="flex-1">{{ item.quantityOnHand }}</div>
          <div class="flex-1">{{ data.assetClass || '-' }}</div>
          <div class="flex-1">{{ item.unitPrice != null ? item.unitPrice : '-' }}</div>
          <div class="flex-1">{{ item.locationName || '-' }}</div>
          <div class="flex-1">{{ item.purchaseDate || '-' }}</div>
          <div class="flex-1">
            <input
              type="text"
              class="inline-edit-input"
              [(ngModel)]="item.warrantyDetails"
              placeholder="-"
            />
          </div>
          <div class="flex-1">
            <input
              type="text"
              class="inline-edit-input"
              [(ngModel)]="item.identificationNo"
              placeholder="-"
            />
          </div>
        </div>
      </ng-template>
    </div>

    <div class="sty-paginate">
      <div class="bb-light b-fluid sty-paginate-main-bg"></div>
      <div class="list-pagin">
        <mat-paginator
          #paginator
          (page)="onChangePaginator($event)"
          [length]="totalRecords"
          [pageSizeOptions]="pageSizeOptions"
          [pageSize]="pageSize"
          showFirstLastButtons>
        </mat-paginator>
      </div>
    </div>
  </div>

  <div class="d-flex mt-4 pt-3">
    <button (click)="dialogRef.close()" class="bt-primary-white mr-3 mw-128" type="button">
      Close
    </button>
    <button (click)="saveBatchInfo()" [disabled]="isSaving" class="bt-primary mw-128" type="button">
      {{ isSaving ? 'Saving...' : 'Save' }}
    </button>
  </div>
</div>
```

- [ ] **Step 2: Ensure FormsModule is imported in CapitalizationModule**

The `[(ngModel)]` directive requires `FormsModule`. Open:
`src/app/modules/finance/module/fixed-assets/module/capitalization/capitalization.module.ts`

Check that `FormsModule` is in the `imports` array. If missing, add it:
```typescript
import { FormsModule } from '@angular/forms';
// add FormsModule to the imports: [] array
```

- [ ] **Step 3: Add inline-edit-input style**

Open `capitalization-batch-view-dialog.component.scss` and add:

```scss
.inline-edit-input {
  width: 100%;
  border: none;
  border-bottom: 1px solid #ccc;
  background: transparent;
  font-size: inherit;
  color: inherit;
  padding: 2px 0;
  outline: none;

  &:focus {
    border-bottom-color: #3f51b5;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add \
  src/app/modules/finance/module/fixed-assets/module/capitalization/feature/dialog/capitalization-batch-view-dialog/capitalization-batch-view-dialog.component.html \
  src/app/modules/finance/module/fixed-assets/module/capitalization/feature/dialog/capitalization-batch-view-dialog/capitalization-batch-view-dialog.component.scss \
  src/app/modules/finance/module/fixed-assets/module/capitalization/capitalization.module.ts
git commit -m "feat: update Asset Items dialog template with editable warranty/ID fields and Save button"
```

---

## Task 12: Update saveCapitalizationBatchInfo to accept documentNo in payload

**Files:**
- Modify: `services/common/surecore-fixed-assets/common/surecore-fixed-assets-adpater-base/src/main/java/co/surecore/fixed/assets/dto/capitalization/CapitalizationBatchInfoDTO.java`
- Modify: `services/common/surecore-fixed-assets/surecore-fixed-assets-service-wrapper/src/main/java/co/surecore/fixed/assets/controller/capitalization/CapitalizationBatchInfoController.java`
- Modify: `services/common/surecore-fixed-assets/adapters/surecore/surecore-fixed-assets-adapter/src/main/java/co/surecore/fixed/assets/service/service/capitalization/CapitalizationBatchInfoServiceImpl.java`

The frontend sends `documentNo` in the PUT payload (not `headerId`). The backend must resolve `headerId` from `documentNo` during save.

- [ ] **Step 1: Add documentNo field to CapitalizationBatchInfoDTO**

Open `CapitalizationBatchInfoDTO.java` and add:

```java
private String documentNo;
```

The full field list is now: `headerId`, `lineId`, `batchNo`, `warrantyDetails`, `identificationNo`, `documentNo`.

- [ ] **Step 2: Update the PUT endpoint to resolve headerId from documentNo**

In `CapitalizationBatchInfoController`, replace the `saveBatchInfo` method with:

```java
@PutMapping
public ResponseEntity<SuccessResponse> saveBatchInfo(
        @RequestBody List<CapitalizationBatchInfoDTO> items
) {
    // Resolve headerId from documentNo for each item that has documentNo but no headerId
    items.forEach(item -> {
        if (item.getHeaderId() == null && item.getDocumentNo() != null) {
            CapitalizationHeader header = capitalizationHeaderRepository.findCapitalizationHeaderByDocumentNo(item.getDocumentNo());
            if (header != null) {
                item.setHeaderId(header.getId());
            }
        }
    });
    batchInfoService.saveBatchInfo(items);
    return SuccessResponseHandler.generateResponse(null, "Batch info saved successfully");
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/kkwenuja/development/Surecore/surecore-platform
git add \
  services/common/surecore-fixed-assets/common/surecore-fixed-assets-adpater-base/src/main/java/co/surecore/fixed/assets/dto/capitalization/CapitalizationBatchInfoDTO.java \
  services/common/surecore-fixed-assets/surecore-fixed-assets-service-wrapper/src/main/java/co/surecore/fixed/assets/controller/capitalization/CapitalizationBatchInfoController.java
git commit -m "feat: resolve headerId from documentNo in PUT batch-info endpoint"
```

---

## Task 13: Build and verify backend services

- [ ] **Step 1: Build surecore-inventory-purchasing**

```bash
cd /Users/kkwenuja/development/Surecore/surecore-platform/services/common/surecore-inventory-purchasing
mvn clean compile -q
```

Expected: `BUILD SUCCESS`. If there are constructor mismatch errors in `BatchDTO`, verify the new 7-argument constructor signature matches what the JPQL query passes.

- [ ] **Step 2: Build surecore-fixed-assets**

```bash
cd /Users/kkwenuja/development/Surecore/surecore-platform/services/common/surecore-fixed-assets
mvn clean compile -q
```

Expected: `BUILD SUCCESS`. If `DataNotFoundException` import fails in `CapitalizationBatchInfoController`, find the correct package by running:

```bash
grep -r "class DataNotFoundException" /Users/kkwenuja/development/Surecore/surecore-platform/services/common/surecore-fixed-assets --include="*.java" -l
```

Update the import accordingly.

- [ ] **Step 3: Build surecore-frontend**

```bash
cd /Users/kkwenuja/development/Surecore/Surecore/surecore-frontend
ng build --configuration=development 2>&1 | tail -30
```

Expected: `Build at:` line with no errors. If `forkJoin` import fails, verify it is imported from `rxjs` (not `rxjs/observable`). If `FormsModule` is already in `SharedModule` (check `shared.module.ts`), the extra import in `capitalization.module.ts` is not needed — remove it.

---

## Self-Review Notes

- Task 1 adds the BatchDTO constructor → Task 2 uses it in JPQL → consistent 7-arg constructor.
- Task 7 creates the controller with GET by `documentNo`+`lineId` → Task 8 frontend service calls with those params → consistent.
- Task 10 sends `documentNo` in PUT payload → Task 12 backend resolves `headerId` from it → consistent.
- `locationName` is set in `BatchServiceImpl` (Task 3); template binds `item.locationName` (Task 11) → consistent.
- `data.assetClass` displayed in template (Task 11); passed from form (Task 9) → consistent.
- `forkJoin` imported from `rxjs` in Task 10 — verify this matches the Angular version in the project (Angular 8 uses `rxjs` 6, where `forkJoin` is at `rxjs`).
