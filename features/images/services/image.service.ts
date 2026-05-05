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
  limit = 200,
  offset = 0,
): Promise<ImageRecord[]> {
  // Don't pass folder_path — the backend does exact parent-folder matching
  // so files nested in per-upload UUID subfolders would be invisible.
  const { data } = await listFiles({ limit, offset });
  const prefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;

  const candidates = data.filter(
    (f) => (f.mime_type?.startsWith('image/') ?? false) && f.file_path.startsWith(prefix),
  );

  // Each upload from /api/images/upload produces several variants (cover, og,
  // thumb, tiny) that share the same parent_folder_id. Deduplicate by showing
  // the best single representative per upload group.
  // Priority: thumbnail_url > image_url > any other variant.
  const VARIANT_RANK: Record<string, number> = {
    thumbnail_url: 0,
    image_url: 1,
    og_image_url: 2,
    tiny_url: 3,
  };

  const byGroup = new Map<string, FileRecordApi>();
  for (const f of candidates) {
    const groupKey = f.parent_folder_id ?? f.id;
    const existing = byGroup.get(groupKey);
    if (!existing) {
      byGroup.set(groupKey, f);
    } else {
      const thisRank = VARIANT_RANK[f.metadata?.['preset_variant'] as string] ?? 99;
      const existingRank = VARIANT_RANK[existing.metadata?.['preset_variant'] as string] ?? 99;
      if (thisRank < existingRank) byGroup.set(groupKey, f);
    }
  }

  return Array.from(byGroup.values())
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .map(toImageRecord);
}

export async function removeImage(fileId: string): Promise<void> {
  await deleteFile(fileId);
}
