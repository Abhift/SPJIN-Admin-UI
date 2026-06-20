import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page, PageQuery } from '../models/api.models';
import { MediaAsset } from '../models/content.models';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/admin/media`;

  list(query: PageQuery = {}): Observable<Page<MediaAsset>> {
    const params = new HttpParams()
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? 24));
    return this.http.get<Page<MediaAsset>>(this.base, { params });
  }

  get(id: string): Observable<MediaAsset> {
    return this.http.get<MediaAsset>(`${this.base}/${id}`);
  }

  upload(file: File): Observable<MediaAsset> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<MediaAsset>(this.base, form);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
