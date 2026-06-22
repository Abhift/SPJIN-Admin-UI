export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'PUBLISH'
  | 'UNPUBLISH'
  | 'UPLOAD'
  | 'ROLLBACK';

export interface LogEntry {
  action: string;
  performedBy: string;
  performedAt: string;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  performedBy: string;
  performedAt: string;
}

export interface AuditLogRequest {
  action: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  performedBy: string;
}

export const AUDIT_ACTIONS: AuditAction[] = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'PUBLISH',
  'UNPUBLISH',
  'UPLOAD',
  'ROLLBACK',
];

export const AUDIT_RESOURCE_TYPES = [
  'pages',
  'articles',
  'books',
  'videos',
  'activities',
  'albums',
  'quotes',
  'testimonials',
  'branches',
  'menus',
  'settings',
  'media',
  'cloudflare-media',
] as const;
