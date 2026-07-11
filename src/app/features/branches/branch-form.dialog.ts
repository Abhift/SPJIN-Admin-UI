import { Component, inject, signal } from '@angular/core';
import { LogEntry } from '../../core/models/audit.models';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Branch, BranchRequest } from '../../core/models/content.models';
import { emptyLocalizedText } from '../../core/models/api.models';
import { LocalizedInputComponent } from '../../shared/components/localized-input/localized-input.component';
import { LanguageSwitchComponent } from '../../shared/components/language-switch/language-switch.component';
import { LocalizedLangService } from '../../shared/services/localized-lang.service';
import { SectionLogsComponent } from '../../shared/components/section-logs/section-logs.component';
import { localizedTextValidator } from '../../shared/validators/localized-text.validator';

@Component({
  selector: 'app-branch-form-dialog',
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
    <h2 mat-dialog-title>{{ data ? 'Edit branch' : 'New branch' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        <app-language-switch></app-language-switch>
        <app-localized-input
          label="Branch name"
          formControlName="name"
          [required]="true"
        ></app-localized-input>
        <app-localized-input
          label="Address"
          formControlName="address"
          [multiline]="true"
        ></app-localized-input>
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>City</mat-label>
            <input matInput formControlName="city" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Phone</mat-label>
            <input matInput formControlName="phone" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" />
            @if (form.controls.email.hasError('email')) {
              <mat-error>Enter a valid email</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Display order</mat-label>
            <input matInput type="number" formControlName="displayOrder" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Latitude</mat-label>
            <input matInput type="number" formControlName="latitude" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Longitude</mat-label>
            <input matInput type="number" formControlName="longitude" />
          </mat-form-field>
        </div>
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
export class BranchFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContentApi);
  private readonly notify = inject(NotificationService);
  readonly data = inject<Branch | null>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<BranchFormDialog, boolean>>(MatDialogRef);

  readonly saving = signal(false);
  readonly logs = signal<LogEntry[]>([]);

  constructor() {
    if (this.data?.id) {
      this.api.branches.get(this.data.id).subscribe((b) => this.logs.set(b.logs ?? []));
    }
  }

  readonly form = this.fb.nonNullable.group({
    name: [this.data?.name ?? emptyLocalizedText(), localizedTextValidator(true)],
    address: [this.data?.address ?? emptyLocalizedText()],
    city: [this.data?.city ?? ''],
    phone: [this.data?.phone ?? ''],
    email: [this.data?.email ?? '', Validators.email],
    latitude: this.fb.control<number | null>(this.data?.latitude ?? null),
    longitude: this.fb.control<number | null>(this.data?.longitude ?? null),
    displayOrder: [this.data?.displayOrder ?? 0, Validators.required],
  });

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const body = this.form.getRawValue() as BranchRequest;
    const req = this.data
      ? this.api.branches.update(this.data.id, body)
      : this.api.branches.create(body);
    req.subscribe({
      next: () => {
        this.notify.success('Branch saved');
        this.ref.close(true);
      },
      error: () => this.saving.set(false),
    });
  }
}
