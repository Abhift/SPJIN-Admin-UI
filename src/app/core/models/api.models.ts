/** Multilingual content stored by the backend as JSONB `{ "en": ..., "hi": ..., "ne": ..., "gu": ... }`. */
export interface LocalizedText {
  en: string;
  hi: string;
  ne: string;
  gu: string;
}

export function emptyLocalizedText(): LocalizedText {
  return { en: '', hi: '', ne: '', gu: '' };
}

export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'SCHEDULED';

export const PAGE_SECTION_TYPES = [
  'general',
  'hero',
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
  'achievements',
  'event-gallery',
] as const;

export type PageSectionType = (typeof PAGE_SECTION_TYPES)[number];

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
