import { Component, inject, signal } from '@angular/core';
import { LogEntry } from '../../core/models/audit.models';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ContentApi } from '../../core/services/content-api.service';
import { MediaService } from '../../core/services/media.service';
import { NotificationService } from '../../core/services/notification.service';
import { MediaDeleteService } from '../../shared/services/media-delete.service';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';
import { Book, BookRequest } from '../../core/models/content.models';
import { CONTENT_STATUSES, emptyLocalizedText } from '../../core/models/api.models';
import { LocalizedInputComponent } from '../../shared/components/localized-input/localized-input.component';
import { LanguageSwitchComponent } from '../../shared/components/language-switch/language-switch.component';
import { LocalizedLangService } from '../../shared/services/localized-lang.service';
import { SectionLogsComponent } from '../../shared/components/section-logs/section-logs.component';
import { localizedTextValidator } from '../../shared/validators/localized-text.validator';
import { slugValidator } from '../../shared/validators/slug.validator';

@Component({
  selector: 'app-book-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressBarModule,
    LocalizedInputComponent,
    LanguageSwitchComponent,
    SectionLogsComponent,
    MediaUrlPipe,
  ],
  providers: [LocalizedLangService],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit book' : 'New book' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        <app-language-switch></app-language-switch>
        <app-localized-input
          label="Title"
          formControlName="title"
          [required]="true"
        ></app-localized-input>
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Slug</mat-label>
            <input matInput formControlName="slug" />
            @if (form.controls.slug.hasError('required')) {
              <mat-error>Slug is required</mat-error>
            } @else if (form.controls.slug.hasError('slug')) {
              <mat-error>Lowercase letters, numbers and hyphens only</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              @for (s of statuses; track s) {
                <mat-option [value]="s">{{ s }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
        <app-localized-input label="Author" formControlName="author"></app-localized-input>
        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Category</mat-label>
          <input matInput formControlName="category" placeholder="e.g. Spirituality" />
        </mat-form-field>
        <app-localized-input
          label="Description"
          formControlName="description"
          [multiline]="true"
        ></app-localized-input>

        <!-- Cover image upload -->
        <div class="cover-section">
          <span class="cover-label">Cover image</span>
          <input type="file" accept="image/*" hidden #coverInput (change)="onCoverFile($event)" />

          @if (form.controls.coverImageUrl.value) {
            <div class="cover-preview">
              <img
                class="cover-thumb"
                [src]="form.controls.coverImageUrl.value | mediaUrl"
                alt="Cover preview"
                loading="lazy"
              />
              <div class="cover-actions">
                @if (uploadingCover()) {
                  <mat-progress-bar mode="indeterminate"></mat-progress-bar>
                } @else {
                  <button mat-stroked-button type="button" matTooltip="Replace cover" (click)="coverInput.click()">
                    <mat-icon>cloud_upload</mat-icon> Replace
                  </button>
                  <button mat-stroked-button color="warn" type="button" matTooltip="Remove cover" (click)="removeCover()">
                    <mat-icon>delete</mat-icon> Remove
                  </button>
                }
              </div>
            </div>
          } @else {
            <div class="cover-empty">
              @if (uploadingCover()) {
                <mat-progress-bar mode="indeterminate" style="width:240px"></mat-progress-bar>
              } @else {
                <button mat-stroked-button type="button" (click)="coverInput.click()">
                  <mat-icon>add_photo_alternate</mat-icon> Upload cover image
                </button>
              }
            </div>
          }
        </div>

        <!-- PDF upload -->
        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Book file (PDF)</mat-label>
          <input matInput formControlName="fileUrl" placeholder="Upload a PDF or paste URL" />
          <button
            mat-icon-button
            matSuffix
            type="button"
            matTooltip="Upload PDF"
            [disabled]="uploadingFile()"
            (click)="pdfInput.click()"
          >
            <mat-icon>{{ uploadingFile() ? 'hourglass_top' : 'upload_file' }}</mat-icon>
          </button>
        </mat-form-field>
        <input #pdfInput type="file" accept="application/pdf" hidden (change)="onPdfFile($event)" />

        @if (data) {
          <app-section-logs [logs]="logs()"></app-section-logs>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button
          mat-flat-button
          color="primary"
          type="submit"
          [disabled]="saving() || uploadingCover() || uploadingFile()"
        >
          Save
        </button>
      </mat-dialog-actions>
    </form>

    <style>
      .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
      .full-width { width: 100%; }
      .cover-section { display: flex; flex-direction: column; gap: 10px; margin: 8px 0 16px; }
      .cover-label { font-size: 12px; color: rgba(0,0,0,0.6); font-weight: 500; }
      .cover-preview { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
      .cover-thumb { width: 120px; height: 160px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(0,0,0,0.12); }
      .cover-actions { display: flex; flex-direction: column; gap: 8px; justify-content: center; }
      .cover-empty { display: flex; align-items: center; }
    </style>
  `,
})
export class BookFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContentApi);
  private readonly media = inject(MediaService);
  private readonly notify = inject(NotificationService);
  private readonly mediaDelete = inject(MediaDeleteService);
  readonly data = inject<Book | null>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<BookFormDialog, boolean>>(MatDialogRef);

  readonly statuses = CONTENT_STATUSES;
  readonly saving = signal(false);
  readonly uploadingCover = signal(false);
  readonly uploadingFile = signal(false);
  readonly logs = signal<LogEntry[]>([]);

  constructor() {
    if (this.data?.id) {
      this.api.books.get(this.data.id).subscribe((b) => this.logs.set(b.logs ?? []));
    }
  }

  readonly form = this.fb.nonNullable.group({
    title: [this.data?.title ?? emptyLocalizedText(), localizedTextValidator(true)],
    slug: [this.data?.slug ?? '', [Validators.required, slugValidator()]],
    status: [this.data?.status ?? 'DRAFT'],
    author: [this.data?.author ?? emptyLocalizedText()],
    category: [this.data?.category ?? ''],
    description: [this.data?.description ?? emptyLocalizedText()],
    coverImageUrl: [this.data?.coverImageUrl ?? ''],
    fileUrl: [this.data?.fileUrl ?? ''],
  });

  onCoverFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const oldUrl = this.form.controls.coverImageUrl.value;
    this.uploadingCover.set(true);
    this.compressImage(file).then((compressed) => {
      this.media.upload(compressed, 'books').subscribe({
        next: (asset) => {
          this.form.controls.coverImageUrl.setValue(asset.url);
          this.uploadingCover.set(false);
          input.value = '';
          if (oldUrl && oldUrl.startsWith('/uploads/')) {
            this.api.trashFile(oldUrl).subscribe();
          }
        },
        error: () => {
          this.uploadingCover.set(false);
          input.value = '';
        },
      });
    });
  }

  removeCover(): void {
    const url = this.form.controls.coverImageUrl.value;
    this.mediaDelete.confirmRemove(url, () => {
      this.form.controls.coverImageUrl.setValue('');
    });
  }

  onPdfFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingFile.set(true);
    this.media.upload(file, 'books').subscribe({
      next: (asset) => {
        this.form.controls.fileUrl.setValue(asset.url);
        this.form.controls.fileUrl.markAsDirty();
        this.uploadingFile.set(false);
        this.notify.success(`PDF uploaded`);
        input.value = '';
      },
      error: () => {
        this.uploadingFile.set(false);
        input.value = '';
      },
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

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body: BookRequest = {
      ...raw,
      coverImageUrl: raw.coverImageUrl.trim() || undefined,
      fileUrl: raw.fileUrl.trim() || undefined,
    };
    const req = this.data ? this.api.books.update(this.data.id, body) : this.api.books.create(body);
    req.subscribe({
      next: () => {
        this.notify.success('Book saved');
        this.ref.close(true);
      },
      error: () => this.saving.set(false),
    });
  }
}
