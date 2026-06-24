import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page, PageQuery, PAGE_SECTION_TYPES, PageSectionType } from '../models/api.models';

export interface CloudflareAsset {
  id: string;
  fileName: string;
  sectionType: string;
  contentType: string;
  url: string;
  fileSize: number;
  uploadedAt: string;
}

export const CLOUDFLARE_SECTION_TYPES = PAGE_SECTION_TYPES;
export type CloudflareSectionType = PageSectionType;

@Injectable({ providedIn: 'root' })
export class CloudflareMediaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/admin/cloudflare-media`;

  list(query: PageQuery & { sectionType?: string } = {}): Observable<Page<CloudflareAsset>> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? 100));
    if (query.sectionType) {
      params = params.set('sectionType', query.sectionType);
    }
    return this.http.get<Page<CloudflareAsset>>(this.base, { params });
  }

  upload(file: File, sectionType: string): Observable<CloudflareAsset> {
    const form = new FormData();
    form.append('file', file);
    form.append('sectionType', sectionType);
    return this.http.post<CloudflareAsset>(this.base, form);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
