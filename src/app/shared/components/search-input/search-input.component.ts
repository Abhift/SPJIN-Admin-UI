import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Compact debounced search box for list-page headers. Emits the trimmed
 * query 300ms after the user stops typing, and an empty string on clear.
 */
@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="search-box">
      <mat-icon class="search-icon">search</mat-icon>
      <input
        type="text"
        [placeholder]="placeholder"
        [value]="value"
        (input)="onInput($any($event.target).value)"
      />
      @if (value) {
        <button type="button" class="clear-btn" aria-label="Clear search" (click)="clear()">
          <mat-icon>close</mat-icon>
        </button>
      }
    </div>
  `,
  styles: [
    `
      .search-box {
        display: flex;
        align-items: center;
        gap: 6px;
        height: 40px;
        padding: 0 8px 0 12px;
        border: 1px solid rgba(0, 0, 0, 0.38);
        border-radius: 20px;
        background: #fff;
        min-width: 220px;
      }
      .search-box:focus-within {
        border-color: #005cbb;
      }
      .search-icon {
        color: rgba(0, 0, 0, 0.54);
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      input {
        border: none;
        outline: none;
        flex: 1;
        min-width: 0;
        font: inherit;
        background: transparent;
      }
      .clear-btn {
        border: none;
        background: none;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        color: rgba(0, 0, 0, 0.54);
      }
      .clear-btn mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    `,
  ],
})
export class SearchInputComponent implements OnDestroy {
  @Input() placeholder = 'Search…';
  @Output() readonly search = new EventEmitter<string>();

  value = '';
  private timer: ReturnType<typeof setTimeout> | null = null;

  onInput(value: string): void {
    this.value = value;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.search.emit(this.value.trim()), 300);
  }

  clear(): void {
    if (this.timer) clearTimeout(this.timer);
    this.value = '';
    this.search.emit('');
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }
}
