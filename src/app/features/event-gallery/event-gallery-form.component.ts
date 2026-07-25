import { Component, Input, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MediaDeleteService } from '../../shared/services/media-delete.service';
import { ContentApi } from '../../core/services/content-api.service';
import { MediaService } from '../../core/services/media.service';
import { NotificationService } from '../../core/services/notification.service';
import { EventGallery, EventGalleryImage, EventGalleryRequest } from '../../core/models/content.models';
import { CONTENT_STATUSES, ContentStatus } from '../../core/models/api.models';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SectionLogsComponent } from '../../shared/components/section-logs/section-logs.component';
import { LogEntry } from '../../core/models/audit.models';
import { slugValidator, slugify } from '../../shared/validators/slug.validator';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-event-gallery-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    PageHeaderComponent,
    SectionLogsComponent,
    MediaUrlPipe,
  ],
  templateUrl: './event-gallery-form.component.html',
  styleUrl: './event-gallery-form.component.scss',
})
export class EventGalleryFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContentApi);
  private readonly media = inject(MediaService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly mediaDelete = inject(MediaDeleteService);

  private _id: string | null = null;

  @Input() set id(value: string | undefined) {
    this._id = value ?? null;
    if (value) {
      this.loadGallery(value);
    }
  }

  @Input() set lang(value: string | undefined) {
    if (value) {
      this.form.controls.language.setValue(value);
    }
  }

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly statuses = CONTENT_STATUSES;
  readonly logs = signal<LogEntry[]>([]);
  readonly uploadingIndex = signal<number | null>(null);
  readonly multiProgress = signal<{ done: number; total: number } | null>(null);

  readonly langOptions = [
    { value: 'hi', label: 'हिन्दी' },
    { value: 'en', label: 'English' },
    { value: 'gu', label: 'ગુજરાતી' },
    { value: 'ne', label: 'नेपाली' },
  ];

  readonly form = this.fb.nonNullable.group({
    language: ['hi', Validators.required],
    title: ['', Validators.required],
    slug: ['', [Validators.required, slugValidator()]],
    heading: [''],
    details: [''],
    location: [''],
    eventDate: [''],
    status: ['DRAFT' as ContentStatus],
    images: this.fb.array<ReturnType<EventGalleryFormComponent['imageGroup']>>([]),
  });

  get images(): FormArray {
    return this.form.controls.images;
  }

  private imageGroup(img: Partial<EventGalleryImage> = {}) {
    return this.fb.nonNullable.group({
      imageUrl: [img.imageUrl ?? '', Validators.required],
      caption: [img.caption ?? ''],
      displayOrder: [img.displayOrder ?? this.images.length + 1],
    });
  }

  onImageFile(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const oldUrl = this.images.at(index).get('imageUrl')!.value as string;

    this.uploadingIndex.set(index);
    this.compressImage(file).then((compressed) => {
      this.media.upload(compressed, 'event-gallery').subscribe({
        next: (asset) => {
          this.images.at(index).get('imageUrl')!.setValue(asset.url);
          this.uploadingIndex.set(null);
          input.value = '';
          if (oldUrl && oldUrl.startsWith('/uploads/')) {
            this.api.trashFile(oldUrl).subscribe();
          }
        },
        error: () => {
          this.uploadingIndex.set(null);
          input.value = '';
        },
      });
    });
  }

  onMultipleFiles(event: Event, input: HTMLInputElement): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!files.length) return;

    const startIndex = this.images.length;
    const startOrder = startIndex + 1;
    const prog = { done: 0, total: files.length };
    this.multiProgress.set({ ...prog });

    files.forEach((_, i) => {
      this.images.push(this.imageGroup({ displayOrder: startOrder + i }));
    });

    files.forEach((file, i) => {
      const rowIndex = startIndex + i;
      this.compressImage(file).then((compressed) => {
        this.media.upload(compressed, 'event-gallery').subscribe({
          next: (asset) => {
            this.images.at(rowIndex).get('imageUrl')!.setValue(asset.url);
            prog.done++;
            if (prog.done === prog.total) { this.multiProgress.set(null); input.value = ''; }
            else this.multiProgress.set({ ...prog });
          },
          error: () => {
            prog.done++;
            if (prog.done === prog.total) { this.multiProgress.set(null); input.value = ''; }
            else this.multiProgress.set({ ...prog });
          },
        });
      });
    });
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

  autoSlug(): void {
    const slugCtrl = this.form.controls.slug;
    const title = this.form.controls.title.value;
    if (!slugCtrl.dirty && title) {
      slugCtrl.setValue(slugify(title));
    }
  }

  addImage(): void {
    this.images.push(this.imageGroup({ displayOrder: this.images.length + 1 }));
  }

  removeImage(index: number): void {
    const url = this.images.at(index).get('imageUrl')!.value as string;
    this.mediaDelete.confirmRemove(url, () => this.images.removeAt(index));
  }

  private loadGallery(id: string): void {
    this.editing.set(true);
    this.api.eventGalleries.get(id).subscribe((g) => {
      this.logs.set(g.logs ?? []);
      this.patch(g);
    });
  }

  private patch(g: EventGallery): void {
    this.form.patchValue({
      language: g.language ?? 'hi',
      title: g.title,
      slug: g.slug,
      heading: g.heading ?? '',
      details: g.details ?? '',
      location: g.location ?? '',
      eventDate: g.eventDate ?? '',
      status: g.status,
    });
    this.images.clear();
    for (const img of g.images ?? []) {
      this.images.push(this.imageGroup(img));
    }
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      this.notify.error('Please fix the highlighted fields.');
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body: EventGalleryRequest = {
      slug: raw.slug,
      language: raw.language,
      title: raw.title,
      heading: raw.heading || undefined,
      details: raw.details || undefined,
      location: raw.location || undefined,
      eventDate: raw.eventDate || undefined,
      status: raw.status,
      images: raw.images.map((img) => ({
        imageUrl: img.imageUrl,
        caption: img.caption || undefined,
        displayOrder: img.displayOrder,
      })),
    };
    const req = this._id
      ? this.api.eventGalleries.update(this._id, body)
      : this.api.eventGalleries.create(body);
    req.subscribe({
      next: () => {
        this.notify.success('Event gallery saved');
        void this.router.navigate(['/event-gallery']);
      },
      error: () => this.saving.set(false),
    });
  }

  cancel(): void {
    void this.router.navigate(['/event-gallery']);
  }
}
