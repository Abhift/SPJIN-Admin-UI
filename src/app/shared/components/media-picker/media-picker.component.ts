import { Component, Input, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MediaService } from '../../../core/services/media.service';
import { MediaAsset } from '../../../core/models/content.models';
import { MediaPickerDialogComponent } from './media-picker-dialog.component';

/** Form control that stores a media asset id and shows a thumbnail preview. */
@Component({
  selector: 'app-media-picker',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './media-picker.component.html',
  styleUrl: './media-picker.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MediaPickerComponent),
      multi: true,
    },
  ],
})
export class MediaPickerComponent implements ControlValueAccessor {
  @Input() label = 'Image';

  private readonly dialog = inject(MatDialog);
  private readonly media = inject(MediaService);

  readonly asset = signal<MediaAsset | null>(null);
  readonly mediaId = signal<string | null>(null);
  disabled = false;

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.mediaId.set(value ?? null);
    if (value) {
      this.media.get(value).subscribe({
        next: (asset) => this.asset.set(asset),
        error: () => this.asset.set(null),
      });
    } else {
      this.asset.set(null);
    }
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  open(): void {
    this.dialog
      .open(MediaPickerDialogComponent, { width: 'auto', autoFocus: false })
      .afterClosed()
      .subscribe((asset: MediaAsset | undefined) => {
        this.onTouched();
        if (asset) {
          this.asset.set(asset);
          this.mediaId.set(asset.id);
          this.onChange(asset.id);
        }
      });
  }

  clear(): void {
    this.asset.set(null);
    this.mediaId.set(null);
    this.onChange(null);
    this.onTouched();
  }

  isImage(): boolean {
    return this.asset()?.mediaType === 'IMAGE';
  }
}
