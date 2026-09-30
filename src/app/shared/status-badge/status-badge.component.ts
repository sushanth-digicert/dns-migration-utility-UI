import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
})
export class StatusBadgeComponent {
  status = input.required<string>();

  label(): string {
    const map: Record<string, string> = {
      PASSED: 'Passed',
      FAILED: 'Failed',
      COMPLETED: 'Completed',
      PARTIALLY_COMPLETED: 'Partially Completed',
      IN_PROGRESS: 'In Progress',
      MIGRATING: 'In Progress',
      RETRYING: 'Retrying',
      QUEUED: 'Pending',
      PENDING: 'Pending',
    };
    return map[this.status()] ?? this.status();
  }

  cssClass(): string {
    const s = this.status();
    if (['PASSED', 'COMPLETED'].includes(s)) return 'badge green';
    if (['FAILED'].includes(s)) return 'badge red';
    if (['IN_PROGRESS', 'MIGRATING'].includes(s)) return 'badge blue';
    if (['QUEUED', 'PENDING'].includes(s)) return 'badge amber';
    if (s === 'PARTIALLY_COMPLETED') return 'badge yellow';
    if (s === 'RETRYING') return 'badge blue';
    return 'badge gray';
  }
}
