# Backend: Include `logs` Array in Entity GET Responses

## Context

The frontend reads a `logs` field from every content entity (pages, articles, books, videos,
activities, albums, quotes, testimonials, branches, menus) returned by the admin GET-by-ID
endpoints and the list (paginated) endpoints.

Each log entry has this shape:

```json
{
  "action": "CREATE",
  "performedBy": "admin@example.com",
  "performedAt": "2025-01-15T10:30:00Z"
}
```

Currently the GET API (e.g. `GET /api/v1/admin/pages/{id}`) does NOT return `logs` in the
response body, so the frontend Activity Logs panel always shows empty.

---

## What needs to be done

### 1. Entity — add an embedded log list

Each content entity (Page, Article, Book, Video, Activity, Album, Quote, Testimonial, Branch,
Menu) needs to store an ordered list of audit entries. The simplest approach is an
`@ElementCollection` on each entity, or a shared `@OneToMany` to a common `EntityLog` table.

**Option A — ElementCollection (simplest, no join table name collision)**

```java
@Embeddable
public class EntityLog {
    private String action;       // CREATE, UPDATE, DELETE, PUBLISH, UNPUBLISH, ROLLBACK
    private String performedBy;  // username / email of the actor
    private Instant performedAt;
}
```

```java
// Inside each entity (e.g. PageEntity):
@ElementCollection(fetch = FetchType.EAGER)
@CollectionTable(name = "page_logs", joinColumns = @JoinColumn(name = "page_id"))
@OrderBy("performed_at DESC")
private List<EntityLog> logs = new ArrayList<>();
```

**Option B — shared audit log table with a discriminator column**

```sql
CREATE TABLE entity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50)  NOT NULL,  -- 'pages', 'articles', etc.
  entity_id   UUID         NOT NULL,
  action      VARCHAR(30)  NOT NULL,
  performed_by VARCHAR(200) NOT NULL,
  performed_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ON entity_logs (entity_type, entity_id);
```

---

### 2. DTO — expose logs in response

Add a `logs` field to every content response DTO:

```java
public class PageResponse {
    // ... existing fields ...
    private List<EntityLogDto> logs;
}

public class EntityLogDto {
    private String action;
    private String performedBy;
    private String performedAt; // ISO-8601 string
}
```

Map it in the mapper/constructor:

```java
pageResponse.setLogs(
    page.getLogs().stream()
        .map(l -> new EntityLogDto(l.getAction(), l.getPerformedBy(), l.getPerformedAt().toString()))
        .collect(Collectors.toList())
);
```

---

### 3. Service — append a log entry on every write operation

In each service method that mutates an entity, append a log entry **before saving**:

```java
// Example: PageService.update()
public PageResponse update(UUID id, PageRequest request, String performedBy) {
    Page page = pageRepo.findById(id).orElseThrow();

    // ... apply changes from request ...

    page.getLogs().add(new EntityLog("UPDATE", performedBy, Instant.now()));
    pageRepo.save(page);

    return mapper.toResponse(page);
}
```

Do the same for:
- `create()`  → action `"CREATE"`
- `update()`  → action `"UPDATE"`
- `delete()`  → action `"DELETE"`
- `setPublished(true)`  → action `"PUBLISH"`
- `setPublished(false)` → action `"UNPUBLISH"`
- `rollback()`  → action `"ROLLBACK"`

`performedBy` should come from the Spring Security context:
```java
String actor = SecurityContextHolder.getContext().getAuthentication().getName();
```

---

### 4. Affected endpoints

All of these must return `logs` in their responses:

| Method | Path |
|--------|------|
| GET    | `/api/v1/admin/pages/{id}` |
| GET    | `/api/v1/admin/articles/{id}` |
| GET    | `/api/v1/admin/books/{id}` |
| GET    | `/api/v1/admin/videos/{id}` |
| GET    | `/api/v1/admin/activities/{id}` |
| GET    | `/api/v1/admin/albums/{id}` |
| GET    | `/api/v1/admin/quotes/{id}` |
| GET    | `/api/v1/admin/testimonials/{id}` |
| GET    | `/api/v1/admin/branches/{id}` |
| GET    | `/api/v1/admin/menus/{id}` |

The paginated list endpoints (`GET /api/v1/admin/pages?page=0&size=20`) do **not** need to
include logs (for performance); only the single-entity GET by ID is required.

---

## Expected response shape

```json
{
  "id": "019eea4f-8a69-7a1d-99bf-8817492de373",
  "slug": "home",
  "name": "Home",
  "status": "PUBLISHED",
  "sections": [...],
  "logs": [
    {
      "action": "PUBLISH",
      "performedBy": "admin@example.com",
      "performedAt": "2025-06-21T08:45:00Z"
    },
    {
      "action": "UPDATE",
      "performedBy": "editor@example.com",
      "performedAt": "2025-06-20T14:22:00Z"
    },
    {
      "action": "CREATE",
      "performedBy": "admin@example.com",
      "performedAt": "2025-06-19T10:00:00Z"
    }
  ]
}
```

Logs should be ordered newest first (`performedAt DESC`).
