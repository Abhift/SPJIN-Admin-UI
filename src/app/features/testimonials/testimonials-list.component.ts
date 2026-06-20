import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/auth/auth.service';
import { Testimonial } from '../../core/models/content.models';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import {
  DataTableComponent,
  RowAction,
  TableActionEvent,
  TableColumn,
} from '../../shared/components/data-table/data-table.component';
import { confirm } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { TestimonialFormDialog } from './testimonial-form.dialog';

@Component({
  selector: 'app-testimonials-list',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    PageHeaderComponent,
    EmptyStateComponent,
    DataTableComponent,
  ],
  templateUrl: './testimonials-list.component.html',
})
export class TestimonialsListComponent {
  private readonly api = inject(ContentApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);

  readonly rows = signal<Testimonial[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly loading = signal(true);

  readonly canWrite = this.auth.hasPermission('content:write');
  readonly canDelete = this.auth.hasPermission('content:delete');

  readonly columns: TableColumn<Testimonial>[] = [
    { key: 'authorName', header: 'Author', value: (r) => r.authorName },
    { key: 'title', header: 'Title', value: (r) => r.authorTitle?.en ?? '' },
    { key: 'body', header: 'Testimonial', value: (r) => r.body.en },
    { key: 'order', header: 'Order', value: (r) => String(r.displayOrder) },
  ];

  readonly actions: RowAction<Testimonial>[] = [
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
    this.api.testimonials
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

  onAction(e: TableActionEvent<Testimonial>): void {
    if (e.event === 'edit') {
      this.openForm(e.row);
    } else if (e.event === 'delete') {
      this.remove(e.row);
    }
  }

  private openForm(item: Testimonial | null): void {
    this.dialog
      .open(TestimonialFormDialog, { data: item, width: '560px', autoFocus: false })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  private remove(item: Testimonial): void {
    confirm(this.dialog, {
      title: 'Delete testimonial',
      message: `Delete the testimonial by ${item.authorName}?`,
      confirmText: 'Delete',
      destructive: true,
    }).subscribe((ok) => {
      if (ok) {
        this.api.testimonials.remove(item.id).subscribe(() => {
          this.notify.success('Testimonial deleted');
          this.load();
        });
      }
    });
  }
}
