import { Component, Input } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LogEntry } from '../../../core/models/audit.models';

@Component({
  selector: 'app-section-logs',
  standalone: true,
  imports: [
    DatePipe,
    SlicePipe,
    MatExpansionModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './section-logs.component.html',
  styleUrl: './section-logs.component.scss',
})
export class SectionLogsComponent {
  @Input() logs: LogEntry[] = [];

  actionClass(action: string): string {
    const map: Record<string, string> = {
      CREATE: 'badge-create',
      UPDATE: 'badge-update',
      DELETE: 'badge-delete',
      PUBLISH: 'badge-publish',
      UNPUBLISH: 'badge-unpublish',
      UPLOAD: 'badge-upload',
      ROLLBACK: 'badge-rollback',
    };
    return map[action] ?? '';
  }

  actionIcon(action: string): string {
    const map: Record<string, string> = {
      CREATE: 'add_circle',
      UPDATE: 'edit',
      DELETE: 'delete',
      PUBLISH: 'publish',
      UNPUBLISH: 'unpublished',
      UPLOAD: 'cloud_upload',
      ROLLBACK: 'history',
    };
    return map[action] ?? 'info';
  }
}
