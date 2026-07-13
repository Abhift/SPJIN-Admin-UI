import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/auth/auth.service';
import { EventGallery } from '../../core/models/content.models';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import {
  DataTableComponent,
  RowAction,
  TableActionEvent,
  TableColumn,
} from '../../shared/components/data-table/data-table.component';
import { confirm } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-event-gallery-list',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    PageHeaderComponent,
    EmptyStateComponent,
    DataTableComponent,
  ],
  templateUrl: './event-gallery-list.component.html',
})
export class EventGalleryListComponent {
  private readonly api = inject(ContentApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly rows = signal<EventGallery[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly loading = signal(true);

  readonly canWrite = this.auth.hasPermission('content:write');
  readonly canDelete = this.auth.hasPermission('content:delete');
  readonly canPublish = this.auth.hasPermission('content:publish');

  readonly columns: TableColumn<EventGallery>[] = [
    { key: 'title', header: 'Title', value: (r) => r.title.en },
    { key: 'location', header: 'Location', value: (r) => r.location ?? '—' },
    { key: 'eventDate', header: 'Date', value: (r) => r.eventDate ?? '—' },
    { key: 'imageCount', header: 'Images', value: (r) => String(r.imageCount ?? r.images?.length ?? 0) },
    { key: 'status', header: 'Status', type: 'status', value: (r) => r.status },
  ];

  readonly actions: RowAction<EventGallery>[] = [
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
    { label: 'Delete', icon: 'delete', event: 'delete', destructive: true, visible: () => this.canDelete },
  ];

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.eventGalleries
      .list({ page: this.pageIndex(), size: this.pageSize(), sort: 'eventDate,desc' })
      .subscribe({
        next: (page) => {
          this.rows.set(page.content);
          this.total.set(page.totalElements);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onPage(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.load();
  }

  onAction(e: TableActionEvent<EventGallery>): void {
    switch (e.event) {
      case 'edit':
        void this.router.navigate(['/event-gallery', e.row.id, 'edit']);
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

  private setPublished(item: EventGallery, publish: boolean): void {
    this.api.eventGalleries.setPublished(item.id, publish).subscribe(() => {
      this.notify.success(publish ? 'Event gallery published' : 'Event gallery unpublished');
      this.load();
    });
  }

  private remove(item: EventGallery): void {
    confirm(this.dialog, {
      title: 'Delete event gallery',
      message: `Delete "${item.title.en}"?`,
      confirmText: 'Delete',
      destructive: true,
    }).subscribe((ok) => {
      if (ok) {
        this.api.eventGalleries.remove(item.id).subscribe(() => {
          this.notify.success('Event gallery deleted');
          this.load();
        });
      }
    });
  }
}
