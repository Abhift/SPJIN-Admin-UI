import { Component, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog } from '@angular/material/dialog';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/auth/auth.service';
import { Video } from '../../core/models/content.models';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import {
  DataTableComponent,
  RowAction,
  TableActionEvent,
  TableColumn,
} from '../../shared/components/data-table/data-table.component';
import { confirm } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { VideoFormDialog } from './video-form.dialog';

@Component({
  selector: 'app-videos-list',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatSelectModule,
    MatFormFieldModule,
    PageHeaderComponent,
    EmptyStateComponent,
    DataTableComponent,
  ],
  templateUrl: './videos-list.component.html',
})
export class VideosListComponent {
  private readonly api = inject(ContentApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);

  readonly rows = signal<Video[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly loading = signal(true);
  readonly selectedLang = signal<'all' | 'hi' | 'en' | 'gu' | 'ne'>('all');

  readonly langOptions: { value: 'all' | 'hi' | 'en' | 'gu' | 'ne'; label: string }[] = [
    { value: 'all', label: 'All Languages' },
    { value: 'hi', label: 'हिन्दी' },
    { value: 'en', label: 'English' },
    { value: 'gu', label: 'ગુજરાતી' },
    { value: 'ne', label: 'नेपाली' },
  ];

  private readonly langLabels: Record<string, string> = {
    hi: 'हिन्दी',
    en: 'English',
    gu: 'ગુજરાતી',
    ne: 'नेपाली',
  };

  readonly canWrite = this.auth.hasPermission('content:write');
  readonly canDelete = this.auth.hasPermission('content:delete');
  readonly canPublish = this.auth.hasPermission('content:publish');

  readonly columns: TableColumn<Video>[] = [
    { key: 'title', header: 'Title', value: (r) => r.title },
    { key: 'youtubeVideoId', header: 'Video / Playlist ID', value: (r) => r.youtubeVideoId ?? r.playlistId ?? '' },
    { key: 'language', header: 'Language', value: (r) => (r.language ? (this.langLabels[r.language] ?? r.language) : '') },
    { key: 'displayOrder', header: 'Order', value: (r) => String(r.displayOrder) },
    { key: 'status', header: 'Status', type: 'status', value: (r) => r.status },
  ];

  readonly actions: RowAction<Video>[] = [
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
    effect(() => {
      const lang = this.selectedLang();
      this.pageIndex.set(0);
      this.load(lang);
    }, { allowSignalWrites: true });
  }

  load(lang = this.selectedLang()): void {
    this.loading.set(true);
    const langParam = lang !== 'all' ? lang : undefined;
    this.api.videos.list({ page: this.pageIndex(), size: this.pageSize(), sort: 'displayOrder,asc', lang: langParam }).subscribe({
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

  onAction(e: TableActionEvent<Video>): void {
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

  private openForm(item: Video | null): void {
    this.dialog
      .open(VideoFormDialog, { data: item, width: '640px', autoFocus: false })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  private setPublished(item: Video, publish: boolean): void {
    this.api.videos.setPublished(item.id, publish).subscribe(() => {
      this.notify.success(publish ? 'Video published' : 'Video unpublished');
      this.load();
    });
  }

  private remove(item: Video): void {
    confirm(this.dialog, {
      title: 'Delete video',
      message: `Delete "${item.title}"?`,
      confirmText: 'Delete',
      destructive: true,
    }).subscribe((ok) => {
      if (ok) {
        this.api.videos.remove(item.id).subscribe(() => {
          this.notify.success('Video deleted');
          this.load();
        });
      }
    });
  }
}
