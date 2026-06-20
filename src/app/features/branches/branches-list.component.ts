import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/auth/auth.service';
import { Branch } from '../../core/models/content.models';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import {
  DataTableComponent,
  RowAction,
  TableActionEvent,
  TableColumn,
} from '../../shared/components/data-table/data-table.component';
import { confirm } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { BranchFormDialog } from './branch-form.dialog';

@Component({
  selector: 'app-branches-list',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    PageHeaderComponent,
    EmptyStateComponent,
    DataTableComponent,
  ],
  templateUrl: './branches-list.component.html',
})
export class BranchesListComponent {
  private readonly api = inject(ContentApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);

  readonly rows = signal<Branch[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly loading = signal(true);

  readonly canWrite = this.auth.hasPermission('content:write');
  readonly canDelete = this.auth.hasPermission('content:delete');

  readonly columns: TableColumn<Branch>[] = [
    { key: 'name', header: 'Name', value: (r) => r.name.en },
    { key: 'city', header: 'City', value: (r) => r.city ?? '' },
    { key: 'phone', header: 'Phone', value: (r) => r.phone ?? '' },
    { key: 'email', header: 'Email', value: (r) => r.email ?? '' },
    { key: 'order', header: 'Order', value: (r) => String(r.displayOrder) },
  ];

  readonly actions: RowAction<Branch>[] = [
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
    this.api.branches
      .list({ page: this.pageIndex(), size: this.pageSize(), sort: 'displayOrder,asc' })
      .subscribe({
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

  onAction(e: TableActionEvent<Branch>): void {
    if (e.event === 'edit') {
      this.openForm(e.row);
    } else if (e.event === 'delete') {
      this.remove(e.row);
    }
  }

  private openForm(item: Branch | null): void {
    this.dialog
      .open(BranchFormDialog, { data: item, width: '640px', autoFocus: false })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  private remove(item: Branch): void {
    confirm(this.dialog, {
      title: 'Delete branch',
      message: `Delete "${item.name.en}"?`,
      confirmText: 'Delete',
      destructive: true,
    }).subscribe((ok) => {
      if (ok) {
        this.api.branches.remove(item.id).subscribe(() => {
          this.notify.success('Branch deleted');
          this.load();
        });
      }
    });
  }
}
