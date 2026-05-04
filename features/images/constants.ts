// features/images/constants.ts
import { CloudFolders } from '@/features/files/utils/folder-conventions';

export const IMAGE_FOLDERS = [
  CloudFolders.IMAGES,
  CloudFolders.IMAGES_CHAT,
  CloudFolders.IMAGES_SCREENSHOTS,
  CloudFolders.IMAGES_AVATARS,
  CloudFolders.IMAGES_GENERATED,
] as const;

export const IMAGE_FOLDER_LABELS: Record<string, string> = {
  [CloudFolders.IMAGES]: 'All Images',
  [CloudFolders.IMAGES_CHAT]: 'Chat',
  [CloudFolders.IMAGES_SCREENSHOTS]: 'Screenshots',
  [CloudFolders.IMAGES_AVATARS]: 'Avatars',
  [CloudFolders.IMAGES_GENERATED]: 'AI Generated',
};

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
];

export const MAX_IMAGE_SIZE_MB = 20;
