// features/images/services/image.service.ts
import { listFiles, deleteFile } from '@/features/files/api/files';
import { CloudFolders } from '@/features/files/utils/folder-conventions';
import type { ImageRecord } from '../types';
import type { FileRecordApi } from '@/features/files/types';

function toImageRecord(f: FileRecordApi): ImageRecord {
  return {
    id: f.id,
    name: f.file_name,
    url: f.public_url ?? '',
    thumbnailUrl: f.public_url ?? undefined,
    size: f.file_size ?? 0,
    mimeType: f.mime_type ?? 'image/*',
    folderPath: f.file_path,
    createdAt: f.created_at ?? new Date().toISOString(),
    fileRecord: f,
  };
}

export async function listImages(
  folderPath: string = CloudFolders.IMAGES,
  limit = 100,
  offset = 0,
): Promise<ImageRecord[]> {
  const { data } = await listFiles({ folderPath, limit, offset });
  return data
    .filter((f) => f.mime_type?.startsWith('image/') ?? false)
    .map(toImageRecord);
}

export async function removeImage(fileId: string): Promise<void> {
  await deleteFile(fileId);
}
