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
        path: 'activities',
        canActivate: [permissionGuard],
        data: { permissions: ['content:read'] },
        loadComponent: () =>
          import('./features/activities/activities-list.component').then(
            (m) => m.ActivitiesListComponent,
          ),
      },
      {
        path: 'quotes',
        canActivate: [permissionGuard],
        data: { permissions: ['content:read'] },
        loadComponent: () =>
          import('./features/quotes/quotes-list.component').then((m) => m.QuotesListComponent),
      },
      {
        path: 'testimonials',
        canActivate: [permissionGuard],
        data: { permissions: ['content:read'] },
        loadComponent: () =>
          import('./features/testimonials/testimonials-list.component').then(
            (m) => m.TestimonialsListComponent,
          ),
      },
      {
        path: 'branches',
        canActivate: [permissionGuard],
        data: { permissions: ['content:read'] },
        loadComponent: () =>
          import('./features/branches/branches-list.component').then((m) => m.BranchesListComponent),
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
        path: 'albums',
        canActivate: [permissionGuard],
        data: { permissions: ['content:read'] },
        loadComponent: () =>
          import('./features/albums/albums-list.component').then((m) => m.AlbumsListComponent),
      },
      {
        path: 'albums/new',
        canActivate: [permissionGuard],
        data: { permissions: ['content:write'] },
        loadComponent: () =>
          import('./features/albums/album-form.component').then((m) => m.AlbumFormComponent),
      },
      {
        path: 'albums/:id/edit',
        canActivate: [permissionGuard],
        data: { permissions: ['content:write'] },
        loadComponent: () =>
          import('./features/albums/album-form.component').then((m) => m.AlbumFormComponent),
      },
      {
        path: 'menus',
        canActivate: [permissionGuard],
        data: { permissions: ['content:read'] },
        loadComponent: () =>
          import('./features/menus/menus-list.component').then((m) => m.MenusListComponent),
      },
      {
        path: 'menus/new',
        canActivate: [permissionGuard],
        data: { permissions: ['content:write'] },
        loadComponent: () =>
          import('./features/menus/menu-form.component').then((m) => m.MenuFormComponent),
      },
      {
        path: 'menus/:id/edit',
        canActivate: [permissionGuard],
        data: { permissions: ['content:write'] },
        loadComponent: () =>
          import('./features/menus/menu-form.component').then((m) => m.MenuFormComponent),
      },
      {
        path: 'settings',
        canActivate: [permissionGuard],
        data: { permissions: ['settings:manage'] },
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
      {
        path: 'media',
        canActivate: [permissionGuard],
        data: { permissions: ['media:manage'] },
        loadComponent: () =>
          import('./features/media/media-library.component').then((m) => m.MediaLibraryComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
