import 'server-only';

import { fileHelpers } from '@/utils/fileSystemUtil';
import type { FileContentResult } from '@/utils/fileSystemTypes';
import { getFileType } from '@/utils/fileContentKind';

export const loadFileContent = async (
  path: string[],
  filename: string,
  directoryType: 'app' | 'public' | 'custom',
): Promise<FileContentResult> => {
  const fileType = getFileType(filename);

  try {
    switch (fileType) {
      case 'json': {
        const result = await fileHelpers.json.read<unknown>(filename, {
          type: directoryType,
          path,
        });

        return {
          content: result.data,
          type: 'json',
          viewerType: 'json',
          error: result.error,
        };
      }

      case 'markdown': {
        const result = await fileHelpers.text.read(filename, {
          type: directoryType,
          path,
        });

        return {
          content: result.content,
          type: 'markdown',
          viewerType: 'markdown',
          error: result.error,
        };
      }

      case 'text': {
        const result = await fileHelpers.text.read(filename, {
          type: directoryType,
          path,
        });

        return {
          content: result.content,
          type: fileType,
          viewerType: 'text',
          error: result.error,
        };
      }

      case 'image': {
        const filePath = `/${path.join('/')}/${filename}`;
        return {
          content: filePath,
          type: fileType,
          viewerType: 'image',
        };
      }

      case 'binary': {
        return {
          content: null,
          type: fileType,
          viewerType: 'binary',
          error: 'Binary files cannot be displayed directly',
        };
      }

      default:
        return {
          content: null,
          type: 'unknown',
          viewerType: 'none',
          error: 'Unsupported file type',
        };
    }
  } catch (error) {
    return {
      content: null,
      type: fileType,
      viewerType: 'none',
      error: error instanceof Error ? error.message : 'Error loading file',
    };
  }
};
