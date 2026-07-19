import { Component, inject, signal } from '@angular/core';
import { LogEntry } from '../../core/models/audit.models';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Video, VideoRequest } from '../../core/models/content.models';
import { CONTENT_STATUSES } from '../../core/models/api.models';
import { SectionLogsComponent } from '../../shared/components/section-logs/section-logs.component';

const URL_PATTERN = /^https?:\/\/.+/;

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
    MatButtonToggleModule,
    SectionLogsComponent,
  ],
  styles: [`
    .type-toggle { margin-bottom: 16px; }
    .type-label { display: block; font-size: 12px; color: rgba(0,0,0,.6); margin-bottom: 6px; }
    mat-button-toggle-group { width: 100%; }
    mat-button-toggle { flex: 1; }
  `],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit video' : 'New video' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>

        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Title</mat-label>
          <input matInput formControlName="title" placeholder="Enter video title" />
          @if (form.controls.title.hasError('required')) {
            <mat-error>Title is required</mat-error>
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
          <mat-label>Language</mat-label>
          <mat-select formControlName="language">
            <mat-option value="">— None —</mat-option>
            <mat-option value="hi">हिन्दी</mat-option>
            <mat-option value="en">English</mat-option>
            <mat-option value="gu">ગુજરાતી</mat-option>
            <mat-option value="ne">नेपाली</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Display Order</mat-label>
          <input matInput type="number" formControlName="displayOrder" min="0" placeholder="0" />
          @if (form.controls.displayOrder.hasError('min')) {
            <mat-error>Must be 0 or greater</mat-error>
          }
        </mat-form-field>

        <div class="type-toggle">
          <span class="type-label">Type</span>
          <mat-button-toggle-group formControlName="videoType" aria-label="Video type">
            <mat-button-toggle value="video">YouTube Video</mat-button-toggle>
            <mat-button-toggle value="playlist">Playlist</mat-button-toggle>
          </mat-button-toggle-group>
        </div>

        @if (isVideo()) {
          <mat-form-field class="full-width" appearance="outline">
            <mat-label>YouTube Video ID</mat-label>
            <input matInput formControlName="youtubeVideoId" placeholder="e.g. dQw4w9WgXcQ" />
            @if (form.controls.youtubeVideoId.hasError('required')) {
              <mat-error>YouTube Video ID is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field class="full-width" appearance="outline">
            <mat-label>Thumbnail URL</mat-label>
            <input matInput formControlName="thumbnailUrl" placeholder="https://example.com/thumbnail.jpg" type="url" />
            @if (form.controls.thumbnailUrl.hasError('required')) {
              <mat-error>Thumbnail URL is required</mat-error>
            }
            @if (form.controls.thumbnailUrl.hasError('pattern')) {
              <mat-error>Enter a valid image URL starting with http(s)://</mat-error>
            }
          </mat-form-field>
        } @else {
          <mat-form-field class="full-width" appearance="outline">
            <mat-label>Playlist ID</mat-label>
            <input matInput formControlName="playlistId" placeholder="e.g. PL590L5WQmH8fJ54F1fO1l7GgQ5W5R5JwP" />
            @if (form.controls.playlistId.hasError('required')) {
              <mat-error>Playlist ID is required</mat-error>
            }
          </mat-form-field>
        }

        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3" placeholder="Enter description (optional)"></textarea>
        </mat-form-field>

        @if (data) {
          <app-section-logs [logs]="logs()"></app-section-logs>
        }

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
  readonly logs = signal<LogEntry[]>([]);
  readonly isVideo = signal(!this.data?.playlistId);

  readonly form = this.fb.nonNullable.group({
    title: [this.data?.title ?? '', Validators.required],
    status: [this.data?.status ?? 'DRAFT'],
    language: [this.data?.language ?? ''],
    displayOrder: [this.data?.displayOrder ?? 0, [Validators.required, Validators.min(0)]],
    videoType: [this.data?.playlistId ? 'playlist' : 'video'],
    youtubeVideoId: [this.data?.youtubeVideoId ?? ''],
    playlistId: [this.data?.playlistId ?? ''],
    thumbnailUrl: [this.data?.thumbnailUrl ?? ''],
    description: [this.data?.description ?? ''],
  });

  constructor() {
    if (this.data?.id) {
      this.api.videos.get(this.data.id).subscribe((v) => this.logs.set(v.logs ?? []));
    }
    this.applyValidators();
    this.form.controls.videoType.valueChanges.subscribe((type) => {
      this.isVideo.set(type === 'video');
      this.applyValidators();
    });
  }

  private applyValidators(): void {
    const { youtubeVideoId, playlistId, thumbnailUrl } = this.form.controls;
    if (this.isVideo()) {
      youtubeVideoId.setValidators(Validators.required);
      thumbnailUrl.setValidators([Validators.required, Validators.pattern(URL_PATTERN)]);
      playlistId.clearValidators();
      playlistId.reset('');
    } else {
      playlistId.setValidators(Validators.required);
      youtubeVideoId.clearValidators();
      thumbnailUrl.clearValidators();
      youtubeVideoId.reset('');
      thumbnailUrl.reset('');
    }
    youtubeVideoId.updateValueAndValidity({ emitEvent: false });
    playlistId.updateValueAndValidity({ emitEvent: false });
    thumbnailUrl.updateValueAndValidity({ emitEvent: false });
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body: VideoRequest = {
      title: raw.title.trim(),
      status: raw.status,
      language: raw.language || undefined,
      displayOrder: raw.displayOrder,
      description: raw.description || undefined,
      ...(this.isVideo()
        ? { youtubeVideoId: raw.youtubeVideoId, thumbnailUrl: raw.thumbnailUrl }
        : { playlistId: raw.playlistId }),
    };
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
