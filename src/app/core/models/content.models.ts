import { ContentStatus, LocalizedText, SeoDto } from './api.models';
import { LogEntry } from './audit.models';

/* ---------------------------------------------------------------- Pages */

export interface Section {
  id?: string;
  sectionType: string;
  sectionKey: string;
  displayOrder: number;
  enabled: boolean;
  sectionData: unknown;
}

export interface PageEntity {
  id: string;
  slug: string;
  language: string;
  name: string;
  status: ContentStatus;
  seo?: SeoDto;
  sections: Section[];
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  logs?: LogEntry[];
}

export interface PageRequest {
  slug: string;
  language: string;
  name: string;
  status: ContentStatus;
  seo?: SeoDto;
  sections: Section[];
}

/* ------------------------------------------------------------- Articles */

export interface Category {
  id: string;
  slug: string;
  name: LocalizedText;
  description?: LocalizedText;
}

export interface CategoryRequest {
  slug: string;
  name: LocalizedText;
  description?: LocalizedText;
}

export interface Article {
  id: string;
  slug: string;
  language: string;
  title: string;
  summary?: string;
  content: string;
  categoryId?: string;
  featuredImageUrl?: string;
  status: ContentStatus;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  logs?: LogEntry[];
}

export interface ArticleRequest {
  slug: string;
  language: string;
  title: string;
  summary?: string;
  content: string;
  categoryId?: string;
  featuredImageUrl?: string;
  status: ContentStatus;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
}

/* ---------------------------------------------------------------- Books */

export interface Book {
  id: string;
  language: string;
  title: string;
  author?: string;
  category?: string;
  description?: string;
  coverImageUrl?: string;
  fileUrl?: string;
  status: ContentStatus;
  createdAt?: string;
  updatedAt?: string;
  logs?: LogEntry[];
}

export interface BookRequest {
  language: string;
  title: string;
  author?: string;
  category?: string;
  description?: string;
  coverImageUrl?: string;
  fileUrl?: string;
  status: ContentStatus;
}

/* --------------------------------------------------------------- Videos */

export type VideoType = 'VIDEO' | 'SHORTS' | 'PLAYLIST' | 'PLAYLIST_SHORTS';

export interface Video {
  id: string;
  title: string;
  description?: string;
  youtubeVideoId?: string;
  playlistId?: string;
  thumbnailUrl?: string;
  language?: string;
  videoType?: VideoType;
  displayOrder: number;
  status: ContentStatus;
  createdAt?: string;
  updatedAt?: string;
  logs?: LogEntry[];
}

export interface VideoRequest {
  title: string;
  description?: string;
  youtubeVideoId?: string;
  playlistId?: string;
  thumbnailUrl?: string;
  language?: string;
  videoType: VideoType;
  displayOrder: number;
  status: ContentStatus;
}

/* ------------------------------------------------------------- Settings */

export interface Setting {
  id?: string;
  key: string;
  value: unknown;
  description?: string;
  updatedAt?: string;
}

export interface SettingRequest {
  key: string;
  value: unknown;
  description?: string;
}

/* --------------------------------------------------------- Event Gallery */

export interface EventGalleryImage {
  id?: string;
  imageUrl: string;
  displayOrder: number;
  caption?: string;
}

export interface EventGallery {
  id: string;
  slug: string;
  language: string;
  title: string;
  heading?: string;
  details?: string;
  location?: string;
  eventDate?: string;
  status: ContentStatus;
  images: EventGalleryImage[];
  imageCount?: number;
  logs?: LogEntry[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EventGalleryRequest {
  slug: string;
  language: string;
  title: string;
  heading?: string;
  details?: string;
  location?: string;
  eventDate?: string;
  status: ContentStatus;
  images: EventGalleryImage[];
}
