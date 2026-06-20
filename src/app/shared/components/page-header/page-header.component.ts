import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <header class="page-header">
      <div class="titles">
        <h1>{{ title }}</h1>
        @if (subtitle) {
          <p class="muted">{{ subtitle }}</p>
        }
      </div>
      <div class="actions">
        <ng-content></ng-content>
      </div>
    </header>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 20px;
      }
      h1 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
      }
      p {
        margin: 4px 0 0;
        font-size: 0.9rem;
      }
      .actions {
        display: flex;
        gap: 12px;
        flex-shrink: 0;
      }
    `,
  ],
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle = '';
}
