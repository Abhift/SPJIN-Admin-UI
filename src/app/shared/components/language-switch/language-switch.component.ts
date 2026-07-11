import { Component, inject } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { LANGS, LocalizedLangService } from '../../services/localized-lang.service';

/**
 * One language toggle per form. Must be used inside a component that
 * provides `LocalizedLangService` in its `providers` array — every
 * `app-localized-input` in that same component subtree then follows it.
 */
@Component({
  selector: 'app-language-switch',
  standalone: true,
  imports: [MatButtonToggleModule],
  template: `
    <div class="language-switch">
      <span class="label">Language</span>
      <mat-button-toggle-group
        [value]="langService.lang()"
        (change)="langService.switch($event.value)"
        [hideSingleSelectionIndicator]="true"
        aria-label="Language"
      >
        @for (l of langs; track l.value) {
          <mat-button-toggle [value]="l.value">{{ l.label }}</mat-button-toggle>
        }
      </mat-button-toggle-group>
    </div>
  `,
  styles: [
    `
      .language-switch {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }
      .label {
        font-size: 0.85rem;
        font-weight: 500;
        color: rgba(0, 0, 0, 0.6);
      }
      mat-button-toggle-group {
        height: 32px;
      }
    `,
  ],
})
export class LanguageSwitchComponent {
  protected readonly langService = inject(LocalizedLangService);
  protected readonly langs = LANGS;
}
