import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Lowercase letters, numbers and single hyphens (no leading/trailing/double hyphens). */
export function slugValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value as string | null)?.trim();
    if (!value) {
      return null;
    }
    return SLUG_PATTERN.test(value) ? null : { slug: true };
  };
}

/** Derive a URL slug from arbitrary text. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
