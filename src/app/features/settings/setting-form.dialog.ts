import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Setting } from '../../core/models/content.models';

function jsonValidator(control: AbstractControl) {
  const value = control.value as string;
  if (!value?.trim()) {
    return null;
  }
  try {
    JSON.parse(value);
    return null;
  } catch {
    return { json: true };
  }
}

@Component({
  selector: 'app-setting-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit setting' : 'New setting' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Key</mat-label>
          <input matInput formControlName="key" placeholder="e.g. contact.email" />
          @if (form.controls.key.hasError('required')) {
            <mat-error>Key is required</mat-error>
          }
        </mat-form-field>
        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Description</mat-label>
          <input matInput formControlName="description" />
        </mat-form-field>
        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Value (JSON)</mat-label>
          <textarea matInput formControlName="value" rows="8" class="mono"></textarea>
          <mat-hint>Use valid JSON, e.g. "text", 42, true, or {{ '{' }} ... {{ '}' }}</mat-hint>
          @if (form.controls.value.hasError('json')) {
            <mat-error>Invalid JSON</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="saving()">Save</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`.mono { font-family: 'Roboto Mono', monospace; font-size: 0.85rem; }`],
})
export class SettingFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContentApi);
  private readonly notify = inject(NotificationService);
  readonly data = inject<Setting | null>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<SettingFormDialog, boolean>>(MatDialogRef);

  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    key: [{ value: this.data?.key ?? '', disabled: !!this.data }, Validators.required],
    description: [this.data?.description ?? ''],
    value: [this.data ? JSON.stringify(this.data.value, null, 2) : '""', jsonValidator],
  });

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.api
      .upsertSetting({
        key: raw.key,
        description: raw.description || undefined,
        value: JSON.parse(raw.value),
      })
      .subscribe({
        next: () => {
          this.notify.success('Setting saved');
          this.ref.close(true);
        },
        error: () => this.saving.set(false),
      });
  }
}
