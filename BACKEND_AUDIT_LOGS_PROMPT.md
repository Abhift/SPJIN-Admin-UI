# Backend Prompt: Activity / Audit Logs Module

## What the frontend does

An `auditInterceptor` in Angular automatically fires a `POST /api/v1/admin/audit-logs` request after **every successful** `POST`, `PUT`, or `DELETE` to any `/admin/**` endpoint. It is fire-and-forget — failures are silently swallowed so they never affect the main action.

The logs page (`/logs`) calls `GET /api/v1/admin/audit-logs` with optional filters and displays a paginated table.

---

## API contract

### Create a log entry (called automatically by the frontend interceptor)

```
POST /api/v1/admin/audit-logs
Authorization: Bearer <token>
Content-Type: application/json

{
  "action":       "CREATE",          // CREATE | UPDATE | DELETE | PUBLISH | UNPUBLISH | UPLOAD | ROLLBACK
  "resourceType": "videos",          // module slug: pages, articles, books, videos, activities, ...
  "resourceId":   "uuid-of-record",
  "resourceName": "My Video Title",  // human-readable name for display
  "performedBy":  "user@example.com"
}

→ 201 Created  (body ignored by frontend)
```

### List logs (for the /logs page)

```
GET /api/v1/admin/audit-logs?resourceType=videos&action=DELETE&page=0&size=50
Authorization: Bearer <token>

→ 200 OK  (Spring Data Page<AuditLogDto>)
{
  "content": [
    {
      "id":           "uuid",
      "action":       "DELETE",
      "resourceType": "videos",
      "resourceId":   "uuid",
      "resourceName": "My Video",
      "performedBy":  "admin@example.com",
      "performedAt":  "2026-06-21T12:30:00Z"
    }
  ],
  "totalElements": 120,
  "totalPages": 3,
  "number": 0,
  "size": 50,
  ...
}
```

---

## Database table

```sql
CREATE TABLE audit_logs (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    action         VARCHAR(20)  NOT NULL,
    resource_type  VARCHAR(100) NOT NULL,
    resource_id    VARCHAR(255) NOT NULL,
    resource_name  VARCHAR(512) NOT NULL DEFAULT '',
    performed_by   VARCHAR(255) NOT NULL,
    performed_at   TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_action        ON audit_logs(action);
CREATE INDEX idx_audit_performed_at  ON audit_logs(performed_at DESC);
CREATE INDEX idx_audit_performed_by  ON audit_logs(performed_by);
```

---

## Entity

```java
@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "action", nullable = false, length = 20)
    private String action;

    @Column(name = "resource_type", nullable = false, length = 100)
    private String resourceType;

    @Column(name = "resource_id", nullable = false)
    private String resourceId;

    @Column(name = "resource_name", nullable = false)
    private String resourceName;

    @Column(name = "performed_by", nullable = false)
    private String performedBy;

    @Column(name = "performed_at", nullable = false, updatable = false)
    private Instant performedAt = Instant.now();

    // getters / setters
}
```

---

## DTO

```java
public record AuditLogRequest(
    @NotBlank String action,
    @NotBlank String resourceType,
    @NotBlank String resourceId,
              String resourceName,
    @NotBlank String performedBy
) {}

public record AuditLogDto(
    String id,
    String action,
    String resourceType,
    String resourceId,
    String resourceName,
    String performedBy,
    String performedAt   // ISO-8601
) {}
```

---

## Repository

```java
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    Page<AuditLog> findAllByOrderByPerformedAtDesc(Pageable pageable);

    Page<AuditLog> findByResourceTypeOrderByPerformedAtDesc(
        String resourceType, Pageable pageable);

    Page<AuditLog> findByActionOrderByPerformedAtDesc(
        String action, Pageable pageable);

    Page<AuditLog> findByResourceTypeAndActionOrderByPerformedAtDesc(
        String resourceType, String action, Pageable pageable);
}
```

---

## Controller

```java
@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogRepository repo;
    private final AuditLogMapper mapper;   // MapStruct or manual

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public void create(@RequestBody @Valid AuditLogRequest req) {
        AuditLog log = new AuditLog();
        log.setAction(req.action());
        log.setResourceType(req.resourceType());
        log.setResourceId(req.resourceId());
        log.setResourceName(req.resourceName() != null ? req.resourceName() : "");
        log.setPerformedBy(req.performedBy());
        repo.save(log);
    }

    @GetMapping
    public Page<AuditLogDto> list(
        @RequestParam(required = false) String resourceType,
        @RequestParam(required = false) String action,
        @RequestParam(defaultValue = "0")  int page,
        @RequestParam(defaultValue = "50") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);

        Page<AuditLog> result;
        if (resourceType != null && action != null) {
            result = repo.findByResourceTypeAndActionOrderByPerformedAtDesc(
                resourceType, action, pageable);
        } else if (resourceType != null) {
            result = repo.findByResourceTypeOrderByPerformedAtDesc(resourceType, pageable);
        } else if (action != null) {
            result = repo.findByActionOrderByPerformedAtDesc(action, pageable);
        } else {
            result = repo.findAllByOrderByPerformedAtDesc(pageable);
        }
        return result.map(mapper::toDto);
    }
}
```

---

## Security note

- `POST /api/v1/admin/audit-logs` — allow any authenticated admin user (the interceptor sends the user's own JWT)
- `GET /api/v1/admin/audit-logs` — restrict to `settings:manage` authority (matches the frontend route guard)

```java
.requestMatchers(HttpMethod.POST, "/api/v1/admin/audit-logs").authenticated()
.requestMatchers(HttpMethod.GET,  "/api/v1/admin/audit-logs").hasAuthority("settings:manage")
```

---

## What gets logged automatically (no backend changes needed)

| Frontend action | Logged as |
|---|---|
| Create video / article / book / etc. | `CREATE` + resource type + title |
| Edit and save any content | `UPDATE` + resource type + title |
| Delete any content | `DELETE` + resource type + name |
| Publish / Unpublish | `PUBLISH` / `UNPUBLISH` |
| Upload to Cloudflare | `UPLOAD` + `cloudflare-media` + filename |
| Version rollback | `ROLLBACK` |
