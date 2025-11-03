/**
 * Resource Formatting Utility
 * 
 * Converts Resource objects to XML format for LLM consumption.
 * Each resource type has specific metadata and content extraction logic.
 */

import { 
    Resource, 
    ResourceFormatConfig, 
    ProcessedResources,
    NoteResourceData,
    TaskResourceData,
    ProjectResourceData,
    TableResourceData,
    FileResourceData,
    WebpageResourceData,
    YouTubeResourceData,
    ImageUrlResourceData,
    FileUrlResourceData,
    AudioResourceData
} from '../types/resources';

// ===========================
// Format Configuration
// ===========================

/**
 * Configuration for each resource type defining how to format it
 */
export const RESOURCE_FORMAT_CONFIG: Record<string, ResourceFormatConfig> = {
    note: {
        includeInContent: true,
        requiresDataFetch: false,
        instructions: "This is a user note that can be referenced, quoted, or analyzed. If you need to update, delete, or create notes, you should use the appropriate note management tools.",
        extractMetadata: (data: NoteResourceData) => ({
            label: data.label,
            ...(data.folder_name && { folder: data.folder_name }),
            ...(data.tags && data.tags.length > 0 && { tags: data.tags.join(', ') }),
        }),
        extractContent: (data: NoteResourceData) => data.content || '',
    },
    
    task: {
        includeInContent: true,
        requiresDataFetch: false,
        instructions: "This is a task from the user's task list. You can reference it, check its status, or suggest updates. To modify tasks, use the task management tools.",
        extractMetadata: (data: TaskResourceData) => ({
            title: data.title,
            status: data.status,
            ...(data.priority && { priority: data.priority }),
            ...(data.due_date && { due_date: data.due_date }),
            ...(data.project_id && { project: data.project_id }),
        }),
        extractContent: (data: TaskResourceData) => data.description || '',
    },
    
    project: {
        includeInContent: true,
        requiresDataFetch: false,
        instructions: "This is a project from the user's project list. You can reference it or suggest updates. To modify projects, use the project management tools.",
        extractMetadata: (data: ProjectResourceData) => ({
            name: data.name,
        }),
        extractContent: (data: ProjectResourceData) => data.description || '',
    },
    
    table: {
        includeInContent: true,
        requiresDataFetch: true, // Tables need their data fetched via RPC
        instructions: "This is a data table reference that you can analyze, query, or reference. You can perform calculations, filter data, or answer questions about it. To modify the table, use the table management tools.",
        extractMetadata: (data: TableResourceData) => ({
            name: data.table_name,
            ...(data.description && { description: data.description }),
            reference_type: data.type,
            ...(data.row_id && { row_id: data.row_id }),
            ...(data.column_name && { column: data.column_display_name || data.column_name }),
            ...(data.row_count !== undefined && { row_count: String(data.row_count) }),
        }),
        extractContent: (data: TableResourceData) => {
            // Format based on reference type (full_table, table_row, table_column, table_cell)
            return formatTableContent(data);
        },
    },
    
    file: {
        includeInContent: true,
        requiresDataFetch: false,
        instructions: "This is a file attachment. You can reference its contents or metadata. If you need to modify or create files, use the file management tools.",
        extractMetadata: (data: FileResourceData) => ({
            filename: data.filename || data.details?.filename || 'Unknown',
            ...(data.mime_type && { mime_type: data.mime_type }),
            ...(data.size && { size: formatFileSize(data.size) }),
        }),
        extractContent: (data: FileResourceData) => {
            // If we have text content, include it
            if (data.content) {
                return data.content;
            }
            // Otherwise, just mention it's a binary file or provide URL
            if (data.url) {
                return `File available at: ${data.url}`;
            }
            return `File: ${data.filename || 'attachment'}`;
        },
    },
    
    webpage: {
        includeInContent: true,
        requiresDataFetch: false,
        instructions: "This is web content scraped from a URL. You can reference, summarize, or analyze this content. Note that this is a snapshot and may not reflect the current state of the webpage.",
        extractMetadata: (data: WebpageResourceData) => ({
            ...(data.title && { title: data.title }),
            url: data.url,
            ...(data.scrapedAt && { scraped_at: data.scrapedAt }),
            ...(data.charCount && { char_count: String(data.charCount) }),
        }),
        extractContent: (data: WebpageResourceData) => data.textContent || '',
    },
    
    youtube: {
        includeInContent: false, // YouTube URLs go in settings
        requiresDataFetch: false,
        instructions: "YouTube video",
        extractMetadata: (data: YouTubeResourceData) => ({
            url: data.url,
            video_id: data.videoId,
            ...(data.title && { title: data.title }),
        }),
        extractContent: (data: YouTubeResourceData) => data.transcript || '',
    },
    
    image_url: {
        includeInContent: false, // Image URLs go in settings
        requiresDataFetch: false,
        instructions: "Image URL",
        extractMetadata: (data: ImageUrlResourceData) => ({
            url: data.url,
        }),
        extractContent: () => '',
    },
    
    file_url: {
        includeInContent: false, // File URLs go in settings
        requiresDataFetch: false,
        instructions: "File URL",
        extractMetadata: (data: FileUrlResourceData) => ({
            url: data.url,
            ...(data.filename && { filename: data.filename }),
        }),
        extractContent: () => '',
    },
    
    audio: {
        includeInContent: true,
        requiresDataFetch: false,
        instructions: "This is an audio file. If a transcript is available, you can reference it. Use audio management tools to modify or create audio files.",
        extractMetadata: (data: AudioResourceData) => ({
            filename: data.filename || 'Audio',
            ...(data.duration && { duration: `${data.duration}s` }),
        }),
        extractContent: (data: AudioResourceData) => {
            if (data.transcript) {
                return `[Audio Transcript]\n${data.transcript}`;
            }
            return 'Audio file (no transcript available)';
        },
    },
};

// ===========================
// Helper Functions
// ===========================

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format table data based on reference type
 */
function formatTableContent(data: TableResourceData): string {
    const referenceType = data.type;
    
    switch (referenceType) {
        case 'full_table':
            return formatFullTableAsMarkdown(data);
            
        case 'table_row':
            return formatTableRow(data);
            
        case 'table_column':
            return formatTableColumn(data);
            
        case 'table_cell':
            return formatTableCell(data);
            
        default:
            return `Reference to ${data.table_name}`;
    }
}

/**
 * Format full table as markdown table
 */
function formatFullTableAsMarkdown(data: TableResourceData): string {
    if (!data.fields || !data.rows || data.rows.length === 0) {
        return `# ${data.table_name}\n\nNo data available.`;
    }
    
    const lines: string[] = [];
    lines.push(`# ${data.table_name}`);
    lines.push('');
    
    // Create header row
    const headers = data.fields.map(f => f.display_name || f.field_name);
    lines.push('| ' + headers.join(' | ') + ' |');
    
    // Create separator row
    lines.push('| ' + headers.map(() => '---').join(' | ') + ' |');
    
    // Create data rows (limit to first 100 for performance)
    const rowsToShow = data.rows.slice(0, 100);
    for (const row of rowsToShow) {
        const cells = data.fields.map(f => {
            const value = row[f.field_name];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value);
        });
        lines.push('| ' + cells.join(' | ') + ' |');
    }
    
    if (data.rows.length > 100) {
        lines.push('');
        lines.push(`... ${data.rows.length - 100} more rows`);
    }
    
    return lines.join('\n');
}

/**
 * Format a single table row
 */
function formatTableRow(data: TableResourceData): string {
    if (!data.rows || data.rows.length === 0) {
        return `Row from table "${data.table_name}" (ID: ${data.row_id})`;
    }
    
    const row = data.rows[0];
    const lines: string[] = [];
    lines.push(`## Row from ${data.table_name}`);
    lines.push(`Row ID: ${data.row_id}`);
    lines.push('');
    
    // Format as key-value pairs
    for (const [key, value] of Object.entries(row)) {
        if (key === 'id') continue; // Skip internal ID
        const displayValue = value === null || value === undefined ? '(empty)' : 
                           typeof value === 'object' ? JSON.stringify(value) : 
                           String(value);
        lines.push(`**${key}**: ${displayValue}`);
    }
    
    return lines.join('\n');
}

/**
 * Format a table column
 */
function formatTableColumn(data: TableResourceData): string {
    const columnName = data.column_display_name || data.column_name || 'Unknown Column';
    
    if (!data.rows || data.rows.length === 0) {
        return `Column "${columnName}" from table "${data.table_name}"`;
    }
    
    const lines: string[] = [];
    lines.push(`## Column: ${columnName}`);
    lines.push(`From table: ${data.table_name}`);
    lines.push('');
    lines.push('Values:');
    
    // List the column values (limit to first 100)
    const rowsToShow = data.rows.slice(0, 100);
    for (let i = 0; i < rowsToShow.length; i++) {
        const row = rowsToShow[i];
        const value = row[data.column_name || ''];
        const displayValue = value === null || value === undefined ? '(empty)' : 
                           typeof value === 'object' ? JSON.stringify(value) : 
                           String(value);
        lines.push(`${i + 1}. ${displayValue}`);
    }
    
    if (data.rows.length > 100) {
        lines.push(`... ${data.rows.length - 100} more values`);
    }
    
    return lines.join('\n');
}

/**
 * Format a single table cell
 */
function formatTableCell(data: TableResourceData): string {
    const columnName = data.column_display_name || data.column_name || 'Unknown Column';
    const cellValue = (data as any).cell_value;
    
    const lines: string[] = [];
    lines.push(`## Cell from ${data.table_name}`);
    lines.push(`Column: ${columnName}`);
    lines.push(`Row ID: ${data.row_id}`);
    lines.push('');
    lines.push('Value:');
    
    const displayValue = cellValue === null || cellValue === undefined ? '(empty)' : 
                       typeof cellValue === 'object' ? JSON.stringify(cellValue, null, 2) : 
                       String(cellValue);
    lines.push(displayValue);
    
    return lines.join('\n');
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Format metadata as XML attributes
 */
function formatMetadataXml(metadata: Record<string, string>): string {
    return Object.entries(metadata)
        .map(([key, value]) => `<${key}>${escapeXml(value)}</${key}>`)
        .join('');
}

// ===========================
// Main Formatting Functions
// ===========================

/**
 * Get ID from resource data (handles different ID field names)
 */
function getResourceId(resource: Resource): string {
    // Handle different ID field names based on resource type
    if (resource.type === 'table') {
        return resource.data.table_id;
    } else if (resource.type === 'note' || resource.type === 'task' || resource.type === 'project' || resource.type === 'file' || resource.type === 'audio') {
        return resource.data.id || `${resource.type}-${Date.now()}`;
    } else if (resource.type === 'webpage' || resource.type === 'youtube' || resource.type === 'image_url' || resource.type === 'file_url') {
        // URL-based resources use URL as ID
        return resource.data.url || `${resource.type}-${Date.now()}`;
    }
    
    // Fallback (should never reach here if Resource type is exhaustive)
    return `resource-${Date.now()}`;
}

/**
 * Format a single resource to XML
 */
export function formatResourceToXml(resource: Resource): string {
    const config = RESOURCE_FORMAT_CONFIG[resource.type];
    
    if (!config || !config.includeInContent) {
        return ''; // Don't include in content
    }
    
    const metadata = config.extractMetadata(resource.data);
    const content = config.extractContent(resource.data);
    const instructions = config.instructions;
    const resourceId = getResourceId(resource);
    
    // Build XML structure
    const lines: string[] = [];
    lines.push(`<resource type="${resource.type}" id="${resourceId}">`);
    
    // Add metadata
    if (Object.keys(metadata).length > 0) {
        lines.push('<metadata>');
        lines.push(formatMetadataXml(metadata));
        lines.push('</metadata>');
    }
    
    // Add instructions
    lines.push('<instructions>');
    lines.push(escapeXml(instructions));
    lines.push('</instructions>');
    
    // Add content
    if (content) {
        lines.push('<content>');
        lines.push(escapeXml(content));
        lines.push('</content>');
    }
    
    lines.push('</resource>');
    
    return lines.join('\n');
}

/**
 * Format multiple resources to XML (wrapped in <attached_resources> tag)
 */
export function formatResourcesToXml(resources: Resource[]): string {
    // Filter only resources that should be in content
    const contentResources = resources.filter(r => {
        const config = RESOURCE_FORMAT_CONFIG[r.type];
        return config && config.includeInContent;
    });
    
    if (contentResources.length === 0) {
        return '';
    }
    
    const formattedResources = contentResources.map(r => formatResourceToXml(r)).filter(Boolean);
    
    if (formattedResources.length === 0) {
        return '';
    }
    
    return `<attached_resources>\n${formattedResources.join('\n\n')}\n</attached_resources>`;
}

/**
 * Extract settings attachments from resources (URLs, etc.)
 */
export function extractSettingsAttachments(resources: Resource[]): ProcessedResources['settingsAttachments'] {
    const attachments: ProcessedResources['settingsAttachments'] = {};
    
    for (const resource of resources) {
        const config = RESOURCE_FORMAT_CONFIG[resource.type];
        
        // Skip resources that go in content
        if (!config || config.includeInContent) {
            continue;
        }
        
        // Handle URL-based resources
        switch (resource.type) {
            case 'youtube':
                if (!attachments.youtubeUrls) attachments.youtubeUrls = [];
                attachments.youtubeUrls.push(resource.data.url);
                break;
                
            case 'image_url':
                if (!attachments.imageUrls) attachments.imageUrls = [];
                attachments.imageUrls.push(resource.data.url);
                break;
                
            case 'file_url':
                if (!attachments.fileUrls) attachments.fileUrls = [];
                attachments.fileUrls.push(resource.data.url);
                break;
                
            case 'audio':
                if (resource.data.url) {
                    if (!attachments.audioFiles) attachments.audioFiles = [];
                    attachments.audioFiles.push(resource.data.url);
                }
                break;
        }
    }
    
    return attachments;
}

/**
 * Process resources for message inclusion
 * This is the main function to use when preparing a message with resources
 */
export async function processResourcesForMessage(resources: Resource[]): Promise<ProcessedResources> {
    return {
        formattedXml: formatResourcesToXml(resources),
        settingsAttachments: extractSettingsAttachments(resources),
        originalResources: resources,
    };
}

/**
 * Append resources to message content
 */
export function appendResourcesToMessage(messageContent: string, resourcesXml: string): string {
    if (!resourcesXml) {
        return messageContent;
    }
    
    // If message is empty, just return resources
    if (!messageContent.trim()) {
        return resourcesXml;
    }
    
    // Append resources to the end of the message with proper spacing
    return `${messageContent}\n\n${resourcesXml}`;
}

