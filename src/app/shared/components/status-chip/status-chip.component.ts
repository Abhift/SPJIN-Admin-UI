import { Component, Input } from '@angular/core';
import { ContentStatus } from '../../../core/models/api.models';

@Component({
  selector: 'app-status-chip',
  standalone: true,
  template: `<span class="chip" [class]="cssClass()">{{ label() }}</span>`,
  styles: [
    `
      .chip {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        text-transform: capitalize;
      }
      .draft {
        background: #eceff1;
        color: #455a64;
      }
      .published {
        background: #e6f4ea;
        color: #1b7a36;
      }
      .archived {
        background: #fbe9e7;
        color: #b0411e;
      }
      .scheduled {
        background: #e8eaf6;
        color: #3949ab;
      }
    `,
  ],
})
export class StatusChipComponent {
  @Input({ required: true }) status!: ContentStatus;

  label(): string {
    return this.status.charAt(0) + this.status.slice(1).toLowerCase();
  }

  cssClass(): string {
    return this.status.toLowerCase();
  }
}
