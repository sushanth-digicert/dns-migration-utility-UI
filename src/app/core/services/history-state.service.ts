import { Injectable, signal } from '@angular/core';
import { AccountHistoryResponse, BatchHistoryResponse } from '../models/migration.models';

@Injectable({ providedIn: 'root' })
export class HistoryStateService {
  readonly activeTabIndex = signal<number>(0);
  readonly accountId = signal<string>('');
  readonly accountResult = signal<AccountHistoryResponse | null>(null);
  readonly batchId = signal<string>('');
  readonly batchResult = signal<BatchHistoryResponse | null>(null);

  saveAccountSearch(id: string, result: AccountHistoryResponse): void {
    this.accountId.set(id);
    this.accountResult.set(result);
  }

  saveBatchSearch(id: string, result: BatchHistoryResponse): void {
    this.batchId.set(id);
    this.batchResult.set(result);
  }

  setActiveTab(index: number): void {
    this.activeTabIndex.set(index);
  }

  clearTab(index: number): void {
    if (index === 0) {
      this.accountResult.set(null);
    } else {
      this.batchResult.set(null);
    }
  }
}
