import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Category, CategoryRequest } from '../../core/models/content.models';
import { emptyLocalizedText } from '../../core/models/api.models';
import { LocalizedInputComponent } from '../../shared/components/localized-input/localized-input.component';
import { LanguageSwitchComponent } from '../../shared/components/language-switch/language-switch.component';
import { LocalizedLangService } from '../../shared/services/localized-lang.service';
import { localizedTextValidator } from '../../shared/validators/localized-text.validator';
import { slugValidator } from '../../shared/validators/slug.validator';

@Component({
  selector: 'app-category-manager-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    LocalizedInputComponent,
    LanguageSwitchComponent,
  ],
  providers: [LocalizedLangService],
  templateUrl: './category-manager.dialog.html',
})
export class CategoryManagerDialog {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContentApi);
  private readonly notify = inject(NotificationService);

  readonly categories = signal<Category[]>([]);
  readonly editingId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: [emptyLocalizedText(), localizedTextValidator(true)],
    slug: ['', [Validators.required, slugValidator()]],
    description: [emptyLocalizedText()],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.api.listCategories().subscribe((cats) => this.categories.set(cats));
  }

  edit(cat: Category): void {
    this.editingId.set(cat.id);
    this.form.setValue({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? emptyLocalizedText(),
    });
  }

  reset(): void {
    this.editingId.set(null);
    this.form.reset({ name: emptyLocalizedText(), slug: '', description: emptyLocalizedText() });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const body = this.form.getRawValue() as CategoryRequest;
    const id = this.editingId();
    const req = id ? this.api.updateCategory(id, body) : this.api.createCategory(body);
    req.subscribe(() => {
      this.notify.success('Category saved');
      this.reset();
      this.load();
    });
  }

  remove(cat: Category): void {
    this.api.deleteCategory(cat.id).subscribe(() => {
      this.notify.success('Category deleted');
      if (this.editingId() === cat.id) {
        this.reset();
      }
      this.load();
    });
  }
}
