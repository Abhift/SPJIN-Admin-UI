# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start                    # dev server at http://localhost:4200 (proxies /api → localhost:8080)
npm run build                # production build → dist/spjin-admin/
npm test                     # unit tests via Karma/Jasmine (Chrome)
npx tsc --noEmit             # type-check (no linter configured)
ng generate component features/<name>/<name>.component  # scaffold a new feature component
```

The backend must be running on port 8080 before starting the dev server. The proxy (`proxy.conf.json`) forwards all `/api` requests to it.

## Architecture

**Angular 18 standalone components** — no NgModules anywhere. Every component, directive, and pipe is `standalone: true` and declares its own imports.

```
src/app/
  core/           # singleton services, interceptors, models, guards
  features/       # one folder per CMS resource (route-level components)
  layout/         # shell (sidenav + toolbar) and nav config
  shared/         # reusable components, directives, pipes, validators
```

### Auth flow

`AuthService` stores a JWT pair in `localStorage` (`spjin.accessToken` / `spjin.refreshToken`) and exposes the current user as an Angular **signal**. On startup it decodes the stored access token (`jwt.util.ts`) to restore the user without a network call.

Three functional interceptors are registered in order in `app.config.ts`:
1. **loadingInterceptor** — increments/decrements an in-flight counter that drives the global progress bar.
2. **authInterceptor** — attaches `Authorization: Bearer <token>`. On 401, it transparently refreshes the token once; concurrent requests during refresh are queued on a `BehaviorSubject`.
3. **errorInterceptor** — converts all non-401 HTTP errors into snackbar notifications via `NotificationService`.

`auditInterceptor` also exists (`core/interceptors/audit.interceptor.ts`) and fires after every successful `POST`/`PUT`/`DELETE` to `/admin/**`, but is **not currently registered** in `app.config.ts`.

Route protection uses three functional guards: `authGuard` (redirect to `/login`), `guestGuard` (redirect away from `/login`), `permissionGuard` (checks `route.data.permissions` against the user's `authorities`).

### API layer

`CrudClient<TEntity, TRequest>` is a generic class that wraps the standard admin REST conventions (`GET /admin/<resource>?page=&size=`, `POST`, `PUT/:id`, `DELETE/:id`, `POST/:id/publish?publish=`, `POST/:id/rollback/:version`). All URLs are prefixed with `environment.apiBase` (`/api/v1` in dev).

`ContentApi` (root-provided service) instantiates one `CrudClient` per resource and is the single point of contact between features and the HTTP layer. Features should inject `ContentApi`, not `HttpClient` directly. Article categories and settings have extra hand-written methods on `ContentApi` beyond the standard CRUD.

### Bilingual content (LocalizedText)

All user-visible text fields are stored as `{ en: string; hi: string; ne: string; gu: string }` (`LocalizedText`). Use `emptyLocalizedText()` from `api.models.ts` to initialize a blank value. Key pieces:

- **`LocalizedInputComponent`** (`app-localized-input`) — a `ControlValueAccessor` that wraps a `LocalizedText` value. Renders a language toggle + input/textarea. Use it in reactive forms wherever bilingual text is needed.
- **`LanguageSwitchComponent`** (`app-language-switch`) — the UI toggle that calls `LocalizedLangService.switch()`. Add it once at the top of a form to control all `app-localized-input` fields inside.
- **`LocalizedLangService`** — **not** `providedIn: 'root'`. Provide it in the form component's own `providers: [LocalizedLangService]` array so every `app-localized-input` inside that form shares one language toggle.
- **`LocalizePipe`** (`localize`) — displays a `LocalizedText` in templates; falls back `en → hi` if the requested language is empty.
- **`localizedTextValidator`** / **`slugValidator`** — reusable reactive-form validators in `shared/validators/`. `slug.validator.ts` also exports `slugify(name)` for auto-generating a slug from a display name.

### Feature patterns

**Simple resources** (videos, books, quotes, testimonials, activities, branches) follow a *list + Material dialog* pattern: a `*-list.component` hosts the `DataTableComponent` and opens an inline `*-form.dialog` for create/edit.

**Complex resources** (articles, pages, albums, menus, event-gallery) use full-page routed form components navigated from their list components. These components receive the route `:id` parameter as an `@Input()` via Angular's route input binding (`withComponentInputBinding()` in `app.config.ts`), **not** via `ActivatedRoute`. When `id` is undefined the form is in create mode; when set it loads the entity and switches to edit mode.

### Media

`CloudflareMediaService` (`core/services/cloudflare-media.service.ts`) manages CDN-hosted assets (`/admin/cloudflare-media`) tagged by `sectionType` (mirrors `PAGE_SECTION_TYPES` from `api.models.ts`). It is used by the `/upload-media` route to upload and manage section-level assets. Simple resource dialogs (e.g. books, activities) accept image/file URLs as plain text inputs — users paste a URL obtained from the upload-media page.

### Audit logs

`auditInterceptor` (not currently wired into `app.config.ts`) would fire after every successful mutating API call and write a structured `AuditLog` entry. `AuditLogService` and the `LogsComponent` exist in the codebase but the `/logs` route is not registered in `app.routes.ts`.

Per-resource audit trails (`LogEntry[]` returned inline with entity responses) are shown inside complex form pages via `SectionLogsComponent` (`app-section-logs`), rendered as a collapsible panel at the bottom of the form.

### Shared components

- `DataTableComponent<T>` — generic Material table; callers declare `TableColumn<T>[]` and `RowAction<T>[]`, receive `TableActionEvent<T>` via `(action)` output.
- `SectionLogsComponent` — collapsible audit trail panel; accepts `LogEntry[]` as `@Input() logs`.
- `ConfirmDialogComponent` — standard yes/no dialog.
- `PageHeaderComponent` — page title + breadcrumb area.
- `StatusChipComponent` — colored chip for `ContentStatus` (`DRAFT` | `PUBLISHED` | `ARCHIVED` | `SCHEDULED`).
- `EmptyStateComponent` — empty list placeholder.
- `HasPermissionDirective` (`*appHasPermission`) — structural directive that hides elements the current user lacks permission to see.

### Permissions

The `Permission` type is a string union (`content:read`, `content:write`, `content:delete`, `content:publish`, `media:manage`, `user:manage`, `settings:manage`, `version:rollback`). Enforce at the route layer via `permissionGuard` and at the UI layer via `*appHasPermission`.

### Styling

Angular Material 18 with the **azure-blue** prebuilt theme. All form fields default to `appearance: 'outline'` (set globally in `app.config.ts`). Component styles are SCSS and scoped per component.
