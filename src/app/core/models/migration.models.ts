export interface ValidateRequest {
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
  batchId?: string;
  accountIds: string[];
}

export interface StartMigrationResponse {
  migrationJobId: string;
  batchId?: string;
  accountIds: string[];
  status: MigrationJobStatus;
}

export type MigrationJobStatus = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'FAILED';

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

export type AccountMigrationStatus = 'PENDING' | 'QUEUED' | 'MIGRATING' | 'RETRYING' | 'COMPLETED' | 'FAILED';

export interface AccountStatus {
  accountId: string;
  status: AccountMigrationStatus;
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
  totalAccountCount: number;
  completedAccountCount: number;
  failedAccountCount: number;
  logReportAvailable: boolean;
  migrationJobId?: string;
}

export interface LogEntry {
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
}

export interface MigrationLogsResponse {
  migrationJobId: string;
  batchId?: string;
  status: string;
  logReportAvailable: boolean;
  entries: LogEntry[];
}

export interface AccountLogsResponse {
  migrationJobId: string;
  accountId: string;
  status: string;
  entries: LogEntry[];
}

export interface MigrationSession {
  batchId?: string;
  validationResults?: ValidateResponse;
  selectedAccountIds: string[];
  migrationJobId?: string;
}

export interface RecentMigrationEntry {
  accountId: string;
  status: string;
}

export interface RecentMigrationsResponse {
  accounts: RecentMigrationEntry[];
}
