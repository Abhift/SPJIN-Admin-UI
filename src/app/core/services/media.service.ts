import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page, PageQuery, PAGE_SECTION_TYPES, PageSectionType } from '../models/api.models';

export interface MediaAsset {
  id: string;
  fileName: string;
  sectionType: string;
  contentType: string;
  url: string;
  fileSize: number;
  uploadedAt: string;
}

export const SECTION_TYPES = PAGE_SECTION_TYPES;
export type SectionType = PageSectionType;

@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/admin/media`;

  list(query: PageQuery & { sectionType?: string } = {}): Observable<Page<MediaAsset>> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? 100));
    if (query.sectionType) {
      params = params.set('sectionType', query.sectionType);
    }
    return this.http.get<Page<MediaAsset>>(this.base, { params });
  }

  upload(file: File, sectionType: string, name?: string): Observable<MediaAsset> {
    const form = new FormData();
    form.append('file', file);
    form.append('sectionType', sectionType);
    if (name) form.append('name', name);
    return this.http.post<MediaAsset>(this.base, form);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
