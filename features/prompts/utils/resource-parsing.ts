/**
 * Resource Parsing Utility
 * 
 * Parses XML-formatted resources from message content.
 * Used to identify and display resources in chat messages.
 */

import { ParsedResource } from '../types/resources';

// ===========================
// XML Parsing Functions
// ===========================

/**
 * Unescape XML special characters
 */
function unescapeXml(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

/**
 * Extract text content between XML tags
 */
function extractTagContent(xml: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 's');
    const match = xml.match(regex);
    return match ? unescapeXml(match[1].trim()) : null;
}

/**
 * Extract all tag contents from a parent tag
 */
function extractMetadataFromXml(metadataXml: string): Record<string, string> {
    const metadata: Record<string, string> = {};
    
    // Match all <tag>content</tag> patterns
    const tagRegex = /<(\w+)>(.*?)<\/\1>/gs;
    let match;
    
    while ((match = tagRegex.exec(metadataXml)) !== null) {
        const tagName = match[1];
        const content = unescapeXml(match[2].trim());
        metadata[tagName] = content;
    }
    
    return metadata;
}

/**
 * Parse a single resource from XML
 */
function parseResourceXml(resourceXml: string, startIndex: number): ParsedResource | null {
    try {
        // Extract type and id from opening tag
        const openingTagMatch = resourceXml.match(/<resource\s+type="([^"]+)"\s+id="([^"]+)">/);
        if (!openingTagMatch) {
            console.warn('Failed to parse resource: missing type or id');
            return null;
        }
        
        const type = openingTagMatch[1];
        const id = openingTagMatch[2];
        
        // Extract metadata
        const metadataXml = extractTagContent(resourceXml, 'metadata');
        const metadata = metadataXml ? extractMetadataFromXml(metadataXml) : {};
        
        // Extract content
        const content = extractTagContent(resourceXml, 'content') || '';
        
        return {
            type,
            id,
            metadata,
            content,
            rawXml: resourceXml,
            startIndex,
            endIndex: startIndex + resourceXml.length,
        };
    } catch (error) {
        console.error('Error parsing resource XML:', error);
        return null;
    }
}

/**
 * Parse all resources from message content
 */
export function parseResourcesFromMessage(messageContent: string): ParsedResource[] {
    const resources: ParsedResource[] = [];
    
    // Find all <resource> tags
    const resourceRegex = /<resource\s+type="[^"]+"\s+id="[^"]+">(.*?)<\/resource>/gs;
    let match;
    
    while ((match = resourceRegex.exec(messageContent)) !== null) {
        const resourceXml = match[0];
        const startIndex = match.index;
        
        const parsed = parseResourceXml(resourceXml, startIndex);
        if (parsed) {
            resources.push(parsed);
        }
    }
    
    return resources;
}

/**
 * Check if message contains resources
 */
export function messageContainsResources(messageContent: string): boolean {
    return messageContent.includes('<attached_resources>') || messageContent.includes('<resource type=');
}

/**
 * Extract message content without resource XML
 * Useful for displaying just the user's message text
 */
export function extractMessageWithoutResources(messageContent: string): string {
    // Remove entire <attached_resources> block
    let cleaned = messageContent.replace(/<attached_resources>.*?<\/attached_resources>/gs, '');
    
    // Also remove any standalone <resource> tags that might be outside the wrapper
    cleaned = cleaned.replace(/<resource\s+type="[^"]+"\s+id="[^"]+">(.*?)<\/resource>/gs, '');
    
    // Clean up extra whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
}

/**
 * Split message into text segments and resource segments
 * Useful for rendering message with inline resource components
 */
export interface MessageSegment {
    type: 'text' | 'resource';
    content: string;
    resource?: ParsedResource;
}

export function splitMessageIntoSegments(messageContent: string): MessageSegment[] {
    const segments: MessageSegment[] = [];
    const resources = parseResourcesFromMessage(messageContent);
    
    if (resources.length === 0) {
        // No resources, return entire content as text
        return [{ type: 'text', content: messageContent }];
    }
    
    // Sort resources by start index
    resources.sort((a, b) => a.startIndex - b.startIndex);
    
    let currentIndex = 0;
    
    for (const resource of resources) {
        // Add text before this resource
        if (resource.startIndex > currentIndex) {
            const textContent = messageContent.substring(currentIndex, resource.startIndex);
            if (textContent.trim()) {
                segments.push({ type: 'text', content: textContent });
            }
        }
        
        // Add resource
        segments.push({
            type: 'resource',
            content: resource.rawXml,
            resource,
        });
        
        currentIndex = resource.endIndex;
    }
    
    // Add remaining text after last resource
    if (currentIndex < messageContent.length) {
        const textContent = messageContent.substring(currentIndex);
        if (textContent.trim()) {
            segments.push({ type: 'text', content: textContent });
        }
    }
    
    return segments;
}

/**
 * Extract resource IDs from message content
 * Useful for quick lookups
 */
export function extractResourceIds(messageContent: string): Array<{ type: string; id: string }> {
    const resources = parseResourcesFromMessage(messageContent);
    return resources.map(r => ({ type: r.type, id: r.id }));
}

/**
 * Check if a specific resource exists in the message
 */
export function messageHasResource(messageContent: string, resourceType: string, resourceId: string): boolean {
    const ids = extractResourceIds(messageContent);
    return ids.some(r => r.type === resourceType && r.id === resourceId);
}

/**
 * Get count of resources by type in message
 */
export function getResourceCountByType(messageContent: string): Record<string, number> {
    const resources = parseResourcesFromMessage(messageContent);
    const counts: Record<string, number> = {};
    
    for (const resource of resources) {
        counts[resource.type] = (counts[resource.type] || 0) + 1;
    }
    
    return counts;
}

