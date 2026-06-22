import { Component, inject, signal } from '@angular/core';
import { DatePipe, SlicePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { AuditLogService } from '../../core/services/audit-log.service';
import { AuditLog, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../../core/models/audit.models';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [
    DatePipe,
    SlicePipe,
    TitleCasePipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatTableModule,
    MatPaginatorModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './logs.component.html',
  styleUrl: './logs.component.scss',
})
export class LogsComponent {
  private readonly auditLog = inject(AuditLogService);

  readonly logs = signal<AuditLog[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);

  readonly resourceTypes = AUDIT_RESOURCE_TYPES;
  readonly actions = AUDIT_ACTIONS;

  selectedResourceType = '';
  selectedAction = '';
  pageIndex = 0;
  readonly pageSize = 50;

  readonly columns = ['action', 'resourceType', 'resourceName', 'resourceId', 'performedBy', 'performedAt'];

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.auditLog
      .list({
        resourceType: this.selectedResourceType || undefined,
        action: this.selectedAction || undefined,
        page: this.pageIndex,
        size: this.pageSize,
      })
      .subscribe({
        next: (page) => {
          this.logs.set(page.content);
          this.total.set(page.totalElements);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  applyFilter(): void {
    this.pageIndex = 0;
    this.load();
  }

  reset(): void {
    this.selectedResourceType = '';
    this.selectedAction = '';
    this.pageIndex = 0;
    this.load();
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.load();
  }

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
