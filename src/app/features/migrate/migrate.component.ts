import {
  Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';

import { MigrationService } from '../../core/services/migration.service';
import { MigrationSessionService } from '../../core/services/migration-session.service';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { AccountStatus } from '../../core/models/migration.models';

type ViewState = 'enter' | 'results' | 'review' | 'in-progress' | 'completed';

@Component({
  selector: 'app-migrate',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatCheckboxModule, MatProgressSpinnerModule, MatIconModule,
    StatusBadgeComponent,
  ],
  templateUrl: './migrate.component.html',
  styleUrl: './migrate.component.scss',
})
export class MigrateComponent implements OnInit, OnDestroy {
  readonly router = inject(Router);
  readonly session = inject(MigrationSessionService);
  private readonly svc = inject(MigrationService);
  private readonly fb = inject(FormBuilder);

  readonly view = signal<ViewState>('enter');
  readonly activeStepIdx = signal(0);
  readonly validating = signal(false);
  readonly starting = signal(false);
  readonly apiError = signal<string | null>(null);
  readonly accountStatuses = signal<AccountStatus[]>([]);

  readonly PAGE_SIZE = 10;
  readonly resultPage = signal(1);
  readonly reviewPage = signal(1);
  readonly statusPage = signal(1);

  private pollSub?: Subscription;

  readonly steps = [
    { idx: 0, label: 'Validate Accounts' },
    { idx: 1, label: 'Review & Start' },
    { idx: 2, label: 'Migration in Progress' },
    { idx: 3, label: 'Completed' },
  ];

  readonly form = this.fb.group({
    batchId: [''],
    accountIds: ['', Validators.required],
  });

  readonly selectedIds = computed(() => this.session.selectedAccountIds());
  readonly validationResults = computed(() => this.session.validationResults());
  readonly selectedValidAccounts = computed(() =>
    (this.session.validationResults()?.accounts ?? [])
      .filter(a => this.selectedIds().includes(a.accountId))
  );
  // All PASSED accounts — shown in the Review screen so the user can adjust selection
  readonly allValidAccounts = computed(() =>
    (this.session.validationResults()?.accounts ?? [])
      .filter(a => a.validationStatus === 'PASSED')
  );

  readonly paginatedResults = computed(() => {
    const all = this.validationResults()?.accounts ?? [];
    const p = this.resultPage();
    return all.slice((p - 1) * this.PAGE_SIZE, p * this.PAGE_SIZE);
  });

  readonly paginatedReview = computed(() => {
    const all = this.allValidAccounts();
    const p = this.reviewPage();
    return all.slice((p - 1) * this.PAGE_SIZE, p * this.PAGE_SIZE);
  });

  readonly paginatedStatuses = computed(() => {
    const all = this.accountStatuses();
    const p = this.statusPage();
    return all.slice((p - 1) * this.PAGE_SIZE, p * this.PAGE_SIZE);
  });

  totalPages(count: number): number {
    return Math.max(1, Math.ceil(count / this.PAGE_SIZE));
  }

  pageNumbers(current: number, total: number): (number | string)[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | string)[] = [1];
    const mid: number[] = [];
    for (let i = Math.max(2, current - 2); i <= Math.min(total - 1, current + 2); i++) mid.push(i);
    if (mid[0] > 2) pages.push('…');
    pages.push(...mid);
    if (mid[mid.length - 1] < total - 1) pages.push('…');
    pages.push(total);
    return pages;
  }

  isSelected(accountId: string): boolean {
    return this.selectedIds().includes(accountId);
  }

  toggleSelection(accountId: string, checked: boolean): void {
    const current = [...this.selectedIds()];
    if (checked) {
      if (!current.includes(accountId)) current.push(accountId);
    } else {
      const idx = current.indexOf(accountId);
      if (idx >= 0) current.splice(idx, 1);
    }
    this.session.updateSelectedAccounts(current);
  }

  ngOnInit(): void {
    // Restore completed view when user navigates back from Log Report
    const saved = this.session.completedStatuses();
    if (saved.length > 0 && this.session.migrationJobId()) {
      this.accountStatuses.set(saved);
      this.statusPage.set(1);
      this.view.set('completed');
      this.activeStepIdx.set(3);
    }
  }

  submitValidation(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.value.accountIds ?? '';
    const accountIds = raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    if (!accountIds.length) return;

    const batchId = this.form.value.batchId?.trim() || undefined;
    this.validating.set(true);
    this.apiError.set(null);

    this.svc.validateAccounts({ batchId, accountIds }).subscribe({
      next: (resp) => {
        this.session.setValidationResults(batchId, resp);
        this.validating.set(false);
        this.resultPage.set(1);
        this.view.set('results');
        this.activeStepIdx.set(1);
      },
      error: () => {
        this.apiError.set('Validation failed. Please check your input and try again.');
        this.validating.set(false);
      },
    });
  }

  startMigration(): void {
    this.starting.set(true);
    this.apiError.set(null);

    this.svc.startMigration({
      batchId: this.session.batchId() || undefined,
      accountIds: this.selectedIds(),
    }).subscribe({
      next: (resp) => {
        this.session.setMigrationJobId(resp.migrationJobId);
        this.starting.set(false);
        this.statusPage.set(1);
        this.accountStatuses.set(this.selectedIds().map(id => ({ accountId: id, status: 'QUEUED' as const })));
        this.view.set('in-progress');
        this.activeStepIdx.set(2);
        this.startPolling(resp.migrationJobId);
      },
      error: () => {
        this.apiError.set('Failed to start migration. Please try again.');
        this.starting.set(false);
      },
    });
  }

  private startPolling(jobId: string): void {
    const terminalStatuses = ['COMPLETED', 'FAILED'];
    this.pollSub = interval(3000).pipe(
      switchMap(() => this.svc.getAccountStatuses(jobId)),
      takeWhile(resp =>
        resp.accounts.some(a => !terminalStatuses.includes(a.status)), true
      ),
    ).subscribe({
      next: (resp) => {
        this.accountStatuses.set(resp.accounts);
        const allDone = resp.accounts.every(a => terminalStatuses.includes(a.status));
        if (allDone) {
          this.session.setCompletedStatuses(resp.accounts);
          this.pollSub?.unsubscribe();
          setTimeout(() => {
            this.view.set('completed');
            this.activeStepIdx.set(3);
          }, 500);
        }
      },
    });
  }

  viewLog(accountId: string): void {
    const jobId = this.session.migrationJobId();
    if (!jobId) return;
    this.router.navigate(['/log-report'], { queryParams: { jobId, accountId } });
  }

  resetFlow(): void {
    this.pollSub?.unsubscribe();
    this.session.reset();
    this.form.reset();
    this.apiError.set(null);
    this.accountStatuses.set([]);
    this.view.set('enter');
    this.activeStepIdx.set(0);
  }

  ngOnDestroy(): void { this.pollSub?.unsubscribe(); }
}
