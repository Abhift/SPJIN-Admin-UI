import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { Article, ArticleRequest, Category } from '../../core/models/content.models';
import { CONTENT_STATUSES, ContentStatus, SeoDto, emptyLocalizedText } from '../../core/models/api.models';
import { LocalizedInputComponent } from '../../shared/components/localized-input/localized-input.component';
import { MediaPickerComponent } from '../../shared/components/media-picker/media-picker.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { localizedTextValidator } from '../../shared/validators/localized-text.validator';
import { slugValidator, slugify } from '../../shared/validators/slug.validator';

@Component({
  selector: 'app-article-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    LocalizedInputComponent,
    MediaPickerComponent,
    PageHeaderComponent,
  ],
  templateUrl: './article-form.component.html',
})
export class ArticleFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContentApi);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  /** Route param via withComponentInputBinding; empty for new. */
  private _id: string | null = null;
  set id(value: string | undefined) {
    this._id = value ?? null;
    if (value) {
      this.loadArticle(value);
    }
  }

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly categories = signal<Category[]>([]);
  readonly statuses = CONTENT_STATUSES;

  readonly form = this.fb.nonNullable.group({
    title: [emptyLocalizedText(), localizedTextValidator(true)],
    slug: ['', [Validators.required, slugValidator()]],
    status: ['DRAFT' as ContentStatus],
    categoryId: this.fb.control<string | null>(null),
    featuredImageId: this.fb.control<string | null>(null),
    summary: [emptyLocalizedText()],
    content: [emptyLocalizedText(), localizedTextValidator(true)],
    seo: this.fb.nonNullable.group({
      metaTitle: [emptyLocalizedText()],
      metaDescription: [emptyLocalizedText()],
      canonicalUrl: [''],
    }),
  });

  constructor() {
    this.api.listCategories().subscribe((cats) => this.categories.set(cats));
  }

  autoSlug(): void {
    const slugCtrl = this.form.controls.slug;
    const titleEn = this.form.controls.title.value.en;
    if (!slugCtrl.dirty && titleEn) {
      slugCtrl.setValue(slugify(titleEn));
    }
  }

  private loadArticle(id: string): void {
    this.editing.set(true);
    this.api.articles.get(id).subscribe((article) => this.patch(article));
  }

  private patch(a: Article): void {
    this.form.patchValue({
      title: a.title,
      slug: a.slug,
      status: a.status,
      categoryId: a.categoryId ?? null,
      featuredImageId: a.featuredImageId ?? null,
      summary: a.summary ?? emptyLocalizedText(),
      content: a.content,
      seo: {
        metaTitle: a.seo?.metaTitle ?? emptyLocalizedText(),
        metaDescription: a.seo?.metaDescription ?? emptyLocalizedText(),
        canonicalUrl: a.seo?.canonicalUrl ?? '',
      },
    });
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      this.notify.error('Please fix the highlighted fields.');
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const seo: SeoDto = {
      metaTitle: raw.seo.metaTitle,
      metaDescription: raw.seo.metaDescription,
      canonicalUrl: raw.seo.canonicalUrl || undefined,
    };
    const body: ArticleRequest = {
      title: raw.title,
      slug: raw.slug,
      status: raw.status,
      categoryId: raw.categoryId ?? undefined,
      featuredImageId: raw.featuredImageId ?? undefined,
      summary: raw.summary,
      content: raw.content,
      seo,
    };
    const req = this._id
      ? this.api.articles.update(this._id, body)
      : this.api.articles.create(body);
    req.subscribe({
      next: () => {
        this.notify.success('Article saved');
        void this.router.navigate(['/articles']);
      },
      error: () => this.saving.set(false),
    });
  }

  cancel(): void {
    void this.router.navigate(['/articles']);
  }
}
