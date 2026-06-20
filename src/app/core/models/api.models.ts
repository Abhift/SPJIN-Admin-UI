/** Bilingual content stored by the backend as JSONB `{ "en": ..., "hi": ... }`. */
export interface LocalizedText {
  en: string;
  hi: string;
}

export function emptyLocalizedText(): LocalizedText {
  return { en: '', hi: '' };
}

export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'SCHEDULED';

export const CONTENT_STATUSES: ContentStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'SCHEDULED'];

export type MediaType = 'IMAGE' | 'VIDEO' | 'PDF' | 'AUDIO' | 'OTHER';

export const MEDIA_TYPES: MediaType[] = ['IMAGE', 'VIDEO', 'PDF', 'AUDIO', 'OTHER'];

/** Mirrors Spring Data's `Page<T>` JSON shape. */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

export interface PageQuery {
  page?: number;
  size?: number;
  sort?: string;
}

/** Field-level validation error returned by the backend's GlobalExceptionHandler. */
export interface ApiViolation {
  field: string;
  message: string;
}

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  violations?: ApiViolation[];
}

export interface SeoDto {
  metaTitle?: LocalizedText;
  metaDescription?: LocalizedText;
  metaKeywords?: LocalizedText;
  canonicalUrl?: string;
  ogTitle?: LocalizedText;
  ogDescription?: LocalizedText;
  ogImageId?: string;
}
