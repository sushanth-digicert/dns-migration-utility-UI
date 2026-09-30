import { Injectable, signal, computed } from '@angular/core';
import { MigrationSession, ValidateResponse, AccountStatus } from '../models/migration.models';

@Injectable({ providedIn: 'root' })
export class MigrationSessionService {
  private readonly _session = signal<MigrationSession>({ selectedAccountIds: [] });

  readonly session = this._session.asReadonly();
  readonly selectedAccountIds = computed(() => this._session().selectedAccountIds);
  readonly batchId = computed(() => this._session().batchId);
  readonly validationResults = computed(() => this._session().validationResults);
  readonly migrationJobId = computed(() => this._session().migrationJobId);

  setValidationResults(batchId: string | undefined, results: ValidateResponse): void {
    this._session.update(s => ({
      ...s,
      batchId,
      validationResults: results,
      selectedAccountIds: results.accounts
        .filter(a => a.validationStatus === 'PASSED')
        .map(a => a.accountId),
    }));
  }

  updateSelectedAccounts(ids: string[]): void {
    this._session.update(s => ({ ...s, selectedAccountIds: ids }));
  }

  setMigrationJobId(jobId: string): void {
    this._session.update(s => ({ ...s, migrationJobId: jobId }));
  }

  // Persists the final account statuses so the completed screen can be
  // restored when the user navigates back from the Log Report page.
  private readonly _completedStatuses = signal<AccountStatus[]>([]);
  readonly completedStatuses = this._completedStatuses.asReadonly();

  setCompletedStatuses(statuses: AccountStatus[]): void {
    this._completedStatuses.set(statuses);
  }

  reset(): void {
    this._session.set({ selectedAccountIds: [] });
    this._completedStatuses.set([]);
  }
}
