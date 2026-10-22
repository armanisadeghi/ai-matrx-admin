// Client-safe file type detection (no Node / server-only), read from THE file-type registry
// (@ai-matrx/media/files) — never a local extension table.

import { getFileTypeDetails } from '@ai-matrx/media/files';
import type { FileContentResult } from '@/utils/fileSystemTypes';

export type { FileContentResult };

/** How a local file is read: parsed JSON, markdown text, other text, an image, or opaque bytes. */
export const getFileType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const details = getFileTypeDetails(filename);

  if (details.subCategory === 'JSON') return 'json';
  switch (details.previewKind) {
    case 'markdown':
      return 'markdown';
    case 'image':
    case 'svg':
      return 'image';
    case 'text':
    case 'code':
    case 'data':
    case 'html':
      return 'text';
    case 'pdf':
    case 'office':
    case 'spreadsheet':
      return 'binary';
    default:
      return details.category === 'ARCHIVE' ? 'binary' : ext || 'unknown';
  }
};
