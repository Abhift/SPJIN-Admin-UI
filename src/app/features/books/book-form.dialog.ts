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
import { ContentApi } from '../../core/services/content-api.service';
import { CloudflareMediaService } from '../../core/services/cloudflare-media.service';
import { NotificationService } from '../../core/services/notification.service';
import { Book, BookRequest } from '../../core/models/content.models';
import { CONTENT_STATUSES, emptyLocalizedText } from '../../core/models/api.models';
import { LocalizedInputComponent } from '../../shared/components/localized-input/localized-input.component';
import { LanguageSwitchComponent } from '../../shared/components/language-switch/language-switch.component';
import { LocalizedLangService } from '../../shared/services/localized-lang.service';
import { SectionLogsComponent } from '../../shared/components/section-logs/section-logs.component';
import { localizedTextValidator } from '../../shared/validators/localized-text.validator';
import { slugValidator, slugify } from '../../shared/validators/slug.validator';

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
    LocalizedInputComponent,
    LanguageSwitchComponent,
    SectionLogsComponent,
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
        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Cover image URL</mat-label>
          <input matInput formControlName="coverImageUrl" placeholder="https://... or upload" />
          <button
            mat-icon-button
            matSuffix
            type="button"
            matTooltip="Upload cover image"
            [disabled]="uploadingCover()"
            (click)="coverInput.click()"
          >
            <mat-icon>{{ uploadingCover() ? 'hourglass_top' : 'cloud_upload' }}</mat-icon>
          </button>
          <mat-hint>Uploads are named after the slug, e.g. "{{ baseName() }}-cover"</mat-hint>
          @if (form.controls.coverImageUrl.hasError('pattern')) {
            <mat-error>Must be a valid http(s) URL</mat-error>
          }
        </mat-form-field>
        <input
          #coverInput
          type="file"
          accept="image/*"
          hidden
          (change)="onUpload($event, 'cover')"
        />
        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Book file URL (PDF)</mat-label>
          <input matInput formControlName="fileUrl" placeholder="https://... or upload" />
          <button
            mat-icon-button
            matSuffix
            type="button"
            matTooltip="Upload PDF"
            [disabled]="uploadingFile()"
            (click)="pdfInput.click()"
          >
            <mat-icon>{{ uploadingFile() ? 'hourglass_top' : 'cloud_upload' }}</mat-icon>
          </button>
          <mat-hint>Uploads are named after the slug, e.g. "{{ baseName() }}.pdf"</mat-hint>
          @if (form.controls.fileUrl.hasError('pattern')) {
            <mat-error>Must be a valid http(s) URL</mat-error>
          }
        </mat-form-field>
        <input
          #pdfInput
          type="file"
          accept="application/pdf"
          hidden
          (change)="onUpload($event, 'pdf')"
        />
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
  `,
})
export class BookFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContentApi);
  private readonly notify = inject(NotificationService);
  readonly data = inject<Book | null>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<BookFormDialog, boolean>>(MatDialogRef);

  private readonly cfMedia = inject(CloudflareMediaService);

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
    coverImageUrl: [this.data?.coverImageUrl ?? '', Validators.pattern(/^https?:\/\/.+/)],
    fileUrl: [this.data?.fileUrl ?? '', Validators.pattern(/^https?:\/\/.+/)],
  });

  /** File name prefix that ties an uploaded asset back to this book. */
  baseName(): string {
    return this.form.controls.slug.value || slugify(this.form.controls.title.value.en) || 'book';
  }

  onUpload(event: Event, kind: 'cover' | 'pdf'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
    const name = kind === 'cover' ? `${this.baseName()}-cover${ext}` : `${this.baseName()}${ext}`;
    const renamed = new File([file], name, { type: file.type });
    const uploading = kind === 'cover' ? this.uploadingCover : this.uploadingFile;
    const control =
      kind === 'cover' ? this.form.controls.coverImageUrl : this.form.controls.fileUrl;
    uploading.set(true);
    this.cfMedia.upload(renamed, 'books').subscribe({
      next: (asset) => {
        control.setValue(asset.url);
        control.markAsDirty();
        uploading.set(false);
        this.notify.success(`Uploaded as "${asset.fileName}"`);
        input.value = '';
      },
      error: () => {
        uploading.set(false);
        input.value = '';
      },
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
