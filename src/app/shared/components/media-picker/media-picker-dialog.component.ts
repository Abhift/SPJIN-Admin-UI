import { Component, inject, signal } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MediaService } from '../../../core/services/media.service';
import { MediaAsset } from '../../../core/models/content.models';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

@Component({
  selector: 'app-media-picker-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    EmptyStateComponent,
  ],
  templateUrl: './media-picker-dialog.component.html',
  styleUrl: './media-picker-dialog.component.scss',
})
export class MediaPickerDialogComponent {
  private readonly media = inject(MediaService);
  readonly ref = inject<MatDialogRef<MediaPickerDialogComponent, MediaAsset>>(MatDialogRef);

  readonly assets = signal<MediaAsset[]>([]);
  readonly loading = signal(true);
  readonly uploading = signal(false);
  readonly selectedId = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.media.list({ size: 60 }).subscribe({
      next: (page) => {
        this.assets.set(page.content);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.uploading.set(true);
    this.media.upload(file).subscribe({
      next: (asset) => {
        this.assets.update((list) => [asset, ...list]);
        this.selectedId.set(asset.id);
        this.uploading.set(false);
        input.value = '';
      },
      error: () => this.uploading.set(false),
    });
  }

  select(asset: MediaAsset): void {
    this.selectedId.set(asset.id);
  }

  confirm(): void {
    const chosen = this.assets().find((a) => a.id === this.selectedId());
    if (chosen) {
      this.ref.close(chosen);
    }
  }

  isImage(asset: MediaAsset): boolean {
    return asset.mediaType === 'IMAGE';
  }
}
