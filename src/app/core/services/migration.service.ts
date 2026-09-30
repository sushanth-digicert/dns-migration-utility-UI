import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ValidateRequest, ValidateResponse,
  StartMigrationRequest, StartMigrationResponse,
  MigrationJobStatusResponse, AccountStatusesResponse,
  SingleAccountStatusResponse, AccountHistoryResponse,
  BatchHistoryResponse, MigrationLogsResponse, AccountLogsResponse,
  RecentMigrationsResponse,
} from '../models/migration.models';

@Injectable({ providedIn: 'root' })
export class MigrationService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  validateAccounts(req: ValidateRequest): Observable<ValidateResponse> {
    return this.http.post<ValidateResponse>(`${this.base}/migrations/validate`, req);
  }

  startMigration(req: StartMigrationRequest): Observable<StartMigrationResponse> {
    return this.http.post<StartMigrationResponse>(`${this.base}/migrations`, req);
  }

  getMigrationStatus(jobId: string): Observable<MigrationJobStatusResponse> {
    return this.http.get<MigrationJobStatusResponse>(`${this.base}/migrations/${jobId}`);
  }

  getAccountStatuses(jobId: string): Observable<AccountStatusesResponse> {
    return this.http.get<AccountStatusesResponse>(`${this.base}/migrations/${jobId}/accounts`);
  }

  getSingleAccountStatus(jobId: string, accountId: string): Observable<SingleAccountStatusResponse> {
    return this.http.get<SingleAccountStatusResponse>(`${this.base}/migrations/${jobId}/accounts/${accountId}`);
  }

  searchByAccountId(accountId: string): Observable<AccountHistoryResponse> {
    return this.http.get<AccountHistoryResponse>(`${this.base}/migrations/history/accounts/${accountId}`);
  }

  searchByBatchId(batchId: string): Observable<BatchHistoryResponse> {
    return this.http.get<BatchHistoryResponse>(`${this.base}/migrations/history/batches/${batchId}`);
  }

  getMigrationLogs(jobId: string): Observable<MigrationLogsResponse> {
    return this.http.get<MigrationLogsResponse>(`${this.base}/migrations/${jobId}/logs`);
  }

  getAccountLogs(jobId: string, accountId: string): Observable<AccountLogsResponse> {
    return this.http.get<AccountLogsResponse>(`${this.base}/migrations/${jobId}/accounts/${accountId}/logs`);
  }

  /** Suggested endpoint — not in current API contract. See README for details. */
  getRecentMigrations(): Observable<RecentMigrationsResponse> {
    return this.http.get<RecentMigrationsResponse>(`${this.base}/migrations/recent`);
  }
}
