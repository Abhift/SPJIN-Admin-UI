import { Permission } from '../core/models/auth.models';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  permissions?: Permission[];
}

export interface NavSection {
  heading: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'Overview',
    items: [{ label: 'Dashboard', icon: 'dashboard', route: '/dashboard' }],
  },
  {
    heading: 'Content',
    items: [
      { label: 'Pages', icon: 'web', route: '/pages', permissions: ['content:read'] },
      { label: 'Articles', icon: 'article', route: '/articles', permissions: ['content:read'] },
      { label: 'Books', icon: 'menu_book', route: '/books', permissions: ['content:read'] },
      { label: 'Videos', icon: 'smart_display', route: '/videos', permissions: ['content:read'] },
{ label: 'Event Gallery', icon: 'collections', route: '/event-gallery', permissions: ['content:read'] },
    ],
  },
  {
    heading: 'System',
    items: [
      {
        label: 'Upload Media',
        icon: 'cloud_upload',
        route: '/upload-media',
        permissions: ['media:manage'],
      },
      { label: 'Settings', icon: 'settings', route: '/settings', permissions: ['settings:manage'] },
    ],
  },
];
