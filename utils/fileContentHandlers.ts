// utils/fileContentHandlers.ts
import { fileHelpers } from '@/utils/fileSystemUtil';

export interface FileContentResult {
    content: any;
    type: string;
    viewerType: 'json' | 'text' | 'markdown' | 'image' | 'binary' | 'none';
    error?: string;
}

export const FILE_TYPE_PATTERNS = {
    json: /\.json$/i,
    text: /\.(txt|log|md|csv|yml|yaml|env|js|jsx|ts|tsx|css|scss|html|xml)$/i,
    markdown: /\.(md|markdown)$/i,
    image: /\.(jpg|jpeg|png|gif|svg|webp)$/i,
    binary: /\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i
};

export const getFileType = (filename: string): string => {
    // Get file extension
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    // Determine file type
    if (FILE_TYPE_PATTERNS.json.test(filename)) return 'json';
    if (FILE_TYPE_PATTERNS.markdown.test(filename)) return 'markdown';
    if (FILE_TYPE_PATTERNS.text.test(filename)) return 'text';
    if (FILE_TYPE_PATTERNS.image.test(filename)) return 'image';
    if (FILE_TYPE_PATTERNS.binary.test(filename)) return 'binary';

    return ext || 'unknown';
};

export const loadFileContent = async (
    path: string[],
    filename: string,
    directoryType: 'app' | 'public' | 'custom'
): Promise<FileContentResult> => {
    const fileType = getFileType(filename);

    try {
        switch (fileType) {
            case 'json': {
                const result = await fileHelpers.json.read<any>(filename, {
                    type: directoryType,
                    path
                });

                return {
                    content: result.data,
                    type: 'json',
                    viewerType: 'json',
                    error: result.error
                };
            }

            case 'markdown': {
                const result = await fileHelpers.text.read(filename, {
                    type: directoryType,
                    path
                });

                return {
                    content: result.content,
                    type: 'markdown',
                    viewerType: 'markdown',
                    error: result.error
                };
            }

            case 'text': {
                const result = await fileHelpers.text.read(filename, {
                    type: directoryType,
                    path
                });

                return {
                    content: result.content,
                    type: fileType,
                    viewerType: 'text',
                    error: result.error
                };
            }

            case 'image': {
                // For images, we'll return the path to display in an img tag
                const filePath = `/${path.join('/')}/${filename}`;
                return {
                    content: filePath,
                    type: fileType,
                    viewerType: 'image'
                };
            }

            case 'binary': {
                return {
                    content: null,
                    type: fileType,
                    viewerType: 'binary',
                    error: 'Binary files cannot be displayed directly'
                };
            }

            default:
                return {
                    content: null,
                    type: 'unknown',
                    viewerType: 'none',
                    error: 'Unsupported file type'
                };
        }
    } catch (error) {
        return {
            content: null,
            type: fileType,
            viewerType: 'none',
            error: error instanceof Error ? error.message : 'Error loading file'
        };
    }
};
