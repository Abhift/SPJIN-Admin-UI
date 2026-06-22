# Backend Fix: 500 on GET /api/v1/admin/audit-logs?resourceType=books

## Most likely causes (check in order)

### 1. Migration not run — table doesn't exist

```
Caused by: org.postgresql.util.PSQLException: ERROR: relation "audit_logs" does not exist
```

**Fix:** Run the migration from `BACKEND_AUDIT_LOGS_PROMPT.md`:

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
```

---

### 2. Column name mismatch (camelCase vs snake_case)

Spring Boot auto-converts camelCase field names to snake_case by default
(`resourceType` → `resource_type`). If you have `spring.jpa.hibernate.ddl-auto=none`
and the column is named differently, queries fail.

**Check:** Your entity must map explicitly:

```java
@Column(name = "resource_type", nullable = false)
private String resourceType;

@Column(name = "resource_id", nullable = false)
private String resourceId;

@Column(name = "resource_name", nullable = false)
private String resourceName;

@Column(name = "performed_by", nullable = false)
private String performedBy;

@Column(name = "performed_at", nullable = false, updatable = false)
private Instant performedAt;
```

---

### 3. Repository method name wrong — JPA can't derive the query

```
Caused by: org.springframework.data.repository.query.QueryCreationException
```

Use `@Query` annotations instead of derived method names to be explicit:

```java
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    @Query("SELECT a FROM AuditLog a ORDER BY a.performedAt DESC")
    Page<AuditLog> findAllSorted(Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE a.resourceType = :resourceType ORDER BY a.performedAt DESC")
    Page<AuditLog> findByResourceType(@Param("resourceType") String resourceType, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE a.action = :action ORDER BY a.performedAt DESC")
    Page<AuditLog> findByAction(@Param("action") String action, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE a.resourceType = :resourceType AND a.action = :action ORDER BY a.performedAt DESC")
    Page<AuditLog> findByResourceTypeAndAction(
        @Param("resourceType") String resourceType,
        @Param("action") String action,
        Pageable pageable
    );
}
```

And update the controller to use these methods:

```java
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
        result = repo.findByResourceTypeAndAction(resourceType, action, pageable);
    } else if (resourceType != null) {
        result = repo.findByResourceType(resourceType, pageable);
    } else if (action != null) {
        result = repo.findByAction(action, pageable);
    } else {
        result = repo.findAllSorted(pageable);
    }
    return result.map(mapper::toDto);
}
```

---

## How to confirm the root cause

Check Spring Boot logs for the full stack trace immediately after the 500.
The first `Caused by:` line will tell you exactly which of the three cases above applies.
