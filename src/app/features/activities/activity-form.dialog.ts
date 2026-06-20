import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Activity, ActivityRequest } from '../../core/models/content.models';
import { CONTENT_STATUSES, emptyLocalizedText } from '../../core/models/api.models';
import { LocalizedInputComponent } from '../../shared/components/localized-input/localized-input.component';
import { MediaPickerComponent } from '../../shared/components/media-picker/media-picker.component';
import { localizedTextValidator } from '../../shared/validators/localized-text.validator';
import { slugValidator } from '../../shared/validators/slug.validator';

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
    MatNativeDateModule,
    MatButtonModule,
    LocalizedInputComponent,
    MediaPickerComponent,
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit activity' : 'New activity' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
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
        <app-media-picker label="Cover image" formControlName="coverImageId"></app-media-picker>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving()">Save</button>
      </mat-dialog-actions>
    </form>
  `,
})
export class ActivityFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContentApi);
  private readonly notify = inject(NotificationService);
  readonly data = inject<Activity | null>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<ActivityFormDialog, boolean>>(MatDialogRef);

  readonly statuses = CONTENT_STATUSES;
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    title: [this.data?.title ?? emptyLocalizedText(), localizedTextValidator(true)],
    slug: [this.data?.slug ?? '', [Validators.required, slugValidator()]],
    status: [this.data?.status ?? 'DRAFT'],
    eventDate: this.fb.control<Date | null>(this.data?.eventDate ? new Date(this.data.eventDate) : null),
    location: [this.data?.location ?? emptyLocalizedText()],
    description: [this.data?.description ?? emptyLocalizedText()],
    coverImageId: this.fb.control<string | null>(this.data?.coverImageId ?? null),
  });

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
      coverImageId: raw.coverImageId ?? undefined,
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
