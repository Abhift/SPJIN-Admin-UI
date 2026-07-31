import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/auth/auth.service';
import { Book } from '../../core/models/content.models';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import {
  DataTableComponent,
  RowAction,
  TableActionEvent,
  TableColumn,
} from '../../shared/components/data-table/data-table.component';
import { confirm } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { BookFormDialog } from './book-form.dialog';
import { BookExcelImportComponent } from './book-excel-import.component';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-books-list',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    PageHeaderComponent,
    EmptyStateComponent,
    DataTableComponent,
    BookExcelImportComponent,
  ],
  templateUrl: './books-list.component.html',
})
export class BooksListComponent {
  private readonly api = inject(ContentApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);

  readonly rows = signal<Book[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly loading = signal(true);
  readonly showImport = signal(false);
  readonly exporting = signal(false);
  readonly selectedLang = signal<'all' | 'en' | 'hi' | 'gu' | 'ne'>('all');

  readonly langOptions: { value: 'all' | 'en' | 'hi' | 'gu' | 'ne'; label: string }[] = [
    { value: 'all', label: 'All Languages' },
    { value: 'hi', label: 'हिन्दी' },
    { value: 'en', label: 'English' },
    { value: 'gu', label: 'ગુજરાતી' },
    { value: 'ne', label: 'नेपाली' },
  ];

  readonly currentLangLabel = computed(
    () => this.langOptions.find((o) => o.value === this.selectedLang())?.label ?? 'All Languages',
  );

  private readonly langLabels: Record<string, string> = {
    hi: 'हिन्दी',
    en: 'English',
    gu: 'ગુજરાતી',
    ne: 'नेपाली',
  };

  readonly canWrite = this.auth.hasPermission('content:write');
  readonly canDelete = this.auth.hasPermission('content:delete');
  readonly canPublish = this.auth.hasPermission('content:publish');

  readonly columns: TableColumn<Book>[] = [
    { key: 'title', header: 'Title', value: (r) => r.title },
    { key: 'author', header: 'Author', value: (r) => r.author ?? '' },
    { key: 'language', header: 'Language', value: (r) => (r.language ? (this.langLabels[r.language] ?? r.language) : '') },
    { key: 'category', header: 'Category', value: (r) => r.category ?? '' },
    { key: 'status', header: 'Status', type: 'status', value: (r) => r.status },
  ];

  readonly actions: RowAction<Book>[] = [
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

  onLangChange(lang: 'all' | 'en' | 'hi' | 'gu' | 'ne'): void {
    this.selectedLang.set(lang);
    this.pageIndex.set(0);
    this.load(lang);
  }

  load(lang = this.selectedLang()): void {
    this.loading.set(true);
    const langParam = lang !== 'all' ? lang : undefined;
    this.api.books.list({ page: this.pageIndex(), size: this.pageSize(), lang: langParam }).subscribe({
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
    this.load(this.selectedLang());
  }

  create(): void {
    this.openForm(null);
  }

  exportExcel(): void {
    this.exporting.set(true);
    const lang = this.selectedLang() !== 'all' ? this.selectedLang() : undefined;
    this.api.books.list({ size: 1000, lang }).subscribe({
      next: page => {
        const rows = page.content.map(b => ({
          title:         b.title ?? '',
          language:      b.language ?? '',
          author:        b.author ?? '',
          category:      b.category ?? '',
          fileUrl:       b.fileUrl ?? '',
          coverImageUrl: b.coverImageUrl ?? '',
          status:        b.status ?? '',
          description:   b.description ?? '',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = Object.keys(rows[0] ?? {}).map(k =>
          ({ wch: ['title', 'description', 'fileUrl', 'coverImageUrl'].includes(k) ? 30 : 15 })
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Books');
        const suffix = lang ? `-${lang}` : '';
        XLSX.writeFile(wb, `books-export${suffix}-${new Date().toISOString().slice(0, 10)}.xlsx`);
        this.exporting.set(false);
        this.notify.success(`${rows.length} book${rows.length !== 1 ? 's' : ''} exported`);
      },
      error: () => this.exporting.set(false),
    });
  }

  onAction(e: TableActionEvent<Book>): void {
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

  private openForm(item: Book | null): void {
    this.dialog
      .open(BookFormDialog, { data: item, width: '680px', autoFocus: false })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  private setPublished(item: Book, publish: boolean): void {
    this.api.books.setPublished(item.id, publish).subscribe(() => {
      this.notify.success(publish ? 'Book published' : 'Book unpublished');
      this.load();
    });
  }

  private remove(item: Book): void {
    confirm(this.dialog, {
      title: 'Delete book',
      message: `Delete "${item.title}"?`,
      confirmText: 'Delete',
      destructive: true,
    }).subscribe((ok) => {
      if (ok) {
        this.api.books.remove(item.id).subscribe(() => {
          this.notify.success('Book deleted');
          this.load();
        });
      }
    });
  }
}
