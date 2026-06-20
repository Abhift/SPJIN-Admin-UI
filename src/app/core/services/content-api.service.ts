import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Activity,
  ActivityRequest,
  Album,
  AlbumRequest,
  Article,
  ArticleRequest,
  Book,
  BookRequest,
  Branch,
  BranchRequest,
  Category,
  CategoryRequest,
  Menu,
  MenuRequest,
  PageEntity,
  PageRequest,
  Quote,
  QuoteRequest,
  Setting,
  SettingRequest,
  Testimonial,
  TestimonialRequest,
  Video,
  VideoRequest,
} from '../models/content.models';
import { CrudClient } from './crud-client';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page, PageQuery } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ContentApi {
  private readonly http = inject(HttpClient);

  readonly pages = new CrudClient<PageEntity, PageRequest>(this.http, 'pages');
  readonly articles = new CrudClient<Article, ArticleRequest>(this.http, 'articles');
  readonly books = new CrudClient<Book, BookRequest>(this.http, 'books');
  readonly videos = new CrudClient<Video, VideoRequest>(this.http, 'videos');
  readonly quotes = new CrudClient<Quote, QuoteRequest>(this.http, 'quotes');
  readonly testimonials = new CrudClient<Testimonial, TestimonialRequest>(this.http, 'testimonials');
  readonly activities = new CrudClient<Activity, ActivityRequest>(this.http, 'activities');
  readonly branches = new CrudClient<Branch, BranchRequest>(this.http, 'branches');
  readonly albums = new CrudClient<Album, AlbumRequest>(this.http, 'albums');
  readonly menus = new CrudClient<Menu, MenuRequest>(this.http, 'menus');
  readonly settings = new CrudClient<Setting, SettingRequest>(this.http, 'settings');

  /** Article categories live under the articles resource. */
  listCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${environment.apiBase}/admin/articles/categories`);
  }

  createCategory(body: CategoryRequest): Observable<Category> {
    return this.http.post<Category>(`${environment.apiBase}/admin/articles/categories`, body);
  }

  updateCategory(id: string, body: CategoryRequest): Observable<Category> {
    return this.http.put<Category>(`${environment.apiBase}/admin/articles/categories/${id}`, body);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBase}/admin/articles/categories/${id}`);
  }

  settingByKey(key: string): Observable<Setting> {
    return this.http.get<Setting>(`${environment.apiBase}/admin/settings/${key}`);
  }

  upsertSetting(body: SettingRequest): Observable<Setting> {
    return this.http.put<Setting>(`${environment.apiBase}/admin/settings`, body);
  }

  listSettings(query: PageQuery = {}): Observable<Page<Setting>> {
    const params = new HttpParams()
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? 100));
    return this.http.get<Page<Setting>>(`${environment.apiBase}/admin/settings`, { params });
  }
}
