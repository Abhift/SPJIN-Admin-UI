# Backend Prompt: Cloudflare R2 Media Upload Module

## Context

The Angular admin UI has a new **Upload Media** module at `/upload-media`. It uploads files (images, PDFs, docs) categorised by `sectionType` (pages, articles, videos, activities, albums, quotes, testimonials, branches, books, menus, general) to Cloudflare R2 and stores the returned CDN URL. The URL is then used inside `page_sections.section_data` JSON.

---

## What needs to be built

### 1. Database table

```sql
CREATE TABLE cloudflare_media_assets (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name     VARCHAR(512)  NOT NULL,
    section_type  VARCHAR(100)  NOT NULL,
    content_type  VARCHAR(255)  NOT NULL,
    file_size     BIGINT        NOT NULL,
    r2_key        VARCHAR(1024) NOT NULL UNIQUE,   -- object key stored in R2 bucket
    url           VARCHAR(2048) NOT NULL,           -- public CDN URL returned to frontend
    uploaded_at   TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE INDEX idx_cf_media_section_type ON cloudflare_media_assets(section_type);
```

---

### 2. Cloudflare R2 configuration

Add to `application.yml` / `application-prod.yml`:

```yaml
cloudflare:
  r2:
    account-id: ${CF_ACCOUNT_ID}
    access-key-id: ${CF_R2_ACCESS_KEY_ID}
    secret-access-key: ${CF_R2_SECRET_ACCESS_KEY}
    bucket: ${CF_R2_BUCKET_NAME}
    public-url: ${CF_R2_PUBLIC_URL}   # e.g. https://pub-xxxx.r2.dev  or custom domain
```

R2 uses an S3-compatible API. Use the AWS SDK v2 (`software.amazon.awssdk:s3`) already common in Spring Boot stacks.

```java
// CloudflareR2Config.java
@Configuration
public class CloudflareR2Config {

    @Value("${cloudflare.r2.account-id}")
    private String accountId;

    @Value("${cloudflare.r2.access-key-id}")
    private String accessKeyId;

    @Value("${cloudflare.r2.secret-access-key}")
    private String secretAccessKey;

    @Bean
    public S3Client r2Client() {
        return S3Client.builder()
            .endpointOverride(URI.create("https://" + accountId + ".r2.cloudflarestorage.com"))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKeyId, secretAccessKey)))
            .region(Region.of("auto"))
            .build();
    }
}
```

---

### 3. Entity

```java
@Entity
@Table(name = "cloudflare_media_assets")
public class CloudflareMediaAsset {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "file_name",    nullable = false)
    private String fileName;

    @Column(name = "section_type", nullable = false)
    private String sectionType;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(name = "file_size",    nullable = false)
    private Long fileSize;

    @Column(name = "r2_key",       nullable = false, unique = true)
    private String r2Key;

    @Column(name = "url",          nullable = false)
    private String url;

    @Column(name = "uploaded_at",  nullable = false, updatable = false)
    private Instant uploadedAt = Instant.now();

    // getters / setters / builder omitted for brevity
}
```

---

### 4. Response DTO

```java
public record CloudflareAssetDto(
    String id,
    String fileName,
    String sectionType,
    String contentType,
    long   fileSize,
    String url,
    String uploadedAt   // ISO-8601
) {}
```

---

### 5. Service

```java
@Service
@RequiredArgsConstructor
public class CloudflareMediaService {

    private final S3Client r2Client;
    private final CloudflareMediaAssetRepository repo;

    @Value("${cloudflare.r2.bucket}")
    private String bucket;

    @Value("${cloudflare.r2.public-url}")
    private String publicUrl;

    public CloudflareMediaAsset upload(MultipartFile file, String sectionType) throws IOException {
        String ext       = getExtension(file.getOriginalFilename());
        String r2Key     = sectionType + "/" + UUID.randomUUID() + ext;
        String cdnUrl    = publicUrl + "/" + r2Key;

        r2Client.putObject(
            PutObjectRequest.builder()
                .bucket(bucket)
                .key(r2Key)
                .contentType(file.getContentType())
                .contentLength(file.getSize())
                .build(),
            RequestBody.fromInputStream(file.getInputStream(), file.getSize())
        );

        CloudflareMediaAsset asset = new CloudflareMediaAsset();
        asset.setFileName(file.getOriginalFilename());
        asset.setSectionType(sectionType);
        asset.setContentType(file.getContentType());
        asset.setFileSize(file.getSize());
        asset.setR2Key(r2Key);
        asset.setUrl(cdnUrl);

        return repo.save(asset);
    }

    public Page<CloudflareMediaAsset> list(String sectionType, Pageable pageable) {
        if (sectionType != null && !sectionType.isBlank()) {
            return repo.findBySectionTypeOrderByUploadedAtDesc(sectionType, pageable);
        }
        return repo.findAllByOrderByUploadedAtDesc(pageable);
    }

    public void delete(UUID id) {
        CloudflareMediaAsset asset = repo.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Asset not found"));

        r2Client.deleteObject(DeleteObjectRequest.builder()
            .bucket(bucket)
            .key(asset.getR2Key())
            .build());

        repo.delete(asset);
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf('.'));
    }
}
```

---

### 6. Repository

```java
public interface CloudflareMediaAssetRepository extends JpaRepository<CloudflareMediaAsset, UUID> {
    Page<CloudflareMediaAsset> findBySectionTypeOrderByUploadedAtDesc(String sectionType, Pageable pageable);
    Page<CloudflareMediaAsset> findAllByOrderByUploadedAtDesc(Pageable pageable);
}
```

---

### 7. REST Controller

```java
@RestController
@RequestMapping("/api/v1/admin/cloudflare-media")
@RequiredArgsConstructor
public class CloudflareMediaController {

    private final CloudflareMediaService service;
    private final CloudflareAssetMapper mapper;   // MapStruct or manual

    // List all assets (optionally filtered by sectionType)
    @GetMapping
    public Page<CloudflareAssetDto> list(
        @RequestParam(required = false) String sectionType,
        @RequestParam(defaultValue = "0")  int page,
        @RequestParam(defaultValue = "100") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        return service.list(sectionType, pageable).map(mapper::toDto);
    }

    // Upload a file
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public CloudflareAssetDto upload(
        @RequestParam("file")        MultipartFile file,
        @RequestParam("sectionType") String sectionType
    ) throws IOException {
        return mapper.toDto(service.upload(file, sectionType));
    }

    // Delete a file (removes from R2 and DB)
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
```

---

### 8. Required Maven dependencies

```xml
<!-- AWS SDK S3 (for Cloudflare R2 S3-compatible API) -->
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>s3</artifactId>
    <version>2.25.x</version>
</dependency>
```

---

### 9. Cloudflare R2 bucket setup checklist

- [ ] Create R2 bucket in Cloudflare dashboard
- [ ] Enable **Public access** on the bucket (or use a custom domain with a Worker) so `publicUrl` returns publicly accessible URLs
- [ ] Generate R2 API token with **Object Read & Write** permissions
- [ ] Set bucket CORS policy to allow `PUT` from your admin domain (for future direct uploads if needed):

```json
[
  {
    "AllowedOrigins": ["https://your-admin-domain.com"],
    "AllowedMethods": ["GET", "PUT", "DELETE"],
    "AllowedHeaders": ["*"]
  }
]
```

---

### 10. Environment variables to set in production

| Variable | Description |
|---|---|
| `CF_ACCOUNT_ID` | Cloudflare account ID (found in dashboard URL) |
| `CF_R2_ACCESS_KEY_ID` | R2 API token access key |
| `CF_R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `CF_R2_BUCKET_NAME` | Name of the R2 bucket |
| `CF_R2_PUBLIC_URL` | Public base URL e.g. `https://pub-xxxx.r2.dev` or `https://cdn.yourdomain.com` |

---

### 11. How section_data should reference the URL

After uploading, the frontend copies the Cloudflare URL. In `page_sections.section_data` JSON, store it like:

```json
{
  "imageUrl": "https://pub-xxxx.r2.dev/articles/uuid.jpg",
  "videoUrl": "https://pub-xxxx.r2.dev/videos/uuid.mp4",
  "pdfUrl":   "https://pub-xxxx.r2.dev/general/uuid.pdf"
}
```

The R2 key is prefixed with `{sectionType}/` so all assets are logically separated inside the bucket.
