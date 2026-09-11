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
import { ContentApi } from '../../core/services/content-api.service';
import { Book, EventGallery, EventGalleryImage } from '../../core/models/content.models';
import { compressImage, validateImageSize, validateFileSize, formatFileSize } from '../../shared/utils/upload.utils';

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
  private readonly contentApi = inject(ContentApi);

  readonly sectionTypes = SECTION_TYPES;
  readonly assets = signal<MediaAsset[]>([]);
  readonly loading = signal(true);
  readonly uploading = signal(false);
  readonly compressing = signal(false);
  readonly uploadTotal = signal(0);
  readonly uploadIndex = signal(0);

  /** null = root folder view; a section type string = inside that folder */
  readonly activeFolder = signal<SectionType | null>(null);

  /** Event gallery sub-folder state */
  readonly eventGalleries = signal<EventGallery[]>([]);
  readonly activeEventSlug = signal<string | null>(null);
  readonly activeEventGallery = signal<EventGallery | null>(null);
  readonly eventSlugImages = computed<EventGalleryImage[]>(() =>
    this.activeEventGallery()?.images ?? []
  );

  /** Assets in event-gallery section not linked to any slug */
  readonly unorganizedEventAssets = computed<MediaAsset[]>(() => {
    const linkedUrls = new Set(
      this.eventGalleries().flatMap(g => (g.images ?? []).map(i => i.imageUrl))
    );
    return this.assets().filter(
      a => a.sectionType === 'event-gallery' && !linkedUrls.has(a.url)
    );
  });

  /** Book sub-folder state */
  readonly books = signal<Book[]>([]);
  readonly activeBook = signal<Book | null>(null);
  readonly booksShowUnorganized = signal(false);

  readonly activeBookAssets = computed<MediaAsset[]>(() => {
    const book = this.activeBook();
    if (!book) return [];
    return this.assets().filter(
      a => a.url === book.coverImageUrl || a.url === book.fileUrl
    );
  });

  readonly unorganizedBookAssets = computed<MediaAsset[]>(() => {
    const linkedUrls = new Set(
      this.books().flatMap(b => [b.coverImageUrl, b.fileUrl].filter(Boolean) as string[])
    );
    return this.assets().filter(
      a => a.sectionType === 'books' && !linkedUrls.has(a.url)
    );
  });

  readonly DONATION_SLOTS = [
    { name: 'home-hero', label: 'Home Hero Image', icon: 'home' },
    { name: 'UpiQrCode', label: 'UPI QR Code', icon: 'qr_code_2' },
  ] as const;

  readonly BOOKS_BANNER_SLOTS = [
    { name: 'page-banner', label: 'Books Page Banner', icon: 'auto_stories' },
  ] as const;

  readonly ARTICLES_BANNER_SLOTS = [
    { name: 'page-banner', label: 'Articles Page Banner', icon: 'article' },
  ] as const;

  readonly VIDEOS_BANNER_SLOTS = [
    { name: 'page-banner', label: 'Videos Page Banner', icon: 'smart_display' },
  ] as const;

  readonly PATRIKA_BANNER_SLOTS = [
    { name: 'page-banner', label: 'Patrika Page Banner', icon: 'newspaper' },
  ] as const;

  readonly SWAMI_JI_PIC_SLOTS = [
    { name: 'swami-ji', label: 'Swami Ji Portrait', icon: 'person' },
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
    if (type === 'event-gallery') {
      this.loadEventGalleries();
    }
    if (type === 'books') {
      this.loadBooks();
    }
  }

  exitFolder(): void {
    this.activeFolder.set(null);
    this.activeEventSlug.set(null);
    this.activeBook.set(null);
    this.booksShowUnorganized.set(false);
  }

  private loadEventGalleries(): void {
    this.contentApi.eventGalleries.list({ page: 0, size: 200 }).subscribe({
      next: (page) => {
        this.eventGalleries.set(page.content);
        // Fetch full detail for each gallery to get the images array
        // (list response only returns imageCount, not the images themselves)
        page.content.forEach(g => {
          this.contentApi.eventGalleries.get(g.id).subscribe({
            next: (full) => {
              this.eventGalleries.update(list =>
                list.map(eg => eg.id === full.id ? full : eg)
              );
            },
            error: () => {},
          });
        });
      },
      error: () => {},
    });
  }

  enterEventSlug(slug: string): void {
    this.activeEventSlug.set(slug);
    this.activeEventGallery.set(null);
    const gallery = this.eventGalleries().find(g => g.slug === slug);
    if (!gallery) return;
    this.contentApi.eventGalleries.get(gallery.id).subscribe({
      next: (full) => this.activeEventGallery.set(full),
      error: () => {},
    });
  }

  exitEventSlug(): void {
    this.activeEventSlug.set(null);
    this.activeEventGallery.set(null);
  }

  private loadBooks(): void {
    this.contentApi.books.list({ page: 0, size: 200 }).subscribe({
      next: (page) => this.books.set(page.content),
      error: () => {},
    });
  }

  enterBook(book: Book): void {
    this.activeBook.set(book);
    this.booksShowUnorganized.set(false);
  }

  enterBookUnorganized(): void {
    this.activeBook.set(null);
    this.booksShowUnorganized.set(true);
  }

  exitBook(): void {
    this.activeBook.set(null);
    this.booksShowUnorganized.set(false);
  }

  bookAssetCount(book: Book): number {
    return this.assets().filter(
      a => a.url === book.coverImageUrl || a.url === book.fileUrl
    ).length;
  }

  eventGalleryImageCount(slug: string): number {
    const g = this.eventGalleries().find(eg => eg.slug === slug);
    return g?.imageCount ?? g?.images?.length ?? 0;
  }

  private readonly compressImage = compressImage;

  private validateNonImage(file: File): string | null {
    return validateFileSize(file);
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    const folder = this.activeFolder()!;
    this.uploadFiles(Array.from(files), folder, input);
  }

  private async uploadFiles(
    files: File[],
    sectionType: string,
    input: HTMLInputElement,
  ): Promise<void> {
    this.uploading.set(true);
    this.uploadTotal.set(files.length);
    this.uploadIndex.set(0);

    let successCount = 0;

    for (const file of files) {
      this.uploadIndex.update((n) => n + 1);

      if (file.type.startsWith('image/')) {
        this.compressing.set(true);
        const compressed = await this.compressImage(file);
        this.compressing.set(false);
        const savedBytes = file.size - compressed.size;
        if (savedBytes > 0) {
          this.notify.info(
            `Image compressed: ${this.formatSize(file.size)} → ${this.formatSize(compressed.size)}`,
          );
        }
        const imgError = validateImageSize(compressed);
        if (imgError) {
          this.notify.error(`${file.name}: ${imgError}`);
          continue;
        }
        if (await this.uploadFile(compressed, sectionType)) successCount++;
      } else {
        const error = this.validateNonImage(file);
        if (error) {
          this.notify.error(`${file.name}: ${error}`);
          continue;
        }
        if (await this.uploadFile(file, sectionType)) successCount++;
      }
    }

    this.uploading.set(false);
    this.uploadTotal.set(0);
    this.uploadIndex.set(0);
    input.value = '';

    if (successCount > 0) {
      this.notify.success(
        successCount > 1 ? `${successCount} files uploaded successfully` : 'Uploaded successfully',
      );
    }
  }

  private uploadFile(file: File, sectionType: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.media.upload(file, sectionType).subscribe({
        next: (asset) => {
          this.assets.update((list) => [asset, ...list]);
          resolve(true);
        },
        error: () => resolve(false),
      });
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

  onBannerFile(event: Event, sectionType: string, slotName: string, input: HTMLInputElement): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingSlot.set(slotName);
    this.compressImage(file).then((compressed) => {
      this.media.upload(compressed, sectionType as any, slotName).subscribe({
        next: (asset) => {
          this.assets.update((list) => {
            const rest = list.filter((a) => {
              const filename = a.url.split('/').pop() ?? '';
              const base = filename.replace(/\.[^.]+$/, '');
              return !(a.sectionType === sectionType && base === slotName);
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

  onBooksBannerFile(event: Event, slotName: string, input: HTMLInputElement): void {
    this.onBannerFile(event, 'books-banner', slotName, input);
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
      'books-banner': 'image',
      'articles-banner': 'image',
      'videos-banner': 'image',
      'patrika-banner': 'newspaper',
      'home-swami-ji': 'person',
    };
    return icons[type] ?? 'folder';
  }

  formatSize = formatFileSize;
}
