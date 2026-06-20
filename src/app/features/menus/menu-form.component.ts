import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Menu, MenuItem, MenuRequest } from '../../core/models/content.models';
import { LocalizedText, emptyLocalizedText } from '../../core/models/api.models';
import { LocalizedInputComponent } from '../../shared/components/localized-input/localized-input.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-menu-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    LocalizedInputComponent,
    PageHeaderComponent,
  ],
  templateUrl: './menu-form.component.html',
  styleUrl: './menu-form.component.scss',
})
export class MenuFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContentApi);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  private _id: string | null = null;
  set id(value: string | undefined) {
    this._id = value ?? null;
    if (value) {
      this.loadMenu(value);
    }
  }

  readonly editing = signal(false);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    key: [{ value: '', disabled: false }, Validators.required],
    name: ['', Validators.required],
    items: this.fb.array<FormGroup>([]),
  });

  get items(): FormArray {
    return this.form.controls.items;
  }

  childrenOf(index: number): FormArray {
    return this.items.at(index).get('children') as FormArray;
  }

  private itemGroup(item: Partial<MenuItem>): FormGroup {
    return this.fb.nonNullable.group({
      label: [item.label ?? emptyLocalizedText()],
      url: [item.url ?? ''],
      children: this.fb.array((item.children ?? []).map((c) => this.childGroup(c))),
    });
  }

  private childGroup(item: Partial<MenuItem>): FormGroup {
    return this.fb.nonNullable.group({
      label: [item.label ?? emptyLocalizedText()],
      url: [item.url ?? ''],
    });
  }

  addItem(): void {
    this.items.push(this.itemGroup({}));
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
  }

  addChild(parentIndex: number): void {
    this.childrenOf(parentIndex).push(this.childGroup({}));
  }

  removeChild(parentIndex: number, childIndex: number): void {
    this.childrenOf(parentIndex).removeAt(childIndex);
  }

  private loadMenu(id: string): void {
    this.editing.set(true);
    this.api.menus.get(id).subscribe((menu) => this.patch(menu));
  }

  private patch(m: Menu): void {
    this.form.controls.key.disable();
    this.form.patchValue({ key: m.key, name: m.name });
    this.items.clear();
    for (const item of m.items ?? []) {
      this.items.push(this.itemGroup(item));
    }
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      this.notify.error('Please fix the highlighted fields.');
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue() as {
      key: string;
      name: string;
      items: { label: LocalizedText; url: string; children: { label: LocalizedText; url: string }[] }[];
    };
    const body: MenuRequest = {
      key: raw.key,
      name: raw.name,
      items: raw.items.map((item, i) => ({
        label: item.label,
        url: item.url || undefined,
        displayOrder: i,
        children: item.children.map((child, ci) => ({
          label: child.label,
          url: child.url || undefined,
          displayOrder: ci,
        })),
      })),
    };
    const req = this._id ? this.api.menus.update(this._id, body) : this.api.menus.create(body);
    req.subscribe({
      next: () => {
        this.notify.success('Menu saved');
        void this.router.navigate(['/menus']);
      },
      error: () => this.saving.set(false),
    });
  }

  cancel(): void {
    void this.router.navigate(['/menus']);
  }
}
