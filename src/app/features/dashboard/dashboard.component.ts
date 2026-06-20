import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ContentApi } from '../../core/services/content-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

interface StatCard {
  label: string;
  icon: string;
  route: string;
  count: number | null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule, MatButtonModule, PageHeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly api = inject(ContentApi);
  private readonly auth = inject(AuthService);

  readonly email = this.auth.user()?.email ?? '';
  readonly stats = signal<StatCard[]>([
    { label: 'Pages', icon: 'web', route: '/pages', count: null },
    { label: 'Articles', icon: 'article', route: '/articles', count: null },
    { label: 'Books', icon: 'menu_book', route: '/books', count: null },
    { label: 'Videos', icon: 'smart_display', route: '/videos', count: null },
    { label: 'Activities', icon: 'event', route: '/activities', count: null },
    { label: 'Albums', icon: 'photo_library', route: '/albums', count: null },
  ]);

  constructor() {
    forkJoin({
      pages: this.api.pages.list({ size: 1 }),
      articles: this.api.articles.list({ size: 1 }),
      books: this.api.books.list({ size: 1 }),
      videos: this.api.videos.list({ size: 1 }),
      activities: this.api.activities.list({ size: 1 }),
      albums: this.api.albums.list({ size: 1 }),
    }).subscribe((res) => {
      this.stats.set([
        { label: 'Pages', icon: 'web', route: '/pages', count: res.pages.totalElements },
        { label: 'Articles', icon: 'article', route: '/articles', count: res.articles.totalElements },
        { label: 'Books', icon: 'menu_book', route: '/books', count: res.books.totalElements },
        { label: 'Videos', icon: 'smart_display', route: '/videos', count: res.videos.totalElements },
        {
          label: 'Activities',
          icon: 'event',
          route: '/activities',
          count: res.activities.totalElements,
        },
        { label: 'Albums', icon: 'photo_library', route: '/albums', count: res.albums.totalElements },
      ]);
    });
  }
}
