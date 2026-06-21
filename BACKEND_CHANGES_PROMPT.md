# Backend Changes Required — SPJIN Admin UI Frontend Updates

This document describes all backend changes needed to support recent frontend updates in the SPJIN Admin UI.

---

## Change 1: Four-Language Support (English · Hindi · Nepali · Gujarati)

### What changed on the frontend

`LocalizedText` previously held two fields (`en`, `hi`). It now holds four:

```typescript
interface LocalizedText {
  en: string;   // English
  hi: string;   // Hindi
  ne: string;   // Nepali
  gu: string;   // Gujarati
}
```

Every form that edits bilingual content now sends all four keys in request bodies and expects all four keys in responses.

---

### Backend impact

#### A. Update the `LocalizedText` Java type

If you have a shared record/class for this JSONB structure, add the two new fields:

```java
// Before
public record LocalizedText(String en, String hi) {}

// After
public record LocalizedText(
    String en,
    String hi,
    String ne,   // Nepali
    String gu    // Gujarati
) {
    public static LocalizedText empty() {
        return new LocalizedText("", "", "", "");
    }
}
```

If you use Jackson for serialization, mark unknown properties as ignored so older stored JSONB (with only `en`/`hi`) deserializes without errors:

```java
@JsonIgnoreProperties(ignoreUnknown = true)
public record LocalizedText(
    @JsonInclude(JsonInclude.Include.NON_NULL) String en,
    @JsonInclude(JsonInclude.Include.NON_NULL) String hi,
    @JsonInclude(JsonInclude.Include.NON_NULL) String ne,
    @JsonInclude(JsonInclude.Include.NON_NULL) String gu
) {}
```

#### B. Database — no schema migration needed

All `LocalizedText` fields are stored as **JSONB** in PostgreSQL. JSONB is schemaless, so existing rows with only `{ "en": "...", "hi": "..." }` will continue to work. New rows will store all four keys. No `ALTER TABLE` is required.

#### C. Every content type that uses `LocalizedText` is affected

| Resource | Fields with `LocalizedText` |
|---|---|
| **Articles** | `title`, `summary`, `content` |
| **Article Categories** | `name`, `description` |
| **Books** | `title`, `author`, `description` |
| **Videos** | `title`, `description` |
| **Activities** | `title`, `description`, `location` |
| **Quotes** | `text`, `author` |
| **Testimonials** | `authorTitle`, `body` |
| **Branches** | `name`, `address` |
| **Albums** | `title`, `description`, `images[].caption` |
| **Menus** | `items[].label` |
| **Pages (SEO)** | `seo.metaTitle`, `seo.metaDescription`, `seo.metaKeywords`, `seo.ogTitle`, `seo.ogDescription` |

#### D. Update request validation

If you have `@NotBlank` or custom validators on `LocalizedText.en`, those should remain (English is still the required fallback). `ne` and `gu` should be **optional** — no `@NotNull`/`@NotBlank` on the new fields.

```java
public record LocalizedTextRequest(
    @NotBlank String en,   // required
    String hi,             // optional
    String ne,             // optional
    String gu              // optional
) {}
```

#### E. Update full-text search / indexing (if applicable)

If you have a search index (e.g. Elasticsearch, PostgreSQL `tsvector`) that indexes localized text, add `ne` and `gu` language extractors to it. At minimum, index them as plain text (no language-specific stemming needed for now).

---

## Change 2: Cloudflare R2 Upload Media Module

### What changed on the frontend

A new **Upload Media** page (`/upload-media`) was added. It:
- Uploads files (images, PDFs, docs) to a **new backend endpoint** categorised by `sectionType`
- Lists all previously uploaded Cloudflare assets
- Returns a **public Cloudflare CDN URL** per asset, which editors paste into `page_sections.section_data` JSON

### API contract the frontend expects

```
POST   /api/v1/admin/cloudflare-media          multipart: file + sectionType → CloudflareAssetDto
GET    /api/v1/admin/cloudflare-media?sectionType=&page=&size=  → Page<CloudflareAssetDto>
DELETE /api/v1/admin/cloudflare-media/{id}     → 204
```

### `CloudflareAssetDto` shape

```json
{
  "id":          "uuid",
  "fileName":    "banner.jpg",
  "sectionType": "articles",
  "contentType": "image/jpeg",
  "fileSize":    204800,
  "url":         "https://pub-xxxx.r2.dev/articles/uuid.jpg",
  "uploadedAt":  "2026-06-21T10:30:00Z"
}
```

### Valid `sectionType` values

`general`, `pages`, `articles`, `books`, `videos`, `activities`, `albums`, `quotes`, `testimonials`, `branches`, `menus`

### Full implementation details

See **`BACKEND_CLOUDFLARE_PROMPT.md`** in the same repo root for:
- Database table DDL (`cloudflare_media_assets`)
- Spring Boot `S3Client` config for Cloudflare R2
- Entity, Repository, Service, Controller code
- AWS SDK v2 Maven dependency
- Cloudflare R2 bucket setup checklist
- Environment variables

---

## Change 3: Page Sections `enabled` Field (confirm support)

### What changed on the frontend

The `enabled` boolean on each page section is now **explicitly visible and editable** in the page form. The frontend sends it in every section object inside the `PageRequest`:

```json
{
  "sections": [
    {
      "sectionType": "hero",
      "sectionKey":  "home-hero",
      "displayOrder": 0,
      "enabled": true,
      "sectionData": { ... }
    }
  ]
}
```

### Backend — confirm the following

- [ ] `page_sections` table has an `enabled BOOLEAN NOT NULL DEFAULT TRUE` column
- [ ] The `Section` entity maps `enabled` and it is persisted on create and update
- [ ] `PageRequest` / `SectionRequest` DTO accepts `enabled` (not ignored)
- [ ] `PageResponse` / `SectionDto` includes `enabled` in the JSON response so the edit form pre-fills correctly

If `enabled` is already implemented, no changes are needed. If not, add the column and wire it through the DTO and entity.

---

## Summary checklist

| # | Change | Backend work |
|---|---|---|
| 1 | 4-language `LocalizedText` | Update Java record to add `ne`, `gu`; add `@JsonIgnoreProperties(ignoreUnknown=true)`; update validation to keep only `en` required |
| 2 | Cloudflare upload media | New table + S3Client config + endpoint (see `BACKEND_CLOUDFLARE_PROMPT.md`) |
| 3 | Page section `enabled` | Confirm column + DTO + entity support — likely already done |
