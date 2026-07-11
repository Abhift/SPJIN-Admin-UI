import { Injectable, signal } from '@angular/core';

export type Lang = 'en' | 'hi' | 'ne' | 'gu';

export const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'hi', label: 'हिं' },
  { value: 'ne', label: 'नेपा' },
  { value: 'gu', label: 'ગુજ' },
];

/**
 * Provided per-form (via the form component's `providers` array) so every
 * `app-localized-input` inside that form shares one language toggle instead
 * of each field having its own.
 */
@Injectable()
export class LocalizedLangService {
  readonly lang = signal<Lang>('en');

  switch(lang: Lang): void {
    this.lang.set(lang);
  }
}
