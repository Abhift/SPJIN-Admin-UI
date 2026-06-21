import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { Clipboard } from '@angular/cdk/clipboard';
import {
  CloudflareAsset,
  CloudflareMediaService,
  CLOUDFLARE_SECTION_TYPES,
  CloudflareSectionType,
} from '../../core/services/cloudflare-media.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { confirm } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-upload-media',
  standalone: true,
  imports: [
    DatePipe,
    TitleCasePipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatProgressBarModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './upload-media.component.html',
  styleUrl: './upload-media.component.scss',
})
export class UploadMediaComponent {
  private readonly cfMedia = inject(CloudflareMediaService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly clipboard = inject(Clipboard);

  readonly sectionTypes = CLOUDFLARE_SECTION_TYPES;
  readonly assets = signal<CloudflareAsset[]>([]);
  readonly loading = signal(true);
  readonly uploading = signal(false);

  readonly selectedFilter = signal<string>('all');
  uploadSectionType: CloudflareSectionType = 'general';

  readonly filtered = computed(() => {
    const filter = this.selectedFilter();
    const all = this.assets();
    return filter === 'all' ? all : all.filter((a) => a.sectionType === filter);
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.cfMedia.list({ size: 200 }).subscribe({
      next: (page) => {
        this.assets.set(page.content);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private validateFile(file: File): string | null {
    const MB = 1024 * 1024;
    if (file.type.startsWith('image/') && file.size > 2 * MB) {
      return `Image must be less than 2 MB (current: ${this.formatSize(file.size)})`;
    }
    if (file.size > 5 * MB) {
      return `File must be less than 5 MB (current: ${this.formatSize(file.size)})`;
    }
    return null;
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const error = this.validateFile(file);
    if (error) {
      this.notify.error(error);
      input.value = '';
      return;
    }
    this.uploading.set(true);
    this.cfMedia.upload(file, this.uploadSectionType).subscribe({
      next: (asset) => {
        this.assets.update((list) => [asset, ...list]);
        this.uploading.set(false);
        this.notify.success('Uploaded to Cloudflare');
        input.value = '';
      },
      error: () => this.uploading.set(false),
    });
  }

  copyUrl(url: string): void {
    this.clipboard.copy(url);
    this.notify.success('URL copied to clipboard');
  }

  remove(asset: CloudflareAsset): void {
    confirm(this.dialog, {
      title: 'Delete file',
      message: `Delete "${asset.fileName}" from Cloudflare? This cannot be undone.`,
      confirmText: 'Delete',
      destructive: true,
    }).subscribe((ok) => {
      if (ok) {
        this.cfMedia.remove(asset.id).subscribe(() => {
          this.assets.update((list) => list.filter((a) => a.id !== asset.id));
          this.notify.success('File deleted');
        });
      }
    });
  }

  isImage(asset: CloudflareAsset): boolean {
    return asset.contentType.startsWith('image/');
  }

  fileIcon(asset: CloudflareAsset): string {
    if (asset.contentType.startsWith('image/')) return 'image';
    if (asset.contentType === 'application/pdf') return 'picture_as_pdf';
    if (asset.contentType.includes('word') || asset.contentType.includes('document'))
      return 'article';
    return 'insert_drive_file';
  }

  countByType(type: string): number {
    return this.assets().filter((a) => a.sectionType === type).length;
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
