# Mock Data Reference — DNS Migration Utility UI

Run `npm run start:mock` to enable the mock backend. All API calls are intercepted in-browser — no server is needed.

---

## Accounts at a Glance

| Account ID  | Validation | Migration  | Notes |
|-------------|------------|------------|-------|
| AC-10045    | ✅ PASSED  | ✅ COMPLETED | First to finish; used in all happy-path demos |
| AC-10046    | ✅ PASSED  | ✅ COMPLETED | Finishes ~1 s after AC-10045 |
| AC-10047    | ❌ FAILED  | ⛔ Blocked  | Fails validation — cannot be migrated |
| AC-10048    | ✅ PASSED  | ❌ FAILED   | Passes validation but fails migration |
| AC-10049    | ✅ PASSED  | ✅ COMPLETED | Completes after AC-10048 fails |
| AC-10050    | ✅ PASSED  | ✅ COMPLETED | Last to finish |
| AC-10057    | ❌ FAILED  | ⛔ Blocked  | Ends in "7" — fails validation rule |
| AC-99997    | ❌ FAILED  | ⛔ Blocked  | Any ID ending in 7 fails validation |
| *(any other)* | ✅ PASSED | ✅ COMPLETED | Default happy-path account |

> **Validation rule:** Any Account ID ending in the digit `7` (e.g. AC-10047, AC-99997) is always rejected with *"Account does not exist in source system."*
>
> **Migration rule:** The specific account `AC-10048` always fails migration with *"Account migration failed during target validation."* All other validated accounts complete successfully.

---

## Batch IDs at a Glance

| Batch ID | Status | Accounts | Log Report Scenario |
|----------|--------|----------|---------------------|
| `1` | PARTIALLY_COMPLETED | 5 completed, 1 failed | AC-10048 fails; rest succeed |
| `2` *(or any unrecognised ID)* | COMPLETED | 6 completed, 0 failed | All accounts succeed |
| `3` | FAILED | 0 completed, 6 failed | All accounts fail — target outage |
| Any ID containing `fail`, `failed`, or `error` | FAILED | 0 completed, 6 failed | Same as batch `3` |
| Any ID containing `partial` | PARTIALLY_COMPLETED | 5 completed, 1 failed | Same as batch `1` |

---

## Scenario 1 — Happy Path (All Pass)

**Goal:** All accounts validate and migrate successfully.

**Account IDs to enter:**
```
AC-10045
AC-10046
AC-10049
AC-10050
```

**Steps:**
1. Go to **Migrate Accounts**.
2. Enter Batch ID: `100` (optional).
3. Paste the four Account IDs above.
4. Click **Validate Accounts** → all four show **Passed**.
5. Click **Proceed to Review (4 Selected)**.
6. Click **Start Migration (4 Accounts)**.
7. Watch the In Progress screen — all accounts move through QUEUED → MIGRATING → COMPLETED within ~6 seconds.
8. Migration Completed screen shows all four as **Completed**.

**Expected Log Report (any account, e.g. AC-10045):**
```
[INFO]  Starting migration for account AC-10045.
[INFO]  Validating account in source system.
[INFO]  Reading source account data.
[INFO]  Preparing migration payload.
[INFO]  Migrating account data to target system.
[INFO]  Validating target data integrity.
[INFO]  Reconciliation complete.
[INFO]  Account migration completed successfully.
```

---

## Scenario 2 — Validation Failure (Mixed)

**Goal:** One account fails validation; the rest proceed.

**Account IDs to enter:**
```
AC-10045
AC-10046
AC-10047
AC-10048
AC-10049
AC-10050
```

**Steps:**
1. Go to **Migrate Accounts**.
2. Enter Batch ID: `1`.
3. Paste all six Account IDs.
4. Click **Validate Accounts**.

**Expected Results:**
| Account ID | Status | Details |
|------------|--------|---------|
| AC-10045   | Passed | Account is eligible for migration. |
| AC-10046   | Passed | Account is eligible for migration. |
| AC-10047   | **Failed** | Account does not exist in source system. |
| AC-10048   | Passed | Account is eligible for migration. |
| AC-10049   | Passed | Account is eligible for migration. |
| AC-10050   | Passed | Account is eligible for migration. |

- Summary banner shows: **Valid 5 / Failed 1**.
- AC-10047 row is highlighted red; its checkbox is disabled and cannot be selected.
- Proceed button shows: **Proceed to Review (5 Selected)**.

---

## Scenario 3 — Migration Failure (AC-10048)

**Goal:** One account fails during migration even though it passed validation.

**Account IDs:**
```
AC-10045
AC-10046
AC-10048
AC-10049
AC-10050
```

**Steps:**
1. Validate (all five pass).
2. Click **Proceed to Review (5 Selected)** → **Start Migration (5 Accounts)**.
3. Watch In Progress — AC-10048 will turn **Failed** while others complete.

**Expected Completed screen:**
| Account ID | Status |
|------------|--------|
| AC-10045   | Completed |
| AC-10046   | Completed |
| AC-10048   | **Failed** |
| AC-10049   | Completed |
| AC-10050   | Completed |

**Expected Log Report for AC-10048 (View Log Report):**
```
[INFO]  Starting migration for account AC-10048.
[INFO]  Validating account in source system.
[INFO]  Reading source account data.
[ERROR] Account migration failed during target validation.
[INFO]  Migration stopped.
```
Status banner on log report page: **Migration Failed** (red).

**Expected Log Report for AC-10045 (successful account):**
```
[INFO]  Starting migration for account AC-10045.
[INFO]  Validating account in source system.
[INFO]  Reading source account data.
[INFO]  Preparing migration payload.
[INFO]  Migrating account data to target system.
[INFO]  Validating target data integrity.
[INFO]  Reconciliation complete.
[INFO]  Account migration completed successfully.
```
Status banner: **Migration Completed** (green).

---

## Scenario 4 — All Validation Failures

**Goal:** Every account fails validation; the Proceed button stays disabled.

**Account IDs:**
```
AC-10047
AC-10057
AC-10037
AC-99997
```

**Steps:**
1. Paste all four IDs.
2. Click **Validate Accounts**.
3. Summary shows **Valid 0 / Failed 4**.
4. All rows are red; **Proceed to Review (0 Selected)** button is disabled.

---

## Scenario 5 — Single Account Deselection

**Goal:** Engineer deselects a valid account before migration.

**Account IDs:**
```
AC-10045
AC-10046
AC-10049
```

**Steps:**
1. Validate — all three pass.
2. Uncheck **AC-10046** in the results table.
3. Button shows **Proceed to Review (2 Selected)**.
4. Review screen shows only AC-10045 and AC-10049.
5. Start migration — only those two accounts appear in the In Progress / Completed views.

---

## Scenario 6 — Search History by Account ID

Navigate to **Search History → By Account ID** tab.

| Account ID to search | Expected Status | Log Report Available |
|----------------------|-----------------|---------------------|
| `AC-10048`           | **Failed**      | Yes — shows ERROR entry |
| `AC-10045`           | Completed       | Yes — shows INFO entries only |
| `AC-10099`           | Completed       | Yes — generic completed log |

**Log Report for AC-10048 (via Search History):**
```
[INFO]  Starting migration for account AC-10048.
[INFO]  Validating account in source system.
[INFO]  Reading source account data.
[ERROR] Account migration failed during target validation.
[INFO]  Migration stopped.
```
Status banner: **Migration Failed** (red).

**Log Report for AC-10045 (via Search History):**
```
[INFO]  Starting migration for account AC-10045.
[INFO]  Validating account in source system.
[INFO]  Reading source account data.
[INFO]  Preparing migration payload.
[INFO]  Migrating account data to target system.
[INFO]  Validating target data integrity.
[INFO]  Reconciliation complete.
[INFO]  Account migration completed successfully.
```
Status banner: **Migration Completed** (green).

---

## Scenario 7 — Search History by Batch ID

Navigate to **Search History → By Batch ID** tab.

### 7a — Completed (All Pass)

**Batch ID to enter:** `2` *(or any unrecognised ID)*

| Field | Value |
|-------|-------|
| Status | **Completed** |
| Total | 6 accounts |
| Completed | 6 |
| Failed | 0 |

**Batch Log Report:**
```
[INFO]    Batch Start       Batch started. 6 accounts queued for migration.
[SUCCESS] Account Processed AC-10045 migrated successfully in 38.2s.
[SUCCESS] Account Processed AC-10046 migrated successfully in 37.2s.
[SUCCESS] Account Processed AC-10049 migrated successfully in 42.2s.
[SUCCESS] Account Processed AC-10050 migrated successfully in 42.2s.
[SUCCESS] Account Processed AC-10051 migrated successfully in 39.7s.
[SUCCESS] Account Processed AC-10052 migrated successfully in 38.5s.
[INFO]    Batch Complete    All 6 accounts migrated successfully.
```
Status banner: **Migration Completed Successfully** (green).

---

### 7b — Partially Completed (1 Failure)

**Batch ID to enter:** `1` *(or any ID containing "partial")*

| Field | Value |
|-------|-------|
| Status | **Partially Completed** |
| Total | 6 accounts |
| Completed | 5 |
| Failed | 1 (AC-10048) |

**Batch Log Report:**
```
[INFO]    Batch Start       Batch started. 6 accounts queued for migration.
[SUCCESS] Account Processed AC-10045 migrated successfully in 45.3s.
[SUCCESS] Account Processed AC-10046 migrated successfully in 38.7s.
[ERROR]   Account Processed AC-10048 failed and was rolled back after 2m 5s.
[SUCCESS] Account Processed AC-10049 migrated successfully in 52.1s.
[SUCCESS] Account Processed AC-10050 migrated successfully in 41.8s.
[WARN]    Batch Complete    5 accounts migrated successfully, 1 requires attention.
```
Status banner: **Partially Completed** (amber).

---

### 7c — Failed (All Accounts Failed)

**Batch ID to enter:** `3`, `fail`, `failed`, or any ID containing "error"

| Field | Value |
|-------|-------|
| Status | **Failed** |
| Total | 6 accounts |
| Completed | 0 |
| Failed | 6 |

Simulates a target-system outage that caused every account to be rejected and rolled back.

**Batch Log Report:**
```
[INFO]     Batch Start       Batch started. 6 accounts queued for migration.
[ERROR]    Account Processed AC-10045 failed after 31.0s — target system rejected payload. Rolled back.
[ERROR]    Account Processed AC-10046 failed after 27.4s — target system rejected payload. Rolled back.
[WARN]     Account Processed Failure pattern detected. Remaining accounts likely to fail.
[ERROR]    Account Processed AC-10048 failed after 27.7s — target system rejected payload. Rolled back.
[ERROR]    Account Processed AC-10049 failed after 29.3s — target system rejected payload. Rolled back.
[ERROR]    Account Processed AC-10050 failed after 28.5s — target system rejected payload. Rolled back.
[ERROR]    Account Processed AC-10051 failed after 27.4s — target system rejected payload. Rolled back.
[CRITICAL] Batch Complete    All 6 accounts failed — target system may be unavailable.
```
Status banner: **Migration Failed** (red).

---

## Scenario 8 — Dashboard Recent Migrations (Mock Mode)

When running with `npm run start:mock`, the Dashboard **Recent Migrations** table shows:

| Account ID | Status |
|------------|--------|
| AC-10045   | Completed |
| AC-10046   | In Progress |
| AC-10047   | Failed |
| AC-10048   | Completed |

> When running with `npm start` (real backend), the Dashboard shows a yellow notice:
> *"Endpoint not available in current API contract. Suggested: `GET /api/v1/migrations/recent`"*

---

## Log Report — Level Summary

| Level | Color | Meaning |
|-------|-------|---------|
| INFO  | Blue badge | Normal operation step |
| WARN  | Amber badge | Non-fatal issue (not currently generated by mock) |
| ERROR | Red badge, red row highlight | Step that caused failure |

---

## Status Badge Reference

| Status | Color | Where it appears |
|--------|-------|-----------------|
| Passed | Green | Validation results |
| Failed | Red | Validation results, migration completed, history |
| Completed | Green | Migration completed, history |
| In Progress | Blue | Migration in progress, dashboard |
| Pending | Gray | Migration in progress (queued accounts) |
| Partially Completed | Amber | Batch history search |

---

## Migration Timing (In Progress screen)

Accounts transition through states on a staggered schedule after **Start Migration** is clicked:

| Time after start | Account state |
|------------------|---------------|
| 0 – 1.5 s | All accounts: QUEUED (shown as **Pending**) |
| 1.5 – 2 s | All accounts: MIGRATING (shown as **In Progress**) |
| ~2 s | Account[0] → COMPLETED |
| ~3.2 s | Account[1] → COMPLETED |
| ~4.4 s | Account[2] → COMPLETED or FAILED (AC-10048) |
| ~5.6 s | Account[3] → COMPLETED |
| ~6.8 s | Account[4] → COMPLETED |

The UI polls every **3 seconds**. After all accounts reach a terminal state (COMPLETED or FAILED), the view automatically advances to the **Migration Completed** screen after a 500 ms delay.

---

## Suggested Missing API Endpoint

The Dashboard requires a recent-migrations feed that is **not in the current API contract**:

```
GET /api/v1/migrations/recent
```

**Suggested response:**
```json
{
  "accounts": [
    { "accountId": "AC-10045", "status": "COMPLETED" },
    { "accountId": "AC-10046", "status": "IN_PROGRESS" },
    { "accountId": "AC-10047", "status": "FAILED" },
    { "accountId": "AC-10048", "status": "COMPLETED" }
  ]
}
```

This endpoint should return the N most recently processed accounts with their final status, ordered by recency descending.

---

## Quick Test Checklist

- [ ] Happy-path: 4 valid accounts → all Completed → download log report
- [ ] Mixed validation: AC-10045–AC-10050 → AC-10047 fails, rest proceed
- [ ] Migration failure: include AC-10048 → appears as Failed in Completed screen
- [ ] Deselect valid account before migration → excluded from results
- [ ] All-fail validation: enter only IDs ending in 7 → Proceed button disabled
- [ ] History by Account ID: `AC-10048` → Failed status + red log
- [ ] History by Account ID: `AC-10045` → Completed status + green log
- [ ] History by Batch ID: `2` → Completed + all-success batch log (green banner)
- [ ] History by Batch ID: `1` → Partially Completed + batch log with ERROR line (amber banner)
- [ ] History by Batch ID: `3` → Failed + all-failed batch log with CRITICAL entry (red banner)
- [ ] Download log report from Completed screen
- [ ] Download log report from Search History
- [ ] Dashboard Recent Migrations visible in mock mode
- [ ] Dashboard shows suggested-endpoint notice in real-backend mode
