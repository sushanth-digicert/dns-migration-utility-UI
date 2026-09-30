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
  private readonly svc = inject(MigrationService);

  readonly loading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly entries = signal<LogEntry[]>([]);
  readonly status = signal('');
  readonly titleSuffix = signal('');

  readonly isFailed = () => this.status() === 'FAILED';
  readonly isPartial = () => this.status() === 'PARTIALLY_COMPLETED';

  private readonly location = inject(Location);

  private jobId = '';
  private accountId: string | null = null;

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.jobId = params.get('jobId') ?? '';
    this.accountId = params.get('accountId');
    const label = this.accountId ? ` — ${this.accountId}` : '';
    this.titleSuffix.set(label);

    if (!this.jobId) {
      this.errorMsg.set('No migration job ID provided.');
      this.loading.set(false);
      return;
    }

    const obs: Observable<{ entries: LogEntry[]; status: string }> = this.accountId
      ? this.svc.getAccountLogs(this.jobId, this.accountId)
      : this.svc.getMigrationLogs(this.jobId);

    obs.subscribe({
      next: (resp) => {
        this.entries.set(resp.entries);
        this.status.set(resp.status);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Failed to load log report. Please try again.');
        this.loading.set(false);
      },
    });
  }

  downloadReport(): void {
    const suffix = this.accountId ?? this.jobId;
    const lines = [
      `Migration Log Report — ${suffix}`,
      `Status: ${this.status()}`,
      '',
      ...this.entries().map(e => `[${e.level}] ${e.message}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `log-report-${suffix}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  goBack(): void { this.location.back(); }
}
