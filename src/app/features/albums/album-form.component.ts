import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Album, AlbumImage, AlbumRequest } from '../../core/models/content.models';
import { CONTENT_STATUSES, ContentStatus, LocalizedText, emptyLocalizedText } from '../../core/models/api.models';
import { LocalizedInputComponent } from '../../shared/components/localized-input/localized-input.component';
import { LanguageSwitchComponent } from '../../shared/components/language-switch/language-switch.component';
import { LocalizedLangService } from '../../shared/services/localized-lang.service';
import { MediaPickerComponent } from '../../shared/components/media-picker/media-picker.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { MediaPickerDialogComponent } from '../../shared/components/media-picker/media-picker-dialog.component';
import { MediaAsset } from '../../core/models/content.models';
import { SectionLogsComponent } from '../../shared/components/section-logs/section-logs.component';
import { LogEntry } from '../../core/models/audit.models';
import { localizedTextValidator } from '../../shared/validators/localized-text.validator';
import { slugValidator, slugify } from '../../shared/validators/slug.validator';

@Component({
  selector: 'app-album-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    LocalizedInputComponent,
    LanguageSwitchComponent,
    MediaPickerComponent,
    PageHeaderComponent,
    SectionLogsComponent,
  ],
  providers: [LocalizedLangService],
  templateUrl: './album-form.component.html',
  styleUrl: './album-form.component.scss',
})
export class AlbumFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContentApi);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  private _id: string | null = null;
  set id(value: string | undefined) {
    this._id = value ?? null;
    if (value) {
      this.loadAlbum(value);
    }
  }

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly statuses = CONTENT_STATUSES;
  readonly logs = signal<LogEntry[]>([]);

  readonly form = this.fb.nonNullable.group({
    title: [emptyLocalizedText(), localizedTextValidator(true)],
    slug: ['', [Validators.required, slugValidator()]],
    status: ['DRAFT' as ContentStatus],
    description: [emptyLocalizedText()],
    coverImageId: this.fb.control<string | null>(null),
    images: this.fb.array<ReturnType<AlbumFormComponent['imageGroup']>>([]),
  });

  get images(): FormArray {
    return this.form.controls.images;
  }

  private imageGroup(img: Partial<AlbumImage>) {
    return this.fb.nonNullable.group({
      mediaId: [img.mediaId ?? '', Validators.required],
      url: [img.url ?? ''],
      caption: [img.caption ?? emptyLocalizedText()],
      displayOrder: [img.displayOrder ?? this.images.length],
    });
  }

  autoSlug(): void {
    const slugCtrl = this.form.controls.slug;
    const titleEn = this.form.controls.title.value.en;
    if (!slugCtrl.dirty && titleEn) {
      slugCtrl.setValue(slugify(titleEn));
    }
  }

  addImages(): void {
    this.dialog
      .open(MediaPickerDialogComponent, { width: 'auto', autoFocus: false })
      .afterClosed()
      .subscribe((asset: MediaAsset | undefined) => {
        if (asset) {
          this.images.push(
            this.imageGroup({ mediaId: asset.id, url: asset.url, displayOrder: this.images.length }),
          );
        }
      });
  }

  removeImage(index: number): void {
    this.images.removeAt(index);
  }

  imageUrl(index: number): string {
    return (this.images.at(index).get('url')?.value as string) ?? '';
  }

  private loadAlbum(id: string): void {
    this.editing.set(true);
    this.api.albums.get(id).subscribe((album) => {
      this.logs.set(album.logs ?? []);
      this.patch(album);
    });
  }

  private patch(a: Album): void {
    this.form.patchValue({
      title: a.title,
      slug: a.slug,
      status: a.status,
      description: a.description ?? emptyLocalizedText(),
      coverImageId: a.coverImageId ?? null,
    });
    this.images.clear();
    for (const img of a.images ?? []) {
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
    const body: AlbumRequest = {
      title: raw.title,
      slug: raw.slug,
      status: raw.status,
      description: raw.description,
      coverImageId: raw.coverImageId ?? undefined,
      images: raw.images.map((img, index) => ({
        mediaId: img.mediaId,
        caption: img.caption as LocalizedText,
        displayOrder: index,
      })),
    };
    const req = this._id ? this.api.albums.update(this._id, body) : this.api.albums.create(body);
    req.subscribe({
      next: () => {
        this.notify.success('Album saved');
        void this.router.navigate(['/albums']);
      },
      error: () => this.saving.set(false),
    });
  }

  cancel(): void {
    void this.router.navigate(['/albums']);
  }
}
