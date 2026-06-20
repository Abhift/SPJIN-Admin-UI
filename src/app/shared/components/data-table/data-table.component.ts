import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ContentStatus } from '../../../core/models/api.models';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StatusChipComponent } from '../status-chip/status-chip.component';

export type ColumnType = 'text' | 'status' | 'image' | 'date';

export interface TableColumn<T> {
  key: string;
  header: string;
  type?: ColumnType;
  value: (row: T) => string;
}

export interface RowAction<T> {
  label: string;
  icon: string;
  event: string;
  /** Hide the action for rows where this returns false. */
  visible?: (row: T) => boolean;
  destructive?: boolean;
}

export interface TableActionEvent<T> {
  event: string;
  row: T;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    StatusChipComponent,
  ],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent<T extends { id?: string }> {
  @Input({ required: true }) columns: TableColumn<T>[] = [];
  @Input({ required: true }) rows: T[] = [];
  @Input() actions: RowAction<T>[] = [];

  @Output() action = new EventEmitter<TableActionEvent<T>>();

  get displayedColumns(): string[] {
    const cols = this.columns.map((c) => c.key);
    return this.actions.length ? [...cols, 'actions'] : cols;
  }

  asStatus(value: string): ContentStatus {
    return value as ContentStatus;
  }

  visibleActions(row: T): RowAction<T>[] {
    return this.actions.filter((a) => !a.visible || a.visible(row));
  }

  emit(event: string, row: T): void {
    this.action.emit({ event, row });
  }
}
