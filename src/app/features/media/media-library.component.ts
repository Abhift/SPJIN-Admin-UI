import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MediaService } from '../../core/services/media.service';
import { MediaAsset } from '../../core/models/content.models';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { confirm } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-media-library',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './media-library.component.html',
  styleUrl: './media-library.component.scss',
})
export class MediaLibraryComponent {
  private readonly media = inject(MediaService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);

  readonly assets = signal<MediaAsset[]>([]);
  readonly loading = signal(true);
  readonly uploading = signal(false);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.media.list({ size: 100 }).subscribe({
      next: (page) => {
        this.assets.set(page.content);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.uploading.set(true);
    this.media.upload(file).subscribe({
      next: (asset) => {
        this.assets.update((list) => [asset, ...list]);
        this.uploading.set(false);
        this.notify.success('File uploaded');
        input.value = '';
      },
      error: () => this.uploading.set(false),
    });
  }

  remove(asset: MediaAsset): void {
    confirm(this.dialog, {
      title: 'Delete media',
      message: `Delete "${asset.fileName}"? This cannot be undone.`,
      confirmText: 'Delete',
      destructive: true,
    }).subscribe((ok) => {
      if (ok) {
        this.media.remove(asset.id).subscribe(() => {
          this.assets.update((list) => list.filter((a) => a.id !== asset.id));
          this.notify.success('Media deleted');
        });
      }
    });
  }

  isImage(asset: MediaAsset): boolean {
    return asset.mediaType === 'IMAGE';
  }
}
