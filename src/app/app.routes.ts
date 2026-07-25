import { Routes } from '@angular/router';
import { authGuard, guestGuard, permissionGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'videos',
        canActivate: [permissionGuard],
        data: { permissions: ['content:read'] },
        loadComponent: () =>
          import('./features/videos/videos-list.component').then((m) => m.VideosListComponent),
      },
      {
        path: 'books',
        canActivate: [permissionGuard],
        data: { permissions: ['content:read'] },
        loadComponent: () =>
          import('./features/books/books-list.component').then((m) => m.BooksListComponent),
      },
      {
        path: 'articles',
        canActivate: [permissionGuard],
        data: { permissions: ['content:read'] },
        loadComponent: () =>
          import('./features/articles/articles-list.component').then((m) => m.ArticlesListComponent),
      },
      {
        path: 'articles/new',
        canActivate: [permissionGuard],
        data: { permissions: ['content:write'] },
        loadComponent: () =>
          import('./features/articles/article-form.component').then((m) => m.ArticleFormComponent),
      },
      {
        path: 'articles/:id/edit',
        canActivate: [permissionGuard],
        data: { permissions: ['content:write'] },
        loadComponent: () =>
          import('./features/articles/article-form.component').then((m) => m.ArticleFormComponent),
      },
      {
        path: 'pages',
        canActivate: [permissionGuard],
        data: { permissions: ['content:read'] },
        loadComponent: () =>
          import('./features/pages/pages-list.component').then((m) => m.PagesListComponent),
      },
      {
        path: 'pages/new',
        canActivate: [permissionGuard],
        data: { permissions: ['content:write'] },
        loadComponent: () =>
          import('./features/pages/page-form.component').then((m) => m.PageFormComponent),
      },
      {
        path: 'pages/:id/edit',
        canActivate: [permissionGuard],
        data: { permissions: ['content:write'] },
        loadComponent: () =>
          import('./features/pages/page-form.component').then((m) => m.PageFormComponent),
      },
      {
        path: 'settings',
        canActivate: [permissionGuard],
        data: { permissions: ['settings:manage'] },
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
      {
        path: 'event-gallery',
        canActivate: [permissionGuard],
        data: { permissions: ['content:read'] },
        loadComponent: () =>
          import('./features/event-gallery/event-gallery-list.component').then(
            (m) => m.EventGalleryListComponent,
          ),
      },
      {
        path: 'event-gallery/new',
        canActivate: [permissionGuard],
        data: { permissions: ['content:write'] },
        loadComponent: () =>
          import('./features/event-gallery/event-gallery-form.component').then(
            (m) => m.EventGalleryFormComponent,
          ),
      },
      {
        path: 'event-gallery/:id/edit',
        canActivate: [permissionGuard],
        data: { permissions: ['content:write'] },
        loadComponent: () =>
          import('./features/event-gallery/event-gallery-form.component').then(
            (m) => m.EventGalleryFormComponent,
          ),
      },
      {
        path: 'upload-media',
        canActivate: [permissionGuard],
        data: { permissions: ['media:manage'] },
        loadComponent: () =>
          import('./features/upload-media/upload-media.component').then(
            (m) => m.UploadMediaComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
