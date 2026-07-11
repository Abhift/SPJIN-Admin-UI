import { Component, inject, signal } from '@angular/core';
import { LogEntry } from '../../core/models/audit.models';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Testimonial, TestimonialRequest } from '../../core/models/content.models';
import { emptyLocalizedText } from '../../core/models/api.models';
import { LocalizedInputComponent } from '../../shared/components/localized-input/localized-input.component';
import { LanguageSwitchComponent } from '../../shared/components/language-switch/language-switch.component';
import { LocalizedLangService } from '../../shared/services/localized-lang.service';
import { MediaPickerComponent } from '../../shared/components/media-picker/media-picker.component';
import { SectionLogsComponent } from '../../shared/components/section-logs/section-logs.component';
import { localizedTextValidator } from '../../shared/validators/localized-text.validator';

@Component({
  selector: 'app-testimonial-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    LocalizedInputComponent,
    LanguageSwitchComponent,
    MediaPickerComponent,
    SectionLogsComponent,
  ],
  providers: [LocalizedLangService],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit testimonial' : 'New testimonial' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Author name</mat-label>
          <input matInput formControlName="authorName" />
          @if (form.controls.authorName.hasError('required')) {
            <mat-error>Author name is required</mat-error>
          }
        </mat-form-field>
        <app-language-switch></app-language-switch>
        <app-localized-input label="Author title" formControlName="authorTitle"></app-localized-input>
        <app-localized-input
          label="Testimonial"
          formControlName="body"
          [multiline]="true"
          [required]="true"
        ></app-localized-input>
        <app-media-picker label="Avatar" formControlName="avatarId"></app-media-picker>
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
export class TestimonialFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContentApi);
  private readonly notify = inject(NotificationService);
  readonly data = inject<Testimonial | null>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<TestimonialFormDialog, boolean>>(MatDialogRef);

  readonly saving = signal(false);
  readonly logs = signal<LogEntry[]>([]);

  constructor() {
    if (this.data?.id) {
      this.api.testimonials.get(this.data.id).subscribe((t) => this.logs.set(t.logs ?? []));
    }
  }

  readonly form = this.fb.nonNullable.group({
    authorName: [this.data?.authorName ?? '', Validators.required],
    authorTitle: [this.data?.authorTitle ?? emptyLocalizedText()],
    body: [this.data?.body ?? emptyLocalizedText(), localizedTextValidator(true)],
    avatarId: this.fb.control<string | null>(this.data?.avatarId ?? null),
    displayOrder: [this.data?.displayOrder ?? 0, Validators.required],
  });

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const body = this.form.getRawValue() as TestimonialRequest;
    const req = this.data
      ? this.api.testimonials.update(this.data.id, body)
      : this.api.testimonials.create(body);
    req.subscribe({
      next: () => {
        this.notify.success('Testimonial saved');
        this.ref.close(true);
      },
      error: () => this.saving.set(false),
    });
  }
}
