import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Converts a relative upload path (/uploads/...) to a full URL using the
 * configured mediaBase. Absolute URLs and empty values pass through unchanged.
 *
 * Usage in templates:  [src]="imageUrl | mediaUrl"
 */
@Pipe({ name: 'mediaUrl', standalone: true })
export class MediaUrlPipe implements PipeTransform {
  transform(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return environment.mediaBase + url;
  }
}
