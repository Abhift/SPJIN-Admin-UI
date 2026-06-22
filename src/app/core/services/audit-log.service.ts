import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../models/api.models';
import { AuditLog, AuditLogRequest } from '../models/audit.models';

const LS_KEY = 'spjin.auditLogs';
const MAX_LOCAL_ENTRIES = 500;

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/admin/audit-logs`;

  /** Saves to localStorage immediately, also tries backend (fire-and-forget). */
  log(entry: AuditLogRequest): void {
    const record: AuditLog = {
      id: crypto.randomUUID(),
      action: entry.action as AuditLog['action'],
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      resourceName: entry.resourceName,
      performedBy: entry.performedBy,
      performedAt: new Date().toISOString(),
    };

    this.saveToLocal(record);
    this.http.post<void>(this.base, entry).subscribe({ error: () => {} });
  }

  /**
   * Tries the backend first. If it returns an error (500, 404, network) it
   * transparently falls back to the localStorage log so the UI always works.
   */
  list(query: {
    resourceType?: string;
    action?: string;
    page?: number;
    size?: number;
  } = {}): Observable<Page<AuditLog>> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? 50));
    if (query.resourceType) params = params.set('logs', query.resourceType);
    if (query.action) params = params.set('action', query.action);

    return this.http.get<Page<AuditLog>>(this.base, { params }).pipe(
      catchError(() => of(this.listFromLocal(query))),
    );
  }

  // ── localStorage helpers ──────────────────────────────────────────────────

  private saveToLocal(record: AuditLog): void {
    try {
      const all = this.readLocal();
      all.unshift(record);
      localStorage.setItem(LS_KEY, JSON.stringify(all.slice(0, MAX_LOCAL_ENTRIES)));
    } catch {
      // localStorage full or unavailable — skip silently
    }
  }

  private readLocal(): AuditLog[] {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? (JSON.parse(raw) as AuditLog[]) : [];
    } catch {
      return [];
    }
  }

  private listFromLocal(query: {
    resourceType?: string;
    action?: string;
    page?: number;
    size?: number;
  }): Page<AuditLog> {
    let entries = this.readLocal();

    if (query.resourceType) {
      entries = entries.filter((e) => e.resourceType === query.resourceType);
    }
    if (query.action) {
      entries = entries.filter((e) => e.action === query.action);
    }

    const page = query.page ?? 0;
    const size = query.size ?? 50;
    const start = page * size;
    const content = entries.slice(start, start + size);

    return {
      content,
      totalElements: entries.length,
      totalPages: Math.ceil(entries.length / size),
      number: page,
      size,
      first: page === 0,
      last: start + size >= entries.length,
      numberOfElements: content.length,
      empty: content.length === 0,
    };
  }
}
