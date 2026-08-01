import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/auth/auth.service';
import { Article } from '../../core/models/content.models';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import {
  DataTableComponent,
  RowAction,
  TableActionEvent,
  TableColumn,
} from '../../shared/components/data-table/data-table.component';
import { confirm } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { CategoryManagerDialog } from './category-manager.dialog';

@Component({
  selector: 'app-articles-list',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    PageHeaderComponent,
    EmptyStateComponent,
    DataTableComponent,
    SearchInputComponent,
  ],
  templateUrl: './articles-list.component.html',
})
export class ArticlesListComponent {
  private readonly api = inject(ContentApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly rows = signal<Article[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly loading = signal(true);
  readonly selectedLang = signal<'all' | 'en' | 'hi' | 'gu' | 'ne'>('all');
  readonly search = signal('');

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

  readonly canWrite = this.auth.hasPermission('content:write');
  readonly canDelete = this.auth.hasPermission('content:delete');
  readonly canPublish = this.auth.hasPermission('content:publish');

  private readonly langLabels: Record<string, string> = {
    hi: 'हिन्दी',
    en: 'English',
    gu: 'ગુજરાતી',
    ne: 'नेपाली',
  };

  readonly columns: TableColumn<Article>[] = [
    { key: 'title', header: 'Title', value: (r) => r.title },
    { key: 'slug', header: 'Slug', value: (r) => r.slug },
    { key: 'language', header: 'Language', value: (r) => (r.language ? (this.langLabels[r.language] ?? r.language) : '') },
    { key: 'status', header: 'Status', type: 'status', value: (r) => r.status },
  ];

  readonly actions: RowAction<Article>[] = [
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

  onSearch(q: string): void {
    this.search.set(q);
    this.pageIndex.set(0);
    this.load();
  }

  load(lang = this.selectedLang()): void {
    this.loading.set(true);
    const langParam = lang !== 'all' ? lang : undefined;
    this.api.articles
      .list({ page: this.pageIndex(), size: this.pageSize(), lang: langParam, q: this.search() || undefined })
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
    this.load(this.selectedLang());
  }

  create(): void {
    const lang = this.selectedLang();
    void this.router.navigate(
      ['/articles/new'],
      lang !== 'all' ? { queryParams: { lang } } : undefined,
    );
  }

  manageCategories(): void {
    this.dialog.open(CategoryManagerDialog, { width: '720px', autoFocus: false });
  }

  onAction(e: TableActionEvent<Article>): void {
    switch (e.event) {
      case 'edit': {
        const lang = this.selectedLang();
        void this.router.navigate(
          ['/articles', e.row.id, 'edit'],
          lang !== 'all' ? { queryParams: { lang } } : undefined,
        );
        break;
      }
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

  private setPublished(item: Article, publish: boolean): void {
    this.api.articles.setPublished(item.id, publish).subscribe(() => {
      this.notify.success(publish ? 'Article published' : 'Article unpublished');
      this.load();
    });
  }

  private remove(item: Article): void {
    confirm(this.dialog, {
      title: 'Delete article',
      message: `Delete "${item.title}"?`,
      confirmText: 'Delete',
      destructive: true,
    }).subscribe((ok) => {
      if (ok) {
        this.api.articles.remove(item.id).subscribe(() => {
          this.notify.success('Article deleted');
          this.load();
        });
      }
    });
  }
}
