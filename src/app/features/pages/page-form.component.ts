import { Component, Input, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { ContentApi } from '../../core/services/content-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageEntity, PageRequest, Section } from '../../core/models/content.models';
import { CONTENT_STATUSES, ContentStatus, PAGE_SECTION_TYPES, SeoDto, emptyLocalizedText } from '../../core/models/api.models';
import { SectionLogsComponent } from '../../shared/components/section-logs/section-logs.component';
import { LogEntry } from '../../core/models/audit.models';
import { LocalizedInputComponent } from '../../shared/components/localized-input/localized-input.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { slugValidator, slugify } from '../../shared/validators/slug.validator';

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
  selector: 'app-page-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatExpansionModule,
    LocalizedInputComponent,
    PageHeaderComponent,
    SectionLogsComponent,
  ],
  templateUrl: './page-form.component.html',
  styleUrl: './page-form.component.scss',
})
export class PageFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ContentApi);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  private _id: string | null = null;
  @Input() set id(value: string | undefined) {
    this._id = value ?? null;
    if (value) {
      this.loadPage(value);
    }
  }

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly logs = signal<LogEntry[]>([]);
  readonly statuses = CONTENT_STATUSES;
  readonly sectionTypes = PAGE_SECTION_TYPES;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    slug: ['', [Validators.required, slugValidator()]],
    status: ['DRAFT' as ContentStatus],
    seo: this.fb.nonNullable.group({
      metaTitle: [emptyLocalizedText()],
      metaDescription: [emptyLocalizedText()],
      canonicalUrl: [''],
    }),
    sections: this.fb.array<ReturnType<PageFormComponent['sectionGroup']>>([]),
  });

  get sections(): FormArray {
    return this.form.controls.sections;
  }

  private sectionGroup(section: Partial<Section>) {
    const raw = section.sectionData as Record<string, unknown> | null | undefined;
    const data = raw && typeof raw === 'object' ? (({ logs: _, ...rest }) => rest)(raw) : raw;
    return this.fb.nonNullable.group({
      sectionType: [section.sectionType ?? '', Validators.required],
      sectionKey: [section.sectionKey ?? '', Validators.required],
      enabled: [section.enabled ?? true],
      sectionData: [
        data ? JSON.stringify(data, null, 2) : '{}',
        jsonValidator,
      ],
    });
  }

  autoSlug(): void {
    const slugCtrl = this.form.controls.slug;
    const name = this.form.controls.name.value;
    if (!slugCtrl.dirty && name) {
      slugCtrl.setValue(slugify(name));
    }
  }

  addSection(): void {
    this.sections.push(this.sectionGroup({ enabled: true }));
  }

  removeSection(index: number): void {
    this.sections.removeAt(index);
  }

  moveSection(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= this.sections.length) {
      return;
    }
    const ctrl = this.sections.at(index);
    this.sections.removeAt(index);
    this.sections.insert(target, ctrl);
  }

  private loadPage(id: string): void {
    this.editing.set(true);
    this.api.pages.get(id).subscribe((page) => {
      this.logs.set(page.logs ?? []);
      this.patch(page);
    });
  }

  private patch(p: PageEntity): void {
    this.form.patchValue({
      name: p.name,
      slug: p.slug,
      status: p.status,
      seo: {
        metaTitle: p.seo?.metaTitle ?? emptyLocalizedText(),
        metaDescription: p.seo?.metaDescription ?? emptyLocalizedText(),
        canonicalUrl: p.seo?.canonicalUrl ?? '',
      },
    });
    this.sections.clear();
    for (const section of p.sections ?? []) {
      this.sections.push(this.sectionGroup(section));
    }
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
    const body: PageRequest = {
      name: raw.name,
      slug: raw.slug,
      status: raw.status,
      seo,
      sections: raw.sections.map((s, index) => {
        const parsed = JSON.parse(s.sectionData) as Record<string, unknown>;
        const { logs: _, ...sectionData } = parsed;
        return {
          sectionType: s.sectionType,
          sectionKey: s.sectionKey,
          displayOrder: index,
          enabled: s.enabled,
          sectionData,
        };
      }),
    };
    const req = this._id ? this.api.pages.update(this._id, body) : this.api.pages.create(body);
    req.subscribe({
      next: () => {
        this.notify.success('Page saved');
        void this.router.navigate(['/pages']);
      },
      error: () => this.saving.set(false),
    });
  }

  cancel(): void {
    void this.router.navigate(['/pages']);
  }
}
