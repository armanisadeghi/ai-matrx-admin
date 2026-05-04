// features/images/types.ts
import type { FileRecordApi } from '@/features/files/types';

export type ImageSurface = 'page' | 'overlay' | 'panel';
export type ImageViewMode = 'grid' | 'masonry';
export type ImageTab = 'manager' | 'search' | 'studio' | 'crop';

export interface ImageRecord {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  size: number;
  mimeType: string;
  folderPath: string;
  createdAt: string;
  fileRecord: FileRecordApi;
}

export interface UploadQueueItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  result?: ImageRecord;
}

export interface CaptureResult {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
}
