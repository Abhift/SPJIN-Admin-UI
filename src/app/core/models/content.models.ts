import { ContentStatus, LocalizedText, MediaType, SeoDto } from './api.models';

/** Media library asset. */
export interface MediaAsset {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  mediaType: MediaType;
  width?: number;
  height?: number;
  duration?: number;
  url: string;
  createdAt: string;
}

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
  name: string;
  status: ContentStatus;
  seo?: SeoDto;
  sections: Section[];
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PageRequest {
  slug: string;
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
  title: LocalizedText;
  summary?: LocalizedText;
  content: LocalizedText;
  categoryId?: string;
  featuredImageId?: string;
  status: ContentStatus;
  seo?: SeoDto;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArticleRequest {
  slug: string;
  title: LocalizedText;
  summary?: LocalizedText;
  content: LocalizedText;
  categoryId?: string;
  featuredImageId?: string;
  status: ContentStatus;
  seo?: SeoDto;
}

/* ---------------------------------------------------------------- Books */

export interface Book {
  id: string;
  slug: string;
  title: LocalizedText;
  author?: LocalizedText;
  description?: LocalizedText;
  coverImageId?: string;
  fileId?: string;
  status: ContentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookRequest {
  slug: string;
  title: LocalizedText;
  author?: LocalizedText;
  description?: LocalizedText;
  coverImageId?: string;
  fileId?: string;
  status: ContentStatus;
}

/* --------------------------------------------------------------- Videos */

export interface Video {
  id: string;
  slug: string;
  title: LocalizedText;
  description?: LocalizedText;
  youtubeVideoId: string;
  thumbnailId?: string;
  status: ContentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface VideoRequest {
  slug: string;
  title: LocalizedText;
  description?: LocalizedText;
  youtubeVideoId: string;
  thumbnailId?: string;
  status: ContentStatus;
}

/* --------------------------------------------------------------- Quotes */

export interface Quote {
  id: string;
  text: LocalizedText;
  author?: LocalizedText;
  source?: string;
  displayOrder: number;
  createdAt?: string;
}

export interface QuoteRequest {
  text: LocalizedText;
  author?: LocalizedText;
  source?: string;
  displayOrder: number;
}

/* --------------------------------------------------------- Testimonials */

export interface Testimonial {
  id: string;
  authorName: string;
  authorTitle?: LocalizedText;
  body: LocalizedText;
  avatarId?: string;
  displayOrder: number;
  createdAt?: string;
}

export interface TestimonialRequest {
  authorName: string;
  authorTitle?: LocalizedText;
  body: LocalizedText;
  avatarId?: string;
  displayOrder: number;
}

/* ----------------------------------------------------------- Activities */

export interface Activity {
  id: string;
  slug: string;
  title: LocalizedText;
  description?: LocalizedText;
  coverImageId?: string;
  eventDate?: string;
  location?: LocalizedText;
  status: ContentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityRequest {
  slug: string;
  title: LocalizedText;
  description?: LocalizedText;
  coverImageId?: string;
  eventDate?: string;
  location?: LocalizedText;
  status: ContentStatus;
}

/* ------------------------------------------------------------- Branches */

export interface Branch {
  id: string;
  name: LocalizedText;
  address?: LocalizedText;
  city?: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  displayOrder: number;
  createdAt?: string;
}

export interface BranchRequest {
  name: LocalizedText;
  address?: LocalizedText;
  city?: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  displayOrder: number;
}

/* --------------------------------------------------------------- Albums */

export interface AlbumImage {
  id?: string;
  mediaId: string;
  caption?: LocalizedText;
  displayOrder: number;
  url?: string;
}

export interface Album {
  id: string;
  slug: string;
  title: LocalizedText;
  description?: LocalizedText;
  coverImageId?: string;
  images: AlbumImage[];
  status: ContentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface AlbumRequest {
  slug: string;
  title: LocalizedText;
  description?: LocalizedText;
  coverImageId?: string;
  images: AlbumImage[];
  status: ContentStatus;
}

/* ---------------------------------------------------------------- Menus */

export interface MenuItem {
  id?: string;
  label: LocalizedText;
  url?: string;
  parentId?: string;
  displayOrder: number;
  children?: MenuItem[];
}

export interface Menu {
  id: string;
  key: string;
  name: string;
  items: MenuItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuRequest {
  key: string;
  name: string;
  items: MenuItem[];
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
