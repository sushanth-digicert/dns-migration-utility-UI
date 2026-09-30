import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

import { MigrationService } from '../../core/services/migration.service';
import { HistoryStateService } from '../../core/services/history-state.service';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { AccountHistoryResponse, BatchHistoryResponse } from '../../core/models/migration.models';

@Component({
  selector: 'app-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatTabsModule, MatProgressSpinnerModule, MatIconModule,
    StatusBadgeComponent,
  ],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
})
export class HistoryComponent implements OnInit {
  private readonly svc = inject(MigrationService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly historyState = inject(HistoryStateService);

  readonly accountSearching = signal(false);
  readonly batchSearching = signal(false);
  readonly accountError = signal<string | null>(null);
  readonly batchError = signal<string | null>(null);
  readonly accountResult = signal<AccountHistoryResponse | null>(null);
  readonly batchResult = signal<BatchHistoryResponse | null>(null);

  readonly accountCtrl = this.fb.control('', Validators.required);
  readonly batchCtrl = this.fb.control('', Validators.required);

  ngOnInit(): void {
    // Restore last search state so Back from Log Report returns to correct results
    const saved = this.historyState;
    if (saved.accountResult()) {
      this.accountCtrl.setValue(saved.accountId());
      this.accountResult.set(saved.accountResult());
    }
    if (saved.batchResult()) {
      this.batchCtrl.setValue(saved.batchId());
      this.batchResult.set(saved.batchResult());
    }
  }

  onTabChange(index: number): void {
    this.historyState.setActiveTab(index);
    // Clear only the tab being left so the other tab's results survive
    this.accountError.set(null);
    this.batchError.set(null);
  }

  searchByAccount(): void {
    this.accountCtrl.markAsTouched();
    if (this.accountCtrl.invalid) return;
    const id = this.accountCtrl.value!.trim();
    this.accountSearching.set(true);
    this.accountError.set(null);
    this.accountResult.set(null);

    this.svc.searchByAccountId(id).subscribe({
      next: (resp) => {
        this.accountResult.set(resp);
        this.historyState.saveAccountSearch(id, resp);
        this.accountSearching.set(false);
      },
      error: () => {
        this.accountError.set(`No migration history found for Account ID "${id}".`);
        this.accountSearching.set(false);
      },
    });
  }

  searchByBatch(): void {
    this.batchCtrl.markAsTouched();
    if (this.batchCtrl.invalid) return;
    const id = this.batchCtrl.value!.trim();
    this.batchSearching.set(true);
    this.batchError.set(null);
    this.batchResult.set(null);

    this.svc.searchByBatchId(id).subscribe({
      next: (resp) => {
        this.batchResult.set(resp);
        this.historyState.saveBatchSearch(id, resp);
        this.batchSearching.set(false);
      },
      error: () => {
        this.batchError.set(`No migration history found for Batch ID "${id}".`);
        this.batchSearching.set(false);
      },
    });
  }

  viewAccountLog(jobId: string, accountId: string): void {
    this.router.navigate(['/log-report'], { queryParams: { jobId, accountId } });
  }

  viewBatchLog(jobId: string): void {
    this.router.navigate(['/log-report'], { queryParams: { jobId } });
  }
}
