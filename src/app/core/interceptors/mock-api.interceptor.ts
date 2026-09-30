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

function rnd(): number { return Math.floor(Math.random() * 300) + 300; }

function accountFails(id: string): boolean { return id === 'AC-10048'; }

function getAccountStatus(accountId: string, index: number, elapsed: number): {
  status: string; errorCode?: string; errorMessage?: string;
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
  if (statuses.some(s => active.includes(s))) return 'IN_PROGRESS';
  if (statuses.every(s => s === 'COMPLETED')) return 'COMPLETED';
  if (statuses.every(s => s === 'FAILED')) return 'FAILED';
  return 'PARTIALLY_COMPLETED';
}

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMockApi) return next(req);

  const url = req.url;
  const method = req.method;

  // GET /migrations/recent  (suggested endpoint for dashboard)
  if (method === 'GET' && url.endsWith('/migrations/recent')) {
    return of(new HttpResponse({
      status: 200, body: {
        accounts: [
          { accountId: 'AC-10045', status: 'COMPLETED' },
          { accountId: 'AC-10046', status: 'IN_PROGRESS' },
          { accountId: 'AC-10047', status: 'FAILED' },
          { accountId: 'AC-10048', status: 'COMPLETED' },
        ],
      },
    })).pipe(delay(rnd()));
  }

  // POST /migrations/validate
  if (method === 'POST' && url.includes('/migrations/validate')) {
    const body = req.body as { batchId?: string; accountIds: string[] };
    const accounts = body.accountIds.map(id => {
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
    const validCount = accounts.filter(a => a.validationStatus === 'PASSED').length;
    return of(new HttpResponse({
      status: 200, body: {
        batchId: body.batchId,
        totalAccountCount: accounts.length,
        validAccountCount: validCount,
        invalidAccountCount: accounts.length - validCount,
        accounts,
      },
    })).pipe(delay(rnd()));
  }

  // POST /migrations  (start migration)
  if (method === 'POST' && /\/migrations$/.test(url)) {
    const body = req.body as { batchId?: string; accountIds: string[] };
    const jobId = `MIG-${Date.now()}-${String(jobCounter++).padStart(6, '0')}`;
    jobs[jobId] = { migrationJobId: jobId, batchId: body.batchId, accountIds: body.accountIds, startTime: Date.now() };
    return of(new HttpResponse({
      status: 202, body: {
        migrationJobId: jobId, batchId: body.batchId, accountIds: body.accountIds, status: 'IN_PROGRESS',
      },
    })).pipe(delay(rnd()));
  }

  // GET /migrations/history/accounts/:accountId
  const histAccMatch = url.match(/\/migrations\/history\/accounts\/([^/?]+)/);
  if (method === 'GET' && histAccMatch) {
    const accountId = histAccMatch[1];
    const isFailed = accountId === 'AC-10048';
    return of(new HttpResponse({
      status: 200, body: {
        accountId,
        migrations: [
          {
            status: isFailed ? 'FAILED' : 'COMPLETED',
            logReportAvailable: true,
            migrationJobId: isFailed ? 'MIG-HIST-FAILED-001' : 'MIG-HIST-OK-001',
          },
        ],
      },
    })).pipe(delay(rnd()));
  }

  // GET /migrations/history/batches/:batchId
  const histBatchMatch = url.match(/\/migrations\/history\/batches\/([^/?]+)/);
  if (method === 'GET' && histBatchMatch) {
    const batchId = histBatchMatch[1];
    const partial = batchId === '1';
    return of(new HttpResponse({
      status: 200, body: {
        batchId,
        status: partial ? 'PARTIALLY_COMPLETED' : 'COMPLETED',
        totalAccountCount: 6,
        completedAccountCount: partial ? 5 : 6,
        failedAccountCount: partial ? 1 : 0,
        logReportAvailable: true,
        migrationJobId: 'MIG-HIST-BATCH-001',
      },
    })).pipe(delay(rnd()));
  }

  // GET /migrations/:jobId/accounts/:accountId/logs
  const accLogsMatch = url.match(/\/migrations\/([^/]+)\/accounts\/([^/]+)\/logs/);
  if (method === 'GET' && accLogsMatch) {
    const [, jobId, accountId] = accLogsMatch;
    const job = jobs[jobId];
    const elapsed = job ? (Date.now() - job.startTime) / 1000 : 999;
    const idx = job?.accountIds.indexOf(accountId) ?? 0;
    const { status } = getAccountStatus(accountId, idx, elapsed);
    const isFailed = accountId === 'AC-10048' || status === 'FAILED';
    return of(new HttpResponse({
      status: 200, body: {
        migrationJobId: jobId,
        accountId,
        status: isFailed ? 'FAILED' : 'COMPLETED',
        entries: isFailed
          ? [
              { level: 'INFO', message: `Starting migration for account ${accountId}.` },
              { level: 'INFO', message: 'Validating account in source system.' },
              { level: 'INFO', message: 'Reading source account data.' },
              { level: 'ERROR', message: 'Account migration failed during target validation.' },
              { level: 'INFO', message: 'Migration stopped.' },
            ]
          : [
              { level: 'INFO', message: `Starting migration for account ${accountId}.` },
              { level: 'INFO', message: 'Validating account in source system.' },
              { level: 'INFO', message: 'Reading source account data.' },
              { level: 'INFO', message: 'Preparing migration payload.' },
              { level: 'INFO', message: 'Migrating account data to target system.' },
              { level: 'INFO', message: 'Validating target data integrity.' },
              { level: 'INFO', message: 'Reconciliation complete.' },
              { level: 'INFO', message: 'Account migration completed successfully.' },
            ],
      },
    })).pipe(delay(rnd()));
  }

  // GET /migrations/:jobId/logs
  const jobLogsMatch = url.match(/\/migrations\/([^/]+)\/logs$/);
  if (method === 'GET' && jobLogsMatch) {
    const [, jobId] = jobLogsMatch;
    const job = jobs[jobId];
    const isFailed = jobId.includes('HIST-FAILED');
    const isPartial = jobId.includes('BATCH') || (!!job && job.accountIds.includes('AC-10048'));
    return of(new HttpResponse({
      status: 200, body: {
        migrationJobId: jobId,
        batchId: job?.batchId,
        status: isFailed ? 'FAILED' : isPartial ? 'PARTIALLY_COMPLETED' : 'COMPLETED',
        logReportAvailable: true,
        entries: [
          { level: 'INFO', message: 'Migration batch request initiated.' },
          { level: 'INFO', message: `Processing ${job?.accountIds.length ?? 5} account(s).` },
          { level: 'INFO', message: 'AC-10045: Migration completed successfully.' },
          { level: 'INFO', message: 'AC-10046: Migration completed successfully.' },
          { level: 'ERROR', message: 'AC-10048: Account migration failed during target validation.' },
          { level: 'INFO', message: 'AC-10049: Migration completed successfully.' },
          { level: 'INFO', message: 'AC-10050: Migration completed successfully.' },
          { level: 'INFO', message: 'Batch processing complete. 4 succeeded, 1 failed.' },
        ],
      },
    })).pipe(delay(rnd()));
  }

  // GET /migrations/:jobId/accounts/:accountId  (single account status)
  const singleAccMatch = url.match(/\/migrations\/([^/]+)\/accounts\/([^/]+)$/);
  if (method === 'GET' && singleAccMatch) {
    const [, jobId, accountId] = singleAccMatch;
    const job = jobs[jobId];
    const elapsed = job ? (Date.now() - job.startTime) / 1000 : 999;
    const idx = job?.accountIds.indexOf(accountId) ?? 0;
    const { status, errorCode, errorMessage } = getAccountStatus(accountId, idx, elapsed);
    return of(new HttpResponse({
      status: 200, body: {
        migrationJobId: jobId, accountId, status,
        currentStage: status === 'COMPLETED' ? 'COMPLETED' : status === 'FAILED' ? 'VALIDATING_TARGET' : 'MIGRATING_ACCOUNT',
        errorCode, errorMessage,
      },
    })).pipe(delay(rnd()));
  }

  // GET /migrations/:jobId/accounts  (all account statuses)
  const accListMatch = url.match(/\/migrations\/([^/]+)\/accounts$/);
  if (method === 'GET' && accListMatch) {
    const [, jobId] = accListMatch;
    const job = jobs[jobId];
    const elapsed = job ? (Date.now() - job.startTime) / 1000 : 999;
    const accounts = (job?.accountIds ?? []).map((id, idx) => {
      const { status, errorCode, errorMessage } = getAccountStatus(id, idx, elapsed);
      return { accountId: id, status, errorCode, errorMessage };
    });
    return of(new HttpResponse({
      status: 200, body: { migrationJobId: jobId, batchId: job?.batchId, accounts },
    })).pipe(delay(rnd()));
  }

  // GET /migrations/:jobId  (overall job status)
  const jobStatusMatch = url.match(/\/migrations\/([^/]+)$/);
  if (method === 'GET' && jobStatusMatch) {
    const [, jobId] = jobStatusMatch;
    const job = jobs[jobId];
    const elapsed = job ? (Date.now() - job.startTime) / 1000 : 999;
    const statuses = (job?.accountIds ?? []).map((id, idx) => getAccountStatus(id, idx, elapsed).status);
    return of(new HttpResponse({
      status: 200, body: {
        migrationJobId: jobId,
        batchId: job?.batchId,
        status: computeOverallStatus(statuses),
        requestedAccountCount: statuses.length,
        completedAccountCount: statuses.filter(s => s === 'COMPLETED').length,
        failedAccountCount: statuses.filter(s => s === 'FAILED').length,
        inProgressAccountCount: statuses.filter(s => ['MIGRATING', 'RETRYING'].includes(s)).length,
        pendingAccountCount: statuses.filter(s => ['QUEUED', 'PENDING'].includes(s)).length,
      },
    })).pipe(delay(rnd()));
  }

  return next(req);
};
