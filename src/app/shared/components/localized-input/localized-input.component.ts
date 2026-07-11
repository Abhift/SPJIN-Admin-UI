import { Component, Input, inject, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NgControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ErrorStateMatcher } from '@angular/material/core';
import { LocalizedText, emptyLocalizedText } from '../../../core/models/api.models';
import { Lang, LocalizedLangService } from '../../services/localized-lang.service';

@Component({
  selector: 'app-localized-input',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './localized-input.component.html',
  styleUrl: './localized-input.component.scss',
})
export class LocalizedInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() multiline = false;
  @Input() rows = 4;
  @Input() required = false;
  @Input() hint = '';

  protected readonly ctrl = inject(NgControl, { optional: true, self: true });

  /** Falls back to a private instance when no form-level provider exists. */
  private readonly langService =
    inject(LocalizedLangService, { optional: true }) ?? new LocalizedLangService();

  protected readonly errorMatcher: ErrorStateMatcher = {
    isErrorState: () => !!(this.ctrl?.invalid && this.ctrl?.touched),
  };

  protected readonly lang = this.langService.lang;
  readonly value = signal<LocalizedText>(emptyLocalizedText());
  disabled = false;

  private onChange: (value: LocalizedText) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    if (this.ctrl) this.ctrl.valueAccessor = this;
  }

  writeValue(value: LocalizedText | null): void {
    this.value.set(value ? { en: value.en ?? '', hi: value.hi ?? '', ne: value.ne ?? '', gu: value.gu ?? '' } : emptyLocalizedText());
  }

  registerOnChange(fn: (value: LocalizedText) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  current(): string {
    return this.value()[this.lang()];
  }

  langPlaceholder(): string {
    const map: Record<Lang, string> = { en: 'English', hi: 'Hindi', ne: 'Nepali', gu: 'Gujarati' };
    return map[this.lang()];
  }

  update(text: string): void {
    const next: LocalizedText = { ...this.value(), [this.lang()]: text };
    this.value.set(next);
    this.onChange(next);
  }

  blur(): void {
    this.onTouched();
  }
}
