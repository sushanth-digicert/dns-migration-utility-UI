export interface ValidateRequest {
  supportUserName: string;
  batchId?: string;
  accountIds: string[];
}

export interface AccountValidationResult {
  accountId: string;
  validationStatus: 'PASSED' | 'FAILED';
  validationDetails: string;
}

export interface ValidateResponse {
  batchId?: string;
  totalAccountCount: number;
  validAccountCount: number;
  invalidAccountCount: number;
  accounts: AccountValidationResult[];
}

export interface StartMigrationRequest {
  supportUserName: string;
  batchId?: string;
  accountIds: string[];
}

export interface StartMigrationResponse {
  migrationJobId: string;
  batchId?: string;
  accountIds: string[];
  status: MigrationJobStatus;
}

export type MigrationJobStatus =
  'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'FAILED';

export interface MigrationJobStatusResponse {
  migrationJobId: string;
  batchId?: string;
  status: MigrationJobStatus;
  requestedAccountCount: number;
  completedAccountCount: number;
  failedAccountCount: number;
  inProgressAccountCount: number;
  pendingAccountCount: number;
}

export type AccountMigrationStatus =
  'PENDING' | 'QUEUED' | 'MIGRATING' | 'RETRYING' | 'COMPLETED' | 'FAILED';

export interface AccountStatus {
  accountId: string;
  batchId?: string;
  status: AccountMigrationStatus;
  startedAt?: string;
  completedAt?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface AccountStatusesResponse {
  migrationJobId: string;
  batchId?: string;
  accounts: AccountStatus[];
}

export interface SingleAccountStatusResponse {
  migrationJobId: string;
  accountId: string;
  status: AccountMigrationStatus;
  currentStage?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface AccountHistoryEntry {
  status: string;
  batchId?: string;
  startedAt?: string;
  completedAt?: string;
  logReportAvailable: boolean;
  migrationJobId?: string;
}

export interface AccountHistoryResponse {
  accountId: string;
  migrations: AccountHistoryEntry[];
}

export interface BatchHistoryResponse {
  batchId: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  totalAccountCount: number;
  completedAccountCount: number;
  failedAccountCount: number;
  logReportAvailable: boolean;
  migrationJobId?: string;
}

export type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  stage: string;
  outcome: 'success' | 'failure' | 'recovered' | 'recorded';
  status?: string;
  support_message: string;
}

export interface MigrationLogsResponse {
  migrationJobId: string;
  batchId?: string;
  status: string;
  logReportAvailable: boolean;
  entries: LogEntry[];
  batch_started_at?: string;
  batch_completed_at?: string;
  batch_duration_ms?: number;
  total_account_count?: number;
  completed_account_count?: number;
  failed_account_count?: number;
}

export interface AccountLogsResponse {
  migrationJobId: string;
  accountId: string;
  status: string;
  entries: LogEntry[];
  account_started_at?: string;
  account_completed_at?: string;
  account_duration_ms?: number;
}

export interface MigrationSession {
  supportUserName?: string;
  batchId?: string;
  validationResults?: ValidateResponse;
  selectedAccountIds: string[];
  migrationJobId?: string;
}

export interface RecentMigrationEntry {
  accountId: string;
  batchId?: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  logReportAvailable?: boolean;
  migrationJobId?: string;
}

export interface RecentMigrationsResponse {
  migrations: RecentMigrationEntry[];
}
