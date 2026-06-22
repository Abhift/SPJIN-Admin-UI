import { HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AuditLogService } from '../services/audit-log.service';

const WRITE_METHODS = new Set(['POST', 'PUT', 'DELETE']);

function shouldAudit(url: string, method: string): boolean {
  if (!WRITE_METHODS.has(method)) return false;
  if (!url.includes('/admin/')) return false;
  // Skip the audit log endpoint itself to prevent infinite loop
  if (url.includes('/audit-logs')) return false;
  // Skip auth
  if (url.includes('/auth/')) return false;
  return true;
}

function parseAction(method: string, url: string, params: string): string {
  if (method === 'POST' && url.includes('/publish')) {
    return params.includes('publish=true') ? 'PUBLISH' : 'UNPUBLISH';
  }
  if (method === 'POST' && url.includes('/rollback')) return 'ROLLBACK';
  if (method === 'POST' && url.includes('/cloudflare-media')) return 'UPLOAD';
  if (method === 'POST') return 'CREATE';
  if (method === 'PUT') return 'UPDATE';
  if (method === 'DELETE') return 'DELETE';
  return method;
}

function parseResourceType(url: string): string {
  const match = url.match(/\/admin\/([^/?]+)/);
  return match?.[1] ?? 'unknown';
}

function parseResourceId(method: string, url: string, responseBody: unknown): string {
  // For PUT/DELETE the ID is the last path segment before query string
  const pathMatch = url.split('?')[0].match(/\/admin\/[^/]+\/([^/]+)(?:\/|$)/);
  if (pathMatch?.[1] && !['publish', 'rollback'].includes(pathMatch[1])) {
    return pathMatch[1];
  }
  // For POST (CREATE/UPLOAD) the ID comes from the response body
  if (method === 'POST' && responseBody && typeof responseBody === 'object') {
    return String((responseBody as Record<string, unknown>)['id'] ?? '');
  }
  return '';
}

function extractName(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const b = body as Record<string, unknown>;

  // LocalizedText title/name
  const title = b['title'] ?? b['name'] ?? b['text'];
  if (title && typeof title === 'object') {
    const loc = title as Record<string, unknown>;
    return String(loc['en'] ?? loc['hi'] ?? '');
  }
  if (typeof title === 'string' && title) return title;

  // Flat string fields
  for (const key of ['fileName', 'slug', 'key', 'authorName']) {
    if (typeof b[key] === 'string' && b[key]) return String(b[key]);
  }
  return '';
}

export const auditInterceptor: HttpInterceptorFn = (req, next) => {
  if (!shouldAudit(req.url, req.method)) return next(req);

  const auth = inject(AuthService);
  const auditLog = inject(AuditLogService);
  const requestBody = req.body;

  return next(req).pipe(
    tap((event) => {
      if (!(event instanceof HttpResponse)) return;

      const performedBy = auth.user()?.email ?? 'unknown';
      const action = parseAction(req.method, req.url, req.urlWithParams);
      const resourceType = parseResourceType(req.url);
      const resourceId = parseResourceId(req.method, req.url, event.body);

      // Prefer name from response body (has more complete data), fall back to request
      const resourceName =
        extractName(event.body) || extractName(requestBody) || resourceId;

      auditLog.log({ action, resourceType, resourceId, resourceName, performedBy });
    }),
  );
};
