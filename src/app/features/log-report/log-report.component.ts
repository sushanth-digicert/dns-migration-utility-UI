import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable } from 'rxjs';
import { MigrationService } from '../../core/services/migration.service';
import { LogEntry } from '../../core/models/migration.models';

@Component({
  selector: 'app-log-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './log-report.component.html',
  styleUrl: './log-report.component.scss',
})
export class LogReportComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly svc = inject(MigrationService);

  readonly loading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly entries = signal<LogEntry[]>([]);
  readonly status = signal('');
  readonly accountId = signal<string | null>(null);
  readonly batchId = signal<string | null>(null);
  readonly startedAt = signal<string | null>(null);
  readonly completedAt = signal<string | null>(null);
  readonly durationMs = signal<number | null>(null);
  readonly totalAccountCount = signal<number | null>(null);
  readonly completedAccountCount = signal<number | null>(null);
  readonly failedAccountCount = signal<number | null>(null);

  readonly isFailed = () => this.status() === 'FAILED';
  readonly isPartial = () => this.status() === 'PARTIALLY_COMPLETED';

  statusIcon(): string {
    const s = this.status();
    if (s === 'COMPLETED' || s === 'READY_FOR_ZONES') return 'check_circle';
    if (s === 'FAILED') return 'cancel';
    if (s === 'PARTIALLY_COMPLETED') return 'warning';
    return 'sync';
  }

  statusIconClass(): string {
    const s = this.status();
    if (s === 'COMPLETED' || s === 'READY_FOR_ZONES') return 'icon-ok';
    if (s === 'FAILED') return 'icon-fail';
    if (s === 'PARTIALLY_COMPLETED') return 'icon-warn';
    return 'icon-info';
  }

  private jobId = '';
  private rawAccountId: string | null = null;

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.jobId = params.get('jobId') ?? '';
    this.rawAccountId = params.get('accountId');
    this.accountId.set(this.rawAccountId);

    if (!this.jobId) {
      this.errorMsg.set('No migration job ID provided.');
      this.loading.set(false);
      return;
    }

    const obs: Observable<{
      entries: LogEntry[];
      status: string;
      batchId?: string;
      account_started_at?: string;
      account_completed_at?: string;
      account_duration_ms?: number;
      batch_started_at?: string;
      batch_completed_at?: string;
      batch_duration_ms?: number;
    }> = this.rawAccountId
      ? this.svc.getAccountLogs(this.jobId, this.rawAccountId)
      : this.svc.getMigrationLogs(this.jobId);

    obs.subscribe({
      next: (resp) => {
        this.entries.set(resp.entries);
        this.status.set(resp.status);
        this.batchId.set((resp as { batchId?: string }).batchId ?? null);
        this.startedAt.set(resp.account_started_at ?? resp.batch_started_at ?? null);
        this.completedAt.set(resp.account_completed_at ?? resp.batch_completed_at ?? null);
        this.durationMs.set(resp.account_duration_ms ?? resp.batch_duration_ms ?? null);
        const batchResp = resp as {
          total_account_count?: number;
          completed_account_count?: number;
          failed_account_count?: number;
        };
        this.totalAccountCount.set(batchResp.total_account_count ?? null);
        this.completedAccountCount.set(batchResp.completed_account_count ?? null);
        this.failedAccountCount.set(batchResp.failed_account_count ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Failed to load log report. Please try again.');
        this.loading.set(false);
      },
    });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDateOnly(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatTimeOnly(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  formatDuration(ms: number | null): string {
    if (ms === null) return '—';
    if (ms < 1_000) return `${ms}ms`;
    if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
    const m = Math.floor(ms / 60_000);
    const s = Math.round((ms % 60_000) / 1_000);
    return `${m}m ${s}s`;
  }

  rowClass(entry: LogEntry): string {
    const l = entry.level;
    if (l === 'ERROR' || l === 'CRITICAL') return 'row-error';
    if (l === 'WARN') return 'row-warn';
    return '';
  }

  downloadReport(): void {
    const id = this.rawAccountId ?? this.batchId() ?? this.jobId;
    const sep = '='.repeat(120);
    const thin = '-'.repeat(120);
    const pad = (s: string, n: number) => s.padEnd(n).substring(0, n);
    const lbl = (key: string, val: string) => `  ${key.padEnd(14)}${val}`;

    const header = [
      sep,
      '  MIGRATION LOG REPORT',
      sep,
      lbl('Type:', this.rawAccountId ? 'Account Log' : 'Batch Log'),
      this.rawAccountId
        ? lbl('Account ID:', this.rawAccountId)
        : lbl('Batch ID:', this.batchId() ?? this.jobId),
      lbl('Status:', this.status()),
      ...(this.durationMs() !== null
        ? [lbl('Duration:', this.formatDuration(this.durationMs()))]
        : []),
      ...(this.startedAt()
        ? [
            lbl(
              'Started:',
              `${this.formatDateOnly(this.startedAt())}  ${this.formatTimeOnly(this.startedAt())}`,
            ),
          ]
        : []),
      ...(this.completedAt()
        ? [
            lbl(
              'Completed:',
              `${this.formatDateOnly(this.completedAt())}  ${this.formatTimeOnly(this.completedAt())}`,
            ),
          ]
        : []),
      ...(this.totalAccountCount() !== null
        ? [lbl('Total Accts:', String(this.totalAccountCount()))]
        : []),
      ...(this.completedAccountCount() !== null
        ? [lbl('Succeeded Accts:', String(this.completedAccountCount()))]
        : []),
      ...(this.failedAccountCount() !== null
        ? [lbl('Failed Accts:', String(this.failedAccountCount()))]
        : []),
      sep,
      '',
    ];

    const colHeaders = `  ${'TIME'.padEnd(10)}  ${'LEVEL'.padEnd(10)}  ${'STAGE'.padEnd(40)}  ${'STATUS'.padEnd(28)}  MESSAGE`;

    const entries = this.entries().map((e) => {
      const time = pad(this.formatTime(e.timestamp), 10);
      const level = pad(e.level, 10);
      const stage = pad(e.stage, 40);
      const status = pad(e.status ?? '—', 28);
      return `  ${time}  ${level}  ${stage}  ${status}  ${e.support_message}`;
    });

    const lines = [
      ...header,
      colHeaders,
      thin,
      ...entries,
      '',
      sep,
      `  Generated: ${new Date().toLocaleString('en-GB')}`,
      sep,
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `log-report-${id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  goBack(): void {
    this.location.back();
  }
}
