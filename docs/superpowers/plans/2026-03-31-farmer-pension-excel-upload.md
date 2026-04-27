# Farmer Pension Excel Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new Farmer Pension Excel upload feature to the Life Underwriting service that parses the ERP transfer data format (47 columns, 7,552 rows) and stages it into a new DB table, following the exact same pattern as the existing `LifePolicyLifeExcelUploadService`.

**Architecture:** Mirror the existing life upload pattern exactly — new DB table + JPA entity, new staging + error table, new service interface + impl, new stored procedure function wrapper, new REST controller. The upload phase only stages data (no business validation); the confirm phase triggers the stored procedure. All new code lives in the same modules and packages as the existing life upload code.

**Tech Stack:** Java 8+, Spring Boot, Apache POI (XSSFWorkbook/HSSFWorkbook), JPA/Hibernate, PostgreSQL (`SURECORE_LIFE_UW` schema), Maven multi-module

---

## Excel Column Mapping

The file `ERP - Tfr Data - Farmer Pension.xlsx` has 1 header row (row 0) + 7,552 data rows, 47 columns (indices 0–46). Row iterator breaks when col 0 (row index, numeric) is null.

| Col | Header | Java Field | DB Column | Type | Required |
|-----|--------|-----------|----------|------|----------|
| 0 | (row index) | — | — | numeric | Yes — null = end of data |
| 1 | Action | — | — | String | Ignored |
| 2 | Print Policy | — | — | String | Ignored |
| 3 | S_No | `fpexSNo` | `FPEX_S_NO` | Integer | No |
| 4 | District | `fpexDistrict` | `FPEX_DISTRICT` | String | No |
| 5 | Policy No | `fpexPolicyNo` | `FPEX_POLICY_NO` | String | **Yes** |
| 6 | Moderate Name | `fpexModerateName` | `FPEX_MODERATE_NAME` | String | No |
| 7 | Name With Initials | `fpexNameWithInitials` | `FPEX_NAME_WITH_INITIALS` | String | No |
| 8 | Moderate ID | `fpexModerateId` | `FPEX_MODERATE_ID` | String | No |
| 9 | Phone | `fpexPhone` | `FPEX_PHONE` | String | No |
| 10 | Address1 | `fpexAddress1` | `FPEX_ADDRESS1` | String | No |
| 11 | Address2 | `fpexAddress2` | `FPEX_ADDRESS2` | String | No |
| 12 | Address3 | `fpexAddress3` | `FPEX_ADDRESS3` | String | No |
| 13 | Asc | `fpexAsc` | `FPEX_ASC` | String | No |
| 14 | GN Division | `fpexGnDivision` | `FPEX_GN_DIVISION` | String | No |
| 15 | date_birth | `fpexDateBirth` | `FPEX_DATE_BIRTH` | Date | **Yes** |
| 16 | Enrolment date | `fpexEnrolmentDate` | `FPEX_ENROLMENT_DATE` | Date | **Yes** |
| 17 | Age | `fpexAge` | `FPEX_AGE` | Integer | No |
| 18 | Gender | `fpexGender` | `FPEX_GENDER` | String | No |
| 19 | Sivil_status | `fpexCivilStatus` | `FPEX_CIVIL_STATUS` | String | No |
| 20 | Pre_Amount | `fpexPreAmount` | `FPEX_PRE_AMOUNT` | BigDecimal | No |
| 21 | x | — | — | — | Ignored |
| 22 | Premium | `fpexPremium` | `FPEX_PREMIUM` | String | No |
| 23 | Number Of Premium | `fpexNumberOfPremium` | `FPEX_NUMBER_OF_PREMIUM` | Integer | No |
| 24 | End Date | `fpexEndDate` | `FPEX_END_DATE` | Date | No |
| 25 | Pension Date | `fpexPensionDate` | `FPEX_PENSION_DATE` | Date | No |
| 26 | 60-63 Pension | `fpexPension6063` | `FPEX_PENSION_60_63` | BigDecimal | No |
| 27 | 64-70 Pension | `fpexPension6470` | `FPEX_PENSION_64_70` | BigDecimal | No |
| 28 | 71-77 Pension | `fpexPension7177` | `FPEX_PENSION_71_77` | BigDecimal | No |
| 29 | More 78 | `fpexPensionMore78` | `FPEX_PENSION_MORE_78` | BigDecimal | No |
| 30 | Bank | `fpexBank` | `FPEX_BANK` | String | No |
| 31 | Branch | `fpexBranch` | `FPEX_BRANCH` | String | No |
| 32 | Acc_no | `fpexAccNo` | `FPEX_ACC_NO` | String | No |
| 33 | Spouse | `fpexSpouse` | `FPEX_SPOUSE` | String | No |
| 34 | Spouse name | `fpexSpouseName` | `FPEX_SPOUSE_NAME` | String | No |
| 35 | Spouse id | `fpexSpouseId` | `FPEX_SPOUSE_ID` | String | No |
| 36 | Spouse id_date | `fpexSpouseIdDate` | `FPEX_SPOUSE_ID_DATE` | String | No |
| 37 | Agri Status | `fpexAgriStatus` | `FPEX_AGRI_STATUS` | String | No |
| 38 | Officer Name(AIB) | `fpexOfficerNameAib` | `FPEX_OFFICER_NAME_AIB` | String | No |
| 39 | Officer Name(Other/Agent) | `fpexOfficerNameOther` | `FPEX_OFFICER_NAME_OTHER` | String | No |
| 40 | Re_No | `fpexReNo` | `FPEX_RE_NO` | String | No |
| 41 | Description | `fpexDescription` | `FPEX_DESCRIPTION` | String | No |
| 42 | Approval_HO | `fpexApprovalHo` | `FPEX_APPROVAL_HO` | String | No |
| 43 | Approval_AD | `fpexApprovalAd` | `FPEX_APPROVAL_AD` | String | No |
| 44 | Date_Time | `fpexDateTime` | `FPEX_DATE_TIME` | String | No |
| 45 | Len | `fpexLen` | `FPEX_LEN` | Integer | No |
| 46 | (null) | — | — | — | Ignored |

> **Note on col 0:** The row index column is numeric. Break the row loop when col 0 is null or blank. Columns 1, 2, 21, 46 are ignored (not persisted).

---

## File Structure

### New Files to Create

**DB Script**
```
services/life/life-underwriting-service/
  deploy/db-scripts/farmer-pension-excel-upload.sql
```

**Adapter module** (`surecore-life-underwriting-adapter`):
```
src/main/java/co/surecore/life/underwriting/
  entity/life_policy/TUwTmFarmerPensionExcelUpload.java
  entity/life_policy/TUwTmFarmerPensionExcelUploadError.java
  repository/life_policy/FarmerPensionExcelUploadRepository.java
  repository/life_policy/FarmerPensionExcelErrorRepository.java
  service/policy_management/life_policy/FarmerPensionExcelUploadServiceImpl.java
  function/FarmerPensionExcelUploadService.java
```

**Base module** (`life-underwriting-base`):
```
src/main/java/co/surecore/life/underwriting/
  service/policy_management/life_policy/FarmerPensionExcelUploadService.java
  dto/policy_management/policy/FarmerPensionUploadErrorDTO.java
  dto/policy_management/policy/FarmerPensionUploadErrorPaginatedDTO.java
  dto/policy_management/policy/FarmerPensionUploadSuccessDTO.java
  dto/policy_management/policy/FarmerPensionUploadSuccessPaginatedDTO.java
```

**Wrapper module** (`surecore-life-underwriting-service-wrapper`):
```
src/main/java/co/surecore/life/underwriting/
  controller/policy_management/life_policy_draft/FarmerPensionExcelUploadController.java
```

### Existing Files to Reference (do NOT modify)
- `entity/life_policy/TUwTmPolicyExcelUpload.java` — column size reference
- `entity/life_policy/TUwTmPolicyExcelUploadError.java` — error entity pattern
- `service/policy_management/life_policy/LifePolicyLifeExcelUploadServiceImpl.java` — full upload pattern
- `function/PolicyExcelUploadService.java` — stored proc call pattern
- `entity/AuditModel.java` — audit fields base class
- `service/common/BaseService.java` — `validateEntity()` pattern

---

## Task 1: Create DB Tables

**Files:**
- Create: `services/life/life-underwriting-service/deploy/db-scripts/farmer-pension-excel-upload.sql`

- [ ] **Step 1: Write the DB migration script**

```sql
-- T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD
CREATE SEQUENCE IF NOT EXISTS "SURECORE_LIFE_UW"."T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD_FPEX_SEQ_NO_seq"
    START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS "SURECORE_LIFE_UW"."T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD" (
    "FPEX_SEQ_NO"             BIGINT NOT NULL DEFAULT nextval('"SURECORE_LIFE_UW"."T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD_FPEX_SEQ_NO_seq"'),
    "FPEX_POLC_SEQ_NO"        BIGINT NOT NULL,
    "FPEX_ROW_NUMBER"         INTEGER,
    "FPEX_STATUS"             SMALLINT,
    "FPEX_S_NO"               INTEGER,
    "FPEX_DISTRICT"           VARCHAR(100),
    "FPEX_POLICY_NO"          VARCHAR(50),
    "FPEX_MODERATE_NAME"      VARCHAR(500),
    "FPEX_NAME_WITH_INITIALS" VARCHAR(500),
    "FPEX_MODERATE_ID"        VARCHAR(50),
    "FPEX_PHONE"              VARCHAR(20),
    "FPEX_ADDRESS1"           VARCHAR(500),
    "FPEX_ADDRESS2"           VARCHAR(500),
    "FPEX_ADDRESS3"           VARCHAR(500),
    "FPEX_ASC"                VARCHAR(200),
    "FPEX_GN_DIVISION"        VARCHAR(200),
    "FPEX_DATE_BIRTH"         TIMESTAMP,
    "FPEX_ENROLMENT_DATE"     TIMESTAMP,
    "FPEX_AGE"                INTEGER,
    "FPEX_GENDER"             VARCHAR(10),
    "FPEX_CIVIL_STATUS"       VARCHAR(20),
    "FPEX_PRE_AMOUNT"         NUMERIC,
    "FPEX_PREMIUM"            VARCHAR(20),
    "FPEX_NUMBER_OF_PREMIUM"  INTEGER,
    "FPEX_END_DATE"           TIMESTAMP,
    "FPEX_PENSION_DATE"       TIMESTAMP,
    "FPEX_PENSION_60_63"      NUMERIC,
    "FPEX_PENSION_64_70"      NUMERIC,
    "FPEX_PENSION_71_77"      NUMERIC,
    "FPEX_PENSION_MORE_78"    NUMERIC,
    "FPEX_BANK"               VARCHAR(200),
    "FPEX_BRANCH"             VARCHAR(200),
    "FPEX_ACC_NO"             VARCHAR(50),
    "FPEX_SPOUSE"             VARCHAR(50),
    "FPEX_SPOUSE_NAME"        VARCHAR(500),
    "FPEX_SPOUSE_ID"          VARCHAR(50),
    "FPEX_SPOUSE_ID_DATE"     VARCHAR(50),
    "FPEX_AGRI_STATUS"        VARCHAR(100),
    "FPEX_OFFICER_NAME_AIB"   VARCHAR(200),
    "FPEX_OFFICER_NAME_OTHER" VARCHAR(200),
    "FPEX_RE_NO"              VARCHAR(50),
    "FPEX_DESCRIPTION"        VARCHAR(500),
    "FPEX_APPROVAL_HO"        VARCHAR(20),
    "FPEX_APPROVAL_AD"        VARCHAR(20),
    "FPEX_DATE_TIME"          VARCHAR(50),
    "FPEX_LEN"                INTEGER,
    "CREATED_DATE"            TIMESTAMP NOT NULL,
    "CREATED_USER_CODE"       VARCHAR(20) NOT NULL,
    "LAST_MOD_DATE"           TIMESTAMP NOT NULL,
    "LAST_MOD_USER_CODE"      VARCHAR(20) NOT NULL,
    CONSTRAINT "T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD_pkey" PRIMARY KEY ("FPEX_SEQ_NO")
);

-- T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD_ERROR
CREATE SEQUENCE IF NOT EXISTS "SURECORE_LIFE_UW"."T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD_ERROR_FPEE_SEQ_NO_seq"
    START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS "SURECORE_LIFE_UW"."T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD_ERROR" (
    "FPEE_SEQ_NO"       BIGINT NOT NULL DEFAULT nextval('"SURECORE_LIFE_UW"."T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD_ERROR_FPEE_SEQ_NO_seq"'),
    "FPEE_POLC_SEQ_NO"  BIGINT,
    "FPEE_FPEX_SEQ_NO"  BIGINT,
    "FPEE_ERROR"        VARCHAR(1000),
    "FPEE_ACTION"       SMALLINT NOT NULL DEFAULT 1,
    "VERSION"           INTEGER NOT NULL DEFAULT 0,
    "CREATED_DATE"      TIMESTAMP NOT NULL,
    "CREATED_USER_CODE" VARCHAR(20) NOT NULL,
    "LAST_MOD_DATE"     TIMESTAMP NOT NULL,
    "LAST_MOD_USER_CODE" VARCHAR(20) NOT NULL,
    CONSTRAINT "T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD_ERROR_pkey" PRIMARY KEY ("FPEE_SEQ_NO")
);

ALTER TABLE "SURECORE_LIFE_UW"."T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD_ERROR"
    ADD CONSTRAINT "fpee_polc_fk" FOREIGN KEY ("FPEE_POLC_SEQ_NO")
    REFERENCES "SURECORE_LIFE_UW"."T_UW_TR_POLICY" ("POLC_SEQ_NO") ON DELETE CASCADE;

ALTER TABLE "SURECORE_LIFE_UW"."T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD_ERROR"
    ADD CONSTRAINT "fpee_fpex_fk" FOREIGN KEY ("FPEE_FPEX_SEQ_NO")
    REFERENCES "SURECORE_LIFE_UW"."T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD" ("FPEX_SEQ_NO") ON DELETE CASCADE;
```

- [ ] **Step 2: Run the script against the DB**

```bash
psql "postgresql://postgres:password@localhost:5432/SureCoreCAS" \
  -f services/life/life-underwriting-service/deploy/db-scripts/farmer-pension-excel-upload.sql
```

Expected output: no errors, `CREATE SEQUENCE`, `CREATE TABLE` lines visible.

- [ ] **Step 3: Verify tables exist**

```bash
psql "postgresql://postgres:password@localhost:5432/SureCoreCAS" -c "
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'SURECORE_LIFE_UW'
  AND table_name LIKE '%FARMER%';"
```

Expected: two rows — `T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD` and `T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD_ERROR`.

- [ ] **Step 4: Commit**

```bash
git add services/life/life-underwriting-service/deploy/db-scripts/farmer-pension-excel-upload.sql
git commit -m "feat: add DB tables for Farmer Pension Excel upload staging"
```

---

## Task 2: Create Upload Entity

**Files:**
- Create: `services/life/life-underwriting-service/adapters/surecore/surecore-life-underwriting-adapter/src/main/java/co/surecore/life/underwriting/entity/life_policy/TUwTmFarmerPensionExcelUpload.java`

- [ ] **Step 1: Create the entity**

```java
package co.surecore.life.underwriting.entity.life_policy;

import co.surecore.life.underwriting.entity.AuditModel;

import javax.persistence.*;
import java.math.BigDecimal;
import java.util.Date;
import java.util.Objects;

@Entity
@Table(name = "T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD", schema = "SURECORE_LIFE_UW")
public class TUwTmFarmerPensionExcelUpload extends AuditModel {

    @Id
    @Column(name = "FPEX_SEQ_NO")
    @GeneratedValue(generator = "FarmerPensionExcelSequence")
    @SequenceGenerator(name = "FarmerPensionExcelSequence", schema = "\"SURECORE_LIFE_UW\"",
            sequenceName = "\"T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD_FPEX_SEQ_NO_seq\"", allocationSize = 1)
    private long fpexSeqNo;

    @Basic @Column(name = "FPEX_POLC_SEQ_NO") private long fpexPolcSeqNo;
    @Basic @Column(name = "FPEX_ROW_NUMBER")  private Integer fpexRowNumber;
    @Basic @Column(name = "FPEX_STATUS")       private Short fpexStatus;
    @Basic @Column(name = "FPEX_S_NO")         private Integer fpexSNo;
    @Basic @Column(name = "FPEX_DISTRICT")     private String fpexDistrict;
    @Basic @Column(name = "FPEX_POLICY_NO")    private String fpexPolicyNo;
    @Basic @Column(name = "FPEX_MODERATE_NAME")       private String fpexModerateName;
    @Basic @Column(name = "FPEX_NAME_WITH_INITIALS")  private String fpexNameWithInitials;
    @Basic @Column(name = "FPEX_MODERATE_ID")         private String fpexModerateId;
    @Basic @Column(name = "FPEX_PHONE")               private String fpexPhone;
    @Basic @Column(name = "FPEX_ADDRESS1")            private String fpexAddress1;
    @Basic @Column(name = "FPEX_ADDRESS2")            private String fpexAddress2;
    @Basic @Column(name = "FPEX_ADDRESS3")            private String fpexAddress3;
    @Basic @Column(name = "FPEX_ASC")                 private String fpexAsc;
    @Basic @Column(name = "FPEX_GN_DIVISION")         private String fpexGnDivision;

    @Basic @Temporal(TemporalType.TIMESTAMP) @Column(name = "FPEX_DATE_BIRTH")      private Date fpexDateBirth;
    @Basic @Temporal(TemporalType.TIMESTAMP) @Column(name = "FPEX_ENROLMENT_DATE")  private Date fpexEnrolmentDate;
    @Basic @Temporal(TemporalType.TIMESTAMP) @Column(name = "FPEX_END_DATE")        private Date fpexEndDate;
    @Basic @Temporal(TemporalType.TIMESTAMP) @Column(name = "FPEX_PENSION_DATE")    private Date fpexPensionDate;

    @Basic @Column(name = "FPEX_AGE")              private Integer fpexAge;
    @Basic @Column(name = "FPEX_GENDER")           private String fpexGender;
    @Basic @Column(name = "FPEX_CIVIL_STATUS")     private String fpexCivilStatus;
    @Basic @Column(name = "FPEX_PRE_AMOUNT")       private BigDecimal fpexPreAmount;
    @Basic @Column(name = "FPEX_PREMIUM")          private String fpexPremium;
    @Basic @Column(name = "FPEX_NUMBER_OF_PREMIUM") private Integer fpexNumberOfPremium;
    @Basic @Column(name = "FPEX_PENSION_60_63")    private BigDecimal fpexPension6063;
    @Basic @Column(name = "FPEX_PENSION_64_70")    private BigDecimal fpexPension6470;
    @Basic @Column(name = "FPEX_PENSION_71_77")    private BigDecimal fpexPension7177;
    @Basic @Column(name = "FPEX_PENSION_MORE_78")  private BigDecimal fpexPensionMore78;
    @Basic @Column(name = "FPEX_BANK")             private String fpexBank;
    @Basic @Column(name = "FPEX_BRANCH")           private String fpexBranch;
    @Basic @Column(name = "FPEX_ACC_NO")           private String fpexAccNo;
    @Basic @Column(name = "FPEX_SPOUSE")           private String fpexSpouse;
    @Basic @Column(name = "FPEX_SPOUSE_NAME")      private String fpexSpouseName;
    @Basic @Column(name = "FPEX_SPOUSE_ID")        private String fpexSpouseId;
    @Basic @Column(name = "FPEX_SPOUSE_ID_DATE")   private String fpexSpouseIdDate;
    @Basic @Column(name = "FPEX_AGRI_STATUS")      private String fpexAgriStatus;
    @Basic @Column(name = "FPEX_OFFICER_NAME_AIB") private String fpexOfficerNameAib;
    @Basic @Column(name = "FPEX_OFFICER_NAME_OTHER") private String fpexOfficerNameOther;
    @Basic @Column(name = "FPEX_RE_NO")            private String fpexReNo;
    @Basic @Column(name = "FPEX_DESCRIPTION")      private String fpexDescription;
    @Basic @Column(name = "FPEX_APPROVAL_HO")      private String fpexApprovalHo;
    @Basic @Column(name = "FPEX_APPROVAL_AD")      private String fpexApprovalAd;
    @Basic @Column(name = "FPEX_DATE_TIME")        private String fpexDateTime;
    @Basic @Column(name = "FPEX_LEN")              private Integer fpexLen;

    // --- Getters & Setters ---

    public long getFpexSeqNo() { return fpexSeqNo; }
    public void setFpexSeqNo(long fpexSeqNo) { this.fpexSeqNo = fpexSeqNo; }

    public long getFpexPolcSeqNo() { return fpexPolcSeqNo; }
    public void setFpexPolcSeqNo(long fpexPolcSeqNo) { this.fpexPolcSeqNo = fpexPolcSeqNo; }

    public Integer getFpexRowNumber() { return fpexRowNumber; }
    public void setFpexRowNumber(Integer fpexRowNumber) { this.fpexRowNumber = fpexRowNumber; }

    public Short getFpexStatus() { return fpexStatus; }
    public void setFpexStatus(Short fpexStatus) { this.fpexStatus = fpexStatus; }

    public Integer getFpexSNo() { return fpexSNo; }
    public void setFpexSNo(Integer fpexSNo) { this.fpexSNo = fpexSNo; }

    public String getFpexDistrict() { return fpexDistrict; }
    public void setFpexDistrict(String fpexDistrict) { this.fpexDistrict = fpexDistrict; }

    public String getFpexPolicyNo() { return fpexPolicyNo; }
    public void setFpexPolicyNo(String fpexPolicyNo) { this.fpexPolicyNo = fpexPolicyNo; }

    public String getFpexModerateName() { return fpexModerateName; }
    public void setFpexModerateName(String fpexModerateName) { this.fpexModerateName = fpexModerateName; }

    public String getFpexNameWithInitials() { return fpexNameWithInitials; }
    public void setFpexNameWithInitials(String fpexNameWithInitials) { this.fpexNameWithInitials = fpexNameWithInitials; }

    public String getFpexModerateId() { return fpexModerateId; }
    public void setFpexModerateId(String fpexModerateId) { this.fpexModerateId = fpexModerateId; }

    public String getFpexPhone() { return fpexPhone; }
    public void setFpexPhone(String fpexPhone) { this.fpexPhone = fpexPhone; }

    public String getFpexAddress1() { return fpexAddress1; }
    public void setFpexAddress1(String fpexAddress1) { this.fpexAddress1 = fpexAddress1; }

    public String getFpexAddress2() { return fpexAddress2; }
    public void setFpexAddress2(String fpexAddress2) { this.fpexAddress2 = fpexAddress2; }

    public String getFpexAddress3() { return fpexAddress3; }
    public void setFpexAddress3(String fpexAddress3) { this.fpexAddress3 = fpexAddress3; }

    public String getFpexAsc() { return fpexAsc; }
    public void setFpexAsc(String fpexAsc) { this.fpexAsc = fpexAsc; }

    public String getFpexGnDivision() { return fpexGnDivision; }
    public void setFpexGnDivision(String fpexGnDivision) { this.fpexGnDivision = fpexGnDivision; }

    public Date getFpexDateBirth() { return fpexDateBirth; }
    public void setFpexDateBirth(Date fpexDateBirth) { this.fpexDateBirth = fpexDateBirth; }

    public Date getFpexEnrolmentDate() { return fpexEnrolmentDate; }
    public void setFpexEnrolmentDate(Date fpexEnrolmentDate) { this.fpexEnrolmentDate = fpexEnrolmentDate; }

    public Integer getFpexAge() { return fpexAge; }
    public void setFpexAge(Integer fpexAge) { this.fpexAge = fpexAge; }

    public String getFpexGender() { return fpexGender; }
    public void setFpexGender(String fpexGender) { this.fpexGender = fpexGender; }

    public String getFpexCivilStatus() { return fpexCivilStatus; }
    public void setFpexCivilStatus(String fpexCivilStatus) { this.fpexCivilStatus = fpexCivilStatus; }

    public BigDecimal getFpexPreAmount() { return fpexPreAmount; }
    public void setFpexPreAmount(BigDecimal fpexPreAmount) { this.fpexPreAmount = fpexPreAmount; }

    public String getFpexPremium() { return fpexPremium; }
    public void setFpexPremium(String fpexPremium) { this.fpexPremium = fpexPremium; }

    public Integer getFpexNumberOfPremium() { return fpexNumberOfPremium; }
    public void setFpexNumberOfPremium(Integer fpexNumberOfPremium) { this.fpexNumberOfPremium = fpexNumberOfPremium; }

    public Date getFpexEndDate() { return fpexEndDate; }
    public void setFpexEndDate(Date fpexEndDate) { this.fpexEndDate = fpexEndDate; }

    public Date getFpexPensionDate() { return fpexPensionDate; }
    public void setFpexPensionDate(Date fpexPensionDate) { this.fpexPensionDate = fpexPensionDate; }

    public BigDecimal getFpexPension6063() { return fpexPension6063; }
    public void setFpexPension6063(BigDecimal fpexPension6063) { this.fpexPension6063 = fpexPension6063; }

    public BigDecimal getFpexPension6470() { return fpexPension6470; }
    public void setFpexPension6470(BigDecimal fpexPension6470) { this.fpexPension6470 = fpexPension6470; }

    public BigDecimal getFpexPension7177() { return fpexPension7177; }
    public void setFpexPension7177(BigDecimal fpexPension7177) { this.fpexPension7177 = fpexPension7177; }

    public BigDecimal getFpexPensionMore78() { return fpexPensionMore78; }
    public void setFpexPensionMore78(BigDecimal fpexPensionMore78) { this.fpexPensionMore78 = fpexPensionMore78; }

    public String getFpexBank() { return fpexBank; }
    public void setFpexBank(String fpexBank) { this.fpexBank = fpexBank; }

    public String getFpexBranch() { return fpexBranch; }
    public void setFpexBranch(String fpexBranch) { this.fpexBranch = fpexBranch; }

    public String getFpexAccNo() { return fpexAccNo; }
    public void setFpexAccNo(String fpexAccNo) { this.fpexAccNo = fpexAccNo; }

    public String getFpexSpouse() { return fpexSpouse; }
    public void setFpexSpouse(String fpexSpouse) { this.fpexSpouse = fpexSpouse; }

    public String getFpexSpouseName() { return fpexSpouseName; }
    public void setFpexSpouseName(String fpexSpouseName) { this.fpexSpouseName = fpexSpouseName; }

    public String getFpexSpouseId() { return fpexSpouseId; }
    public void setFpexSpouseId(String fpexSpouseId) { this.fpexSpouseId = fpexSpouseId; }

    public String getFpexSpouseIdDate() { return fpexSpouseIdDate; }
    public void setFpexSpouseIdDate(String fpexSpouseIdDate) { this.fpexSpouseIdDate = fpexSpouseIdDate; }

    public String getFpexAgriStatus() { return fpexAgriStatus; }
    public void setFpexAgriStatus(String fpexAgriStatus) { this.fpexAgriStatus = fpexAgriStatus; }

    public String getFpexOfficerNameAib() { return fpexOfficerNameAib; }
    public void setFpexOfficerNameAib(String fpexOfficerNameAib) { this.fpexOfficerNameAib = fpexOfficerNameAib; }

    public String getFpexOfficerNameOther() { return fpexOfficerNameOther; }
    public void setFpexOfficerNameOther(String fpexOfficerNameOther) { this.fpexOfficerNameOther = fpexOfficerNameOther; }

    public String getFpexReNo() { return fpexReNo; }
    public void setFpexReNo(String fpexReNo) { this.fpexReNo = fpexReNo; }

    public String getFpexDescription() { return fpexDescription; }
    public void setFpexDescription(String fpexDescription) { this.fpexDescription = fpexDescription; }

    public String getFpexApprovalHo() { return fpexApprovalHo; }
    public void setFpexApprovalHo(String fpexApprovalHo) { this.fpexApprovalHo = fpexApprovalHo; }

    public String getFpexApprovalAd() { return fpexApprovalAd; }
    public void setFpexApprovalAd(String fpexApprovalAd) { this.fpexApprovalAd = fpexApprovalAd; }

    public String getFpexDateTime() { return fpexDateTime; }
    public void setFpexDateTime(String fpexDateTime) { this.fpexDateTime = fpexDateTime; }

    public Integer getFpexLen() { return fpexLen; }
    public void setFpexLen(Integer fpexLen) { this.fpexLen = fpexLen; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TUwTmFarmerPensionExcelUpload that = (TUwTmFarmerPensionExcelUpload) o;
        return fpexSeqNo == that.fpexSeqNo && fpexPolcSeqNo == that.fpexPolcSeqNo;
    }

    @Override
    public int hashCode() {
        return Objects.hash(fpexSeqNo, fpexPolcSeqNo);
    }
}
```

- [ ] **Step 2: Compile to verify no errors**

```bash
cd services/life/life-underwriting-service/adapters/surecore/surecore-life-underwriting-adapter
mvn compile -q
```

Expected: `BUILD SUCCESS`

- [ ] **Step 3: Commit**

```bash
git add services/life/life-underwriting-service/adapters/surecore/surecore-life-underwriting-adapter/src/main/java/co/surecore/life/underwriting/entity/life_policy/TUwTmFarmerPensionExcelUpload.java
git commit -m "feat: add TUwTmFarmerPensionExcelUpload entity"
```

---

## Task 3: Create Error Entity

**Files:**
- Create: `services/life/life-underwriting-service/adapters/surecore/surecore-life-underwriting-adapter/src/main/java/co/surecore/life/underwriting/entity/life_policy/TUwTmFarmerPensionExcelUploadError.java`

- [ ] **Step 1: Create the error entity**

```java
package co.surecore.life.underwriting.entity.life_policy;

import co.surecore.life.underwriting.entity.AuditModel;
import co.surecore.life.underwriting.entity.life_policy_draft.LifeTUwTrPolicyDraft;

import javax.persistence.*;
import java.util.Objects;

@Entity
@Table(name = "T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD_ERROR", schema = "SURECORE_LIFE_UW")
public class TUwTmFarmerPensionExcelUploadError extends AuditModel {

    @Id
    @Column(name = "FPEE_SEQ_NO")
    @GeneratedValue(generator = "FarmerPensionExcelErrorSequence")
    @SequenceGenerator(name = "FarmerPensionExcelErrorSequence", schema = "\"SURECORE_LIFE_UW\"",
            sequenceName = "\"T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD_ERROR_FPEE_SEQ_NO_seq\"", allocationSize = 1)
    private long fpeeSeqNo;

    @Column(name = "FPEE_ERROR")
    private String fpeeError;

    @Column(name = "FPEE_ACTION")
    private short fpeeAction;

    @Version
    @Column(name = "VERSION")
    private int version;

    @ManyToOne
    @JoinColumn(name = "FPEE_POLC_SEQ_NO")
    private LifeTUwTrPolicyDraft lifePolicyDraft;

    @ManyToOne
    @JoinColumn(name = "FPEE_FPEX_SEQ_NO")
    private TUwTmFarmerPensionExcelUpload excelUpload;

    public long getFpeeSeqNo() { return fpeeSeqNo; }
    public void setFpeeSeqNo(long fpeeSeqNo) { this.fpeeSeqNo = fpeeSeqNo; }

    public String getFpeeError() { return fpeeError; }
    public void setFpeeError(String fpeeError) { this.fpeeError = fpeeError; }

    public short getFpeeAction() { return fpeeAction; }
    public void setFpeeAction(short fpeeAction) { this.fpeeAction = fpeeAction; }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public LifeTUwTrPolicyDraft getLifePolicyDraft() { return lifePolicyDraft; }
    public void setLifePolicyDraft(LifeTUwTrPolicyDraft lifePolicyDraft) { this.lifePolicyDraft = lifePolicyDraft; }

    public TUwTmFarmerPensionExcelUpload getExcelUpload() { return excelUpload; }
    public void setExcelUpload(TUwTmFarmerPensionExcelUpload excelUpload) { this.excelUpload = excelUpload; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TUwTmFarmerPensionExcelUploadError that = (TUwTmFarmerPensionExcelUploadError) o;
        return fpeeSeqNo == that.fpeeSeqNo && fpeeAction == that.fpeeAction && version == that.version
                && Objects.equals(fpeeError, that.fpeeError);
    }

    @Override
    public int hashCode() {
        return Objects.hash(fpeeSeqNo, fpeeError, fpeeAction, version);
    }
}
```

- [ ] **Step 2: Compile**

```bash
mvn compile -q
```

Expected: `BUILD SUCCESS`

- [ ] **Step 3: Commit**

```bash
git add services/life/life-underwriting-service/adapters/surecore/surecore-life-underwriting-adapter/src/main/java/co/surecore/life/underwriting/entity/life_policy/TUwTmFarmerPensionExcelUploadError.java
git commit -m "feat: add TUwTmFarmerPensionExcelUploadError entity"
```

---

## Task 4: Create Repositories

**Files:**
- Create: `...repository/life_policy/FarmerPensionExcelUploadRepository.java`
- Create: `...repository/life_policy/FarmerPensionExcelErrorRepository.java`

- [ ] **Step 1: Create upload repository**

```java
package co.surecore.life.underwriting.repository.life_policy;

import co.surecore.life.underwriting.entity.life_policy.TUwTmFarmerPensionExcelUpload;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface FarmerPensionExcelUploadRepository extends JpaRepository<TUwTmFarmerPensionExcelUpload, Long> {

    void deleteByFpexPolcSeqNo(long polcSeqNo);

    TUwTmFarmerPensionExcelUpload findByFpexSeqNo(long fpexSeqNo);

    @Query("SELECT u FROM TUwTmFarmerPensionExcelUpload u " +
           "WHERE u.fpexPolcSeqNo = :polcSeqNo " +
           "AND u.fpexSeqNo NOT IN (" +
           "  SELECT e.excelUpload.fpexSeqNo FROM TUwTmFarmerPensionExcelUploadError e " +
           "  WHERE e.lifePolicyDraft.polcSeqNo = :polcSeqNo" +
           ") " +
           "AND (:name = '' OR UPPER(u.fpexModerateName) LIKE %:name%) " +
           "AND (:id = '' OR UPPER(u.fpexModerateId) LIKE %:id%) " +
           "ORDER BY u.fpexRowNumber ASC")
    Page<TUwTmFarmerPensionExcelUpload> searchSuccessRecords(
            @Param("polcSeqNo") long polcSeqNo,
            @Param("name") String name,
            @Param("id") String id,
            Pageable pageable);
}
```

- [ ] **Step 2: Create error repository**

```java
package co.surecore.life.underwriting.repository.life_policy;

import co.surecore.life.underwriting.entity.life_policy.TUwTmFarmerPensionExcelUploadError;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FarmerPensionExcelErrorRepository extends JpaRepository<TUwTmFarmerPensionExcelUploadError, Long> {

    List<TUwTmFarmerPensionExcelUploadError> findByLifePolicyDraft_PolcSeqNo(long polcSeqNo);

    void deleteByLifePolicyDraft_PolcSeqNo(long polcSeqNo);

    TUwTmFarmerPensionExcelUploadError findByFpeeSeqNo(long fpeeSeqNo);

    @Query("SELECT e FROM TUwTmFarmerPensionExcelUploadError e " +
           "JOIN e.excelUpload u " +
           "WHERE e.lifePolicyDraft.polcSeqNo = :polcSeqNo " +
           "AND e.fpeeAction = 1 " +
           "AND (:name = '' OR UPPER(u.fpexModerateName) LIKE %:name%) " +
           "AND (:id = '' OR UPPER(u.fpexModerateId) LIKE %:id%) " +
           "ORDER BY u.fpexRowNumber ASC")
    Page<TUwTmFarmerPensionExcelUploadError> searchErrors(
            @Param("polcSeqNo") long polcSeqNo,
            @Param("name") String name,
            @Param("id") String id,
            Pageable pageable);
}
```

- [ ] **Step 3: Compile**

```bash
mvn compile -q
```

Expected: `BUILD SUCCESS`

- [ ] **Step 4: Commit**

```bash
git add \
  services/life/life-underwriting-service/adapters/surecore/surecore-life-underwriting-adapter/src/main/java/co/surecore/life/underwriting/repository/life_policy/FarmerPensionExcelUploadRepository.java \
  services/life/life-underwriting-service/adapters/surecore/surecore-life-underwriting-adapter/src/main/java/co/surecore/life/underwriting/repository/life_policy/FarmerPensionExcelErrorRepository.java
git commit -m "feat: add Farmer Pension Excel upload repositories"
```

---

## Task 5: Create DTOs

**Files (all in `life-underwriting-base`):**
- Create: `dto/policy_management/policy/FarmerPensionUploadErrorDTO.java`
- Create: `dto/policy_management/policy/FarmerPensionUploadErrorPaginatedDTO.java`
- Create: `dto/policy_management/policy/FarmerPensionUploadSuccessDTO.java`
- Create: `dto/policy_management/policy/FarmerPensionUploadSuccessPaginatedDTO.java`

- [ ] **Step 1: Create FarmerPensionUploadErrorDTO**

```java
package co.surecore.life.underwriting.dto.policy_management.policy;

public class FarmerPensionUploadErrorDTO {
    private Long sequence;
    private Long rowNumber;
    private String policyNo;
    private String moderateName;
    private String errorDescription;
    private Integer action;
    private Integer version;

    public Long getSequence() { return sequence; }
    public void setSequence(Long sequence) { this.sequence = sequence; }

    public Long getRowNumber() { return rowNumber; }
    public void setRowNumber(Long rowNumber) { this.rowNumber = rowNumber; }

    public String getPolicyNo() { return policyNo; }
    public void setPolicyNo(String policyNo) { this.policyNo = policyNo; }

    public String getModerateName() { return moderateName; }
    public void setModerateName(String moderateName) { this.moderateName = moderateName; }

    public String getErrorDescription() { return errorDescription; }
    public void setErrorDescription(String errorDescription) { this.errorDescription = errorDescription; }

    public Integer getAction() { return action; }
    public void setAction(Integer action) { this.action = action; }

    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }
}
```

- [ ] **Step 2: Create FarmerPensionUploadErrorPaginatedDTO**

```java
package co.surecore.life.underwriting.dto.policy_management.policy;

import java.util.List;

public class FarmerPensionUploadErrorPaginatedDTO {
    private List<FarmerPensionUploadErrorDTO> errorList;
    private int numberOfRecords;
    private int numberOfPages;

    public List<FarmerPensionUploadErrorDTO> getErrorList() { return errorList; }
    public void setErrorList(List<FarmerPensionUploadErrorDTO> errorList) { this.errorList = errorList; }

    public int getNumberOfRecords() { return numberOfRecords; }
    public void setNumberOfRecords(int numberOfRecords) { this.numberOfRecords = numberOfRecords; }

    public int getNumberOfPages() { return numberOfPages; }
    public void setNumberOfPages(int numberOfPages) { this.numberOfPages = numberOfPages; }
}
```

- [ ] **Step 3: Create FarmerPensionUploadSuccessDTO**

```java
package co.surecore.life.underwriting.dto.policy_management.policy;

import java.math.BigDecimal;

public class FarmerPensionUploadSuccessDTO {
    private Long rowNumber;
    private String policyNo;
    private String moderateName;
    private String moderateId;
    private BigDecimal preAmount;

    public Long getRowNumber() { return rowNumber; }
    public void setRowNumber(Long rowNumber) { this.rowNumber = rowNumber; }

    public String getPolicyNo() { return policyNo; }
    public void setPolicyNo(String policyNo) { this.policyNo = policyNo; }

    public String getModerateName() { return moderateName; }
    public void setModerateName(String moderateName) { this.moderateName = moderateName; }

    public String getModerateId() { return moderateId; }
    public void setModerateId(String moderateId) { this.moderateId = moderateId; }

    public BigDecimal getPreAmount() { return preAmount; }
    public void setPreAmount(BigDecimal preAmount) { this.preAmount = preAmount; }
}
```

- [ ] **Step 4: Create FarmerPensionUploadSuccessPaginatedDTO**

```java
package co.surecore.life.underwriting.dto.policy_management.policy;

import java.util.List;

public class FarmerPensionUploadSuccessPaginatedDTO {
    private List<FarmerPensionUploadSuccessDTO> successList;
    private int numberOfRecords;
    private int numberOfPages;

    public List<FarmerPensionUploadSuccessDTO> getSuccessList() { return successList; }
    public void setSuccessList(List<FarmerPensionUploadSuccessDTO> successList) { this.successList = successList; }

    public int getNumberOfRecords() { return numberOfRecords; }
    public void setNumberOfRecords(int numberOfRecords) { this.numberOfRecords = numberOfRecords; }

    public int getNumberOfPages() { return numberOfPages; }
    public void setNumberOfPages(int numberOfPages) { this.numberOfPages = numberOfPages; }
}
```

- [ ] **Step 5: Compile base module**

```bash
cd services/life/life-underwriting-service/common/life-underwriting-base
mvn compile -q
```

Expected: `BUILD SUCCESS`

- [ ] **Step 6: Commit**

```bash
git add services/life/life-underwriting-service/common/life-underwriting-base/src/main/java/co/surecore/life/underwriting/dto/policy_management/policy/FarmerPension*.java
git commit -m "feat: add Farmer Pension Excel upload DTOs"
```

---

## Task 6: Create Service Interface

**Files:**
- Create: `services/life/life-underwriting-service/common/life-underwriting-base/src/main/java/co/surecore/life/underwriting/service/policy_management/life_policy/FarmerPensionExcelUploadService.java`

- [ ] **Step 1: Create the interface**

```java
package co.surecore.life.underwriting.service.policy_management.life_policy;

import co.surecore.life.underwriting.dto.policy_management.policy.FarmerPensionUploadErrorDTO;
import co.surecore.life.underwriting.dto.policy_management.policy.FarmerPensionUploadErrorPaginatedDTO;
import co.surecore.life.underwriting.dto.policy_management.policy.FarmerPensionUploadSuccessPaginatedDTO;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletResponse;

public interface FarmerPensionExcelUploadService {

    Long uploadFarmerPensionExcel(Long draftPolicySequence, HttpServletResponse servletResponse, MultipartFile file);

    FarmerPensionUploadErrorPaginatedDTO getExcelErrorList(Long draftPolicySequence, String moderateName, String moderateId, int page, int size);

    Long updateErrorStatus(Long excelUploadErrorSequence, FarmerPensionUploadErrorDTO errorDTO);

    Long confirmUploadFarmerPensionExcel(Long draftPolicySequence);

    Long discardAllErrors(Long draftPolicySequence);

    FarmerPensionUploadSuccessPaginatedDTO getExcelSuccessList(Long draftPolicySequence, String moderateName, String moderateId, int page, int size);
}
```

- [ ] **Step 2: Compile**

```bash
mvn compile -q
```

Expected: `BUILD SUCCESS`

- [ ] **Step 3: Commit**

```bash
git add services/life/life-underwriting-service/common/life-underwriting-base/src/main/java/co/surecore/life/underwriting/service/policy_management/life_policy/FarmerPensionExcelUploadService.java
git commit -m "feat: add FarmerPensionExcelUploadService interface"
```

---

## Task 7: Create Stored Procedure Function Wrapper

**Files:**
- Create: `services/life/life-underwriting-service/adapters/surecore/surecore-life-underwriting-adapter/src/main/java/co/surecore/life/underwriting/function/FarmerPensionExcelUploadService.java`

> **Note:** A new stored procedure `F_LUW_INSERT_FARMER_PENSION_DATA` needs to be written by the DBA team. This Java class is the bridge that calls it. The stored procedure reads from `T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD` and writes validated data to the actual policy tables (and any errors to `T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD_ERROR`). Until the SP is ready, the confirm endpoint can be stubbed.

- [ ] **Step 1: Create the function wrapper**

```java
package co.surecore.life.underwriting.function;

import co.surecore.life.underwriting.exception.FailedOperationException;
import co.surecore.life.underwriting.exception.InvalidDataException;
import org.hibernate.exception.GenericJDBCException;
import org.springframework.stereotype.Service;

import javax.persistence.*;
import java.time.LocalDateTime;

@Service
public class FarmerPensionExcelUploadService {

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Calls stored procedure F_LUW_INSERT_FARMER_PENSION_DATA.
     * The SP reads staged rows from T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD,
     * performs business validation, and writes policies and any errors.
     */
    public Integer uploadFarmerPensionData(Long draftPolicySequence, String userCode) {
        StoredProcedureQuery query = entityManager.createStoredProcedureQuery(
                "\"SURECORE_LIFE_UW\".\"F_LUW_INSERT_FARMER_PENSION_DATA\"");

        query.registerStoredProcedureParameter(1, Long.class, ParameterMode.IN);
        query.registerStoredProcedureParameter(2, String.class, ParameterMode.IN);
        query.registerStoredProcedureParameter(3, LocalDateTime.class, ParameterMode.IN);

        query.setParameter(1, draftPolicySequence);
        query.setParameter(2, userCode);
        query.setParameter(3, LocalDateTime.now());

        try {
            return (Integer) query.getSingleResult();
        } catch (PersistenceException e) {
            String msg = ((GenericJDBCException) e.getCause()).getSQLException().getLocalizedMessage();
            if (msg.contains("ERRORMSG01")) throw new InvalidDataException("Invalid Draft Policy Sequence.");
            if (msg.contains("ERRORMSG02")) throw new InvalidDataException("Default Customer Type is not Defined in the System Parameters.");
            if (msg.contains("ERRORMSG03")) throw new InvalidDataException("Product Definition not Found.");
            if (msg.contains("ERRORMSG04")) throw new InvalidDataException("No Records to Upload.");
            throw new FailedOperationException("Farmer Pension Excel Upload Failed.");
        }
    }
}
```

- [ ] **Step 2: Compile**

```bash
mvn compile -q
```

Expected: `BUILD SUCCESS`

- [ ] **Step 3: Commit**

```bash
git add services/life/life-underwriting-service/adapters/surecore/surecore-life-underwriting-adapter/src/main/java/co/surecore/life/underwriting/function/FarmerPensionExcelUploadService.java
git commit -m "feat: add FarmerPensionExcelUploadService stored procedure wrapper"
```

---

## Task 8: Create Service Implementation

**Files:**
- Create: `services/life/life-underwriting-service/adapters/surecore/surecore-life-underwriting-adapter/src/main/java/co/surecore/life/underwriting/service/policy_management/life_policy/FarmerPensionExcelUploadServiceImpl.java`

- [ ] **Step 1: Create the service implementation**

```java
package co.surecore.life.underwriting.service.policy_management.life_policy;

import co.surecore.life.underwriting.dto.policy_management.policy.*;
import co.surecore.life.underwriting.entity.life_policy.TUwTmFarmerPensionExcelUpload;
import co.surecore.life.underwriting.entity.life_policy.TUwTmFarmerPensionExcelUploadError;
import co.surecore.life.underwriting.exception.*;
import co.surecore.life.underwriting.function.FarmerPensionExcelUploadService;
import co.surecore.life.underwriting.repository.life_policy.FarmerPensionExcelErrorRepository;
import co.surecore.life.underwriting.repository.life_policy.FarmerPensionExcelUploadRepository;
import co.surecore.life.underwriting.service.common.BaseService;
import co.surecore.life.underwriting.service.common.LoginUserCodeService;
import co.surecore.life.underwriting.service.policy_management.life_policy_draft.LifePolicyDraftValidator;
import co.surecore.utils.Messages;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FarmerPensionExcelUploadServiceImpl extends BaseService implements FarmerPensionExcelUploadService {

    @Autowired private FarmerPensionExcelUploadRepository uploadRepository;
    @Autowired private FarmerPensionExcelErrorRepository errorRepository;
    @Autowired private LifePolicyDraftValidator lifePolicyDraftValidator;
    @Autowired private FarmerPensionExcelUploadService farmerPensionExcelUploadService;
    @Autowired private LoginUserCodeService loginUserCodeService;

    @Transactional
    @Override
    public Long uploadFarmerPensionExcel(Long draftPolicySequence, HttpServletResponse servletResponse, MultipartFile file) {
        lifePolicyDraftValidator.validateDraftLifePolicy(draftPolicySequence);
        errorRepository.deleteByLifePolicyDraft_PolcSeqNo(draftPolicySequence);
        uploadRepository.deleteByFpexPolcSeqNo(draftPolicySequence);

        Workbook workbook = validateExcelFile(file);
        readExcelFile(draftPolicySequence, workbook);
        return draftPolicySequence;
    }

    private Workbook validateExcelFile(MultipartFile file) {
        String fileName = file.getOriginalFilename();
        try {
            if (fileName != null && fileName.endsWith(".xlsx")) {
                return new XSSFWorkbook(file.getInputStream());
            } else {
                return new HSSFWorkbook(file.getInputStream());
            }
        } catch (IOException e) {
            throw new InvalidDataException("Invalid File.");
        }
    }

    private void readExcelFile(Long draftPolicySequence, Workbook workbook) {
        Sheet sheet = workbook.getSheetAt(0);
        Iterator<Row> rowIterator = sheet.rowIterator();

        while (rowIterator.hasNext()) {
            Row row = rowIterator.next();
            if (row.getRowNum() == 0) continue; // skip header

            Cell col0 = row.getCell(0);
            if (col0 == null || col0.getCellType() == CellType.BLANK) break;

            TUwTmFarmerPensionExcelUpload entity = new TUwTmFarmerPensionExcelUpload();
            entity.setFpexPolcSeqNo(draftPolicySequence);
            entity.setFpexRowNumber(row.getRowNum());

            Iterator<Cell> cellIterator = row.cellIterator();
            while (cellIterator.hasNext()) {
                Cell cell = cellIterator.next();
                try {
                    switch (cell.getColumnIndex()) {
                        case 0: break; // row index — only used for break check above
                        case 1: break; // Action — ignored
                        case 2: break; // Print Policy — ignored
                        case 3:  entity.setFpexSNo((int) cell.getNumericCellValue()); break;
                        case 4:  entity.setFpexDistrict(stringOrNull(cell)); break;
                        case 5:
                            String policyNo = cellAsString(cell);
                            if (policyNo == null || policyNo.isEmpty())
                                throw new DataNotFoundException("Policy No is Required at row " + row.getRowNum());
                            entity.setFpexPolicyNo(policyNo);
                            break;
                        case 6:  entity.setFpexModerateName(stringOrNull(cell)); break;
                        case 7:  entity.setFpexNameWithInitials(stringOrNull(cell)); break;
                        case 8:  entity.setFpexModerateId(cellAsString(cell)); break;
                        case 9:  entity.setFpexPhone(cellAsString(cell)); break;
                        case 10: entity.setFpexAddress1(stringOrNull(cell)); break;
                        case 11: entity.setFpexAddress2(stringOrNull(cell)); break;
                        case 12: entity.setFpexAddress3(stringOrNull(cell)); break;
                        case 13: entity.setFpexAsc(stringOrNull(cell)); break;
                        case 14: entity.setFpexGnDivision(stringOrNull(cell)); break;
                        case 15:
                            if (cell.getCellType() == CellType.BLANK || cell.getDateCellValue() == null)
                                throw new DataNotFoundException("Date of Birth is Required at row " + row.getRowNum());
                            entity.setFpexDateBirth(cell.getDateCellValue());
                            break;
                        case 16:
                            if (cell.getCellType() == CellType.BLANK || cell.getDateCellValue() == null)
                                throw new DataNotFoundException("Enrolment Date is Required at row " + row.getRowNum());
                            entity.setFpexEnrolmentDate(cell.getDateCellValue());
                            break;
                        case 17: entity.setFpexAge((int) cell.getNumericCellValue()); break;
                        case 18: entity.setFpexGender(stringOrNull(cell)); break;
                        case 19: entity.setFpexCivilStatus(stringOrNull(cell)); break;
                        case 20:
                            if (cell.getCellType() == CellType.NUMERIC)
                                entity.setFpexPreAmount(BigDecimal.valueOf(cell.getNumericCellValue()));
                            break;
                        case 21: break; // 'x' column — ignored
                        case 22: entity.setFpexPremium(stringOrNull(cell)); break;
                        case 23:
                            if (cell.getCellType() == CellType.NUMERIC)
                                entity.setFpexNumberOfPremium((int) cell.getNumericCellValue());
                            break;
                        case 24:
                            if (cell.getCellType() == CellType.NUMERIC)
                                entity.setFpexEndDate(cell.getDateCellValue());
                            break;
                        case 25:
                            if (cell.getCellType() == CellType.NUMERIC)
                                entity.setFpexPensionDate(cell.getDateCellValue());
                            break;
                        case 26:
                            if (cell.getCellType() == CellType.NUMERIC)
                                entity.setFpexPension6063(BigDecimal.valueOf(cell.getNumericCellValue()));
                            break;
                        case 27:
                            if (cell.getCellType() == CellType.NUMERIC)
                                entity.setFpexPension6470(BigDecimal.valueOf(cell.getNumericCellValue()));
                            break;
                        case 28:
                            if (cell.getCellType() == CellType.NUMERIC)
                                entity.setFpexPension7177(BigDecimal.valueOf(cell.getNumericCellValue()));
                            break;
                        case 29:
                            if (cell.getCellType() == CellType.NUMERIC)
                                entity.setFpexPensionMore78(BigDecimal.valueOf(cell.getNumericCellValue()));
                            break;
                        case 30: entity.setFpexBank(stringOrNull(cell)); break;
                        case 31: entity.setFpexBranch(stringOrNull(cell)); break;
                        case 32: entity.setFpexAccNo(cellAsString(cell)); break;
                        case 33: entity.setFpexSpouse(stringOrNull(cell)); break;
                        case 34: entity.setFpexSpouseName(stringOrNull(cell)); break;
                        case 35: entity.setFpexSpouseId(cellAsString(cell)); break;
                        case 36: entity.setFpexSpouseIdDate(stringOrNull(cell)); break;
                        case 37: entity.setFpexAgriStatus(stringOrNull(cell)); break;
                        case 38: entity.setFpexOfficerNameAib(stringOrNull(cell)); break;
                        case 39: entity.setFpexOfficerNameOther(stringOrNull(cell)); break;
                        case 40: entity.setFpexReNo(cellAsString(cell)); break;
                        case 41: entity.setFpexDescription(stringOrNull(cell)); break;
                        case 42: entity.setFpexApprovalHo(stringOrNull(cell)); break;
                        case 43: entity.setFpexApprovalAd(stringOrNull(cell)); break;
                        case 44: entity.setFpexDateTime(stringOrNull(cell)); break;
                        case 45:
                            if (cell.getCellType() == CellType.NUMERIC)
                                entity.setFpexLen((int) cell.getNumericCellValue());
                            break;
                        case 46: break; // null header — ignored
                        default:
                            throw new InvalidDataException("Invalid Cell Data at column: " + cell.getColumnIndex() + " row: " + row.getRowNum());
                    }
                } catch (IllegalStateException e) {
                    throw new InvalidDataException("Invalid Data in Column: " + cell.getColumnIndex() + " Row: " + row.getRowNum() + ": " + e.getLocalizedMessage());
                }
            }
            persistEntity(entity);
        }

        try {
            workbook.close();
        } catch (IOException e) {
            throw new InvalidDataException("Error closing workbook.");
        }
    }

    /**
     * Returns string value for string cells, numeric-as-string for numeric cells, null for blank.
     */
    private String cellAsString(Cell cell) {
        if (cell == null || cell.getCellType() == CellType.BLANK) return null;
        if (cell.getCellType() == CellType.NUMERIC)
            return String.valueOf((long) cell.getNumericCellValue());
        if (cell.getCellType() == CellType.STRING)
            return cell.getStringCellValue();
        return null;
    }

    private String stringOrNull(Cell cell) {
        if (cell == null || cell.getCellType() == CellType.BLANK) return null;
        String val = cell.getStringCellValue();
        return (val == null || val.isEmpty()) ? null : val;
    }

    private TUwTmFarmerPensionExcelUpload persistEntity(TUwTmFarmerPensionExcelUpload entity) {
        try {
            validateEntity(entity);
            return uploadRepository.save(entity);
        } catch (ObjectOptimisticLockingFailureException e) {
            throw new TransactionConflictException(Messages.CONCURRENT_ISSUE);
        }
    }

    @Override
    public FarmerPensionUploadErrorPaginatedDTO getExcelErrorList(Long draftPolicySequence, String moderateName, String moderateId, int page, int size) {
        moderateName = (moderateName == null || moderateName.isEmpty()) ? "" : moderateName.toUpperCase();
        moderateId   = (moderateId == null || moderateId.isEmpty()) ? "" : moderateId.toUpperCase();
        if (page <= 0 || size <= 0) throw new DataNotFoundException("Page and Size are Required.");

        FarmerPensionUploadErrorPaginatedDTO paginatedDTO = new FarmerPensionUploadErrorPaginatedDTO();
        Page<TUwTmFarmerPensionExcelUploadError> errorPage = errorRepository.searchErrors(draftPolicySequence, moderateName, moderateId, PageRequest.of(page - 1, size));
        List<FarmerPensionUploadErrorDTO> errorList = errorPage.stream().map(this::mapErrorToDTO).collect(Collectors.toList());
        paginatedDTO.setErrorList(errorList);
        paginatedDTO.setNumberOfRecords((int) errorPage.getTotalElements());
        paginatedDTO.setNumberOfPages(errorPage.getTotalPages());
        return paginatedDTO;
    }

    private FarmerPensionUploadErrorDTO mapErrorToDTO(TUwTmFarmerPensionExcelUploadError e) {
        TUwTmFarmerPensionExcelUpload upload = uploadRepository.findByFpexSeqNo(e.getExcelUpload().getFpexSeqNo());
        FarmerPensionUploadErrorDTO dto = new FarmerPensionUploadErrorDTO();
        dto.setRowNumber((long) upload.getFpexRowNumber());
        dto.setPolicyNo(upload.getFpexPolicyNo());
        dto.setModerateName(upload.getFpexModerateName());
        dto.setErrorDescription(e.getFpeeError());
        dto.setSequence(e.getFpeeSeqNo());
        dto.setVersion(e.getVersion());
        return dto;
    }

    @Override
    public Long updateErrorStatus(Long excelUploadErrorSequence, FarmerPensionUploadErrorDTO errorDTO) {
        TUwTmFarmerPensionExcelUploadError error = errorRepository.findByFpeeSeqNo(excelUploadErrorSequence);
        if (error == null) throw new InvalidDataException("Invalid Excel Upload Error Sequence.");
        if (errorDTO.getAction() == null) throw new DataNotFoundException("Action is Required.");
        if (errorDTO.getVersion() == null) throw new DataNotFoundException("Version is Required.");
        if (error.getVersion() != errorDTO.getVersion()) throw new TransactionConflictException(Messages.CONCURRENT_ISSUE);
        if (errorDTO.getAction() != 0) throw new InvalidDataException("Invalid Action.");
        error.setFpeeAction((short) 0);
        return errorRepository.save(error).getFpeeSeqNo();
    }

    @Transactional
    @Override
    public Long confirmUploadFarmerPensionExcel(Long draftPolicySequence) {
        lifePolicyDraftValidator.validateDraftLifePolicy(draftPolicySequence);
        farmerPensionExcelUploadService.uploadFarmerPensionData(draftPolicySequence, loginUserCodeService.getLoginUserCode());
        List<TUwTmFarmerPensionExcelUploadError> errors = errorRepository.findByLifePolicyDraft_PolcSeqNo(draftPolicySequence);
        if (!errors.isEmpty()) throw new FailedOperationException("Farmer Pension Excel Upload Failed.");
        return draftPolicySequence;
    }

    @Override
    public Long discardAllErrors(Long draftPolicySequence) {
        lifePolicyDraftValidator.validateDraftLifePolicy(draftPolicySequence);
        List<TUwTmFarmerPensionExcelUploadError> allErrors = errorRepository.findByLifePolicyDraft_PolcSeqNo(draftPolicySequence);
        for (TUwTmFarmerPensionExcelUploadError error : allErrors) {
            FarmerPensionUploadErrorDTO dto = mapErrorToDTO(error);
            dto.setAction(0);
            updateErrorStatus(dto.getSequence(), dto);
        }
        return draftPolicySequence;
    }

    @Override
    public FarmerPensionUploadSuccessPaginatedDTO getExcelSuccessList(Long draftPolicySequence, String moderateName, String moderateId, int page, int size) {
        moderateName = (moderateName == null || moderateName.isEmpty()) ? "" : moderateName.toUpperCase();
        moderateId   = (moderateId == null || moderateId.isEmpty()) ? "" : moderateId.toUpperCase();
        if (page <= 0 || size <= 0) throw new DataNotFoundException("Page and Size are Required.");

        FarmerPensionUploadSuccessPaginatedDTO paginatedDTO = new FarmerPensionUploadSuccessPaginatedDTO();
        Page<TUwTmFarmerPensionExcelUpload> successPage = uploadRepository.searchSuccessRecords(draftPolicySequence, moderateName, moderateId, PageRequest.of(page - 1, size));
        List<FarmerPensionUploadSuccessDTO> successList = successPage.stream().map(u -> {
            FarmerPensionUploadSuccessDTO dto = new FarmerPensionUploadSuccessDTO();
            dto.setRowNumber((long) u.getFpexRowNumber());
            dto.setPolicyNo(u.getFpexPolicyNo());
            dto.setModerateName(u.getFpexModerateName());
            dto.setModerateId(u.getFpexModerateId());
            dto.setPreAmount(u.getFpexPreAmount());
            return dto;
        }).collect(Collectors.toList());
        paginatedDTO.setSuccessList(successList);
        paginatedDTO.setNumberOfRecords((int) successPage.getTotalElements());
        paginatedDTO.setNumberOfPages(successPage.getTotalPages());
        return paginatedDTO;
    }
}
```

- [ ] **Step 2: Compile the adapter module**

```bash
cd services/life/life-underwriting-service/adapters/surecore/surecore-life-underwriting-adapter
mvn compile -q
```

Expected: `BUILD SUCCESS`

- [ ] **Step 3: Commit**

```bash
git add services/life/life-underwriting-service/adapters/surecore/surecore-life-underwriting-adapter/src/main/java/co/surecore/life/underwriting/service/policy_management/life_policy/FarmerPensionExcelUploadServiceImpl.java
git commit -m "feat: add FarmerPensionExcelUploadServiceImpl"
```

---

## Task 9: Create REST Controller

**Files:**
- Create: `services/life/life-underwriting-service/surecore-life-underwriting-service-wrapper/src/main/java/co/surecore/life/underwriting/controller/policy_management/life_policy_draft/FarmerPensionExcelUploadController.java`

- [ ] **Step 1: Create the controller**

```java
package co.surecore.life.underwriting.controller.policy_management.life_policy_draft;

import co.surecore.life.underwriting.dto.policy_management.policy.FarmerPensionUploadErrorDTO;
import co.surecore.life.underwriting.dto.policy_management.policy.FarmerPensionUploadErrorPaginatedDTO;
import co.surecore.life.underwriting.dto.policy_management.policy.FarmerPensionUploadSuccessPaginatedDTO;
import co.surecore.life.underwriting.response.SuccessResponse;
import co.surecore.life.underwriting.response.SuccessResponseHandler;
import co.surecore.life.underwriting.service.policy_management.life_policy.FarmerPensionExcelUploadService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@CrossOrigin
@RestController
@RequestMapping(path = "/life/uw/")
public class FarmerPensionExcelUploadController {

    @Autowired
    private FarmerPensionExcelUploadService farmerPensionExcelUploadService;

    private final ObjectMapper mapper = new ObjectMapper();

    @PostMapping(path = "farmer-pension/{id}/upload")
    public ResponseEntity<SuccessResponse> uploadFarmerPensionExcel(
            @PathVariable Long id,
            HttpServletResponse servletResponse,
            @RequestParam(value = "file") MultipartFile file) {
        Long data = farmerPensionExcelUploadService.uploadFarmerPensionExcel(id, servletResponse, file);
        return SuccessResponseHandler.generateResponse(data);
    }

    @GetMapping(path = "farmer-pension/{id}/errorList")
    public ResponseEntity<SuccessResponse> getExcelErrorList(
            @PathVariable Long id,
            @RequestParam(value = "moderateName", required = false) String moderateName,
            @RequestParam(value = "moderateId", required = false) String moderateId,
            @RequestParam(value = "page") int page,
            @RequestParam(value = "size") int size) {
        FarmerPensionUploadErrorPaginatedDTO data = farmerPensionExcelUploadService.getExcelErrorList(id, moderateName, moderateId, page, size);
        return SuccessResponseHandler.generateResponse(data);
    }

    @PutMapping(path = "farmer-pension/upload/error/{id}/statusChange")
    public ResponseEntity<SuccessResponse> updateErrorStatus(
            @PathVariable Long id,
            @RequestBody String errorJsonString) throws IOException {
        FarmerPensionUploadErrorDTO errorDTO = mapper.readValue(errorJsonString, FarmerPensionUploadErrorDTO.class);
        Long data = farmerPensionExcelUploadService.updateErrorStatus(id, errorDTO);
        return SuccessResponseHandler.generateResponse(data);
    }

    @PostMapping(path = "farmer-pension/{id}/confirmUpload")
    public ResponseEntity<SuccessResponse> confirmUpload(@PathVariable Long id) {
        Long data = farmerPensionExcelUploadService.confirmUploadFarmerPensionExcel(id);
        return SuccessResponseHandler.generateResponse(data);
    }

    @PutMapping(path = "farmer-pension/{id}/upload/error/discardAll")
    public ResponseEntity<SuccessResponse> discardAllErrors(@PathVariable Long id) {
        Long data = farmerPensionExcelUploadService.discardAllErrors(id);
        return SuccessResponseHandler.generateResponse(data);
    }

    @GetMapping(path = "farmer-pension/{id}/successList")
    public ResponseEntity<SuccessResponse> getExcelSuccessList(
            @PathVariable Long id,
            @RequestParam(value = "moderateName", required = false) String moderateName,
            @RequestParam(value = "moderateId", required = false) String moderateId,
            @RequestParam(value = "page") int page,
            @RequestParam(value = "size") int size) {
        FarmerPensionUploadSuccessPaginatedDTO data = farmerPensionExcelUploadService.getExcelSuccessList(id, moderateName, moderateId, page, size);
        return SuccessResponseHandler.generateResponse(data);
    }
}
```

- [ ] **Step 2: Build the full service**

```bash
cd services/life/life-underwriting-service
mvn clean package -DskipTests -q
```

Expected: `BUILD SUCCESS`

- [ ] **Step 3: Commit**

```bash
git add services/life/life-underwriting-service/surecore-life-underwriting-service-wrapper/src/main/java/co/surecore/life/underwriting/controller/policy_management/life_policy_draft/FarmerPensionExcelUploadController.java
git commit -m "feat: add FarmerPensionExcelUploadController REST endpoints"
```

---

## Task 10: Smoke Test via curl

- [ ] **Step 1: Start the service (if not already running)**

```bash
cd services/life/life-underwriting-service/surecore-life-underwriting-service-wrapper
mvn spring-boot:run &
```

- [ ] **Step 2: Upload the Excel file to a known draft policy sequence**

Replace `<DRAFT_POLICY_SEQ>` with a valid sequence from `T_UW_TR_POLICY_DRAFT` (query below to find one).

```bash
psql "postgresql://postgres:password@localhost:5432/SureCoreCAS" -c \
  "SELECT \"POLC_SEQ_NO\" FROM \"SURECORE_LIFE_UW\".\"T_UW_TM_POLICY\" LIMIT 5;"
```

Then upload:

```bash
curl -X POST "http://localhost:8080/life/uw/farmer-pension/<DRAFT_POLICY_SEQ>/upload" \
  -H "PARTY_CODE: ADMIN" \
  -F "file=@/Users/kkwenuja/Downloads/ERP - Tfr Data - Farmer Pension.xlsx"
```

Expected: HTTP 200 with `{"data": <DRAFT_POLICY_SEQ>}`

- [ ] **Step 3: Verify rows are staged**

```bash
psql "postgresql://postgres:password@localhost:5432/SureCoreCAS" -c \
  "SELECT COUNT(*) FROM \"SURECORE_LIFE_UW\".\"T_UW_TM_FARMER_PENSION_EXCEL_UPLOAD\" WHERE \"FPEX_POLC_SEQ_NO\" = <DRAFT_POLICY_SEQ>;"
```

Expected: `7552`

- [ ] **Step 4: Check error list**

```bash
curl "http://localhost:8080/life/uw/farmer-pension/<DRAFT_POLICY_SEQ>/errorList?page=1&size=10" \
  -H "PARTY_CODE: ADMIN"
```

Expected: paginated response (may be empty if no validation errors at staging time)

- [ ] **Step 5: Commit any fixes found during smoke test**

---

## Summary of REST Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/life/uw/farmer-pension/{id}/upload` | Upload Excel file (stages data) |
| `GET` | `/life/uw/farmer-pension/{id}/errorList` | Get validation errors (paginated) |
| `PUT` | `/life/uw/farmer-pension/upload/error/{id}/statusChange` | Dismiss a single error |
| `POST` | `/life/uw/farmer-pension/{id}/confirmUpload` | Trigger stored procedure, create policies |
| `PUT` | `/life/uw/farmer-pension/{id}/upload/error/discardAll` | Dismiss all errors |
| `GET` | `/life/uw/farmer-pension/{id}/successList` | Get successful (error-free) rows |

---

## Open Questions / Prerequisites

1. **Stored procedure `F_LUW_INSERT_FARMER_PENSION_DATA`** — This needs to be written by the DBA/backend team. Until it exists, calling `confirmUpload` will fail with a `FailedOperationException`. The upload (staging) endpoint works independently.

2. **Draft policy FK** — The endpoint takes `{id}` as a draft policy sequence. Confirm which table in `SURECORE_LIFE_UW` is the parent for farmer pension policies (likely `T_UW_TR_POLICY` or `T_UW_TM_POLICY`). Adjust the `@ManyToOne` FK constraint in `Task 1` accordingly.

3. **Column 8 (Moderate ID) and column 32 (Acc_no)** — These are numeric in the sample data but stored as `VARCHAR`. The `cellAsString()` helper handles this by casting the numeric to a long string (e.g., `196823900344` → `"196823900344"`). Confirm this is the desired format.

4. **`PLEX_POLC_SEQ_NO` FK reference** — In the existing error table, `PLEE_POLC_SEQ_NO` references `LifeTUwTrPolicyDraft`. Confirm whether Farmer Pension uses the same draft entity or a different one — adjust the `@ManyToOne` in `TUwTmFarmerPensionExcelUploadError` accordingly.
