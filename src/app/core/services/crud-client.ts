import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page, PageQuery } from '../models/api.models';

/**
 * Thin typed wrapper over the admin REST conventions shared by every content module:
 * POST (create), PUT/{id} (update), GET (paged list), GET/{id}, DELETE/{id} (soft),
 * and POST/{id}/publish?publish= for publishable content.
 */
export class CrudClient<TEntity, TRequest> {
  private readonly base: string;

  constructor(
    private readonly http: HttpClient,
    resourcePath: string,
  ) {
    this.base = `${environment.apiBase}/admin/${resourcePath}`;
  }

  list(query: PageQuery = {}): Observable<Page<TEntity>> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? 20));
    if (query.sort) params = params.set('sort', query.sort);
    if (query.lang) params = params.set('lang', query.lang);
    return this.http.get<Page<TEntity>>(this.base, { params });
  }

  get(id: string): Observable<TEntity> {
    return this.http.get<TEntity>(`${this.base}/${id}`);
  }

  create(body: TRequest): Observable<TEntity> {
    return this.http.post<TEntity>(this.base, body);
  }

  update(id: string, body: TRequest): Observable<TEntity> {
    return this.http.put<TEntity>(`${this.base}/${id}`, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  setPublished(id: string, publish: boolean): Observable<TEntity> {
    const params = new HttpParams().set('publish', String(publish));
    return this.http.post<TEntity>(`${this.base}/${id}/publish`, null, { params });
  }

  rollback(id: string, version: number): Observable<TEntity> {
    return this.http.post<TEntity>(`${this.base}/${id}/rollback/${version}`, null);
  }
}
