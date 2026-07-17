import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { switchMap, of, filter } from 'rxjs';
import { confirm } from '../components/confirm-dialog/confirm-dialog.component';
import { ContentApi } from '../../core/services/content-api.service';

/**
 * Reusable service for confirming image / file removal across any form.
 *
 * Usage:
 *   private readonly mediaDelete = inject(MediaDeleteService);
 *
 *   removeImage(index: number): void {
 *     const url = this.images.at(index).get('imageUrl')!.value;
 *     this.mediaDelete.confirmRemove(url, () => this.images.removeAt(index));
 *   }
 *
 * On confirm the file is immediately moved to uploadDeleted/ on the server,
 * then onConfirm() is called. Files in uploadDeleted/ are auto-purged after 7 days
 * by TrashCleanupScheduler.
 */
@Injectable({ providedIn: 'root' })
export class MediaDeleteService {
  private readonly dialog = inject(MatDialog);
  private readonly api = inject(ContentApi);

  /**
   * Shows the remove-image confirm dialog.
   * On confirm: moves the file to server trash immediately, then calls onConfirm().
   * fileUrl is optional — pass it whenever the image has already been uploaded.
   */
  confirmRemove(fileUrl: string | null | undefined, onConfirm: () => void): void {
    confirm(this.dialog, {
      title: 'Remove image',
      message:
        'Are you sure you want to remove this image? The file will be moved to trash and permanently deleted after 7 days.',
      confirmText: 'Yes, remove',
      cancelText: 'Cancel',
      destructive: true,
    })
      .pipe(
        filter((v): v is boolean => v === true),
        switchMap(() =>
          fileUrl && fileUrl.startsWith('/uploads/') ? this.api.trashFile(fileUrl) : of(undefined),
        ),
      )
      .subscribe(() => onConfirm());
  }
}
