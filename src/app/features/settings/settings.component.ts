import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { ContentApi } from '../../core/services/content-api.service';
import { Setting } from '../../core/models/content.models';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import {
  DataTableComponent,
  RowAction,
  TableActionEvent,
  TableColumn,
} from '../../shared/components/data-table/data-table.component';
import { SettingFormDialog } from './setting-form.dialog';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    PageHeaderComponent,
    EmptyStateComponent,
    DataTableComponent,
  ],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  private readonly api = inject(ContentApi);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<Setting[]>([]);
  readonly loading = signal(true);

  readonly columns: TableColumn<Setting>[] = [
    { key: 'key', header: 'Key', value: (r) => r.key },
    { key: 'value', header: 'Value', value: (r) => this.preview(r.value) },
    { key: 'description', header: 'Description', value: (r) => r.description ?? '' },
  ];

  readonly actions: RowAction<Setting>[] = [
    { label: 'Edit', icon: 'edit', event: 'edit' },
  ];

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.listSettings().subscribe({
      next: (page) => {
        this.rows.set(page.content);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  create(): void {
    this.openForm(null);
  }

  onAction(e: TableActionEvent<Setting>): void {
    if (e.event === 'edit') {
      this.openForm(e.row);
    }
  }

  private preview(value: unknown): string {
    const json = JSON.stringify(value);
    return json.length > 60 ? json.slice(0, 60) + '…' : json;
  }

  private openForm(setting: Setting | null): void {
    this.dialog
      .open(SettingFormDialog, { data: setting, width: '560px', autoFocus: false })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }
}
