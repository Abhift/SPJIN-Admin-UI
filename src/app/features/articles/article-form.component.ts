import { Component, Input, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ContentApi } from '../../core/services/content-api.service';
import { MediaService } from '../../core/services/media.service';
import { NotificationService } from '../../core/services/notification.service';
import { MediaDeleteService } from '../../shared/services/media-delete.service';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';
import { Article, ArticleRequest, Category } from '../../core/models/content.models';
import { CONTENT_STATUSES, ContentStatus } from '../../core/models/api.models';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SectionLogsComponent } from '../../shared/components/section-logs/section-logs.component';
import { LogEntry } from '../../core/models/audit.models';
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
    MatProgressBarModule,
    MatTooltipModule,
    PageHeaderComponent,
    SectionLogsComponent,
    MediaUrlPipe,
  ],
  templateUrl: './article-form.component.html',
  styleUrl: './article-form.component.scss',
})
export class ArticleFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContentApi);
  private readonly media = inject(MediaService);
  private readonly notify = inject(NotificationService);
  private readonly mediaDelete = inject(MediaDeleteService);
  private readonly router = inject(Router);

  private _id: string | null = null;
  @Input() set id(value: string | undefined) {
    this._id = value ?? null;
    if (value) {
      this.loadArticle(value);
    }
  }

  /** Pre-select language from the list page's language filter. */
  @Input() set lang(value: string | undefined) {
    const supported = ['en', 'hi', 'gu', 'ne'];
    if (value && supported.includes(value)) {
      this.form.controls.language.setValue(value);
    }
  }

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly uploadingFeatured = signal(false);
  readonly categories = signal<Category[]>([]);
  readonly logs = signal<LogEntry[]>([]);
  readonly statuses = CONTENT_STATUSES;

  readonly langOptions = [
    { value: 'hi', label: 'हिन्दी' },
    { value: 'en', label: 'English' },
    { value: 'gu', label: 'ગુજરાતી' },
    { value: 'ne', label: 'नेपाली' },
  ];

  readonly form = this.fb.nonNullable.group({
    language: ['hi', Validators.required],
    title: ['', Validators.required],
    slug: ['', [Validators.required, slugValidator()]],
    status: ['DRAFT' as ContentStatus],
    categoryId: this.fb.control<string | null>(null),
    featuredImageUrl: [''],
    summary: [''],
    content: ['', Validators.required],
    seo: this.fb.nonNullable.group({
      metaTitle: [''],
      metaDescription: [''],
      canonicalUrl: [''],
    }),
  });

  constructor() {
    this.api.listCategories().subscribe((cats) => this.categories.set(cats));
  }

  autoSlug(): void {
    const slugCtrl = this.form.controls.slug;
    const title = this.form.controls.title.value;
    if (!slugCtrl.dirty && title) {
      slugCtrl.setValue(slugify(title));
    }
  }

  onFeaturedImageFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingFeatured.set(true);
    this.compressImage(file).then((compressed) => {
      this.media.upload(compressed, 'articles').subscribe({
        next: (asset) => {
          this.form.controls.featuredImageUrl.setValue(asset.url);
          this.uploadingFeatured.set(false);
          input.value = '';
        },
        error: () => {
          this.uploadingFeatured.set(false);
          input.value = '';
        },
      });
    });
  }

  removeFeaturedImage(): void {
    const url = this.form.controls.featuredImageUrl.value;
    this.mediaDelete.confirmRemove(url, () => {
      this.form.controls.featuredImageUrl.setValue('');
    });
  }

  private compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        URL.revokeObjectURL(objectUrl);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              const name = file.name.replace(/\.[^.]+$/, '.webp');
              resolve(new File([blob], name, { type: 'image/webp' }));
            } else {
              resolve(file);
            }
          },
          'image/webp',
          0.85,
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    });
  }

  private loadArticle(id: string): void {
    this.editing.set(true);
    this.api.articles.get(id).subscribe((article) => {
      this.logs.set(article.logs ?? []);
      this.patch(article);
    });
  }

  private patch(a: Article): void {
    this.form.patchValue({
      language: a.language ?? 'hi',
      title: a.title,
      slug: a.slug,
      status: a.status,
      categoryId: a.categoryId ?? null,
      featuredImageUrl: a.featuredImageUrl ?? '',
      summary: a.summary ?? '',
      content: a.content ?? '',
      seo: {
        metaTitle: a.metaTitle ?? '',
        metaDescription: a.metaDescription ?? '',
        canonicalUrl: a.canonicalUrl ?? '',
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
    const body: ArticleRequest = {
      language: raw.language,
      title: raw.title,
      slug: raw.slug,
      status: raw.status,
      categoryId: raw.categoryId ?? undefined,
      featuredImageUrl: raw.featuredImageUrl || undefined,
      summary: raw.summary || undefined,
      content: raw.content,
      metaTitle: raw.seo.metaTitle || undefined,
      metaDescription: raw.seo.metaDescription || undefined,
      canonicalUrl: raw.seo.canonicalUrl || undefined,
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
