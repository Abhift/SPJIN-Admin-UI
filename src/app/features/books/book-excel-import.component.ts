import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import * as XLSX from 'xlsx';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { BookRequest } from '../../core/models/content.models';

const COLUMNS = ['title', 'language', 'author', 'category', 'fileUrl', 'coverImageUrl', 'status', 'description'] as const;
const VALID_LANGS    = ['hi', 'en', 'gu', 'ne'];
const VALID_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'SCHEDULED'];

type RowStatus = 'pending' | 'importing' | 'success' | 'updated' | 'skipped' | 'error';

interface ImportRow {
  title: string; language: string; author: string;
  category: string; fileUrl: string; coverImageUrl: string;
  status: string; description: string;
  errors: string[]; rowStatus: RowStatus; errorMessage?: string;
}

const normalise = (s: string) => s.trim().toLowerCase();
const makeKey   = (title: string, lang: string) => `${normalise(title)}|${normalise(lang)}`;

@Component({
  selector: 'app-book-excel-import',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule, MatProgressBarModule,
    MatTableModule, MatTooltipModule, MatCheckboxModule,
    MatChipsModule, MatDividerModule,
  ],
  styles: [`
    .import-card { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; margin-top: 16px; }
    .import-header { background: #f5f5f5; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e0e0e0; }
    .import-body { padding: 16px; }
    .info-box { background: #e3f2fd; border-left: 4px solid #1976d2; padding: 10px 14px; border-radius: 4px; font-size: 0.85rem; margin-bottom: 16px; }
    .info-box a { color: #1565c0; font-weight: 500; }
    .action-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
    .spacer { flex: 1; }
    .preview-wrap { max-height: 380px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 4px; }
    .preview-wrap table { width: 100%; }
    .cell-truncate { max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
    .row-error   td { background: #ffebee !important; }
    .row-success td { background: #e8f5e9 !important; }
    .row-updated td { background: #e3f2fd !important; }
    .row-skipped td { background: #fafafa !important; color: #9e9e9e; }
    .summary { display: flex; align-items: center; gap: 8px; padding: 10px 0 4px; font-size: 0.875rem; }
  `],
  template: `
    <div class="import-card">
      <!-- Header -->
      <div class="import-header">
        <span style="font-weight:600;font-size:0.95rem">
          <mat-icon style="vertical-align:middle;font-size:20px;margin-right:6px;color:#388e3c">table_chart</mat-icon>
          Import Books from Excel
        </span>
        <button mat-icon-button (click)="close.emit()" matTooltip="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="import-body">
        <!-- Info -->
        <div class="info-box">
          <strong>How to handle cover images &amp; PDF files:</strong><br>
          Upload images/PDFs on the <a href="/upload-media" target="_blank">Media Library</a> page first →
          copy the URL → paste it into the <code>coverImageUrl</code> or <code>fileUrl</code> column.<br>
          <strong>Duplicate check:</strong> a book is skipped if a book with the same <em>title</em> and <em>language</em> already exists.
          Enable "Update existing" to overwrite it instead.
        </div>

        <!-- Actions -->
        <div class="action-row">
          <button mat-stroked-button (click)="downloadTemplate()">
            <mat-icon>download</mat-icon> Download Template
          </button>

          <input type="file" accept=".xlsx,.xls" hidden #fileInput (change)="onFile($event, fileInput)" />
          <button mat-stroked-button (click)="fileInput.click()" [disabled]="importing()">
            <mat-icon>upload_file</mat-icon> Choose Excel File
          </button>

          @if (rows().length > 0) {
            <span style="color:#757575;font-size:0.85rem">{{ rows().length }} row{{ rows().length === 1 ? '' : 's' }} loaded</span>

            <mat-checkbox [(ngModel)]="upsertMode" [disabled]="importing()" color="primary">
              Update existing
            </mat-checkbox>

            <span class="spacer"></span>

            <button mat-flat-button color="primary" (click)="importAll()"
                    [disabled]="importing() || !hasValidRows()">
              <mat-icon>cloud_upload</mat-icon>
              {{ importing() ? 'Importing…' : 'Import All Valid Rows' }}
            </button>
          }
        </div>

        <!-- Progress -->
        @if (importing()) {
          <mat-progress-bar mode="determinate" [value]="progressPct()" style="margin-bottom:12px"></mat-progress-bar>
        }

        <!-- Summary -->
        @if (done()) {
          <div class="summary">
            <mat-icon color="primary">info</mat-icon>
            <span>
              <strong>{{ successCount() }}</strong> created
              @if (updatedCount() > 0) { &nbsp;·&nbsp; <strong>{{ updatedCount() }}</strong> updated }
              @if (skippedCount() > 0) { &nbsp;·&nbsp; <strong>{{ skippedCount() }}</strong> skipped (duplicate) }
              @if (failCount()    > 0) { &nbsp;·&nbsp; <strong style="color:#d32f2f">{{ failCount() }}</strong> failed }
            </span>
          </div>
          <mat-divider style="margin-bottom:12px"></mat-divider>
        }

        <!-- Preview table -->
        @if (rows().length > 0) {
          <div class="preview-wrap">
            <table mat-table [dataSource]="rows()">
              <ng-container matColumnDef="num">
                <th mat-header-cell *matHeaderCellDef style="width:36px">#</th>
                <td mat-cell *matCellDef="let row; let i = index">{{ i + 1 }}</td>
              </ng-container>
              <ng-container matColumnDef="title">
                <th mat-header-cell *matHeaderCellDef>Title</th>
                <td mat-cell *matCellDef="let row"><span class="cell-truncate" [matTooltip]="row.title">{{ row.title || '—' }}</span></td>
              </ng-container>
              <ng-container matColumnDef="language">
                <th mat-header-cell *matHeaderCellDef>Lang</th>
                <td mat-cell *matCellDef="let row">{{ row.language || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="author">
                <th mat-header-cell *matHeaderCellDef>Author</th>
                <td mat-cell *matCellDef="let row">{{ row.author || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let row">{{ row.status || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="coverImageUrl">
                <th mat-header-cell *matHeaderCellDef>Cover</th>
                <td mat-cell *matCellDef="let row">
                  @if (row.coverImageUrl) { <mat-icon style="font-size:16px;color:#388e3c">check_circle</mat-icon> }
                  @else { <span style="color:#bdbdbd">—</span> }
                </td>
              </ng-container>
              <ng-container matColumnDef="fileUrl">
                <th mat-header-cell *matHeaderCellDef>File</th>
                <td mat-cell *matCellDef="let row">
                  @if (row.fileUrl) { <mat-icon style="font-size:16px;color:#388e3c">check_circle</mat-icon> }
                  @else { <span style="color:#bdbdbd">—</span> }
                </td>
              </ng-container>
              <ng-container matColumnDef="validation">
                <th mat-header-cell *matHeaderCellDef>Validation</th>
                <td mat-cell *matCellDef="let row">
                  @if (row.errors.length === 0) {
                    <span style="color:#388e3c;font-size:0.75rem;font-weight:600">✓ Valid</span>
                  } @else {
                    <span style="color:#d32f2f;font-size:0.75rem;font-weight:600"
                          [matTooltip]="row.errors.join(' | ')">
                      ✗ {{ row.errors.length }} error{{ row.errors.length > 1 ? 's' : '' }}
                    </span>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="result">
                <th mat-header-cell *matHeaderCellDef>Result</th>
                <td mat-cell *matCellDef="let row">
                  @switch (row.rowStatus) {
                    @case ('pending')   { <span style="color:#bdbdbd">—</span> }
                    @case ('importing') { <mat-icon style="font-size:18px;animation:spin 1s linear infinite">sync</mat-icon> }
                    @case ('success')   { <mat-icon style="font-size:18px;color:#388e3c">check_circle</mat-icon> }
                    @case ('updated')   { <mat-icon style="font-size:18px;color:#1976d2" matTooltip="Updated existing">update</mat-icon> }
                    @case ('skipped')   { <mat-icon style="font-size:18px;color:#ff9800" [matTooltip]="row.errorMessage ?? 'Duplicate'">skip_next</mat-icon> }
                    @case ('error')     { <mat-icon style="font-size:18px;color:#d32f2f" [matTooltip]="row.errorMessage ?? 'Error'">error</mat-icon> }
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"
                  [class.row-error]="row.errors.length > 0"
                  [class.row-success]="row.rowStatus === 'success'"
                  [class.row-updated]="row.rowStatus === 'updated'"
                  [class.row-skipped]="row.rowStatus === 'skipped'"></tr>
            </table>
          </div>

          @if (hasInvalidRows()) {
            <p style="color:#d32f2f;font-size:0.8rem;margin-top:8px">
              <mat-icon style="font-size:15px;vertical-align:middle">warning</mat-icon>
              Rows with validation errors will be skipped. Fix them in the Excel and re-upload.
            </p>
          }
        }
      </div>
    </div>
  `,
})
export class BookExcelImportComponent {
  @Output() close    = new EventEmitter<void>();
  @Output() imported = new EventEmitter<void>();

  private readonly api    = inject(ContentApi);
  private readonly notify = inject(NotificationService);

  readonly rows         = signal<ImportRow[]>([]);
  readonly importing    = signal(false);
  readonly done         = signal(false);
  readonly progressPct  = signal(0);
  readonly successCount = signal(0);
  readonly updatedCount = signal(0);
  readonly skippedCount = signal(0);
  readonly failCount    = signal(0);

  upsertMode = false;

  readonly displayedColumns = ['num', 'title', 'language', 'author', 'status', 'coverImageUrl', 'fileUrl', 'validation', 'result'];

  hasValidRows  = () => this.rows().some(r => r.errors.length === 0 && r.rowStatus === 'pending');
  hasInvalidRows = () => this.rows().some(r => r.errors.length > 0);

  downloadTemplate(): void {
    const ws = XLSX.utils.aoa_to_sheet([
      [...COLUMNS],
      ['Ramayan', 'hi', 'Valmiki', 'Scriptures', '/uploads/books/ramayan.pdf', '/uploads/books/ramayan-cover.webp', 'DRAFT', 'Ancient epic'],
    ]);
    ws['!cols'] = COLUMNS.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Books');
    XLSX.writeFile(wb, 'books-import-template.xlsx');
  }

  onFile(event: Event, input: HTMLInputElement): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb   = XLSX.read(data, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const raw: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      this.done.set(false);
      this.successCount.set(0); this.updatedCount.set(0);
      this.skippedCount.set(0); this.failCount.set(0);
      this.rows.set(raw.map(r => this.parseRow(r)));
    };
    reader.readAsArrayBuffer(file);
    input.value = '';
  }

  private parseRow(r: Record<string, string>): ImportRow {
    const row: ImportRow = {
      title:         String(r['title']         ?? '').trim(),
      language:      String(r['language']       ?? '').trim().toLowerCase(),
      author:        String(r['author']         ?? '').trim(),
      category:      String(r['category']       ?? '').trim(),
      fileUrl:       String(r['fileUrl']        ?? '').trim(),
      coverImageUrl: String(r['coverImageUrl']  ?? '').trim(),
      status:        String(r['status']         ?? 'DRAFT').trim().toUpperCase(),
      description:   String(r['description']    ?? '').trim(),
      errors: [], rowStatus: 'pending',
    };
    if (!row.title)                                row.errors.push('title is required');
    if (!row.language)                             row.errors.push('language is required');
    else if (!VALID_LANGS.includes(row.language))  row.errors.push(`language must be: ${VALID_LANGS.join(', ')}`);
    if (!VALID_STATUSES.includes(row.status))      row.errors.push(`status must be: ${VALID_STATUSES.join(', ')}`);
    return row;
  }

  async importAll(): Promise<void> {
    const validRows = this.rows().filter(r => r.errors.length === 0 && r.rowStatus === 'pending');
    if (!validRows.length) return;
    this.importing.set(true);
    this.done.set(false);
    let created = 0, updated = 0, skipped = 0, failed = 0;
    const total = validRows.length;

    // Fetch all existing books upfront; build title|language → id map.
    const existingMap = new Map<string, string>();
    let fetchFailed = false;
    await new Promise<void>(resolve => {
      this.api.books.list({ size: 5000 }).subscribe({
        next: page => {
          page.content.forEach(b =>
            existingMap.set(makeKey(b.title ?? '', b.language ?? ''), b.id)
          );
          resolve();
        },
        error: () => { fetchFailed = true; resolve(); },
      });
    });

    if (fetchFailed) {
      this.importing.set(false);
      this.notify.error('Could not load existing books. Please try again.');
      return;
    }

    for (const row of validRows) {
      row.rowStatus = 'importing';
      this.rows.update(l => [...l]);

      const body: BookRequest = {
        title:         row.title,
        language:      row.language,
        status:        row.status        as BookRequest['status'],
        author:        row.author        || undefined,
        category:      row.category      || undefined,
        fileUrl:       row.fileUrl       || undefined,
        coverImageUrl: row.coverImageUrl || undefined,
        description:   row.description   || undefined,
      };

      const existingId = existingMap.get(makeKey(row.title, row.language));

      await new Promise<void>(resolve => {
        if (existingId && !this.upsertMode) {
          row.rowStatus    = 'skipped';
          row.errorMessage = `A book with this title already exists in ${row.language}`;
          skipped++;
          this.rows.update(l => [...l]);
          resolve();
        } else if (existingId && this.upsertMode) {
          this.api.books.update(existingId, body).subscribe({
            next: () => {
              row.rowStatus = 'updated'; updated++;
              this.rows.update(l => [...l]); resolve();
            },
            error: err => {
              row.rowStatus    = 'error';
              row.errorMessage = err?.error?.message ?? 'Update failed';
              failed++; this.rows.update(l => [...l]); resolve();
            },
          });
        } else {
          this.api.books.create(body).subscribe({
            next: saved => {
              // Register immediately so duplicate rows in same Excel are caught too
              existingMap.set(makeKey(saved.title ?? '', saved.language ?? ''), saved.id);
              row.rowStatus = 'success'; created++;
              this.rows.update(l => [...l]); resolve();
            },
            error: err => {
              row.rowStatus    = 'error';
              row.errorMessage = err?.error?.message ?? 'Server error';
              failed++; this.rows.update(l => [...l]); resolve();
            },
          });
        }
      });

      this.progressPct.set(Math.round(((created + updated + skipped + failed) / total) * 100));
    }

    this.importing.set(false);
    this.done.set(true);
    this.successCount.set(created);
    this.updatedCount.set(updated);
    this.skippedCount.set(skipped);
    this.failCount.set(failed);

    if (created + updated > 0) {
      this.notify.success(`${created} created, ${updated} updated`);
      this.imported.emit();
    }
    if (skipped > 0) this.notify.error(`${skipped} skipped — same title + language already exists. Enable "Update existing" to overwrite.`);
    if (failed  > 0) this.notify.error(`${failed} rows failed`);
  }
}
