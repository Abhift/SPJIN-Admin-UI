import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/auth/auth.service';
import { Activity } from '../../core/models/content.models';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import {
  DataTableComponent,
  RowAction,
  TableActionEvent,
  TableColumn,
} from '../../shared/components/data-table/data-table.component';
import { confirm } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ActivityFormDialog } from './activity-form.dialog';

@Component({
  selector: 'app-activities-list',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    PageHeaderComponent,
    EmptyStateComponent,
    DataTableComponent,
  ],
  templateUrl: './activities-list.component.html',
})
export class ActivitiesListComponent {
  private readonly api = inject(ContentApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly datePipe = new DatePipe('en-US');

  readonly rows = signal<Activity[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly loading = signal(true);

  readonly canWrite = this.auth.hasPermission('content:write');
  readonly canDelete = this.auth.hasPermission('content:delete');
  readonly canPublish = this.auth.hasPermission('content:publish');

  readonly columns: TableColumn<Activity>[] = [
    { key: 'title', header: 'Title', value: (r) => r.title.en },
    { key: 'date', header: 'Event date', value: (r) => this.formatDate(r.eventDate) },
    { key: 'slug', header: 'Slug', value: (r) => r.slug },
    { key: 'status', header: 'Status', type: 'status', value: (r) => r.status },
  ];

  readonly actions: RowAction<Activity>[] = [
    {
      label: 'Publish',
      icon: 'publish',
      event: 'publish',
      visible: (r) => this.canPublish && r.status !== 'PUBLISHED',
    },
    {
      label: 'Unpublish',
      icon: 'unpublished',
      event: 'unpublish',
      visible: (r) => this.canPublish && r.status === 'PUBLISHED',
    },
    { label: 'Edit', icon: 'edit', event: 'edit', visible: () => this.canWrite },
    {
      label: 'Delete',
      icon: 'delete',
      event: 'delete',
      destructive: true,
      visible: () => this.canDelete,
    },
  ];

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.activities.list({ page: this.pageIndex(), size: this.pageSize() }).subscribe({
      next: (page) => {
        this.rows.set(page.content);
        this.total.set(page.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  create(): void {
    this.openForm(null);
  }

  onAction(e: TableActionEvent<Activity>): void {
    switch (e.event) {
      case 'edit':
        this.openForm(e.row);
        break;
      case 'publish':
        this.setPublished(e.row, true);
        break;
      case 'unpublish':
        this.setPublished(e.row, false);
        break;
      case 'delete':
        this.remove(e.row);
        break;
    }
  }

  private formatDate(value?: string): string {
    return value ? (this.datePipe.transform(value, 'mediumDate') ?? '') : '';
  }

  private openForm(item: Activity | null): void {
    this.dialog
      .open(ActivityFormDialog, { data: item, width: '680px', autoFocus: false })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  private setPublished(item: Activity, publish: boolean): void {
    this.api.activities.setPublished(item.id, publish).subscribe(() => {
      this.notify.success(publish ? 'Activity published' : 'Activity unpublished');
      this.load();
    });
  }

  private remove(item: Activity): void {
    confirm(this.dialog, {
      title: 'Delete activity',
      message: `Delete "${item.title.en}"?`,
      confirmText: 'Delete',
      destructive: true,
    }).subscribe((ok) => {
      if (ok) {
        this.api.activities.remove(item.id).subscribe(() => {
          this.notify.success('Activity deleted');
          this.load();
        });
      }
    });
  }
}
