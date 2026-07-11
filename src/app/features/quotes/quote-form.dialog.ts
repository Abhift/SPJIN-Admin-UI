import { Component, inject, signal } from '@angular/core';
import { LogEntry } from '../../core/models/audit.models';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Quote, QuoteRequest } from '../../core/models/content.models';
import { emptyLocalizedText } from '../../core/models/api.models';
import { LocalizedInputComponent } from '../../shared/components/localized-input/localized-input.component';
import { LanguageSwitchComponent } from '../../shared/components/language-switch/language-switch.component';
import { LocalizedLangService } from '../../shared/services/localized-lang.service';
import { SectionLogsComponent } from '../../shared/components/section-logs/section-logs.component';
import { localizedTextValidator } from '../../shared/validators/localized-text.validator';

@Component({
  selector: 'app-quote-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    LocalizedInputComponent,
    LanguageSwitchComponent,
    SectionLogsComponent,
  ],
  providers: [LocalizedLangService],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit quote' : 'New quote' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        <app-language-switch></app-language-switch>
        <app-localized-input
          label="Quote text"
          formControlName="text"
          [multiline]="true"
          [required]="true"
        ></app-localized-input>
        <app-localized-input label="Author" formControlName="author"></app-localized-input>
        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Source</mat-label>
          <input matInput formControlName="source" />
        </mat-form-field>
        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Display order</mat-label>
          <input matInput type="number" formControlName="displayOrder" />
        </mat-form-field>
        @if (data) {
          <app-section-logs [logs]="logs()"></app-section-logs>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving()">Save</button>
      </mat-dialog-actions>
    </form>
  `,
})
export class QuoteFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContentApi);
  private readonly notify = inject(NotificationService);
  readonly data = inject<Quote | null>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<QuoteFormDialog, boolean>>(MatDialogRef);

  readonly saving = signal(false);
  readonly logs = signal<LogEntry[]>([]);

  constructor() {
    if (this.data?.id) {
      this.api.quotes.get(this.data.id).subscribe((q) => this.logs.set(q.logs ?? []));
    }
  }

  readonly form = this.fb.nonNullable.group({
    text: [this.data?.text ?? emptyLocalizedText(), localizedTextValidator(true)],
    author: [this.data?.author ?? emptyLocalizedText()],
    source: [this.data?.source ?? ''],
    displayOrder: [this.data?.displayOrder ?? 0, Validators.required],
  });

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const body = this.form.getRawValue() as QuoteRequest;
    const req = this.data
      ? this.api.quotes.update(this.data.id, body)
      : this.api.quotes.create(body);
    req.subscribe({
      next: () => {
        this.notify.success('Quote saved');
        this.ref.close(true);
      },
      error: () => this.saving.set(false),
    });
  }
}
