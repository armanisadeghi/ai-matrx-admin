// features/public-chat/types/content.ts
// Content item types for the Agent API

/**
 * BACKEND SUPPORTED TYPES (from types/agent-api.ts):
 * - input_text: { type, text }
 * - input_image: { type, url }
 * - input_audio: { type, url }
 * - input_file: { type, url }
 * 
 * All file/media types use a consistent 'url' field for the resource location.
 * Backend accepts [key: string]: unknown, so additional fields won't break.
 */

/**
 * Base content item - all content items have a type
 */
interface BaseContentItem {
    type: string;
}

/**
 * Text input content
 * Backend field: text
 */
export interface TextContentItem extends BaseContentItem {
    type: 'input_text';
    text: string;
}

/**
 * Image input content
 * Backend field: url
 */
export interface ImageContentItem extends BaseContentItem {
    type: 'input_image';
    url: string;
}

/**
 * Audio input content
 * Backend field: url
 */
export interface AudioContentItem extends BaseContentItem {
    type: 'input_audio';
    url: string;
}

/**
 * Generic file input (server will determine type)
 * Backend field: url
 */
export interface FileContentItem extends BaseContentItem {
    type: 'input_file';
    url: string;
}

// Video and Document types are handled as input_file by the backend
// Keeping type aliases for semantic clarity in the codebase
export type VideoContentItem = FileContentItem;
export type DocumentContentItem = FileContentItem;

/**
 * YouTube video content
 * Note: Backend may not support this - sending as-is for future support
 */
export interface YouTubeContentItem extends BaseContentItem {
    type: 'youtube_video';
    url: string;
}

/**
 * Webpage content (scraped text)
 * Note: Backend may not support this - sending as-is for future support
 */
export interface WebpageContentItem extends BaseContentItem {
    type: 'input_webpage';
    url: string;
}

/**
 * Note content (from Matrx notes)
 * Note: Backend may not support this - sending as-is for future support
 */
export interface NoteContentItem extends BaseContentItem {
    type: 'input_note';
    note_id: string;
    title: string;
    content: string;
}

/**
 * Task content (from Matrx tasks)
 * Note: Backend may not support this - sending as-is for future support
 */
export interface TaskContentItem extends BaseContentItem {
    type: 'input_task';
    task_id: string;
    title: string;
    description?: string;
    status?: string;
}

/**
 * Table content (from Matrx tables)
 * Note: Backend may not support this - sending as-is for future support
 */
export interface TableContentItem extends BaseContentItem {
    type: 'input_table';
    table_id: string;
    table_name: string;
    data?: string; // JSON or formatted text
}

/**
 * Union type for all content items
 */
export type ContentItem =
    | TextContentItem
    | ImageContentItem
    | AudioContentItem
    | VideoContentItem
    | DocumentContentItem
    | YouTubeContentItem
    | FileContentItem
    | WebpageContentItem
    | NoteContentItem
    | TaskContentItem
    | TableContentItem;

/**
 * Resource types that can be attached to messages
 * Mirrors the types from features/prompts/types/resources.ts but simplified for public chat
 */
export type PublicResourceType =
    | 'file'        // Uploaded file
    | 'image_link'  // Direct image URL
    | 'file_link'   // Direct file URL
    | 'audio'       // Audio file
    | 'youtube'     // YouTube video
    | 'webpage'     // Scraped webpage
    | 'note'        // Matrx note (placeholder)
    | 'task'        // Matrx task (placeholder)
    | 'table';      // Matrx table (placeholder)

/**
 * Public resource structure
 */
export interface PublicResource {
    type: PublicResourceType;
    data: {
        url?: string;
        filename?: string;
        mime_type?: string;
        type?: string;
        size?: number;
        // For specific types
        video_id?: string;
        title?: string;
        content?: string;
        text_content?: string;
        transcript?: string;
        id?: string;
        description?: string;
        status?: string;
        table_name?: string;
        [key: string]: any;
    };
}

/**
 * Convert a PublicResource to a ContentItem for the API
 * 
 * All media/file types use a consistent 'url' field:
 * - input_text: { type, text }
 * - input_image: { type, url }
 * - input_audio: { type, url }
 * - input_file: { type, url }
 */
export function resourceToContentItem(resource: PublicResource): ContentItem | null {
    const { type, data } = resource;

    switch (type) {
        case 'image_link':
            if (!data.url) return null;
            return {
                type: 'input_image',
                url: data.url,
            };

        case 'file':
            if (!data.url) return null;
            // Determine if it's an image, audio, or generic file
            const mimeType = data.mime_type || data.type || '';
            
            if (mimeType.startsWith('image/')) {
                return {
                    type: 'input_image',
                    url: data.url,
                };
            }
            if (mimeType.startsWith('audio/')) {
                return {
                    type: 'input_audio',
                    url: data.url,
                };
            }
            // Video, document, and other files all go as input_file
            return {
                type: 'input_file',
                url: data.url,
            };

        case 'file_link':
            if (!data.url) return null;
            return {
                type: 'input_file',
                url: data.url,
            };

        case 'audio':
            if (!data.url) return null;
            return {
                type: 'input_audio',
                url: data.url,
            };

        case 'youtube':
            // YouTube not officially supported by backend, but send for future support
            if (!data.url) return null;
            return {
                type: 'youtube_video',
                url: data.url,
            };

        case 'webpage':
            // Webpage not officially supported by backend, but send for future support
            if (!data.url) return null;
            return {
                type: 'input_webpage',
                url: data.url,
            };

        case 'note':
            // Note not officially supported by backend, but send for future support
            return {
                type: 'input_note',
                note_id: data.id || '',
                title: data.title || data.filename || 'Note',
                content: data.content || '',
            };

        case 'task':
            // Task not officially supported by backend, but send for future support
            return {
                type: 'input_task',
                task_id: data.id || '',
                title: data.title || 'Task',
                description: data.description,
                status: data.status,
            };

        case 'table':
            // Table not officially supported by backend, but send for future support
            return {
                type: 'input_table',
                table_id: data.id || '',
                table_name: data.table_name || data.title || 'Table',
                data: typeof data.content === 'string' ? data.content : JSON.stringify(data.content),
            };

        default:
            console.warn('Unknown resource type:', type);
            return null;
    }
}

/**
 * Build content array from text and resources
 */
export function buildContentArray(
    text: string,
    resources: PublicResource[]
): ContentItem[] {
    const content: ContentItem[] = [];

    // Add text content if present
    if (text.trim()) {
        content.push({
            type: 'input_text',
            text: text,
        });
    }

    // Convert and add each resource
    for (const resource of resources) {
        const item = resourceToContentItem(resource);
        if (item) {
            content.push(item);
        }
    }

    return content;
}
