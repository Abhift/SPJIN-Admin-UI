import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/auth/auth.service';
import { Menu } from '../../core/models/content.models';
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
  selector: 'app-menus-list',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    PageHeaderComponent,
    EmptyStateComponent,
    DataTableComponent,
  ],
  templateUrl: './menus-list.component.html',
})
export class MenusListComponent {
  private readonly api = inject(ContentApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly rows = signal<Menu[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly loading = signal(true);

  readonly canWrite = this.auth.hasPermission('content:write');
  readonly canDelete = this.auth.hasPermission('content:delete');

  readonly columns: TableColumn<Menu>[] = [
    { key: 'name', header: 'Name', value: (r) => r.name },
    { key: 'key', header: 'Key', value: (r) => r.key },
    { key: 'count', header: 'Items', value: (r) => String(r.items?.length ?? 0) },
  ];

  readonly actions: RowAction<Menu>[] = [
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
    this.api.menus.list({ page: this.pageIndex(), size: this.pageSize() }).subscribe({
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
    void this.router.navigate(['/menus/new']);
  }

  onAction(e: TableActionEvent<Menu>): void {
    switch (e.event) {
      case 'edit':
        void this.router.navigate(['/menus', e.row.id, 'edit']);
        break;
      case 'delete':
        this.remove(e.row);
        break;
    }
  }

  private remove(item: Menu): void {
    confirm(this.dialog, {
      title: 'Delete menu',
      message: `Delete "${item.name}"?`,
      confirmText: 'Delete',
      destructive: true,
    }).subscribe((ok) => {
      if (ok) {
        this.api.menus.remove(item.id).subscribe(() => {
          this.notify.success('Menu deleted');
          this.load();
        });
      }
    });
  }
}
