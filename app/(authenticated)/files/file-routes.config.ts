/**
 * File Management Routes Configuration
 * Centralized route definitions for the file management system
 */

import { AvailableBuckets } from '@/lib/redux/fileSystem/types';
import { 
  Files, 
  Image, 
  Music, 
  FileText, 
  Code, 
  Video,
  Clock,
  Share2,
  Star,
  FolderOpen,
  Database
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type FileViewType = 
  | 'all-buckets'
  | 'single-bucket'
  | 'images'
  | 'audio'
  | 'documents'
  | 'code'
  | 'videos'
  | 'recent'
  | 'shared'
  | 'favorites';

export interface FileRoute {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  viewType: FileViewType;
  bucket?: AvailableBuckets;
  fileCategory?: string;
}

export const FILE_ROUTES: Record<string, FileRoute> = {
  ALL_BUCKETS: {
    href: '/files',
    label: 'All Files',
    description: 'Browse all files across all buckets',
    icon: Database,
    viewType: 'all-buckets',
  },
  IMAGES: {
    href: '/files/images',
    label: 'Images',
    description: 'All image files across buckets',
    icon: Image,
    viewType: 'images',
    fileCategory: 'IMAGE',
  },
  AUDIO: {
    href: '/files/audio',
    label: 'Audio',
    description: 'All audio files across buckets',
    icon: Music,
    viewType: 'audio',
    fileCategory: 'AUDIO',
  },
  DOCUMENTS: {
    href: '/files/documents',
    label: 'Documents',
    description: 'All document files across buckets',
    icon: FileText,
    viewType: 'documents',
    fileCategory: 'DOCUMENT',
  },
  CODE: {
    href: '/files/code',
    label: 'Code',
    description: 'All code files across buckets',
    icon: Code,
    viewType: 'code',
    fileCategory: 'CODE',
  },
  VIDEOS: {
    href: '/files/videos',
    label: 'Videos',
    description: 'All video files across buckets',
    icon: Video,
    viewType: 'videos',
    fileCategory: 'VIDEO',
  },
  RECENT: {
    href: '/files/recent',
    label: 'Recent',
    description: 'Recently accessed files',
    icon: Clock,
    viewType: 'recent',
  },
  SHARED: {
    href: '/files/shared',
    label: 'Shared',
    description: 'Files shared with you or by you',
    icon: Share2,
    viewType: 'shared',
  },
};

export const BUCKET_ROUTES: Partial<Record<AvailableBuckets, FileRoute>> = {
  'userContent': {
    href: '/files/bucket/userContent',
    label: 'User Content',
    description: 'Your personal user content',
    icon: FolderOpen,
    viewType: 'single-bucket',
    bucket: 'userContent',
  },
  'Images': {
    href: '/files/bucket/Images',
    label: 'Images Bucket',
    description: 'Image storage bucket',
    icon: Image,
    viewType: 'single-bucket',
    bucket: 'Images',
  },
  'Audio': {
    href: '/files/bucket/Audio',
    label: 'Audio Bucket',
    description: 'Audio file storage',
    icon: Music,
    viewType: 'single-bucket',
    bucket: 'Audio',
  },
  'Documents': {
    href: '/files/bucket/Documents',
    label: 'Documents Bucket',
    description: 'Document storage',
    icon: FileText,
    viewType: 'single-bucket',
    bucket: 'Documents',
  },
  'Code': {
    href: '/files/bucket/Code',
    label: 'Code Bucket',
    description: 'Code file storage',
    icon: Code,
    viewType: 'single-bucket',
    bucket: 'Code',
  },
  'any-file': {
    href: '/files/bucket/any-file',
    label: 'All File Types',
    description: 'Mixed file type storage',
    icon: Files,
    viewType: 'single-bucket',
    bucket: 'any-file',
  },
};

export const getAllRoutes = (): FileRoute[] => {
  return [
    ...Object.values(FILE_ROUTES),
    ...Object.values(BUCKET_ROUTES),
  ];
};

export const getRouteByHref = (href: string): FileRoute | undefined => {
  return getAllRoutes().find(route => route.href === href);
};

export const getRoutesByCategory = () => {
  return {
    overview: [FILE_ROUTES.ALL_BUCKETS],
    fileTypes: [
      FILE_ROUTES.IMAGES,
      FILE_ROUTES.AUDIO,
      FILE_ROUTES.DOCUMENTS,
      FILE_ROUTES.CODE,
      FILE_ROUTES.VIDEOS,
    ],
    buckets: Object.values(BUCKET_ROUTES),
    special: [
      FILE_ROUTES.RECENT,
      FILE_ROUTES.SHARED,
    ],
  };
};

