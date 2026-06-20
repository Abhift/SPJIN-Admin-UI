import { Pipe, PipeTransform } from '@angular/core';
import { LocalizedText } from '../../core/models/api.models';

/** Renders a bilingual value, preferring the requested language then falling back. */
@Pipe({ name: 'localize', standalone: true })
export class LocalizePipe implements PipeTransform {
  transform(value: LocalizedText | null | undefined, lang: 'en' | 'hi' = 'en'): string {
    if (!value) {
      return '';
    }
    return value[lang] || value.en || value.hi || '';
  }
}
