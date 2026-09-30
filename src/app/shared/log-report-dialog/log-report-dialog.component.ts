import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { MigrationService } from '../../core/services/migration.service';
import { LogEntry } from '../../core/models/migration.models';

export interface LogReportDialogData {
  mode: 'account' | 'job';
  migrationJobId: string;
  accountId?: string;
  title?: string;
}

@Component({
  selector: 'app-log-report-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './log-report-dialog.component.html',
  styleUrl: './log-report-dialog.component.scss',
})
export class LogReportDialogComponent implements OnInit {
  readonly data: LogReportDialogData = inject(MAT_DIALOG_DATA);
  private readonly svc = inject(MigrationService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly entries = signal<LogEntry[]>([]);
  readonly status = signal('');

  ngOnInit(): void {
    const obs: Observable<{ entries: LogEntry[]; status: string }> =
      this.data.mode === 'account' && this.data.accountId
        ? this.svc.getAccountLogs(this.data.migrationJobId, this.data.accountId)
        : this.svc.getMigrationLogs(this.data.migrationJobId);

    obs.subscribe({
      next: (resp) => {
        this.entries.set(resp.entries);
        this.status.set(resp.status);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load log report.');
        this.loading.set(false);
      },
    });
  }
}
