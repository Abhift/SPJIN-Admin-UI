import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Video, VideoRequest } from '../../core/models/content.models';
import { CONTENT_STATUSES, emptyLocalizedText } from '../../core/models/api.models';
import { LocalizedInputComponent } from '../../shared/components/localized-input/localized-input.component';
import { MediaPickerComponent } from '../../shared/components/media-picker/media-picker.component';
import { localizedTextValidator } from '../../shared/validators/localized-text.validator';
import { slugValidator } from '../../shared/validators/slug.validator';

@Component({
  selector: 'app-video-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    LocalizedInputComponent,
    MediaPickerComponent,
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit video' : 'New video' }}</h2>
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
        </div>
        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Video URL</mat-label>
          <input matInput formControlName="videoUrl" placeholder="https://..." />
          @if (form.controls.videoUrl.hasError('required')) {
            <mat-error>Video URL is required</mat-error>
          }
        </mat-form-field>
        <app-localized-input
          label="Description"
          formControlName="description"
          [multiline]="true"
        ></app-localized-input>
        <app-media-picker label="Thumbnail" formControlName="thumbnailId"></app-media-picker>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving()">Save</button>
      </mat-dialog-actions>
    </form>
  `,
})
export class VideoFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContentApi);
  private readonly notify = inject(NotificationService);
  readonly data = inject<Video | null>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<VideoFormDialog, boolean>>(MatDialogRef);

  readonly statuses = CONTENT_STATUSES;
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    title: [this.data?.title ?? emptyLocalizedText(), localizedTextValidator(true)],
    slug: [this.data?.slug ?? '', [Validators.required, slugValidator()]],
    status: [this.data?.status ?? 'DRAFT'],
    videoUrl: [this.data?.videoUrl ?? '', Validators.required],
    description: [this.data?.description ?? emptyLocalizedText()],
    thumbnailId: this.fb.control<string | null>(this.data?.thumbnailId ?? null),
  });

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const body = this.form.getRawValue() as VideoRequest;
    const req = this.data
      ? this.api.videos.update(this.data.id, body)
      : this.api.videos.create(body);
    req.subscribe({
      next: () => {
        this.notify.success('Video saved');
        this.ref.close(true);
      },
      error: () => this.saving.set(false),
    });
  }
}
