import { Component, computed, inject, signal } from '@angular/core';
import { LogEntry } from '../../core/models/audit.models';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Video, VideoRequest, VideoType } from '../../core/models/content.models';
import { CONTENT_STATUSES } from '../../core/models/api.models';
import { SectionLogsComponent } from '../../shared/components/section-logs/section-logs.component';

const URL_PATTERN = /^https?:\/\/.+/;

const VIDEO_TYPES: { value: VideoType; label: string; icon: string }[] = [
  { value: 'VIDEO',           label: 'YouTube Video',    icon: '▶' },
  { value: 'SHORTS',          label: 'YouTube Shorts',   icon: '📱' },
  { value: 'PLAYLIST',        label: 'Playlist Video',   icon: '☰' },
  { value: 'PLAYLIST_SHORTS', label: 'Playlist Shorts',  icon: '📋' },
];

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
    SectionLogsComponent,
  ],
  styles: [`
    .type-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .type-card {
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 8px 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      font-weight: 500;
      color: rgba(0,0,0,.7);
      transition: border-color 0.15s, background 0.15s;
      user-select: none;
    }
    .type-card:hover { border-color: #90caf9; background: #f5f9ff; }
    .type-card.selected { border-color: #1976d2; background: #e3f2fd; color: #1565c0; }
    .type-card .icon { font-size: 1rem; }
    .section-label { font-size: 12px; color: rgba(0,0,0,.6); font-weight: 500; margin-bottom: 4px; display: block; }
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

        <div class="form-grid">
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
        </div>

        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Display Order</mat-label>
          <input matInput type="number" formControlName="displayOrder" min="0" placeholder="0" />
          @if (form.controls.displayOrder.hasError('min')) {
            <mat-error>Must be 0 or greater</mat-error>
          }
          @if (form.controls.displayOrder.hasError('duplicate')) {
            <mat-error>{{ form.controls.displayOrder.getError('duplicate') }}</mat-error>
          }
        </mat-form-field>

        <!-- Video Type -->
        <span class="section-label">Video Type</span>
        <div class="type-grid">
          @for (opt of videoTypeOptions; track opt.value) {
            <div class="type-card"
                 [class.selected]="selectedType() === opt.value"
                 (click)="setType(opt.value)">
              <span class="icon">{{ opt.icon }}</span>
              {{ opt.label }}
            </div>
          }
        </div>

        <!-- YouTube ID + Thumbnail (VIDEO / SHORTS) -->
        @if (isYoutubeType()) {
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
              <mat-error>Enter a valid URL starting with http(s)://</mat-error>
            }
          </mat-form-field>
        }

        <!-- Playlist ID (PLAYLIST / PLAYLIST_SHORTS) -->
        @if (isPlaylistType()) {
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
  private readonly fb      = inject(FormBuilder);
  private readonly api     = inject(ContentApi);
  private readonly notify  = inject(NotificationService);
  readonly data            = inject<Video | null>(MAT_DIALOG_DATA);
  private readonly ref     = inject<MatDialogRef<VideoFormDialog, boolean>>(MatDialogRef);

  readonly statuses        = CONTENT_STATUSES;
  readonly videoTypeOptions = VIDEO_TYPES;
  readonly saving          = signal(false);
  readonly logs            = signal<LogEntry[]>([]);

  private initialType(): VideoType {
    if (this.data?.videoType) return this.data.videoType;
    return this.data?.playlistId ? 'PLAYLIST' : 'VIDEO';
  }

  readonly selectedType = signal<VideoType>(this.initialType());
  readonly isYoutubeType  = computed(() => this.selectedType() === 'VIDEO' || this.selectedType() === 'SHORTS');
  readonly isPlaylistType = computed(() => this.selectedType() === 'PLAYLIST' || this.selectedType() === 'PLAYLIST_SHORTS');

  readonly form = this.fb.nonNullable.group({
    title:          [this.data?.title ?? '', Validators.required],
    status:         [this.data?.status ?? 'DRAFT'],
    language:       [this.data?.language ?? ''],
    displayOrder:   [this.data?.displayOrder ?? 0, [Validators.required, Validators.min(0)]],
    youtubeVideoId: [this.data?.youtubeVideoId ?? ''],
    playlistId:     [this.data?.playlistId ?? ''],
    thumbnailUrl:   [this.data?.thumbnailUrl ?? ''],
    description:    [this.data?.description ?? ''],
  });

  constructor() {
    if (this.data?.id) {
      this.api.videos.get(this.data.id).subscribe((v) => this.logs.set(v.logs ?? []));
    }
    this.applyValidators();
  }

  setType(type: VideoType): void {
    this.selectedType.set(type);
    // Clear fields that don't belong to the new type
    if (this.isYoutubeType()) {
      this.form.controls.playlistId.reset('');
    } else {
      this.form.controls.youtubeVideoId.reset('');
      this.form.controls.thumbnailUrl.reset('');
    }
    this.applyValidators();
  }

  private applyValidators(): void {
    const { youtubeVideoId, playlistId, thumbnailUrl } = this.form.controls;
    if (this.isYoutubeType()) {
      youtubeVideoId.setValidators(Validators.required);
      thumbnailUrl.setValidators([Validators.required, Validators.pattern(URL_PATTERN)]);
      playlistId.clearValidators();
    } else {
      playlistId.setValidators(Validators.required);
      youtubeVideoId.clearValidators();
      thumbnailUrl.clearValidators();
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
      title:        raw.title.trim(),
      status:       raw.status as VideoRequest['status'],
      language:     raw.language || undefined,
      videoType:    this.selectedType(),
      displayOrder: raw.displayOrder,
      description:  raw.description || undefined,
      ...(this.isYoutubeType()
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
      error: (err) => {
        this.saving.set(false);
        const msg: string = err?.error?.message ?? '';
        if (msg.toLowerCase().includes('display order')) {
          this.form.controls.displayOrder.setErrors({ duplicate: msg });
        }
      },
    });
  }
}
