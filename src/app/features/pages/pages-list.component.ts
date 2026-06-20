import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/auth/auth.service';
import { PageEntity } from '../../core/models/content.models';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import {
  DataTableComponent,
  RowAction,
  TableActionEvent,
  TableColumn,
} from '../../shared/components/data-table/data-table.component';
import { confirm } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-pages-list',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    PageHeaderComponent,
    EmptyStateComponent,
    DataTableComponent,
  ],
  templateUrl: './pages-list.component.html',
})
export class PagesListComponent {
  private readonly api = inject(ContentApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly rows = signal<PageEntity[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly loading = signal(true);

  readonly canWrite = this.auth.hasPermission('content:write');
  readonly canDelete = this.auth.hasPermission('content:delete');
  readonly canPublish = this.auth.hasPermission('content:publish');

  readonly columns: TableColumn<PageEntity>[] = [
    { key: 'name', header: 'Name', value: (r) => r.name },
    { key: 'slug', header: 'Slug', value: (r) => r.slug },
    { key: 'sections', header: 'Sections', value: (r) => String(r.sections?.length ?? 0) },
    { key: 'status', header: 'Status', type: 'status', value: (r) => r.status },
  ];

  readonly actions: RowAction<PageEntity>[] = [
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
    this.api.pages.list({ page: this.pageIndex(), size: this.pageSize() }).subscribe({
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
    void this.router.navigate(['/pages/new']);
  }

  onAction(e: TableActionEvent<PageEntity>): void {
    switch (e.event) {
      case 'edit':
        void this.router.navigate(['/pages', e.row.id, 'edit']);
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

  private setPublished(item: PageEntity, publish: boolean): void {
    this.api.pages.setPublished(item.id, publish).subscribe(() => {
      this.notify.success(publish ? 'Page published' : 'Page unpublished');
      this.load();
    });
  }

  private remove(item: PageEntity): void {
    confirm(this.dialog, {
      title: 'Delete page',
      message: `Delete "${item.name}"?`,
      confirmText: 'Delete',
      destructive: true,
    }).subscribe((ok) => {
      if (ok) {
        this.api.pages.remove(item.id).subscribe(() => {
          this.notify.success('Page deleted');
          this.load();
        });
      }
    });
  }
}
