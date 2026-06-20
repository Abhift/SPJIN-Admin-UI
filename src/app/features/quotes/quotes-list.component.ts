import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/auth/auth.service';
import { Quote } from '../../core/models/content.models';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import {
  DataTableComponent,
  RowAction,
  TableActionEvent,
  TableColumn,
} from '../../shared/components/data-table/data-table.component';
import { confirm } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { QuoteFormDialog } from './quote-form.dialog';

@Component({
  selector: 'app-quotes-list',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    PageHeaderComponent,
    EmptyStateComponent,
    DataTableComponent,
  ],
  templateUrl: './quotes-list.component.html',
})
export class QuotesListComponent {
  private readonly api = inject(ContentApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);

  readonly rows = signal<Quote[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly loading = signal(true);

  readonly canWrite = this.auth.hasPermission('content:write');
  readonly canDelete = this.auth.hasPermission('content:delete');

  readonly columns: TableColumn<Quote>[] = [
    { key: 'text', header: 'Quote', value: (r) => r.text.en },
    { key: 'author', header: 'Author', value: (r) => r.author?.en ?? '' },
    { key: 'source', header: 'Source', value: (r) => r.source ?? '' },
    { key: 'order', header: 'Order', value: (r) => String(r.displayOrder) },
  ];

  readonly actions: RowAction<Quote>[] = [
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
    this.api.quotes
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

  onAction(e: TableActionEvent<Quote>): void {
    if (e.event === 'edit') {
      this.openForm(e.row);
    } else if (e.event === 'delete') {
      this.remove(e.row);
    }
  }

  private openForm(quote: Quote | null): void {
    this.dialog
      .open(QuoteFormDialog, { data: quote, width: '560px', autoFocus: false })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  private remove(quote: Quote): void {
    confirm(this.dialog, {
      title: 'Delete quote',
      message: 'Delete this quote? This cannot be undone.',
      confirmText: 'Delete',
      destructive: true,
    }).subscribe((ok) => {
      if (ok) {
        this.api.quotes.remove(quote.id).subscribe(() => {
          this.notify.success('Quote deleted');
          this.load();
        });
      }
    });
  }
}
