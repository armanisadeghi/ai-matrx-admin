// Client-safe file type detection (no Node / server-only).

import type { FileContentResult } from '@/utils/fileSystemTypes';

export type { FileContentResult };

export const FILE_TYPE_PATTERNS = {
  json: /\.json$/i,
  text: /\.(txt|log|md|csv|yml|yaml|env|js|jsx|ts|tsx|css|scss|html|xml)$/i,
  markdown: /\.(md|markdown)$/i,
  image: /\.(jpg|jpeg|png|gif|svg|webp)$/i,
  binary: /\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i,
};

export const getFileType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (FILE_TYPE_PATTERNS.json.test(filename)) return 'json';
  if (FILE_TYPE_PATTERNS.markdown.test(filename)) return 'markdown';
  if (FILE_TYPE_PATTERNS.text.test(filename)) return 'text';
  if (FILE_TYPE_PATTERNS.image.test(filename)) return 'image';
  if (FILE_TYPE_PATTERNS.binary.test(filename)) return 'binary';

  return ext || 'unknown';
};
