import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, delay } from 'rxjs';
import { environment } from '../../../environments/environment';

interface MockJob {
  migrationJobId: string;
  batchId?: string;
  accountIds: string[];
  startTime: number;
}

const jobs: Record<string, MockJob> = {};
let jobCounter = 1;

function rnd(): number {
  return Math.floor(Math.random() * 300) + 300;
}

function accountFails(id: string): boolean {
  return id === 'AC-10048';
}

function getAccountStatus(
  accountId: string,
  index: number,
  elapsed: number,
): {
  status: string;
  errorCode?: string;
  errorMessage?: string;
} {
  const completionTime = 2 + index * 1.2;
  // Each account starts processing only after the previous one finishes.
  // index 0 starts at 1.5 s; index N starts when index N-1 completes.
  const startTime = index === 0 ? 1.5 : 2 + (index - 1) * 1.2;

  if (elapsed < startTime) return { status: 'QUEUED' };
  if (elapsed < completionTime) return { status: 'MIGRATING' };
  if (accountFails(accountId)) {
    return {
      status: 'FAILED',
      errorCode: 'ACCOUNT_MIGRATION_FAILED',
      errorMessage: 'Account migration failed during target validation.',
    };
  }
  return { status: 'COMPLETED' };
}

function computeOverallStatus(statuses: string[]): string {
  const active = ['QUEUED', 'MIGRATING', 'RETRYING', 'IN_PROGRESS', 'PENDING'];
  if (statuses.some((s) => active.includes(s))) return 'IN_PROGRESS';
  if (statuses.every((s) => s === 'COMPLETED')) return 'COMPLETED';
  if (statuses.every((s) => s === 'FAILED')) return 'FAILED';
  return 'PARTIALLY_COMPLETED';
}

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMockApi) return next(req);

  const url = req.url;
  const method = req.method;

  // GET /migrations/recent  (dashboard: top 5, sorted IN_PROGRESS → COMPLETED → FAILED → PARTIALLY_COMPLETED)
  if (method === 'GET' && url.includes('/migrations/recent')) {
    return of(
      new HttpResponse({
        status: 200,
        body: {
          migrations: [
            {
              accountId: 'AC-10046',
              batchId: 'BATCH-001',
              status: 'IN_PROGRESS',
              startedAt: '2026-09-30T14:18:00Z',
              completedAt: undefined,
              logReportAvailable: false,
              migrationJobId: 'MIG-HIST-OK-001',
            },
            {
              accountId: 'AC-10045',
              batchId: 'BATCH-001',
              status: 'COMPLETED',
              startedAt: '2026-09-30T14:20:00Z',
              completedAt: '2026-09-30T14:35:00Z',
              logReportAvailable: true,
              migrationJobId: 'MIG-HIST-OK-001',
            },
            {
              accountId: 'AC-10048',
              batchId: 'BATCH-002',
              status: 'COMPLETED',
              startedAt: '2026-09-30T13:55:00Z',
              completedAt: '2026-09-30T14:10:00Z',
              logReportAvailable: true,
              migrationJobId: 'MIG-HIST-OK-001',
            },
            {
              accountId: 'AC-10047',
              batchId: 'BATCH-001',
              status: 'FAILED',
              startedAt: '2026-09-30T14:15:00Z',
              completedAt: '2026-09-30T14:17:00Z',
              logReportAvailable: true,
              migrationJobId: 'MIG-HIST-FAILED-001',
            },
            {
              accountId: 'AC-10049',
              batchId: 'BATCH-002',
              status: 'PARTIALLY_COMPLETED',
              startedAt: '2026-09-30T13:50:00Z',
              completedAt: '2026-09-30T14:05:00Z',
              logReportAvailable: true,
              migrationJobId: 'MIG-HIST-BATCH-001',
            },
          ],
        },
      }),
    ).pipe(delay(rnd()));
  }

  // POST /migrations/validate
  if (method === 'POST' && url.includes('/migrations/validate')) {
    const body = req.body as { supportUserName?: string; batchId?: string; accountIds: string[] };
    const accounts = body.accountIds.map((id) => {
      const notFound = id === 'AC-10047' || id.endsWith('7');
      const alreadyMigrated = !notFound && id.endsWith('9');
      const fail = notFound || alreadyMigrated;
      return {
        accountId: id,
        validationStatus: fail ? 'FAILED' : 'PASSED',
        validationDetails: notFound
          ? 'Account does not exist in source system.'
          : alreadyMigrated
            ? 'Account has already been migrated to the target system.'
            : 'Account is eligible for migration.',
      };
    });
    const validCount = accounts.filter((a) => a.validationStatus === 'PASSED').length;
    return of(
      new HttpResponse({
        status: 200,
        body: {
          batchId: body.batchId,
          totalAccountCount: accounts.length,
          validAccountCount: validCount,
          invalidAccountCount: accounts.length - validCount,
          accounts,
        },
      }),
    ).pipe(delay(rnd()));
  }

  // POST /migrations  (start migration)
  if (method === 'POST' && /\/migrations$/.test(url)) {
    const body = req.body as { supportUserName?: string; batchId?: string; accountIds: string[] };
    const jobId = `MIG-${Date.now()}-${String(jobCounter++).padStart(6, '0')}`;
    jobs[jobId] = {
      migrationJobId: jobId,
      batchId: body.batchId,
      accountIds: body.accountIds,
      startTime: Date.now(),
    };
    return of(
      new HttpResponse({
        status: 202,
        body: {
          migrationJobId: jobId,
          batchId: body.batchId,
          accountIds: body.accountIds,
          status: 'IN_PROGRESS',
        },
      }),
    ).pipe(delay(rnd()));
  }

  // GET /migrations/history/accounts/:accountId
  const histAccMatch = url.match(/\/migrations\/history\/accounts\/([^/?]+)/);
  if (method === 'GET' && histAccMatch) {
    const accountId = histAccMatch[1];
    const isFailed = accountId === 'AC-10048';
    return of(
      new HttpResponse({
        status: 200,
        body: {
          accountId,
          migrations: [
            {
              status: isFailed ? 'FAILED' : 'COMPLETED',
              batchId: 'BATCH-001',
              startedAt: '2026-09-30T14:15:00Z',
              completedAt: isFailed ? '2026-09-30T14:17:00Z' : '2026-09-30T14:35:00Z',
              logReportAvailable: true,
              migrationJobId: isFailed ? 'MIG-HIST-FAILED-001' : 'MIG-HIST-OK-001',
            },
          ],
        },
      }),
    ).pipe(delay(rnd()));
  }

  // GET /migrations/history/batches/:batchId
  const histBatchMatch = url.match(/\/migrations\/history\/batches\/([^/?]+)/);
  if (method === 'GET' && histBatchMatch) {
    const batchId = histBatchMatch[1];
    const lower = batchId.toLowerCase();

    let batchStatus: string;
    let batchJobId: string;
    let completedCount: number;
    let failedCount: number;
    const totalCount = 6;

    if (batchId === '1' || lower.includes('partial')) {
      // Scenario: partially completed — 5 passed, 1 failed
      batchStatus = 'PARTIALLY_COMPLETED';
      batchJobId = 'MIG-HIST-BATCH-PARTIAL-001';
      completedCount = 5;
      failedCount = 1;
    } else if (
      batchId === '3' ||
      lower === 'fail' ||
      lower === 'failed' ||
      lower.includes('error')
    ) {
      // Scenario: all accounts failed (e.g. upstream outage)
      batchStatus = 'FAILED';
      batchJobId = 'MIG-HIST-BATCH-FAILED-001';
      completedCount = 0;
      failedCount = 6;
    } else {
      // Scenario: fully completed — batch '2' or any other ID
      batchStatus = 'COMPLETED';
      batchJobId = 'MIG-HIST-BATCH-COMPLETED-001';
      completedCount = 6;
      failedCount = 0;
    }

    return of(
      new HttpResponse({
        status: 200,
        body: {
          batchId,
          status: batchStatus,
          startedAt: '2026-09-30T13:50:00Z',
          completedAt: '2026-09-30T14:05:00Z',
          totalAccountCount: totalCount,
          completedAccountCount: completedCount,
          failedAccountCount: failedCount,
          logReportAvailable: true,
          migrationJobId: batchJobId,
        },
      }),
    ).pipe(delay(rnd()));
  }

  // GET /migrations/:jobId/accounts/:accountId/logs
  const accLogsMatch = url.match(/\/migrations\/([^/]+)\/accounts\/([^/]+)\/logs/);
  if (method === 'GET' && accLogsMatch) {
    const [, jobId, accountId] = accLogsMatch;
    const job = jobs[jobId];
    const base = job ? job.startTime : Date.now() - 120_000;
    const t = (ms: number) => new Date(base + ms).toISOString();
    const isFailed = accountId === 'AC-10048';
    const accountStartedAt = t(0);
    const accountCompletedAt = isFailed ? t(5_100) : t(7_500);
    const accountDurationMs = isFailed ? 5_100 : 7_500;
    const successEntries = [
      {
        timestamp: t(0),
        level: 'INFO',
        stage: 'Account Start',
        outcome: 'success',
        status: 'QUEUED',
        support_message: `Migration started for account ${accountId}.`,
      },
      {
        timestamp: t(214),
        level: 'INFO',
        stage: 'Validate Account Data',
        outcome: 'success',
        status: 'VALIDATED',
        support_message: 'Account data passed all checks and is ready to migrate.',
      },
      {
        timestamp: t(430),
        level: 'INFO',
        stage: 'Claim Account',
        outcome: 'success',
        status: 'CLAIMED',
        support_message:
          "The customer's write access is now paused while migration continues. Reads still work normally.",
      },
      {
        timestamp: t(1_200),
        level: 'SUCCESS',
        stage: 'Create OneLogin Account',
        outcome: 'success',
        status: 'ONELOGIN_ACCOUNT_CREATED',
        support_message: 'The account identity was created in OneLogin successfully.',
      },
      {
        timestamp: t(2_100),
        level: 'SUCCESS',
        stage: 'Create OneLogin Users',
        outcome: 'success',
        status: 'ONELOGIN_USERS_CREATED',
        support_message: 'All users were created successfully under this account.',
      },
      {
        timestamp: t(3_000),
        level: 'SUCCESS',
        stage: 'Register Entitlements with Ecomm',
        outcome: 'success',
        status: 'ECOMM_REGISTERED',
        support_message:
          "The account's subscription and entitlements were registered with Ecomm successfully.",
      },
      {
        timestamp: t(4_100),
        level: 'SUCCESS',
        stage: 'Publish Account to EPS',
        outcome: 'success',
        status: 'UNIFIED_ACCOUNT_PUBLISHED',
        support_message: 'The account is now visible to the Unified DNS platform.',
      },
      {
        timestamp: t(5_200),
        level: 'SUCCESS',
        stage: 'Publish Users to EPS',
        outcome: 'success',
        status: 'UNIFIED_USERS_PUBLISHED',
        support_message: 'All users are now visible to the Unified DNS platform.',
      },
      {
        timestamp: t(6_800),
        level: 'SUCCESS',
        stage: 'Provision Service User',
        outcome: 'success',
        status: 'SERVICE_USER_CREATED',
        support_message:
          'The credential the proxy will use for this account was created successfully.',
      },
      {
        timestamp: t(7_500),
        level: 'SUCCESS',
        stage: 'Store Credentials',
        outcome: 'success',
        status: 'READY_FOR_ZONES',
        support_message:
          'Migration is complete for this account. It is now ready for zone and record migration.',
      },
    ];
    const failedEntries = [
      {
        timestamp: t(0),
        level: 'INFO',
        stage: 'Account Start',
        outcome: 'success',
        status: 'QUEUED',
        support_message: `Migration started for account ${accountId}.`,
      },
      {
        timestamp: t(214),
        level: 'INFO',
        stage: 'Validate Account Data',
        outcome: 'success',
        status: 'VALIDATED',
        support_message: 'Account data passed all checks and is ready to migrate.',
      },
      {
        timestamp: t(430),
        level: 'INFO',
        stage: 'Claim Account',
        outcome: 'success',
        status: 'CLAIMED',
        support_message:
          "The customer's write access is now paused while migration continues. Reads still work normally.",
      },
      {
        timestamp: t(1_200),
        level: 'SUCCESS',
        stage: 'Create OneLogin Account',
        outcome: 'success',
        status: 'ONELOGIN_ACCOUNT_CREATED',
        support_message: 'The account identity was created in OneLogin successfully.',
      },
      {
        timestamp: t(2_100),
        level: 'SUCCESS',
        stage: 'Create OneLogin Users',
        outcome: 'success',
        status: 'ONELOGIN_USERS_CREATED',
        support_message: 'All users were created successfully under this account.',
      },
      {
        timestamp: t(3_000),
        level: 'SUCCESS',
        stage: 'Register Entitlements with Ecomm',
        outcome: 'success',
        status: 'ECOMM_REGISTERED',
        support_message:
          "The account's subscription and entitlements were registered with Ecomm successfully.",
      },
      {
        timestamp: t(4_100),
        level: 'SUCCESS',
        stage: 'Publish Account to EPS',
        outcome: 'success',
        status: 'UNIFIED_ACCOUNT_PUBLISHED',
        support_message: 'The account is now visible to the Unified DNS platform.',
      },
      {
        timestamp: t(5_000),
        level: 'ERROR',
        stage: 'Publish User to EPS',
        outcome: 'failure',
        status: 'FAILED',
        support_message:
          'This user could not be added, most likely because their username is already used elsewhere in this migration. The account itself was not affected.',
      },
      {
        timestamp: t(5_100),
        level: 'INFO',
        stage: 'Rollback — Release Customer',
        outcome: 'success',
        status: 'ROLLED_BACK',
        support_message:
          "The customer's write access has been restored to normal service while this is investigated.",
      },
    ];
    return of(
      new HttpResponse({
        status: 200,
        body: {
          migrationJobId: jobId,
          accountId,
          status: isFailed ? 'FAILED' : 'COMPLETED',
          account_started_at: accountStartedAt,
          account_completed_at: accountCompletedAt,
          account_duration_ms: accountDurationMs,
          entries: isFailed ? failedEntries : successEntries,
        },
      }),
    ).pipe(delay(rnd()));
  }

  // GET /migrations/:jobId/logs
  const jobLogsMatch = url.match(/\/migrations\/([^/]+)\/logs$/);
  if (method === 'GET' && jobLogsMatch) {
    const [, jobId] = jobLogsMatch;
    const job = jobs[jobId];
    const base = job ? job.startTime : Date.now() - 300_000;
    const t = (ms: number) => new Date(base + ms).toISOString();
    const batchId = job?.batchId ?? jobId;

    // Determine scenario from job ID or live job state
    const isAllFailed = jobId.includes('BATCH-FAILED') || jobId.includes('HIST-FAILED');
    const isPartial =
      jobId.includes('BATCH-PARTIAL') || (!!job && job.accountIds.includes('AC-10048'));

    const batchStatus = isAllFailed ? 'FAILED' : isPartial ? 'PARTIALLY_COMPLETED' : 'COMPLETED';

    // Scenario A — all accounts completed successfully
    const completedEntries = [
      {
        timestamp: t(0),
        level: 'INFO',
        stage: 'Batch Start',
        outcome: 'success',
        status: 'IN_PROGRESS',
        support_message: `Batch ${batchId} has started. 6 accounts queued for migration.`,
      },
      {
        timestamp: t(38_200),
        level: 'SUCCESS',
        stage: 'Account Processed',
        outcome: 'success',
        status: 'READY_FOR_ZONES',
        support_message: 'Account AC-10045 migrated successfully in 38.2s.',
      },
      {
        timestamp: t(75_400),
        level: 'SUCCESS',
        stage: 'Account Processed',
        outcome: 'success',
        status: 'READY_FOR_ZONES',
        support_message: 'Account AC-10046 migrated successfully in 37.2s.',
      },
      {
        timestamp: t(117_600),
        level: 'SUCCESS',
        stage: 'Account Processed',
        outcome: 'success',
        status: 'READY_FOR_ZONES',
        support_message: 'Account AC-10049 migrated successfully in 42.2s.',
      },
      {
        timestamp: t(159_800),
        level: 'SUCCESS',
        stage: 'Account Processed',
        outcome: 'success',
        status: 'READY_FOR_ZONES',
        support_message: 'Account AC-10050 migrated successfully in 42.2s.',
      },
      {
        timestamp: t(199_500),
        level: 'SUCCESS',
        stage: 'Account Processed',
        outcome: 'success',
        status: 'READY_FOR_ZONES',
        support_message: 'Account AC-10051 migrated successfully in 39.7s.',
      },
      {
        timestamp: t(238_000),
        level: 'SUCCESS',
        stage: 'Account Processed',
        outcome: 'success',
        status: 'READY_FOR_ZONES',
        support_message: 'Account AC-10052 migrated successfully in 38.5s.',
      },
      {
        timestamp: t(240_000),
        level: 'INFO',
        stage: 'Batch Complete',
        outcome: 'success',
        status: 'COMPLETED',
        support_message: 'Batch completed in 4m 00s. All 6 accounts migrated successfully.',
      },
    ];

    // Scenario B — 1 account failed, rest succeeded (partial)
    const partialEntries = [
      {
        timestamp: t(0),
        level: 'INFO',
        stage: 'Batch Start',
        outcome: 'success',
        status: 'IN_PROGRESS',
        support_message: `Batch ${batchId} has started. 6 accounts queued for migration.`,
      },
      {
        timestamp: t(45_000),
        level: 'SUCCESS',
        stage: 'Account Processed',
        outcome: 'success',
        status: 'READY_FOR_ZONES',
        support_message: 'Account AC-10045 migrated successfully in 45.3s.',
      },
      {
        timestamp: t(83_700),
        level: 'SUCCESS',
        stage: 'Account Processed',
        outcome: 'success',
        status: 'READY_FOR_ZONES',
        support_message: 'Account AC-10046 migrated successfully in 38.7s.',
      },
      {
        timestamp: t(125_000),
        level: 'ERROR',
        stage: 'Account Processed',
        outcome: 'failure',
        status: 'FAILED',
        support_message:
          "Account AC-10048 failed and was rolled back after 2m 5s. The customer's write access has been restored.",
      },
      {
        timestamp: t(177_100),
        level: 'SUCCESS',
        stage: 'Account Processed',
        outcome: 'success',
        status: 'READY_FOR_ZONES',
        support_message: 'Account AC-10049 migrated successfully in 52.1s.',
      },
      {
        timestamp: t(219_000),
        level: 'SUCCESS',
        stage: 'Account Processed',
        outcome: 'success',
        status: 'READY_FOR_ZONES',
        support_message: 'Account AC-10050 migrated successfully in 41.8s.',
      },
      {
        timestamp: t(277_000),
        level: 'WARN',
        stage: 'Batch Complete',
        outcome: 'recorded',
        status: 'PARTIALLY_COMPLETED',
        support_message:
          'Batch completed in 4m 37s. 5 accounts migrated successfully, 1 requires attention.',
      },
    ];

    // Scenario C — all accounts failed (e.g. upstream target outage)
    const failedEntries = [
      {
        timestamp: t(0),
        level: 'INFO',
        stage: 'Batch Start',
        outcome: 'success',
        status: 'IN_PROGRESS',
        support_message: `Batch ${batchId} has started. 6 accounts queued for migration.`,
      },
      {
        timestamp: t(31_000),
        level: 'ERROR',
        stage: 'Account Processed',
        outcome: 'failure',
        status: 'FAILED',
        support_message:
          'Account AC-10045 failed after 31.0s — target system rejected the account payload. Rolled back.',
      },
      {
        timestamp: t(58_400),
        level: 'ERROR',
        stage: 'Account Processed',
        outcome: 'failure',
        status: 'FAILED',
        support_message:
          'Account AC-10046 failed after 27.4s — target system rejected the account payload. Rolled back.',
      },
      {
        timestamp: t(84_200),
        level: 'WARN',
        stage: 'Account Processed',
        outcome: 'recorded',
        status: 'FAILED',
        support_message:
          'Failure pattern detected. Continuing batch but all remaining accounts are likely to fail.',
      },
      {
        timestamp: t(111_900),
        level: 'ERROR',
        stage: 'Account Processed',
        outcome: 'failure',
        status: 'FAILED',
        support_message:
          'Account AC-10048 failed after 27.7s — target system rejected the account payload. Rolled back.',
      },
      {
        timestamp: t(141_200),
        level: 'ERROR',
        stage: 'Account Processed',
        outcome: 'failure',
        status: 'FAILED',
        support_message:
          'Account AC-10049 failed after 29.3s — target system rejected the account payload. Rolled back.',
      },
      {
        timestamp: t(169_700),
        level: 'ERROR',
        stage: 'Account Processed',
        outcome: 'failure',
        status: 'FAILED',
        support_message:
          'Account AC-10050 failed after 28.5s — target system rejected the account payload. Rolled back.',
      },
      {
        timestamp: t(197_100),
        level: 'ERROR',
        stage: 'Account Processed',
        outcome: 'failure',
        status: 'FAILED',
        support_message:
          'Account AC-10051 failed after 27.4s — target system rejected the account payload. Rolled back.',
      },
      {
        timestamp: t(200_000),
        level: 'CRITICAL',
        stage: 'Batch Complete',
        outcome: 'failure',
        status: 'FAILED',
        support_message:
          'Batch aborted. All 6 accounts failed — target system may be unavailable. All customer write access has been restored. Investigate target connectivity before retrying.',
      },
    ];

    const batchDurationMs = isAllFailed ? 200_000 : isPartial ? 277_000 : 240_000;
    const entries = isAllFailed ? failedEntries : isPartial ? partialEntries : completedEntries;
    const totalAccounts = 6;
    const succeededAccounts = isAllFailed ? 0 : isPartial ? 5 : 6;
    const failedAccounts = isAllFailed ? 6 : isPartial ? 1 : 0;

    return of(
      new HttpResponse({
        status: 200,
        body: {
          migrationJobId: jobId,
          batchId,
          status: batchStatus,
          logReportAvailable: true,
          batch_started_at: t(0),
          batch_completed_at: t(batchDurationMs),
          batch_duration_ms: batchDurationMs,
          total_account_count: totalAccounts,
          completed_account_count: succeededAccounts,
          failed_account_count: failedAccounts,
          entries,
        },
      }),
    ).pipe(delay(rnd()));
  }

  // GET /migrations/:jobId/accounts/:accountId  (single account status)
  const singleAccMatch = url.match(/\/migrations\/([^/]+)\/accounts\/([^/]+)$/);
  if (method === 'GET' && singleAccMatch) {
    const [, jobId, accountId] = singleAccMatch;
    const job = jobs[jobId];
    const elapsed = job ? (Date.now() - job.startTime) / 1000 : 999;
    const idx = job?.accountIds.indexOf(accountId) ?? 0;
    const { status, errorCode, errorMessage } = getAccountStatus(accountId, idx, elapsed);
    return of(
      new HttpResponse({
        status: 200,
        body: {
          migrationJobId: jobId,
          accountId,
          status,
          currentStage:
            status === 'COMPLETED'
              ? 'COMPLETED'
              : status === 'FAILED'
                ? 'VALIDATING_TARGET'
                : 'MIGRATING_ACCOUNT',
          errorCode,
          errorMessage,
        },
      }),
    ).pipe(delay(rnd()));
  }

  // GET /migrations/:jobId/accounts  (all account statuses)
  const accListMatch = url.match(/\/migrations\/([^/]+)\/accounts$/);
  if (method === 'GET' && accListMatch) {
    const [, jobId] = accListMatch;
    const job = jobs[jobId];
    const elapsed = job ? (Date.now() - job.startTime) / 1000 : 999;
    const accounts = (job?.accountIds ?? []).map((id, idx) => {
      const { status, errorCode, errorMessage } = getAccountStatus(id, idx, elapsed);
      const accStartOffset = idx === 0 ? 1.5 : 2 + (idx - 1) * 1.2;
      const accEndOffset = 2 + idx * 1.2;
      const startedAt = job
        ? new Date(job.startTime + accStartOffset * 1000).toISOString()
        : undefined;
      const done = status === 'COMPLETED' || status === 'FAILED';
      const completedAt =
        done && job ? new Date(job.startTime + accEndOffset * 1000).toISOString() : undefined;
      return {
        accountId: id,
        batchId: job?.batchId,
        status,
        startedAt,
        completedAt,
        errorCode,
        errorMessage,
      };
    });
    return of(
      new HttpResponse({
        status: 200,
        body: { migrationJobId: jobId, batchId: job?.batchId, accounts },
      }),
    ).pipe(delay(rnd()));
  }

  // GET /migrations/:jobId  (overall job status)
  const jobStatusMatch = url.match(/\/migrations\/([^/]+)$/);
  if (method === 'GET' && jobStatusMatch) {
    const [, jobId] = jobStatusMatch;
    const job = jobs[jobId];
    const elapsed = job ? (Date.now() - job.startTime) / 1000 : 999;
    const statuses = (job?.accountIds ?? []).map(
      (id, idx) => getAccountStatus(id, idx, elapsed).status,
    );
    return of(
      new HttpResponse({
        status: 200,
        body: {
          migrationJobId: jobId,
          batchId: job?.batchId,
          status: computeOverallStatus(statuses),
          requestedAccountCount: statuses.length,
          completedAccountCount: statuses.filter((s) => s === 'COMPLETED').length,
          failedAccountCount: statuses.filter((s) => s === 'FAILED').length,
          inProgressAccountCount: statuses.filter((s) => ['MIGRATING', 'RETRYING'].includes(s))
            .length,
          pendingAccountCount: statuses.filter((s) => ['QUEUED', 'PENDING'].includes(s)).length,
        },
      }),
    ).pipe(delay(rnd()));
  }

  return next(req);
};
