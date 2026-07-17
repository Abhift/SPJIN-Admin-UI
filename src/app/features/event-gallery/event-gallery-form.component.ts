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
import { CloudflareMediaService } from '../../core/services/cloudflare-media.service';
import { NotificationService } from '../../core/services/notification.service';
import { EventGallery, EventGalleryImage, EventGalleryRequest } from '../../core/models/content.models';
import { CONTENT_STATUSES, ContentStatus, emptyLocalizedText } from '../../core/models/api.models';
import { LocalizedInputComponent } from '../../shared/components/localized-input/localized-input.component';
import { LanguageSwitchComponent } from '../../shared/components/language-switch/language-switch.component';
import { LocalizedLangService } from '../../shared/services/localized-lang.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SectionLogsComponent } from '../../shared/components/section-logs/section-logs.component';
import { LogEntry } from '../../core/models/audit.models';
import { localizedTextValidator } from '../../shared/validators/localized-text.validator';
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
    LocalizedInputComponent,
    LanguageSwitchComponent,
    PageHeaderComponent,
    SectionLogsComponent,
    MediaUrlPipe,
  ],
  providers: [LocalizedLangService],
  templateUrl: './event-gallery-form.component.html',
  styleUrl: './event-gallery-form.component.scss',
})
export class EventGalleryFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContentApi);
  private readonly cfMedia = inject(CloudflareMediaService);
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

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly statuses = CONTENT_STATUSES;
  readonly logs = signal<LogEntry[]>([]);
  readonly uploadingIndex = signal<number | null>(null);

  readonly form = this.fb.nonNullable.group({
    title: [emptyLocalizedText(), localizedTextValidator(true)],
    slug: ['', [Validators.required, slugValidator()]],
    heading: [emptyLocalizedText()],
    details: [emptyLocalizedText()],
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
      caption: [img.caption ?? emptyLocalizedText()],
      displayOrder: [img.displayOrder ?? this.images.length + 1],
    });
  }

  onImageFile(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingIndex.set(index);
    this.compressImage(file).then((compressed) => {
      this.cfMedia.upload(compressed, 'event-gallery').subscribe({
        next: (asset) => {
          this.images.at(index).get('imageUrl')!.setValue(asset.url);
          this.uploadingIndex.set(null);
          input.value = '';
        },
        error: () => {
          this.uploadingIndex.set(null);
          input.value = '';
        },
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
    const titleEn = this.form.controls.title.value.en;
    if (!slugCtrl.dirty && titleEn) {
      slugCtrl.setValue(slugify(titleEn));
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
      title: g.title,
      slug: g.slug,
      heading: g.heading ?? emptyLocalizedText(),
      details: g.details ?? emptyLocalizedText(),
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
      title: raw.title,
      heading: raw.heading,
      details: raw.details,
      location: raw.location || undefined,
      eventDate: raw.eventDate || undefined,
      status: raw.status,
      images: raw.images.map((img) => ({
        imageUrl: img.imageUrl,
        caption: img.caption,
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
