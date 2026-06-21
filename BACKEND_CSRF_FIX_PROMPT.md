# Backend Fix: 403 Forbidden on POST/PUT/DELETE — CSRF

## Root cause

Spring Security enables CSRF protection by default. For browser-based apps it expects a CSRF token cookie on every state-changing request (POST, PUT, DELETE). The Angular admin UI uses **stateless JWT authentication** and never sends a CSRF token, so Spring Security silently rejects every write request with 403 before it reaches any controller.

## Fix — disable CSRF in `SecurityConfig`

CSRF protection is only meaningful for session-cookie-based auth. With stateless JWT it provides no security benefit and must be disabled.

```java
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF — stateless JWT API does not use cookies for auth
            .csrf(csrf -> csrf.disable())

            // Stateless session — no HttpSession created or used
            .sessionManagement(sm -> sm
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            .authorizeHttpRequests(auth -> auth
                // Public auth endpoints
                .requestMatchers("/api/v1/auth/login", "/api/v1/auth/refresh").permitAll()

                // Admin endpoints — secured by authority
                .requestMatchers(HttpMethod.GET,    "/api/v1/admin/**").hasAuthority("content:read")
                .requestMatchers(HttpMethod.POST,   "/api/v1/admin/**").hasAuthority("content:write")
                .requestMatchers(HttpMethod.PUT,    "/api/v1/admin/**").hasAuthority("content:write")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/admin/**").hasAuthority("content:delete")

                .anyRequest().authenticated()
            )

            // Add JWT filter before Spring's username/password filter
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
```

## Why this is safe

| Concern | Answer |
|---|---|
| Can an attacker forge POST requests? | No. Every request must carry a valid JWT in the `Authorization: Bearer` header. Browsers never auto-attach this header cross-origin, so CSRF attacks are not possible. |
| Do we lose any protection? | No. CSRF only protects session-cookie flows. JWT-in-header is inherently CSRF-safe. |

## After applying the fix

Restart the Spring Boot server and retry `POST /api/v1/admin/videos` from the Angular admin. The request will now reach the controller and return `201 Created` (or a validation error if the payload is wrong).
