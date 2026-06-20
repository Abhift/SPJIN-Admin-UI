import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { LocalizedText } from '../../core/models/api.models';

/**
 * Validates a `LocalizedText` value. English is always required when `requireEn`;
 * Hindi is encouraged but optional (the backend falls back to English).
 */
export function localizedTextValidator(requireEn = true): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as LocalizedText | null;
    if (requireEn && !value?.en?.trim()) {
      return { localizedRequired: true };
    }
    return null;
  };
}
