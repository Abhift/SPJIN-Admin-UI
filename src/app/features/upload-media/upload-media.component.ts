import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { Clipboard } from '@angular/cdk/clipboard';
import {
  MediaAsset,
  MediaService,
  SECTION_TYPES,
  SectionType,
} from '../../core/services/media.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { confirm } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-upload-media',
  standalone: true,
  imports: [
    DatePipe,
    TitleCasePipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressBarModule,
    PageHeaderComponent,
    EmptyStateComponent,
    MediaUrlPipe,
  ],
  templateUrl: './upload-media.component.html',
  styleUrl: './upload-media.component.scss',
})
export class UploadMediaComponent {
  private readonly media = inject(MediaService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly clipboard = inject(Clipboard);

  readonly sectionTypes = SECTION_TYPES;
  readonly assets = signal<MediaAsset[]>([]);
  readonly loading = signal(true);
  readonly uploading = signal(false);
  readonly compressing = signal(false);

  /** null = root folder view; a section type string = inside that folder */
  readonly activeFolder = signal<SectionType | null>(null);

  readonly DONATION_SLOTS = [
    { name: 'home-hero', label: 'Home Hero Image', icon: 'home' },
    { name: 'UpiQrCode', label: 'UPI QR Code', icon: 'qr_code_2' },
  ] as const;

  readonly uploadingSlot = signal<string | null>(null);

  readonly folderAssets = computed(() => {
    const folder = this.activeFolder();
    if (!folder) return [];
    return this.assets().filter((a) => a.sectionType === folder);
  });

  readonly folderCounts = computed(() => {
    const counts: Record<string, number> = Object.fromEntries(
      this.sectionTypes.map((t) => [t, 0]),
    );
    for (const a of this.assets()) {
      counts[a.sectionType] = (counts[a.sectionType] ?? 0) + 1;
    }
    return counts;
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.media.list({ size: 500 }).subscribe({
      next: (page) => {
        this.assets.set(page.content);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  enterFolder(type: SectionType): void {
    this.activeFolder.set(type);
  }

  exitFolder(): void {
    this.activeFolder.set(null);
  }

  private compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        URL.revokeObjectURL(objectUrl);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              const name = file.name.replace(/\.[^.]+$/, '.webp');
              resolve(new File([blob], name, { type: 'image/webp' }));
            } else {
              resolve(file);
            }
          },
          'image/webp',
          0.85,
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    });
  }

  private validateNonImage(file: File): string | null {
    const MB = 1024 * 1024;
    if (file.size > 5 * MB) {
      return `File must be less than 5 MB (current: ${this.formatSize(file.size)})`;
    }
    return null;
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const folder = this.activeFolder()!;

    if (file.type.startsWith('image/')) {
      this.compressing.set(true);
      this.compressImage(file).then((compressed) => {
        this.compressing.set(false);
        const savedBytes = file.size - compressed.size;
        if (savedBytes > 0) {
          this.notify.info(
            `Image compressed: ${this.formatSize(file.size)} → ${this.formatSize(compressed.size)}`,
          );
        }
        this.uploadFile(compressed, folder, input);
      });
    } else {
      const error = this.validateNonImage(file);
      if (error) {
        this.notify.error(error);
        input.value = '';
        return;
      }
      this.uploadFile(file, folder, input);
    }
  }

  private uploadFile(file: File, sectionType: string, input: HTMLInputElement): void {
    this.uploading.set(true);
    this.media.upload(file, sectionType).subscribe({
      next: (asset) => {
        this.assets.update((list) => [asset, ...list]);
        this.uploading.set(false);
        this.notify.success('Uploaded successfully');
        input.value = '';
      },
      error: () => this.uploading.set(false),
    });
  }

  copyUrl(url: string): void {
    this.clipboard.copy(url);
    this.notify.success('URL copied to clipboard');
  }

  remove(asset: MediaAsset): void {
    const type = asset.contentType.startsWith('image/') ? 'image' : 'file';
    confirm(this.dialog, {
      title: `Delete ${type}`,
      message: `Are you sure you want to delete "${asset.fileName}"? This action cannot be undone.`,
      confirmText: 'Yes, delete',
      cancelText: 'Cancel',
      destructive: true,
    }).subscribe((ok) => {
      if (ok) {
        this.media.remove(asset.id).subscribe(() => {
          this.assets.update((list) => list.filter((a) => a.id !== asset.id));
          this.notify.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`);
        });
      }
    });
  }

  isImage(asset: MediaAsset): boolean {
    return asset.contentType.startsWith('image/');
  }

  fileIcon(asset: MediaAsset): string {
    if (asset.contentType.startsWith('image/')) return 'image';
    if (asset.contentType === 'application/pdf') return 'picture_as_pdf';
    if (asset.contentType.includes('word') || asset.contentType.includes('document'))
      return 'article';
    return 'insert_drive_file';
  }

  donationSlotAsset(slotName: string): MediaAsset | undefined {
    return this.folderAssets().find((a) => {
      const filename = a.url.split('/').pop() ?? '';
      const base = filename.replace(/\.[^.]+$/, '');
      return base === slotName;
    });
  }

  onDonationFile(event: Event, slotName: string, input: HTMLInputElement): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingSlot.set(slotName);
    this.compressImage(file).then((compressed) => {
      this.media.upload(compressed, 'donation', slotName).subscribe({
        next: (asset) => {
          this.assets.update((list) => {
            const rest = list.filter((a) => {
              const filename = a.url.split('/').pop() ?? '';
              const base = filename.replace(/\.[^.]+$/, '');
              return !(a.sectionType === 'donation' && base === slotName);
            });
            return [asset, ...rest];
          });
          this.uploadingSlot.set(null);
          this.notify.success(`${slotName} updated`);
          input.value = '';
        },
        error: () => {
          this.uploadingSlot.set(null);
          input.value = '';
        },
      });
    });
  }

  folderIcon(type: string): string {
    const icons: Record<string, string> = {
      'hero': 'wallpaper',
      'articles': 'article',
      'books': 'menu_book',
      'videos': 'smart_display',
      'activities': 'event',
      'albums': 'photo_library',
      'event-gallery': 'collections',
      'pages': 'web',
      'quotes': 'format_quote',
      'testimonials': 'reviews',
      'branches': 'location_on',
      'menus': 'list',
      'achievements': 'emoji_events',
      'general': 'folder',
      'donation': 'volunteer_activism',
    };
    return icons[type] ?? 'folder';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
