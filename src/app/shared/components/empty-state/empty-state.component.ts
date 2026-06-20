import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="empty">
      <mat-icon>{{ icon }}</mat-icon>
      <p class="title">{{ message }}</p>
      @if (hint) {
        <p class="muted">{{ hint }}</p>
      }
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 56px 16px;
        text-align: center;
      }
      mat-icon {
        font-size: 48px;
        height: 48px;
        width: 48px;
        color: rgba(0, 0, 0, 0.26);
      }
      .title {
        font-size: 1rem;
        font-weight: 500;
        margin: 12px 0 4px;
      }
    `,
  ],
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input({ required: true }) message!: string;
  @Input() hint = '';
}
