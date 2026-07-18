import { Component, inject, signal } from '@angular/core';
import { LogEntry } from '../../core/models/audit.models';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ContentApi } from '../../core/services/content-api.service';
import { MediaService } from '../../core/services/media.service';
import { NotificationService } from '../../core/services/notification.service';
import { Activity, ActivityRequest } from '../../core/models/content.models';
import { CONTENT_STATUSES, emptyLocalizedText } from '../../core/models/api.models';
import { LocalizedInputComponent } from '../../shared/components/localized-input/localized-input.component';
import { LanguageSwitchComponent } from '../../shared/components/language-switch/language-switch.component';
import { LocalizedLangService } from '../../shared/services/localized-lang.service';
import { SectionLogsComponent } from '../../shared/components/section-logs/section-logs.component';
import { localizedTextValidator } from '../../shared/validators/localized-text.validator';
import { slugValidator, slugify } from '../../shared/validators/slug.validator';

@Component({
  selector: 'app-activity-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    LocalizedInputComponent,
    LanguageSwitchComponent,
    SectionLogsComponent,
  ],
  providers: [LocalizedLangService, provideNativeDateAdapter()],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit activity' : 'New activity' }}</h2>
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
          <mat-form-field appearance="outline">
            <mat-label>Event date</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="eventDate" />
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>
        </div>
        <app-localized-input label="Location" formControlName="location"></app-localized-input>
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
          (change)="onUpload($event)"
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
          [disabled]="saving() || uploadingCover()"
        >
          Save
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class ActivityFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContentApi);
  private readonly media = inject(MediaService);
  private readonly notify = inject(NotificationService);
  readonly data = inject<Activity | null>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<ActivityFormDialog, boolean>>(MatDialogRef);

  readonly statuses = CONTENT_STATUSES;
  readonly saving = signal(false);
  readonly uploadingCover = signal(false);
  readonly logs = signal<LogEntry[]>([]);

  constructor() {
    if (this.data?.id) {
      this.api.activities.get(this.data.id).subscribe((a) => this.logs.set(a.logs ?? []));
    }
  }

  readonly form = this.fb.nonNullable.group({
    title: [this.data?.title ?? emptyLocalizedText(), localizedTextValidator(true)],
    slug: [this.data?.slug ?? '', [Validators.required, slugValidator()]],
    status: [this.data?.status ?? 'DRAFT'],
    eventDate: this.fb.control<Date | null>(this.data?.eventDate ? new Date(this.data.eventDate) : null),
    location: [this.data?.location ?? emptyLocalizedText()],
    description: [this.data?.description ?? emptyLocalizedText()],
    coverImageUrl: [this.data?.coverImageUrl ?? '', Validators.pattern(/^https?:\/\/.+/)],
  });

  /** File name prefix that ties an uploaded asset back to this activity. */
  baseName(): string {
    return this.form.controls.slug.value || slugify(this.form.controls.title.value.en) || 'activity';
  }

  onUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
    const renamed = new File([file], `${this.baseName()}-cover${ext}`, { type: file.type });
    this.uploadingCover.set(true);
    this.media.upload(renamed, 'activities').subscribe({
      next: (asset) => {
        this.form.controls.coverImageUrl.setValue(asset.url);
        this.form.controls.coverImageUrl.markAsDirty();
        this.uploadingCover.set(false);
        this.notify.success(`Uploaded as "${asset.fileName}"`);
        input.value = '';
      },
      error: () => {
        this.uploadingCover.set(false);
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
    const body: ActivityRequest = {
      title: raw.title,
      slug: raw.slug,
      status: raw.status,
      description: raw.description,
      location: raw.location,
      coverImageUrl: raw.coverImageUrl.trim() || undefined,
      eventDate: raw.eventDate ? raw.eventDate.toISOString().slice(0, 10) : undefined,
    };
    const req = this.data
      ? this.api.activities.update(this.data.id, body)
      : this.api.activities.create(body);
    req.subscribe({
      next: () => {
        this.notify.success('Activity saved');
        this.ref.close(true);
      },
      error: () => this.saving.set(false),
    });
  }
}
