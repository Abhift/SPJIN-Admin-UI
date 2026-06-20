import { Component, Input, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { LocalizedText, emptyLocalizedText } from '../../../core/models/api.models';

type Lang = 'en' | 'hi';

/**
 * Bilingual (English / Hindi) text control backing a `LocalizedText` value.
 * Renders a language toggle and an input/textarea that edits one language at a time.
 */
@Component({
  selector: 'app-localized-input',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonToggleModule],
  templateUrl: './localized-input.component.html',
  styleUrl: './localized-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LocalizedInputComponent),
      multi: true,
    },
  ],
})
export class LocalizedInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() multiline = false;
  @Input() rows = 4;
  @Input() required = false;
  @Input() hint = '';

  readonly lang = signal<Lang>('en');
  readonly value = signal<LocalizedText>(emptyLocalizedText());
  disabled = false;

  private onChange: (value: LocalizedText) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: LocalizedText | null): void {
    this.value.set(value ? { en: value.en ?? '', hi: value.hi ?? '' } : emptyLocalizedText());
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

  update(text: string): void {
    const next: LocalizedText = { ...this.value(), [this.lang()]: text };
    this.value.set(next);
    this.onChange(next);
  }

  blur(): void {
    this.onTouched();
  }

  switchLang(lang: Lang): void {
    this.lang.set(lang);
  }
}
